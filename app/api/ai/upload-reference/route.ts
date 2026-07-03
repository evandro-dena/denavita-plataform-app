import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // 1. Exige sessão válida
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    // 2. Dono da referência é SEMPRE o usuário da sessão — ignora nutri_id do form.
    const nutriId = user.id

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Apenas PDF aceito' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const id = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    // 1. Upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ai-references')
      .upload(id, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    // 2. Faz upload para a Gemini Files API
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const uploaded = await gemini.files.upload({
      file: new File([blob], file.name, { type: 'application/pdf' }),
      config: { displayName: file.name },
    })

    // 3. Salva metadados no banco
    const { data: saved, error: dbError } = await supabase
      .from('ai_references')
      .insert({
        nutri_id: nutriId,
        name: file.name.replace('.pdf', '').replace(/_/g, ' '),
        file_path: id,
        gemini_uri: uploaded.uri,
        gemini_expires_at: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (dbError) throw new Error(dbError.message)

    return NextResponse.json({ id: (saved as Record<string, unknown>).id, name: file.name })

  } catch (err) {
    console.error('[upload-reference]', err)
    return NextResponse.json({ error: 'Erro ao processar o arquivo' }, { status: 500 })
  }
}
