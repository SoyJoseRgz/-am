import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { connectToMesa, socket } from '../services/socket'
import MenuDigital from './MenuDigital'

interface MesaData {
  id: number
  numero: number
  estado: string
}

interface Comensal {
  usuario_id: number
  nombre: string
  celular: string
}

export default function Mesa() {
  const { restauranteId, mesaId } = useParams()
  const navigate = useNavigate()
  const [mesa, setMesa] = useState<MesaData | null>(null)
  const [comensales, setComensales] = useState<Comensal[]>([])
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoInvitacion, setCodigoInvitacion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [needsCode, setNeedsCode] = useState(false)
  const [joinAttempted, setJoinAttempted] = useState(false)

  const join = useCallback(async (codigo?: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      navigate(`/login?redirect=/m/${restauranteId}/${mesaId}`)
      return
    }

    setLoading(true)
    setError('')
    setJoinAttempted(true)

    try {
      const data = await api('/api/mesas/' + mesaId + '/join', {
        method: 'POST',
        body: JSON.stringify({ restaurante_id: Number(restauranteId), codigo: codigo || undefined }),
      }) as any

      setMesa(data.mesa)
      if (data.codigo_invitacion) {
        setCodigoInvitacion(data.codigo_invitacion)
      }
      connectToMesa(Number(restauranteId), Number(mesaId))
    } catch (e: any) {
      if (e.message === 'Código de invitación requerido') {
        setNeedsCode(true)
        setLoading(false)
        return
      }
      setError(e.message || 'Error al unirse')
    } finally {
      setLoading(false)
    }
  }, [restauranteId, mesaId, navigate])

  useEffect(() => {
    join()

    socket.on('comensal:unido', () => {
      api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId)
        .then((d: any) => setComensales(d.comensales || []))
    })

    return () => { socket.off('comensal:unido') }
  }, [join, mesaId, restauranteId])

  useEffect(() => {
    if (!mesa) return
    api('/api/mesas/' + mesaId + '?restaurante_id=' + restauranteId)
      .then((d: any) => setComensales(d.comensales || []))
  }, [mesa])

  if (loading && !joinAttempted) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <p className="text-gray-500">Uniéndote a la mesa...</p>
      </div>
    )
  }

  if (error && !mesa && !needsCode) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-black">← Volver</button>
      </div>
    )
  }

  if (needsCode && !mesa) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full space-y-4">
          <h2 className="text-xl font-bold text-center">Unirse a mesa</h2>
          <p className="text-gray-500 text-sm text-center">Ingresa el código de invitación de 4 dígitos</p>
          <input
            type="text" maxLength={4} placeholder="0000"
            value={codigoInput}
            onChange={e => setCodigoInput(e.target.value.replace(/\D/g, ''))}
            className="w-full p-4 rounded-md bg-gray-50 border border-gray-200 focus:border-gray-400 outline-none text-center font-mono text-2xl tracking-widest"
          />
          <button
            onClick={() => join(codigoInput)}
            disabled={codigoInput.length !== 4}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 p-3 rounded-md font-semibold transition text-white"
          >
            Unirse
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      </div>
    )
  }

  if (!mesa) return null

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mesa {mesa.numero}</h1>
            <p className="text-gray-500 text-sm">{estadoLabel(mesa.estado)}</p>
          </div>
          <button
            onClick={() => { localStorage.clear(); navigate('/login') }}
            className="text-sm text-gray-400 hover:text-black"
          >
            Cerrar sesión
          </button>
        </div>

        {codigoInvitacion && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Código de invitación</p>
            <p className="text-4xl font-mono font-bold tracking-widest">{codigoInvitacion}</p>
            <p className="text-gray-400 text-xs mt-2">Compártelo con los demás comensales</p>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-700">Comensales</h2>
          {comensales.length === 0 && <p className="text-gray-400 text-sm">Esperando comensales...</p>}
          {comensales.map(c => (
            <div key={c.usuario_id} className="bg-white border border-gray-200 rounded-md p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">{c.nombre[0]}</div>
              <span>{c.nombre}</span>
            </div>
          ))}
        </div>

        <MenuDigital restauranteId={restauranteId!} />
      </div>
    </div>
  )
}

function estadoLabel(estado: string) {
  const map: Record<string, string> = {
    libre: 'Libre',
    ocupada: 'Ocupada',
    unida: 'Unida',
    limpiando: 'Limpiando',
  }
  return map[estado] || estado
}
