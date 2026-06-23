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
// Erros transitórios do Gemini que VALE retentar: 503/UNAVAILABLE (sobrecarga)
// e 429/RESOURCE_EXHAUSTED (rate limit). NÃO inclui erros definitivos como
// 400/API_KEY_INVALID, 401/403 (auth) ou prompt rejeitado — esses falham na hora.
function isTransientGeminiError(err: unknown): boolean {
  const e = err as { status?: number; code?: number; message?: string }
  const code = e?.status ?? e?.code
  if (code === 503 || code === 429) return true
  // O @google/genai lança ApiError com JSON na message: {"error":{"code":503,"status":"UNAVAILABLE"}}
  const msg = String(e?.message ?? err)
  if (/"code"\s*:\s*(503|429)\b/.test(msg)) return true
  if (/\b(UNAVAILABLE|RESOURCE_EXHAUSTED)\b/.test(msg)) return true
  if (/overloaded|high demand|try again later|temporarily/i.test(msg)) return true
  return false
}

// Backoff entre tentativas (ms). 3 tentativas no total; soma das esperas = 6s.
// Somado a ~68s de uma geração bem-sucedida, cabe folgado no wall-clock da Edge
// (150s no Free). Falhas 503 retornam rápido, então o pior caso fica bem abaixo.
const RETRY_BACKOFFS_MS = [2000, 4000]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function generateContentWithRetry(contents: object[]) {
  const maxAttempts = RETRY_BACKOFFS_MS.length + 1 // 3
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await gemini.models.generateContent({ model: 'gemini-2.5-flash', contents })
    } catch (err) {
      lastErr = err
      // Definitivo OU última tentativa → falha agora (sem insistir).
      if (!isTransientGeminiError(err) || attempt === maxAttempts) throw err
      const wait = RETRY_BACKOFFS_MS[attempt - 1]
      console.warn(`[gemini] tentativa ${attempt}/${maxAttempts} falhou (transitório); retry em ${wait}ms`)
      await sleep(wait)
    }
  }
  throw lastErr
}

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

  const response = await generateContentWithRetry(contents)

  const text = response.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini não retornou JSON válido')

  return JSON.parse(jsonMatch[0])
}
