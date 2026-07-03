import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function GET() {
  // 1. Exige sessão válida
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Escopo derivado da sessão — ignora qualquer nutri_id da query.
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('ai_references')
    .select('*')
    .eq('nutri_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  // 1. Exige sessão válida
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = createServiceClient()

  // 2. Carrega o recurso e confirma que pertence ao usuário da sessão.
  //    maybeSingle(): 0 linhas → { data: null, error: null } (404 limpo),
  //    sem gerar o erro PGRST116/406 que o .single() produziria.
  const { data: ref } = await supabase
    .from('ai_references')
    .select('nutri_id, file_path')
    .eq('id', id)
    .maybeSingle()

  if (!ref) return NextResponse.json({ error: 'Referência não encontrada' }, { status: 404 })
  if (ref.nutri_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // 3. Só agora executa as operações privilegiadas.
  if (ref.file_path) {
    await supabase.storage.from('ai-references').remove([ref.file_path])
  }

  await supabase.from('ai_references').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
