import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usa service role para criar aluno (contorna RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

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
        nutritionist_id: data.nutritionist_id,
        role: 'aluno',
        status: 'ativo',
      })
      .select('*, subscriptions(*)')
      .single()

    if (error) {
      console.error('[POST /api/students] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(created)
  } catch (err) {
    console.error('[POST /api/students]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
