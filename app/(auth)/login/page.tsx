'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error
      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Invalid login')) {
        toast.error('E-mail ou senha incorretos')
      } else {
        toast.error('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1C1C1C' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#C8FF00' }}>
            <Dumbbell size={28} style={{ color: '#1C1C1C' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>DenaVita</h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>Painel do Nutricionista</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-8 border" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>Entrar na plataforma</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <Label htmlFor="email" style={{ color: '#888888', fontSize: '13px' }}>E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="mt-1.5 border-0 focus-visible:ring-1"
                style={{ background: '#2F2F2F', color: '#FFFFFF', borderRadius: '12px' }}
                {...register('email')}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password" style={{ color: '#888888', fontSize: '13px' }}>Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10 border-0 focus-visible:ring-1"
                  style={{ background: '#2F2F2F', color: '#FFFFFF', borderRadius: '12px' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#888888' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 font-semibold text-sm mt-2"
              style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}
            >
              {loading ? 'Entrando...' : 'ENTRAR'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
