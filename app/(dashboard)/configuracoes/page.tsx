'use client'
import { useState, useRef } from 'react'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { useNutriId } from '@/lib/hooks/useNutriId'

// ─── Types ────────────────────────────────────────────────────────
interface RefFile {
  id: string
  name: string
  file_path: string
  gemini_uri: string | null
  gemini_expires_at: string | null
  created_at: string
}

// ─── Reference File Card ─────────────────────────────────────────
function RefCard({ ref: r, onDelete }: { ref: RefFile; onDelete: () => void }) {
  const isValid = r.gemini_uri && r.gemini_expires_at && new Date(r.gemini_expires_at) > new Date()
  const expires = r.gemini_expires_at ? new Date(r.gemini_expires_at) : null

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border transition-all"
      style={{ background: '#1C1C1C', borderColor: isValid ? 'rgba(200,255,0,0.3)' : '#3D3D3D' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isValid ? 'rgba(200,255,0,0.1)' : '#2F2F2F' }}>
        <FileText size={18} style={{ color: isValid ? '#C8FF00' : '#555555' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
          {r.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {isValid ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#C8FF00' }}>
              <CheckCircle size={11} /> Ativo no Gemini
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#F59E0B' }}>
              <Clock size={11} /> Expira em breve (re-upload automático)
            </span>
          )}
          {expires && (
            <span className="text-xs" style={{ color: '#555555' }}>
              · até {expires.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all flex-shrink-0">
        <Trash2 size={14} style={{ color: '#EF4444' }} />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'ia'>('perfil')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const nutriId = useNutriId()

  const inputStyle = { background: '#262626', color: '#FFFFFF', borderRadius: '12px', borderColor: '#3D3D3D' }

  // Fetch reference files from Supabase via API
  const { data: refs = [], isLoading } = useQuery<RefFile[]>({
    queryKey: ['ai-references', nutriId],
    queryFn: () => fetch(`/api/ai/references?nutri_id=${nutriId}`).then(r => r.json()),
    enabled: activeTab === 'ia' && !!nutriId,
  })

  const deleteRef = useMutation({
    mutationFn: (id: string) => fetch('/api/ai/references', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-references'] }); toast.success('Referência removida.') },
  })

  async function uploadFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Apenas arquivos PDF são aceitos')
      return
    }
    if (!nutriId) { toast.error('Aguarde carregar...'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('nutri_id', nutriId)
      const res = await fetch('/api/ai/upload-reference', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      qc.invalidateQueries({ queryKey: ['ai-references'] })
      toast.success(`"${file.name.replace('.pdf', '')}" carregado! O Gemini vai usar este plano como referência.`)
    } catch {
      toast.error('Erro ao carregar o arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const TABS = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'ia',     label: '✦ IA & Referências' },
  ] as const

  return (
    <div>
      <Topbar title="Configurações" subtitle="Perfil e preferências da IA" />

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { background: '#C8FF00', color: '#1C1C1C', fontFamily: 'Poppins, sans-serif' }
              : { background: '#262626', color: '#888888' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Perfil ── */}
      {activeTab === 'perfil' && (
        <div className="rounded-2xl border p-8 max-w-lg" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
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
            <Button style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600, alignSelf: 'flex-start', marginTop: '8px' }}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}

      {/* ── IA & Referências ── */}
      {activeTab === 'ia' && (
        <div className="flex flex-col gap-6 max-w-2xl">

          {/* Explicação */}
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(200,255,0,0.04)', borderColor: 'rgba(200,255,0,0.2)' }}>
            <div className="flex items-start gap-3">
              <Sparkles size={18} style={{ color: '#C8FF00', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>
                  Como funciona
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#888888' }}>
                  Suba PDFs dos seus planos alimentares favoritos. O Gemini vai ler o estilo, formato e linguagem dos seus planos e replicar ao criar novas dietas para seus alunos.
                </p>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#555555' }}>Carregar plano de referência (PDF)</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all"
              style={{
                borderColor: dragging ? '#C8FF00' : '#3D3D3D',
                background: dragging ? 'rgba(200,255,0,0.04)' : '#1C1C1C',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
              {uploading ? (
                <>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'rgba(200,255,0,0.15)' }}>
                    <Sparkles size={20} style={{ color: '#C8FF00' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>Carregando para o Gemini...</p>
                    <p className="text-xs mt-1" style={{ color: '#555555' }}>Aguarde um momento</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#2F2F2F' }}>
                    <Upload size={22} style={{ color: '#888888' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                      {dragging ? 'Solte aqui!' : 'Clique ou arraste o PDF'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#555555' }}>Apenas arquivos .pdf</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de referências */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>
                Planos de referência ({refs.length})
              </p>
              {refs.length > 0 && (
                <p className="text-xs" style={{ color: '#555555' }}>
                  O Gemini re-faz o upload automaticamente quando expira
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="text-sm text-center py-6" style={{ color: '#555555' }}>Carregando...</div>
            ) : refs.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: '#1C1C1C', borderColor: '#3D3D3D' }}>
                <FileText size={32} className="mx-auto mb-2 opacity-20" style={{ color: '#888888' }} />
                <p className="text-sm" style={{ color: '#555555' }}>Nenhum plano de referência ainda.</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Suba um PDF acima para começar.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {refs.map(r => (
                  <RefCard key={r.id} ref={r} onDelete={() => deleteRef.mutate(r.id)} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
