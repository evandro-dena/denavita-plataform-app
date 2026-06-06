import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const nutriId = req.nextUrl.searchParams.get('nutri_id')
  if (!nutriId) return NextResponse.json([])

  const { data, error } = await supabase
    .from('ai_references')
    .select('*')
    .eq('nutri_id', nutriId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  // Busca o file_path para deletar do Storage
  const { data: ref } = await supabase
    .from('ai_references')
    .select('file_path')
    .eq('id', id)
    .single()

  if (ref?.file_path) {
    await supabase.storage.from('ai-references').remove([ref.file_path])
  }

  await supabase.from('ai_references').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
