import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Equivalente ao Python:
// from google import genai
// client = genai.Client()
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    // Equivalente ao Python:
    // response = client.models.generate_content(model="gemini-3.5-flash", contents="...")
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    // Equivalente ao Python: response.text
    const text = response.text ?? ''

    // Extrai o JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini não retornou JSON válido')

    const plan = JSON.parse(jsonMatch[0])
    return NextResponse.json({ plan })

  } catch (err) {
    console.error('[Gemini] Erro ao gerar plano:', err)
    return NextResponse.json({ error: 'Erro ao gerar plano com IA' }, { status: 500 })
  }
}
