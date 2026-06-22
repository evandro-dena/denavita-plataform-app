import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

// KICKOFF do botão "Gerar plano". NÃO gera aqui: dispara a Edge Function (que
// responde 202 na hora e gera em background) e volta rápido (~1s). Por isso
// NÃO precisa mais de maxDuration alto / Vercel Pro — os ~68s rodam na Edge.
//
// GET na mesma rota = status para o polling da UI (gerando|pronto|erro).

// Job 'gerando' mais velho que isto é tratado como retomável (Edge morreu sem
// gravar status). Casado com o timeout de polling do cliente (F4).
const STALE_MS = 3 * 60 * 1000

function edgeConfig(): { url: string | null; secret: string | null } {
  // `||` (não `??`): override vazio ("") cai no derivado de produção.
  const url =
    process.env.EDGE_GENERATE_DIET_URL ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-diet`
      : null)
  return { url, secret: process.env.EDGE_SHARED_SECRET ?? null }
}

type AuthOk = { supabase: ReturnType<typeof createServiceClient>; nutritionistId: string }
type AuthErr = { error: string; status: 400 | 401 | 403 | 404 }

// Exige sessão e que o usuário seja o NUTRICIONISTA DONO do aluno (só ele
// dispara/consulta). Deriva o nutricionista do perfil — não confia em input.
async function authorizeNutritionist(studentId: string): Promise<AuthOk | AuthErr> {
  const user = await getSessionUser()
  if (!user) return { error: 'Não autenticado', status: 401 }

  const supabase = createServiceClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('nutritionist_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'Aluno não encontrado', status: 404 }

  const nutritionistId = student.nutritionist_id as string | null
  if (!nutritionistId) return { error: 'Aluno sem nutricionista vinculado', status: 400 }
  if (user.id !== nutritionistId) return { error: 'Acesso negado', status: 403 }

  return { supabase, nutritionistId }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params
    const auth = await authorizeNutritionist(studentId)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase } = auth

    const { url, secret } = edgeConfig()
    if (!url || !secret) {
      console.error('[kickoff] EDGE_GENERATE_DIET_URL/EDGE_SHARED_SECRET ausentes')
      return NextResponse.json({ error: 'Configuração da geração ausente' }, { status: 500 })
    }

    // Trava anti-duplo-disparo: já 'gerando' e não-stale → não redispara.
    const { data: current } = await supabase
      .from('diet_generation_status')
      .select('status, updated_at')
      .eq('student_id', studentId)
      .maybeSingle()
    if (current?.status === 'gerando') {
      const age = Date.now() - new Date(current.updated_at as string).getTime()
      if (age < STALE_MS) {
        return NextResponse.json({ status: 'gerando', alreadyRunning: true }, { status: 202 })
      }
    }

    // Marca 'gerando' já (o 1º poll da UI vê o spinner) e dispara a Edge.
    await supabase.from('diet_generation_status').upsert({
      student_id: studentId,
      status: 'gerando',
      plan_id: null,
      error: null,
      updated_at: new Date().toISOString(),
    })

    // A Edge responde 202 imediatamente (gera em background) → este await ~1s.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-edge-secret': secret },
      body: JSON.stringify({ studentId }),
    })

    if (!res.ok && res.status !== 202) {
      const detail = await res.text().catch(() => '')
      await supabase.from('diet_generation_status').upsert({
        student_id: studentId,
        status: 'erro',
        plan_id: null,
        error: `Edge ${res.status}: ${detail}`.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Falha ao disparar geração' }, { status: 502 })
    }

    return NextResponse.json({ status: 'gerando' }, { status: 202 })
  } catch (err) {
    console.error('[POST kickoff generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao iniciar geração' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params
    const auth = await authorizeNutritionist(studentId)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase } = auth

    const { data: row } = await supabase
      .from('diet_generation_status')
      .select('status, plan_id, error, updated_at')
      .eq('student_id', studentId)
      .maybeSingle()

    // Sem linha = nunca gerou → UI mostra o botão "Gerar plano".
    if (!row) return NextResponse.json({ status: null })

    const stale =
      row.status === 'gerando' &&
      Date.now() - new Date(row.updated_at as string).getTime() > STALE_MS

    return NextResponse.json({
      status: row.status,
      planId: row.plan_id ?? null,
      error: row.error ?? null,
      updatedAt: row.updated_at,
      stale,
    })
  } catch (err) {
    console.error('[GET status generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao consultar status' }, { status: 500 })
  }
}
