// =====================================================================
// Edge Function: generate-diet — FONTE DO FLUXO AUTOMÁTICO
// =====================================================================
// Acionada por trigger (INSERT + UPDATE) em `anamnesis` via Database Webhook
// / pg_net. A rota Vercel /api/ai/students/[id]/generate-diet permanece como
// fonte do fluxo MANUAL (nutricionista clica "Gerar").
//
// FASE E2: gera de fato a dieta (porte de generate-and-persist.ts) e MEDE o
// wall-clock da geração, devolvido no JSON p/ comparar com o limite do Edge.
// =====================================================================

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { generateDietForStudent } from '../_shared/generate.ts'

// Secrets auto-injetados pelo runtime do Supabase em funções deployadas.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Secrets custom — setar via `supabase secrets set` (prod) ou --env-file (local).
const EDGE_SHARED_SECRET = Deno.env.get('EDGE_SHARED_SECRET') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
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

  // 2. Confere secrets necessários p/ a geração.
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

  // 3. Lê o payload do webhook.
  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // Decisão (2): só INSERT/UPDATE em `anamnesis`.
  if (
    payload.table !== 'anamnesis' ||
    (payload.type !== 'INSERT' && payload.type !== 'UPDATE')
  ) {
    return json({ ok: true, ignored: true, reason: `evento ${payload.type} em ${payload.table}` })
  }

  const studentId = (payload.record?.user_id as string | undefined) ?? null
  if (!studentId) {
    return json({ error: 'record.user_id ausente no payload' }, 400)
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

  // 5. Gera + persiste, medindo o WALL-CLOCK da geração.
  const t0 = performance.now()
  try {
    const { planId, skipped } = await generateDietForStudent({ studentId, nutritionistId }, supabase)
    const elapsedMs = Math.round(performance.now() - t0)
    return json({
      ok: true,
      phase: 'E2',
      planId,
      skipped, // true = reaproveitou plano pendente (guard gera-uma-vez)
      elapsed_ms: elapsedMs,
      elapsed_s: Number((elapsedMs / 1000).toFixed(1)),
      studentId,
      nutritionistId,
    })
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - t0)
    console.error('[generate-diet]', err)
    return json(
      { error: 'Erro ao gerar dieta', detail: String(err), elapsed_ms: elapsedMs },
      500,
    )
  }
})
