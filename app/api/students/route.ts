import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Exige sessão válida
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const data = await req.json()

    // 2. O nutricionista é SEMPRE o usuário da sessão — ignora qualquer
    //    nutritionist_id vindo do body do cliente.
    const supabase = createServiceClient()
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        name: data.name,
        email: data.email,
        // Omite campos vazios para evitar erros de constraint
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.birth_date ? { birth_date: data.birth_date } : {}),
        ...(data.goal_label ? { goal_label: data.goal_label } : {}),
        ...(data.current_weight ? { current_weight: Number(data.current_weight) } : {}),
        ...(data.goal_weight ? { goal_weight: Number(data.goal_weight) } : {}),
        nutritionist_id: user.id,
        role: 'aluno',
        status: 'ativo',
      })
      .select('*, subscriptions(*)')
      .single()

    if (error) {
      console.error('[POST /api/students] DB error:', error)
      // Erro de email duplicado
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado na plataforma.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(created)
  } catch (err) {
    console.error('[POST /api/students]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
