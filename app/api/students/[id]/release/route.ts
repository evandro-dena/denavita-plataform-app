import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params

    // 1. Exige sessão válida
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: student } = await supabase
      .from('profiles')
      .select('nutritionist_id')
      .eq('id', studentId)
      .single()
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    // 2. OWNERSHIP (crítico): só o nutricionista DONO libera. A RPC é security
    //    definer e não checa dono internamente — este guard é a única barreira.
    if (student.nutritionist_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Liberação transacional (ativa plano + limpa pendente + status ativo)
    const { error } = await supabase.rpc('release_student', { p_student_id: studentId })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/students/[id]/release]', err)
    return NextResponse.json({ error: 'Erro ao liberar aluno' }, { status: 500 })
  }
}
