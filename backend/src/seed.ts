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

export async function seedDemo() {
  const exists = await pool.query('SELECT id FROM restaurantes LIMIT 1')
  if (exists.rowCount && exists.rowCount > 0) return

  const r = await pool.query('INSERT INTO restaurantes (nombre, direccion) VALUES ($1,$2) RETURNING id', ['Restaurante Demo', 'Calle 123'])
  const rid = r.rows[0].id

  const pwd = await hashPassword('Rodriguez010020#')
  const pwdM = await hashPassword('demo1234')
  await pool.query(
    `INSERT INTO usuarios (restaurante_id, celular, password_hash, nombre, rol) VALUES
     ($1,'2292203219',$2,'Admin Demo','admin'),
     ($1,'2291111111',$3,'Mesero Demo','mesero') ON CONFLICT DO NOTHING`,
    [rid, pwd, pwdM],
  )

  await pool.query(`INSERT INTO categorias (restaurante_id, nombre, orden) VALUES
    ($1,'Entradas',0), ($1,'Platos Fuertes',1), ($1,'Bebidas',2), ($1,'Postres',3)`, [rid])

  await pool.query(`INSERT INTO mesas (restaurante_id, numero) VALUES ($1,1),($1,2),($1,3)`, [rid])

  console.log(`Demo creado — restaurante ${rid}, admin 2292203219 / Rodriguez010020#`)
}
