import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

async function addColumn() {
  // Configuração para WebSockets no Neon
  globalThis.WebSocket = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adicionando coluna full_name à tabela withdrawal_requests...');
    
    await pool.query(`
      ALTER TABLE withdrawal_requests 
      ADD COLUMN IF NOT EXISTS full_name TEXT;
    `);
    
    console.log('Coluna adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
  } finally {
    await pool.end();
  }
}

addColumn();