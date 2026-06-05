import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#1C1C1C' }}>
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
