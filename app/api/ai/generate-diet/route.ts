import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function getValidUris(nutriId?: string): Promise<string[]> {
  if (!nutriId) return []

  const supabase = createServiceClient()
  const { data: refs } = await supabase
    .from('ai_references')
    .select('*')
    .eq('nutri_id', nutriId)

  if (!refs?.length) return []

  const uris: string[] = []

  for (const ref of refs) {
    const now = new Date()
    const expires = ref.gemini_expires_at ? new Date(ref.gemini_expires_at) : null
    const isValid = expires && expires > now && ref.gemini_uri

    if (isValid) {
      uris.push(ref.gemini_uri)
      continue
    }

    // URI expirou — re-faz upload do PDF do Supabase Storage
    try {
      const { data: fileData } = await supabase.storage
        .from('ai-references')
        .download(ref.file_path)

      if (!fileData) continue

      const buffer = await fileData.arrayBuffer()
      const uploaded = await gemini.files.upload({
        file: new File([buffer], ref.name + '.pdf', { type: 'application/pdf' }),
        config: { displayName: ref.name },
      })

      if (uploaded.uri) {
        // Atualiza URI no banco
        await supabase.from('ai_references').update({
          gemini_uri: uploaded.uri,
          gemini_expires_at: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
        }).eq('id', ref.id)

        uris.push(uploaded.uri)
      }
    } catch {
      // Ignora se falhar — segue sem este arquivo
    }
  }

  return uris
}

export async function POST(req: NextRequest) {
  try {
    // 1. Exige sessão válida
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { prompt } = await req.json()

    // 2. As referências usadas são SEMPRE as do usuário da sessão —
    //    ignora qualquer nutri_id vindo do body.
    const referenceUris = await getValidUris(user.id)

    const contents: object[] = []

    if (referenceUris.length > 0) {
      contents.push({
        parts: [
          {
            text: `Você é uma nutricionista especializada. Use os ${referenceUris.length} plano(s) alimentar(es) abaixo como referência de estilo, formato e linguagem. Siga o mesmo padrão ao criar o novo plano.`
          },
          ...referenceUris.map(uri => ({
            fileData: { fileUri: uri, mimeType: 'application/pdf' }
          }))
        ]
      })
    }

    contents.push({ parts: [{ text: prompt }] })

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini não retornou JSON válido')

    const plan = JSON.parse(jsonMatch[0])
    return NextResponse.json({ plan })

  } catch (err) {
    console.error('[Gemini generate-diet]', err)
    return NextResponse.json({ error: 'Erro ao gerar plano com IA' }, { status: 500 })
  }
}
