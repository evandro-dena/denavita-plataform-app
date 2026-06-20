import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// Cliente ligado aos cookies da requisição (anon key → respeita RLS).
// Use APENAS para identificar o usuário autenticado via auth.getUser().
// NUNCA use para operações privilegiadas.
export async function createSessionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Em route handlers o Supabase pode rotacionar o token de sessão.
          // Se o contexto não permitir escrita de cookie, apenas ignoramos.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* contexto somente-leitura — ok ignorar */
          }
        },
      },
    }
  )
}

// Cliente service role — BYPASSA RLS.
// Só pode ser usado depois de validar sessão e ownership manualmente.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Retorna o usuário autenticado da sessão (JWT validado no servidor de Auth)
// ou null se não houver sessão válida. auth.getUser() valida o token no
// servidor — não confiar em getSession()/cookie decodificado.
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}
