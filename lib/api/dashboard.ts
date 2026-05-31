import { DashboardStats, Subscription } from '@/types'
import { MOCK_DASHBOARD, MOCK_STUDENTS } from './mock-data'

export const dashboardService = {
  async getStats(nutritionistId: string): Promise<DashboardStats> {
    // TODO: conectar Supabase
    void nutritionistId
    await new Promise(r => setTimeout(r, 400))
    return MOCK_DASHBOARD
  },
}

export const subscriptionService = {
  async list(nutritionistId: string): Promise<Subscription[]> {
    // TODO: conectar Supabase
    void nutritionistId
    await new Promise(r => setTimeout(r, 300))
    return MOCK_STUDENTS.filter(s => s.subscription).map(s => s.subscription!)
  },

  async renew(subscriptionId: string, months: number): Promise<void> {
    // TODO: conectar Supabase
    void subscriptionId
    void months
    await new Promise(r => setTimeout(r, 300))
  },
}
