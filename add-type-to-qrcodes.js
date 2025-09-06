/**
 * Script para adicionar a coluna type à tabela qr_codes
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure a conexão com o banco de dados
neonConfig.webSocketConstructor = ws;

async function addTypeColumn() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verificar se a coluna já existe
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'type'
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      // A coluna não existe, então vamos adicioná-la
      console.log('A coluna "type" não existe na tabela qr_codes. Adicionando...');
      
      const addColumnQuery = `
        ALTER TABLE qr_codes 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'payment'
      `;
      
      await pool.query(addColumnQuery);
      console.log('Coluna "type" adicionada com sucesso à tabela qr_codes!');
    } else {
      console.log('A coluna "type" já existe na tabela qr_codes.');
    }
    
    await pool.end();
    console.log('Operação concluída.');
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
    process.exit(1);
  }
}

addTypeColumn();