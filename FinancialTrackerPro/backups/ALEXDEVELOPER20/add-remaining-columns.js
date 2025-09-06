import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

async function addRemainingColumns() {
  // Configuração para WebSockets no Neon
  globalThis.WebSocket = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adicionando colunas faltantes à tabela withdrawal_requests...');
    
    await pool.query(`
      ALTER TABLE withdrawal_requests 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    `);
    
    console.log('Colunas adicionadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    await pool.end();
  }
}

addRemainingColumns();