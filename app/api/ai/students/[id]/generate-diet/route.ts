import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { generateDietForStudent } from '@/lib/ai/generate-and-persist'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params

    // 1. Exige sessão (cookie do nutricionista OU Bearer do aluno — Fase A)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Deriva o nutricionista do perfil do aluno (não confia em input do cliente)
    const supabase = createServiceClient()
    const { data: student } = await supabase
      .from('profiles')
      .select('nutritionist_id')
      .eq('id', studentId)
      .single()
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    const nutritionistId = student.nutritionist_id as string | null
    if (!nutritionistId) {
      return NextResponse.json({ error: 'Aluno sem nutricionista vinculado' }, { status: 400 })
    }

    // 3. Autorização: o próprio aluno OU o nutricionista dono
    if (user.id !== studentId && user.id !== nutritionistId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 4. Gera e persiste (diet_plans + meals + meal_items, source='ia')
    const { planId } = await generateDietForStudent({ studentId, nutritionistId }, supabase)
    return NextResponse.json({ planId })
  } catch (err) {
    console.error('[POST /api/ai/students/[id]/generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao gerar dieta' }, { status: 500 })
  }
}
