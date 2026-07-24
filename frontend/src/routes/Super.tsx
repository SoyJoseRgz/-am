import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { api, clearAppData } from '../services/api'

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
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <Button variant="ghost" size="sm" onClick={() => { clearAppData(); navigate('/login') }} className="text-muted-foreground/60 hover:text-foreground">Cerrar sesión</Button>
      </div>

      <Button onClick={() => { setShowForm(!showForm); setResultado(null) }}>
        {showForm ? 'Cancelar' : 'Nuevo restaurante'}
      </Button>

      {showForm && (
        <form onSubmit={crear} className="bg-muted border border-border rounded-md p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" />
            <input required placeholder="Slug (ej: mi-resto)" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" />
          </div>
          <input placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" />
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Admin celular" value={adminCelular} onChange={e => setAdminCelular(e.target.value.replace(/\D/g, ''))} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" />
            <input required placeholder="Admin nombre" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creando...' : 'Crear restaurante'}
          </Button>
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm space-y-1">
              <p className="text-green-700 font-medium">✓ Restaurante creado</p>
              <p>Admin: <strong>{resultado.admin.nombre}</strong> ({resultado.admin.celular})</p>
              <p>Contraseña temporal: <strong className="font-mono">{resultado.tempPassword}</strong></p>
              <p className="text-muted-foreground text-xs">El admin debe cambiarla al primer login</p>
              <Button variant="outline" size="xs" onClick={() => {
                const txt = `Restaurante: ${resultado.restaurante.nombre}\nAdmin: ${resultado.admin.nombre}\nCelular: ${resultado.admin.celular}\nContraseña: ${resultado.tempPassword}`
                navigator.clipboard.writeText(txt)
              }} className="text-green-700 border-green-300 hover:bg-green-100 mt-1">
                Copiar credenciales
              </Button>
            </div>
          )}
        </form>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{restaurantes.length} restaurante{restaurantes.length !== 1 ? 's' : ''}</p>
        {restaurantes.map(r => (
          editId === r.id ? (
            <div key={r.id} className="bg-muted border border-border rounded-md p-3 space-y-2">
              <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" placeholder="Nombre" />
              <div className="grid grid-cols-2 gap-2">
                <input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" placeholder="Slug" />
                <input value={editTelefono} onChange={e => setEditTelefono(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" placeholder="Teléfono" />
              </div>
              <input value={editDireccion} onChange={e => setEditDireccion(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-muted-foreground" placeholder="Dirección" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>Guardar</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="bg-white border border-border rounded-md p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.nombre}</p>
                <p className="text-xs text-muted-foreground/60 truncate">{r.slug} · {r.direccion || 'Sin dirección'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </span>
                <Button variant="outline" size="xs" onClick={() => startEdit(r)}>Editar</Button>
                {deletingId === r.id ? (
                  <div className="flex gap-1">
                    <Button variant="outline" size="xs" className="text-red-600 border-red-200" onClick={() => deleteRestaurante(r.id)}>Confirmar</Button>
                    <Button variant="outline" size="xs" onClick={() => setDeletingId(null)}>No</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="xs" className="text-red-500 hover:text-red-700 border-red-200" onClick={() => setDeletingId(r.id)}>Eliminar</Button>
                )}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
