import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Super() {
  const navigate = useNavigate()
  const [restaurantes, setRestaurantes] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [direccion, setDireccion] = useState('')
  const [adminCelular, setAdminCelular] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDireccion, setEditDireccion] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function cargar() {
    api<any>('/api/super/restaurantes').then(d => setRestaurantes(d.restaurantes || [])).catch(() => {})
  }

  useEffect(cargar, [])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setResultado(null)
    try {
      const r = await api<any>('/api/super/restaurantes', {
        method: 'POST',
        body: JSON.stringify({ nombre, slug, direccion, adminCelular, adminNombre }),
      })
      setResultado(r)
      setNombre(''); setSlug(''); setDireccion(''); setAdminCelular(''); setAdminNombre('')
      cargar()
    } catch (e: any) {
      setError(e.message || 'Error al crear')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(r: any) {
    setEditId(r.id)
    setEditNombre(r.nombre)
    setEditSlug(r.slug)
    setEditDireccion(r.direccion || '')
    setEditTelefono(r.telefono || '')
  }

  async function saveEdit() {
    if (!editId) return
    try {
      await api(`/api/super/restaurantes/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: editNombre, slug: editSlug, direccion: editDireccion, telefono: editTelefono }),
      })
      setEditId(null)
      cargar()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function deleteRestaurante(id: number) {
    try {
      await api(`/api/super/restaurantes/${id}`, { method: 'DELETE' })
      setDeletingId(null)
      cargar()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <button onClick={() => { localStorage.clear(); navigate('/login') }} className="text-sm text-gray-400 hover:text-black">Cerrar sesión</button>
      </div>

      <button onClick={() => { setShowForm(!showForm); setResultado(null) }} className="bg-black text-white px-4 py-2 rounded-md text-sm">
        {showForm ? 'Cancelar' : 'Nuevo restaurante'}
      </button>

      {showForm && (
        <form onSubmit={crear} className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <input required placeholder="Slug (ej: mi-resto)" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" />
          </div>
          <input placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Admin celular" value={adminCelular} onChange={e => setAdminCelular(e.target.value.replace(/\D/g, ''))} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <input required placeholder="Admin nombre" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button disabled={submitting} className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white py-2 rounded-md text-sm">
            {submitting ? 'Creando...' : 'Crear restaurante'}
          </button>
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm space-y-1">
              <p className="text-green-700 font-medium">✓ Restaurante creado</p>
              <p>Admin: <strong>{resultado.admin.nombre}</strong> ({resultado.admin.celular})</p>
              <p>Contraseña temporal: <strong className="font-mono">{resultado.tempPassword}</strong></p>
              <p className="text-gray-500 text-xs">El admin debe cambiarla al primer login</p>
              <button onClick={() => {
                const txt = `Restaurante: ${resultado.restaurante.nombre}\nAdmin: ${resultado.admin.nombre}\nCelular: ${resultado.admin.celular}\nContraseña: ${resultado.tempPassword}`
                navigator.clipboard.writeText(txt)
              }} className="text-xs border border-green-300 text-green-700 rounded px-2 py-1 hover:bg-green-100 mt-1">
                Copiar credenciales
              </button>
            </div>
          )}
        </form>
      )}

      <div className="space-y-2">
        <p className="text-sm text-gray-500">{restaurantes.length} restaurante{restaurantes.length !== 1 ? 's' : ''}</p>
        {restaurantes.map(r => (
          editId === r.id ? (
            <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
              <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" placeholder="Nombre" />
              <div className="grid grid-cols-2 gap-2">
                <input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" placeholder="Slug" />
                <input value={editTelefono} onChange={e => setEditTelefono(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" placeholder="Teléfono" />
              </div>
              <input value={editDireccion} onChange={e => setEditDireccion(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400" placeholder="Dirección" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="bg-black text-white px-3 py-1.5 rounded-md text-sm">Guardar</button>
                <button onClick={() => setEditId(null)} className="text-gray-500 px-3 py-1.5 text-sm">Cancelar</button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="bg-white border border-gray-200 rounded-md p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.nombre}</p>
                <p className="text-xs text-gray-400 truncate">{r.slug} · {r.direccion || 'Sin dirección'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => startEdit(r)} className="text-xs text-gray-500 hover:text-black border border-gray-200 rounded px-2 py-0.5">Editar</button>
                {deletingId === r.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteRestaurante(r.id)} className="text-xs text-red-600 border border-red-200 rounded px-2 py-0.5">Confirmar</button>
                    <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingId(r.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-0.5">Eliminar</button>
                )}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
