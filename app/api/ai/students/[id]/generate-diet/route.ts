import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { generateDietForStudent } from '@/lib/ai/generate-and-persist'

// A geração pode levar ~1-2min (Gemini, com re-upload de PDFs de referência).
// maxDuration eleva o limite da função serverless (depende do plano Vercel:
// Hobby ~60s, Pro até 300s). Se exceder, a dieta não persiste.
export const maxDuration = 300

// Origens do PWA autorizadas a chamar esta rota (CSV em env).
// Ex.: PWA_ALLOWED_ORIGINS="https://denavita-app.vercel.app,https://app.denavita.com"
const ALLOWED_ORIGINS = (process.env.PWA_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  // Só ecoa a origem se estiver na allowlist (usamos Bearer, não cookies).
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

// Preflight CORS — o browser envia OPTIONS (sem Authorization) antes do POST.
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cors = corsHeaders(req.headers.get('origin'))
  try {
    const { id: studentId } = await params

    // 1. Exige sessão (cookie do nutricionista OU Bearer do aluno — Fase A)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401, headers: cors })
    }

    // 2. Deriva o nutricionista do perfil do aluno (não confia em input do cliente)
    const supabase = createServiceClient()
    const { data: student } = await supabase
      .from('profiles')
      .select('nutritionist_id')
      .eq('id', studentId)
      .single()
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404, headers: cors })
    }

    const nutritionistId = student.nutritionist_id as string | null
    if (!nutritionistId) {
      return NextResponse.json({ error: 'Aluno sem nutricionista vinculado' }, { status: 400, headers: cors })
    }

    // 3. Autorização: o próprio aluno OU o nutricionista dono
    if (user.id !== studentId && user.id !== nutritionistId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403, headers: cors })
    }

    // 4. Gera e persiste (diet_plans + meals + meal_items, source='ia', pendente)
    const { planId } = await generateDietForStudent({ studentId, nutritionistId }, supabase)
    return NextResponse.json({ planId }, { headers: cors })
  } catch (err) {
    console.error('[POST /api/ai/students/[id]/generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao gerar dieta' }, { status: 500, headers: cors })
  }
}
