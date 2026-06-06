'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Retorna o ID do nutricionista logado
// Enquanto carrega, retorna null
export function useNutriId(): string | null {
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setId(data.user?.id ?? null)
    })
  }, [])

  return id
}
