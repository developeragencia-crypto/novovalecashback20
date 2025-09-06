import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

async function addColumns() {
  // Configuração para WebSockets no Neon
  globalThis.WebSocket = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adicionando colunas faltantes à tabela withdrawal_requests...');
    
    await pool.query(`
      ALTER TABLE withdrawal_requests 
      ADD COLUMN IF NOT EXISTS store_name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    
    console.log('Colunas adicionadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    await pool.end();
  }
}

addColumns();