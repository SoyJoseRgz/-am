import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { api } from '../../services/api'

interface Staff {
  id: number; nombre: string; celular: string; rol: string; created_at: string
}

export default function AdminStaff() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('mesero')
  const [editId, setEditId] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    try {
      setStaff(await api<Staff[]>('/api/admin/staff'))
    } catch (e: any) {
      console.error('Error al cargar staff', e)
    }
  }
  useEffect(() => { load() }, [])

  async function save() {
    try {
      if (editId) {
        await api(`/api/admin/staff/${editId}`, { method: 'PUT', body: JSON.stringify({ nombre, rol }) })
        setMsg('Staff actualizado')
      } else {
        await api('/api/admin/staff', { method: 'POST', body: JSON.stringify({ nombre, celular, password, rol }) })
        setMsg('Staff creado')
      }
      reset(); load()
    } catch (e: any) {
      setMsg(e.message || 'Error al guardar')
    }
  }

  async function del(id: number) {
    if (!confirm('Eliminar staff?')) return
    try {
      await api(`/api/admin/staff/${id}`, { method: 'DELETE' })
      setMsg('Eliminado'); load()
    } catch (e: any) {
      console.error('Error al eliminar staff', e)
    }
  }

  function reset() { setNombre(''); setCelular(''); setPassword(''); setRol('mesero'); setEditId(null) }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Staff</h2>
      {msg && <p className={`mb-2 text-sm ${msg.includes('Error') || msg.includes('registrado') ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>}

      <div className="bg-white border border-border rounded-md p-4 space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="bg-muted border border-border rounded-md px-4 py-2" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input className="bg-muted border border-border rounded-md px-4 py-2" placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)} disabled={!!editId} />
          {!editId && <input className="bg-muted border border-border rounded-md px-4 py-2" placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />}
          <select className="bg-muted border border-border rounded-md px-4 py-2" value={rol} onChange={e => setRol(e.target.value)}>
            <option value="mesero">Mesero</option>
            <option value="cocina">Cocina</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>{editId ? 'Actualizar' : 'Agregar'}</Button>
          {editId && <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>}
        </div>
      </div>

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="bg-white border border-border rounded-md px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <span className="font-medium">{s.nombre}</span>
              <span className="text-muted-foreground text-sm ml-3">{s.celular}</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground/80">{s.rol}</span>
            <Button variant="ghost" size="xs" onClick={() => { setEditId(s.id); setNombre(s.nombre); setRol(s.rol) }}>Editar</Button>
            <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-700" onClick={() => del(s.id)}>Eliminar</Button>
          </div>
        ))}
        {staff.length === 0 && <p className="text-muted-foreground/60">Sin staff</p>}
      </div>
    </div>
  )
}
