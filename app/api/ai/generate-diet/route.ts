import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { generatePlanFromPrompt } from '@/lib/ai/gemini'

export async function POST(req: NextRequest) {
  try {
    // 1. Exige sessão válida
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { prompt } = await req.json()

    // 2. As referências usadas são SEMPRE as do usuário da sessão.
    const supabase = createServiceClient()
    const plan = await generatePlanFromPrompt(prompt, user.id, supabase)

    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[Gemini generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao gerar plano com IA' }, { status: 500 })
  }
}
