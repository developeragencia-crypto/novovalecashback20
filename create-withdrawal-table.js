import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

async function createTable() {
  // Configuração para WebSockets no Neon
  globalThis.WebSocket = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Criando tabela withdrawal_requests...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        merchant_id INTEGER NOT NULL REFERENCES merchants(id),
        amount TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        agency TEXT NOT NULL,
        account TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        admin_notes TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Tabela criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
  } finally {
    await pool.end();
  }
}

createTable();