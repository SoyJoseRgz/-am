import { pool } from './db.js'
import { hashPassword } from './services/auth.js'

export async function seedSuperAdmin() {
  const exists = await pool.query('SELECT id FROM usuarios WHERE rol = $1', ['super_admin'])
  if (exists.rowCount && exists.rowCount > 0) return

  const pwd = await hashPassword('Rodriguez010020#')
  await pool.query(
    `INSERT INTO usuarios (restaurante_id, celular, password_hash, nombre, rol)
     VALUES (NULL, $1, $2, $3, 'super_admin') ON CONFLICT DO NOTHING`,
    ['2299288981', pwd, 'Super Admin'],
  )
  console.log('Super Admin creado — celular: 2299288981, password: Rodriguez010020#')
}


