import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { loadMeta, isUriValid, readPdfFromDisk, updateUri } from '@/lib/ai/references-store'

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Garante que cada referência tem um URI válido no Gemini (re-faz upload se expirou)
async function ensureValidUris() {
  const refs = loadMeta()
  const valid = []

  for (const ref of refs) {
    if (isUriValid(ref)) {
      valid.push(ref.geminiUri!)
      continue
    }
    // URI expirou — re-faz upload do PDF salvo no disco
    const buffer = readPdfFromDisk(ref.filename)
    if (!buffer) continue
    try {
      const ab = buffer.buffer as ArrayBuffer
      const blob = new Blob([ab.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], { type: 'application/pdf' })
      const uploaded = await client.files.upload({
        file: new File([blob], ref.name + '.pdf', { type: 'application/pdf' }),
        config: { displayName: ref.name },
      })
      if (uploaded.uri) {
        updateUri(ref.id, uploaded.uri)
        valid.push(uploaded.uri)
      }
    } catch {
      // Ignora se o re-upload falhar — segue sem esse arquivo
    }
  }

  return valid
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    // Busca URIs válidas dos PDFs de referência
    const referenceUris = await ensureValidUris()

    // Monta o conteúdo: PDFs de referência + prompt
    const contents: object[] = []

    if (referenceUris.length > 0) {
      // Instrução sobre como usar os PDFs
      contents.push({
        parts: [
          { text: `Você é uma nutricionista especializada. Use os ${referenceUris.length} plano(s) alimentar(es) abaixo como referência de estilo, formato e linguagem. Siga o mesmo padrão ao criar o novo plano.` },
          ...referenceUris.map(uri => ({
            fileData: { fileUri: uri, mimeType: 'application/pdf' }
          }))
        ]
      })
    }

    // Prompt principal com dados do aluno
    contents.push({ parts: [{ text: prompt }] })

    const response = await client.models.generateContent({
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
