import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

async function addProcessedByColumn() {
  // Configuração para WebSockets no Neon
  globalThis.WebSocket = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adicionando coluna processed_by à tabela withdrawal_requests...');
    
    await pool.query(`
      ALTER TABLE withdrawal_requests 
      ADD COLUMN IF NOT EXISTS processed_by INTEGER REFERENCES users(id);
    `);
    
    console.log('Coluna processed_by adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
  } finally {
    await pool.end();
  }
}

addProcessedByColumn();