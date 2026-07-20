import bcrypt from 'bcrypt'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: 'postgres://miresto:miresto@localhost:5432/miresto' })
const hash = await bcrypt.hash('Rodriguez010020#', 10)
await pool.query('UPDATE usuarios SET password_hash = $1, force_password_change = false WHERE celular = $2', [hash, '2292203219'])
console.log('Contraseña actualizada')
await pool.end()
