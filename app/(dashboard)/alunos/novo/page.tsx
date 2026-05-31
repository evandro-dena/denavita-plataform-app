'use client'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { studentService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type FormData = {
  name: string
  email: string
  phone?: string
  birth_date?: string
  goal_label: string
  current_weight?: string
  goal_weight?: string
}

function required(val: string | undefined) {
  return (val && val.trim().length > 0) || 'Campo obrigatório'
}

const GOALS = ['Perder gordura', 'Ganhar massa muscular', 'Manter peso', 'Melhorar performance', 'Saúde e qualidade de vida']

export default function NovoAlunoPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>()

  const create = useMutation({
    mutationFn: (data: FormData) => studentService.create({
      ...data,
      nutritionist_id: 'nutri-1',
      current_weight: data.current_weight ? parseFloat(data.current_weight) : undefined,
      goal_weight: data.goal_weight ? parseFloat(data.goal_weight) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Aluno cadastrado com sucesso!')
      router.push('/alunos')
    },
    onError: () => toast.error('Erro ao cadastrar aluno'),
  })

  const onSubmit: SubmitHandler<FormData> = (data) => create.mutate(data)

  const inputStyle = { background: '#1A1A1A', color: '#FFFFFF', borderRadius: '12px', borderColor: '#2A2A2A' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/alunos">
          <button className="p-2 rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} style={{ color: '#888888' }} />
          </button>
        </Link>
        <Topbar title="Novo aluno" subtitle="Preencha os dados do aluno" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border p-8 max-w-2xl" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <Label style={{ color: '#888888', fontSize: '13px' }}>Nome completo *</Label>
              <Input placeholder="Nome do aluno" className="mt-1.5 border" style={inputStyle}
                {...register('name', { validate: required })} />
              {errors.name && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.name.message as string}</p>}
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>E-mail *</Label>
              <Input type="email" placeholder="email@exemplo.com" className="mt-1.5 border" style={inputStyle}
                {...register('email', { required: 'E-mail obrigatório', pattern: { value: /\S+@\S+\.\S+/, message: 'E-mail inválido' } })} />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.email.message as string}</p>}
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>Telefone</Label>
              <Input placeholder="(11) 99999-9999" className="mt-1.5 border" style={inputStyle} {...register('phone')} />
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>Data de nascimento</Label>
              <Input type="date" className="mt-1.5 border" style={inputStyle} {...register('birth_date')} />
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>Objetivo *</Label>
              <Select onValueChange={(v: string | null) => setValue('goal_label', v ?? '')}>
                <SelectTrigger className="mt-1.5 border" style={{ ...inputStyle, minHeight: '40px' }}>
                  <SelectValue placeholder="Selecionar objetivo" />
                </SelectTrigger>
                <SelectContent style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '12px' }}>
                  {GOALS.map(g => (
                    <SelectItem key={g} value={g} style={{ color: '#FFFFFF' }}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.goal_label && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.goal_label.message as string}</p>}
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>Peso atual (kg)</Label>
              <Input type="number" step="0.1" placeholder="70.5" className="mt-1.5 border" style={inputStyle} {...register('current_weight')} />
            </div>
            <div>
              <Label style={{ color: '#888888', fontSize: '13px' }}>Peso meta (kg)</Label>
              <Input type="number" step="0.1" placeholder="65.0" className="mt-1.5 border" style={inputStyle} {...register('goal_weight')} />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Link href="/alunos">
              <Button variant="outline" type="button" style={{ borderRadius: '12px', borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={create.isPending}
              style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              {create.isPending ? 'Cadastrando...' : 'Cadastrar aluno'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
