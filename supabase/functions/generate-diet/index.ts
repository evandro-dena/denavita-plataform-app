// =====================================================================
// Edge Function: generate-diet — FONTE DO FLUXO AUTOMÁTICO
// =====================================================================
// Acionada por trigger (INSERT + UPDATE) em `anamnesis` via Database Webhook
// / pg_net. A rota Vercel /api/ai/students/[id]/generate-diet permanece como
// fonte do fluxo MANUAL (nutricionista clica "Gerar").
//
// FASE E1 (este arquivo): apenas ESQUELETO. Validamos o segredo compartilhado,
// conferimos que os secrets necessários existem, parseamos o payload do webhook
// e fazemos um roundtrip real no banco (service role) p/ derivar o nutricionista
// do aluno — exatamente a pré-condição da geração. NÃO geramos a dieta ainda.
// A geração real (porte de generate-and-persist.ts) + medição de wall-clock
// entram na Fase E2.
// =====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Secrets auto-injetados pelo runtime do Supabase em funções deployadas
// (e também no `supabase functions serve` local).
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Secrets custom — setar via `supabase secrets set` (prod) ou --env-file (local).
const EDGE_SHARED_SECRET = Deno.env.get('EDGE_SHARED_SECRET') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

// Payload de um Database Webhook do Supabase (INSERT/UPDATE/DELETE).
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

  // 1. Autentica o chamador. Como verify_jwt=false, qualquer um alcançaria a
  //    função; o trigger prova que é ele enviando o segredo compartilhado
  //    (header x-edge-secret OU Authorization: Bearer <segredo>).
  const provided =
    req.headers.get('x-edge-secret') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!EDGE_SHARED_SECRET || provided !== EDGE_SHARED_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // 2. Confere que os secrets necessários p/ a geração (E2) já estão presentes.
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

  // Decisão (2): só nos interessam INSERT/UPDATE em `anamnesis`.
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

  // 4. Smoke-test do service client: deriva o nutricionista do aluno — mesma
  //    pré-condição que a geração real usará na E2.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: student, error } = await supabase
    .from('profiles')
    .select('id, nutritionist_id, status')
    .eq('id', studentId)
    .maybeSingle()
  if (error) {
    return json({ error: 'DB error', detail: error.message }, 500)
  }

  return json({
    ok: true,
    phase: 'E1',
    event: { type: payload.type, table: payload.table },
    wouldGenerateFor: {
      studentId,
      nutritionistId: student?.nutritionist_id ?? null,
      status: student?.status ?? null,
      found: Boolean(student),
    },
    note: 'Geração real + medição de wall-clock entram na Fase E2.',
  })
})
