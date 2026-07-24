import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { api, getCurrentUser } from '../services/api'

export default function ForcePasswordChange() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true)
    setError('')
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ celular: user.celular, otp: '000000', newPassword, restaurante_id: user.restaurante_id }),
      })
      localStorage.setItem('user', JSON.stringify({ ...user, force_password_change: false }))
      const destino = user.rol === 'admin' ? '/admin' : user.rol === 'mesero' ? '/dashboard' : '/cocina'
      navigate(destino, { replace: true })
    } catch (e: any) {
      setError(e.message || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">Cambiar contraseña</h2>
        <p className="text-muted-foreground text-sm text-center">Es la primera vez que inicias sesión. Cambia tu contraseña.</p>
        <input type="password" placeholder="Nueva contraseña (mín. 6 caracteres)" value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full p-3 rounded-md bg-muted border border-border focus:border-muted-foreground outline-none" />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full p-3 h-auto font-semibold">
          {loading ? 'Cambiando...' : 'Cambiar contraseña'}
        </Button>
      </form>
    </div>
  )
}
