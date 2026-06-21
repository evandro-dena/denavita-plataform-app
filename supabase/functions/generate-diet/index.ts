// =====================================================================
// Edge Function: generate-diet — WORKER ASSÍNCRONO do botão "Gerar plano"
// =====================================================================
// Acionada pela rota Vercel kickoff (F3) — NÃO mais por trigger (disparo auto
// removido na F1). Responde 202 NA HORA e gera em background (waitUntil), então
// grava diet_generation_status (pronto|erro). Isso mantém os ~68s FORA do limite
// de 60s do Vercel Hobby (rodam aqui, no Supabase, até 150s no Free).
//
// FASE F2: 202 + background + status. Geração em si = porte da E2 (_shared).
// =====================================================================

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { generateDietForStudent } from '../_shared/generate.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const EDGE_SHARED_SECRET = Deno.env.get('EDGE_SHARED_SECRET') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

type GenStatus = 'gerando' | 'pronto' | 'erro'

async function setStatus(
  supabase: SupabaseClient,
  studentId: string,
  status: GenStatus,
  planId: string | null = null,
  error: string | null = null,
): Promise<void> {
  await supabase.from('diet_generation_status').upsert({
    student_id: studentId,
    status,
    plan_id: planId,
    error,
    updated_at: new Date().toISOString(),
  })
}

// Roda o promise em background. No Supabase usa EdgeRuntime.waitUntil (mantém o
// worker vivo após o 202); localmente (deno run) o servidor segue vivo e o
// promise continua no event loop.
function runInBackground(promise: Promise<unknown>): void {
  // @ts-ignore EdgeRuntime existe só no runtime do Supabase
  const er = typeof EdgeRuntime !== 'undefined' ? EdgeRuntime : undefined
  if (er?.waitUntil) {
    er.waitUntil(promise)
  } else {
    promise.catch((e) => console.error('[generate-diet bg]', e))
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // 1. Autentica o chamador (segredo compartilhado — verify_jwt=false).
  const provided =
    req.headers.get('x-edge-secret') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!EDGE_SHARED_SECRET || provided !== EDGE_SHARED_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // 2. Secrets necessários p/ a geração.
  const missing = (
    [
      ['SUPABASE_URL', SUPABASE_URL],
      ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY],
      ['GEMINI_API_KEY', GEMINI_API_KEY],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) {
    return json({ error: 'Missing secrets', missing }, 500)
  }

  // 3. Payload — aceita { studentId } (kickoff) ou { record: { user_id } } (legado).
  let body: { studentId?: string; record?: { user_id?: string } }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const studentId = body.studentId ?? body.record?.user_id ?? null
  if (!studentId) {
    return json({ error: 'studentId ausente no payload' }, 400)
  }

  const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 4. Deriva o nutricionista do aluno (não confia em input do cliente).
  const { data: student, error: stuErr } = await supabase
    .from('profiles')
    .select('id, nutritionist_id')
    .eq('id', studentId)
    .maybeSingle()
  if (stuErr) return json({ error: 'DB error', detail: stuErr.message }, 500)
  if (!student) return json({ error: 'Aluno não encontrado' }, 404)

  const nutritionistId = (student.nutritionist_id as string | null) ?? null
  if (!nutritionistId) {
    return json({ error: 'Aluno sem nutricionista vinculado' }, 400)
  }

  // 5. Marca 'gerando' (a UI já mostra spinner) e dispara a geração em background.
  await setStatus(supabase, studentId, 'gerando')

  const job = (async () => {
    const t0 = performance.now()
    try {
      const { planId, skipped } = await generateDietForStudent(
        { studentId, nutritionistId },
        supabase,
      )
      await setStatus(supabase, studentId, 'pronto', planId)
      console.log(
        `[generate-diet] pronto student=${studentId} plan=${planId} skipped=${skipped} ${Math.round(
          performance.now() - t0,
        )}ms`,
      )
    } catch (err) {
      await setStatus(supabase, studentId, 'erro', null, String(err))
      console.error(`[generate-diet] erro student=${studentId}`, err)
    }
  })()
  runInBackground(job)

  // 6. Resposta imediata (≈ sub-segundo) — não espera os ~68s.
  return json({ ok: true, phase: 'F2', status: 'gerando', studentId, nutritionistId }, 202)
})
