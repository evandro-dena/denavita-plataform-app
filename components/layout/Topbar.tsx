interface TopbarProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: '#888888' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
