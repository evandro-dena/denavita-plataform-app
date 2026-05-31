'use client'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfiguracoesPage() {
  const inputStyle = { background: '#1A1A1A', color: '#FFFFFF', borderRadius: '12px', borderColor: '#2A2A2A' }
  return (
    <div>
      <Topbar title="Configurações" subtitle="Perfil do nutricionista" />
      <div className="rounded-2xl border p-8 max-w-lg" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        <div className="flex flex-col gap-5">
          <div>
            <Label style={{ color: '#888888', fontSize: '13px' }}>Nome completo</Label>
            <Input defaultValue="Dr. Nutricionista" className="mt-1.5 border" style={inputStyle} />
          </div>
          <div>
            <Label style={{ color: '#888888', fontSize: '13px' }}>E-mail</Label>
            <Input type="email" defaultValue="nutri@denavita.com" className="mt-1.5 border" style={inputStyle} />
          </div>
          <div>
            <Label style={{ color: '#888888', fontSize: '13px' }}>CRN</Label>
            <Input defaultValue="CRN-3 12345" className="mt-1.5 border" style={inputStyle} />
          </div>
          <Button style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, alignSelf: 'flex-start', marginTop: '8px' }}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  )
}
