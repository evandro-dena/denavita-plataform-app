import { Campaign } from '@/types'

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    name: 'Registro de Peso — Toda Sexta',
    type: 'peso_feedback',
    channels: ['whatsapp', 'app'],
    audience: 'todos',
    audience_count: 3,
    status: 'agendado',
    schedule_type: 'recorrente',
    recurrence: 'semanal',
    recurrence_weekday: 5,
    recurrence_time: '08:00',
    whatsapp_message: 'Bom dia! 👋\n\nHora do check-in semanal! 📊\n\nEnvie seu peso em jejum de hoje e um feedback de como foi a semana:\n- Como você se sentiu?\n- Seguiu o plano?\n- Alguma dificuldade?\n\nSeu progresso é fundamental! 💪',
    push_title: 'Check-in semanal ⚖️',
    push_body: 'Hora de registrar seu peso e compartilhar seu feedback da semana!',
    created_at: '2025-05-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Lembrete de Vencimento — 7 dias',
    type: 'vencimento',
    channels: ['whatsapp', 'app'],
    audience: 'vencendo_7d',
    audience_count: 1,
    status: 'agendado',
    schedule_type: 'recorrente',
    recurrence: 'diario',
    recurrence_time: '10:00',
    whatsapp_message: 'Olá! 👋\n\nSeu plano DenaVita vence em 7 dias.\n\nRenove agora e continue com seu plano alimentar personalizado e suporte contínuo! 💚\n\nAcesse o app para renovar com desconto exclusivo.',
    push_title: 'Seu plano vence em 7 dias ⏰',
    push_body: 'Renove agora e mantenha seu progresso sem interrupção.',
    created_at: '2025-05-10T00:00:00Z',
  },
  {
    id: 'c3',
    name: 'Promoção Semestral — Junho',
    type: 'promocao',
    channels: ['whatsapp', 'app'],
    audience: 'todos',
    audience_count: 3,
    status: 'enviado',
    schedule_type: 'agendado',
    scheduled_at: '2025-06-01T09:00:00Z',
    whatsapp_message: '🎉 Junho chegou com promoção especial!\n\nAtualize seu plano para SEMESTRAL e ganhe:\n✅ 2 meses grátis\n✅ Consulta de revisão gratuita\n✅ Acesso ao grupo exclusivo\n\nPromoção válida até 30/06. Use o código: JUNHO25',
    push_title: 'Promoção especial de Junho! 🎉',
    push_body: 'Plano semestral com 2 meses grátis. Código: JUNHO25',
    sent_count: 3,
    open_rate: 87,
    created_at: '2025-05-28T00:00:00Z',
    sent_at: '2025-06-01T09:00:00Z',
  },
  {
    id: 'c4',
    name: 'Cupom Suplementos DenaVita',
    type: 'cupom',
    channels: ['whatsapp', 'app'],
    audience: 'melhores_resultados',
    audience_count: 2,
    status: 'enviado',
    schedule_type: 'imediato',
    whatsapp_message: '🏷️ Presente exclusivo para você!\n\nComo um dos nossos alunos com melhores resultados, você ganhou um cupom de 20% OFF na loja DenaVita Suplementos!\n\nCódigo: RESULTADO20\n\nVálido até 31/07 em compras acima de R$150.\n\nAproveite! 🛍️',
    push_title: 'Cupom exclusivo para você 🎁',
    push_body: '20% OFF na loja DenaVita Suplementos. Código: RESULTADO20',
    sent_count: 2,
    open_rate: 100,
    created_at: '2025-05-15T00:00:00Z',
    sent_at: '2025-05-15T14:00:00Z',
  },
  {
    id: 'c5',
    name: 'Dica da Semana — Hidratação',
    type: 'dica',
    channels: ['app'],
    audience: 'todos',
    audience_count: 3,
    status: 'rascunho',
    schedule_type: 'agendado',
    scheduled_at: '2025-06-09T08:00:00Z',
    whatsapp_message: '',
    push_title: 'Dica da semana 💧',
    push_body: 'Beber 2L de água por dia acelera o metabolismo em até 30%. Confira no app como calcular sua hidratação ideal!',
    created_at: '2025-06-04T00:00:00Z',
  },
]

export const campaignService = {
  async list(): Promise<Campaign[]> {
    await new Promise(r => setTimeout(r, 300))
    return [...MOCK_CAMPAIGNS]
  },

  async create(data: Partial<Campaign>): Promise<Campaign> {
    await new Promise(r => setTimeout(r, 400))
    const campaign: Campaign = {
      id: String(Date.now()),
      name: '',
      type: 'personalizada',
      channels: ['whatsapp'],
      audience: 'todos',
      audience_count: 0,
      status: 'rascunho',
      schedule_type: 'imediato',
      whatsapp_message: '',
      push_title: '',
      push_body: '',
      created_at: new Date().toISOString(),
      ...data,
    }
    MOCK_CAMPAIGNS.unshift(campaign)
    return campaign
  },

  async update(id: string, data: Partial<Campaign>): Promise<void> {
    await new Promise(r => setTimeout(r, 300))
    const idx = MOCK_CAMPAIGNS.findIndex(c => c.id === id)
    if (idx >= 0) MOCK_CAMPAIGNS[idx] = { ...MOCK_CAMPAIGNS[idx], ...data }
  },

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 200))
    const idx = MOCK_CAMPAIGNS.findIndex(c => c.id === id)
    if (idx >= 0) MOCK_CAMPAIGNS.splice(idx, 1)
  },

  async send(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 800))
    const idx = MOCK_CAMPAIGNS.findIndex(c => c.id === id)
    if (idx >= 0) {
      MOCK_CAMPAIGNS[idx].status = 'enviado'
      MOCK_CAMPAIGNS[idx].sent_at = new Date().toISOString()
      MOCK_CAMPAIGNS[idx].sent_count = MOCK_CAMPAIGNS[idx].audience_count
    }
  },
}
