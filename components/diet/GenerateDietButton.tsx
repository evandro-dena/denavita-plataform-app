'use client'
import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Botão "Gerar plano" (kickoff → Edge Function). 3 estados:
//   null    → "Gerar plano"
//   gerando → "Gerando..." (spinner, polling a cada 3s)
//   pronto  → "✓ Gerada" (e atualiza a lista de espera p/ aparecer Liberar/Ver dieta)
//   erro / timeout → "Tentar novamente"
// O TIMEOUT máximo usa o flag `stale` do GET (job 'gerando' há >3min = travado),
// então o polling para sozinho e nunca fica "Gerando..." pra sempre.

type GenStatusResp = {
  status: 'gerando' | 'pronto' | 'erro' | null
  planId?: string | null
  error?: string | null
  stale?: boolean
}

async function getStatus(studentId: string): Promise<GenStatusResp> {
  const res = await fetch(`/api/ai/students/${studentId}/generate-diet`)
  if (!res.ok) throw new Error('Falha ao consultar status')
  return res.json()
}

const BTN = {
  borderRadius: '10px',
  fontSize: '12px',
  height: '30px',
  padding: '0 10px',
  fontFamily: 'Poppins, sans-serif' as const,
}

export function GenerateDietButton({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const notified = useRef<string | null>(null)

  const { data, refetch } = useQuery({
    queryKey: ['diet-gen-status', studentId],
    queryFn: () => getStatus(studentId),
    refetchOnWindowFocus: false,
    // Polla enquanto 'gerando' e não-stale; para no pronto/erro/stale (timeout).
    refetchInterval: (query) => {
      const d = query.state.data as GenStatusResp | undefined
      return d?.status === 'gerando' && !d?.stale ? 3000 : false
    },
  })

  const start = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ai/students/${studentId}/generate-diet`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Falha ao iniciar geração')
      return body as GenStatusResp
    },
    onSuccess: () => {
      notified.current = null // libera novas notificações desta rodada
      refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const status = data?.status ?? null
  const timedOut = status === 'gerando' && !!data?.stale
  const generating = start.isPending || (status === 'gerando' && !timedOut)
  const failed = status === 'erro' || timedOut

  // Transições → toast (uma vez) e, no pronto, atualiza a lista de espera.
  useEffect(() => {
    if (status === 'pronto' && notified.current !== 'pronto') {
      notified.current = 'pronto'
      toast.success('Dieta gerada! Já aparece na aba Nutrição.')
      qc.invalidateQueries({ queryKey: ['needs-diet-review'] })
      qc.invalidateQueries({ queryKey: ['pending-plan-map'] })
      qc.invalidateQueries({ queryKey: ['diet-plans-all'] })
    } else if (status === 'erro' && notified.current !== 'erro') {
      notified.current = 'erro'
      toast.error('Falha ao gerar a dieta. Tente novamente.')
    } else if (timedOut && notified.current !== 'timeout') {
      notified.current = 'timeout'
      toast.error('A geração demorou demais. Tente novamente.')
    }
  }, [status, timedOut, qc])

  if (generating) {
    return (
      <Button size="sm" disabled
        style={{ ...BTN, background: 'rgba(200,255,0,0.1)', color: '#C8FF00', fontWeight: 600 }}>
        <Loader2 size={13} className="mr-1.5 animate-spin" /> Gerando...
      </Button>
    )
  }

  if (failed) {
    return (
      <Button size="sm" onClick={() => start.mutate()} title={data?.error ?? undefined}
        style={{ ...BTN, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
        <RefreshCw size={13} className="mr-1.5" /> Tentar novamente
      </Button>
    )
  }

  if (status === 'pronto') {
    return (
      <Button size="sm" disabled
        style={{ ...BTN, background: 'rgba(200,255,0,0.12)', color: '#C8FF00', fontWeight: 700 }}>
        ✓ Gerada
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={() => start.mutate()}
      style={{ ...BTN, background: '#C8FF00', color: '#1C1C1C', fontWeight: 700 }}>
      <Sparkles size={13} className="mr-1.5" /> Gerar plano
    </Button>
  )
}
