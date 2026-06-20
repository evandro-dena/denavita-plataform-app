// Porte (Deno) de lib/ai/gemini.ts — refs do nutricionista + geração via Gemini.
import { GoogleGenAI } from 'npm:@google/genai@^2.8.0'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const gemini = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })

// Resolve as URIs válidas das referências (PDFs) do nutricionista no Gemini,
// re-fazendo upload a partir do Storage quando a URI expirou.
export async function getValidUris(
  nutriId: string | undefined,
  supabase: SupabaseClient,
): Promise<string[]> {
  if (!nutriId) return []

  const { data: refs } = await supabase.from('ai_references').select('*').eq('nutri_id', nutriId)
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
      const { data: fileData } = await supabase.storage.from('ai-references').download(ref.file_path)
      if (!fileData) continue

      const buffer = await fileData.arrayBuffer()
      const uploaded = await gemini.files.upload({
        file: new File([buffer], ref.name + '.pdf', { type: 'application/pdf' }),
        config: { displayName: ref.name },
      })

      if (uploaded.uri) {
        await supabase
          .from('ai_references')
          .update({
            gemini_uri: uploaded.uri,
            gemini_expires_at: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', ref.id)

        uris.push(uploaded.uri)
      }
    } catch {
      // Ignora se falhar — segue sem este arquivo
    }
  }

  return uris
}

// Gera o plano alimentar via Gemini a partir de um prompt pronto, usando as
// referências do nutricionista como contexto. Retorna o JSON parseado.
export async function generatePlanFromPrompt(
  prompt: string,
  nutriId: string | undefined,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  const referenceUris = await getValidUris(nutriId, supabase)

  const contents: object[] = []

  if (referenceUris.length > 0) {
    contents.push({
      parts: [
        {
          text: `Você é uma nutricionista especializada. Use os ${referenceUris.length} plano(s) alimentar(es) abaixo como referência de estilo, formato e linguagem. Siga o mesmo padrão ao criar o novo plano.`,
        },
        ...referenceUris.map((uri) => ({
          fileData: { fileUri: uri, mimeType: 'application/pdf' },
        })),
      ],
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

  return JSON.parse(jsonMatch[0])
}
