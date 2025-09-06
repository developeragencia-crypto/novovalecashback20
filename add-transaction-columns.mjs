import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function addSourceColumn() {
  try {
    console.log("Adicionando coluna 'source' à tabela transactions...");
    
    // Verifica se a coluna já existe
    const sourceResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'source'
    `);
    
    if (sourceResult.rows.length === 0) {
      // Adiciona a coluna source se ela não existir
      await db.execute(sql`
        ALTER TABLE transactions 
        ADD COLUMN source TEXT DEFAULT 'manual'
      `);
      console.log("Coluna 'source' adicionada com sucesso.");
    } else {
      console.log("Coluna 'source' já existe na tabela transactions.");
    }
    
    // Verifica se a coluna qr_code_id já existe
    const qrCodeResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'qr_code_id'
    `);
    
    if (qrCodeResult.rows.length === 0) {
      // Adiciona a coluna qr_code_id se ela não existir
      await db.execute(sql`
        ALTER TABLE transactions 
        ADD COLUMN qr_code_id TEXT
      `);
      console.log("Coluna 'qr_code_id' adicionada com sucesso.");
    } else {
      console.log("Coluna 'qr_code_id' já existe na tabela transactions.");
    }
    
    console.log("Migração concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
  } finally {
    // Encerra a conexão com o banco de dados
    await pool.end();
  }
}

// Executa a função
addSourceColumn().catch(console.error);