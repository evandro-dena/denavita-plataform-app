import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { addReference, savePdfToDisk, updateUri } from '@/lib/ai/references-store'

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const id = `ref_${Date.now()}`

    // 1. Salva o PDF no disco (persistência local)
    const filename = savePdfToDisk(id, buffer, file.name)

    // 2. Faz upload para a Gemini Files API
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const uploaded = await client.files.upload({
      file: new File([blob], file.name, { type: 'application/pdf' }),
      config: { displayName: file.name },
    })

    // 3. Salva metadados
    const expires = new Date()
    expires.setHours(expires.getHours() + 47)

    addReference({
      id,
      name: file.name.replace('.pdf', '').replace(/_/g, ' '),
      filename,
      geminiUri: uploaded.uri ?? null,
      uploadedAt: new Date().toISOString(),
      expiresAt: expires.toISOString(),
    })

    return NextResponse.json({ id, name: file.name, uri: uploaded.uri })

  } catch (err) {
    console.error('[upload-reference]', err)
    return NextResponse.json({ error: 'Erro ao processar o arquivo' }, { status: 500 })
  }
}
