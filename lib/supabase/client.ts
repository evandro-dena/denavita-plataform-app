import { createBrowserClient } from '@supabase/ssr'

// Variáveis de ambiente — crie .env.local com:
// NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton para uso em serviços client-side
export const supabase = createClient()
