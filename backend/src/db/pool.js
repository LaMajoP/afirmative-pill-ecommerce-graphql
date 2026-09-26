//Pool de conexión a Supabase (PostgreSQL).
 // Usamos `pg` directo (no el SDK JS de Supabase) porque necesitamos
 // control fino sobre el batching de DataLoader con `WHERE id IN (...)`.
const { Pool } = require('pg');

if (!process.env.SUPABASE_DB_URL) {
  console.warn(
    '[db] SUPABASE_DB_URL no está definida. Copia backend/.env.example a backend/.env ' +
    'y coloca la connection string de tu proyecto Supabase (Settings > Database).'
  );
}

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
  max: 10,
});

const originalQuery = pool.query.bind(pool);
pool.query = (text, params) => {
  const preview = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : text;
  console.log(`🗄️  [SQL] ${preview}`, params ? `params=${JSON.stringify(params)}` : '');
  return originalQuery(text, params);
};

module.exports = { pool };
