/**
 * Script para adicionar as colunas source e qr_code_id à tabela transactions
 */
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

// Correção para o ambiente Node.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');

async function addTransactionColumns() {
  try {
    // Verificar se a coluna já existe antes de criar
    // Primeiro, verifica se a coluna 'source' existe
    const sourceColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'source'
    `);
    
    if (sourceColumnResult.rows.length === 0) {
      console.log("Adicionando coluna 'source' à tabela transactions...");
      await db.execute(sql`
        ALTER TABLE transactions 
        ADD COLUMN source TEXT DEFAULT 'manual'
      `);
      console.log("Coluna 'source' adicionada com sucesso.");
    } else {
      console.log("Coluna 'source' já existe na tabela transactions.");
    }
    
    // Em seguida, verifica se a coluna 'qr_code_id' existe
    const qrCodeIdColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'qr_code_id'
    `);
    
    if (qrCodeIdColumnResult.rows.length === 0) {
      console.log("Adicionando coluna 'qr_code_id' à tabela transactions...");
      await db.execute(sql`
        ALTER TABLE transactions 
        ADD COLUMN qr_code_id TEXT
      `);
      console.log("Coluna 'qr_code_id' adicionada com sucesso.");
    } else {
      console.log("Coluna 'qr_code_id' já existe na tabela transactions.");
    }
    
    console.log("Script de migração concluído com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar colunas à tabela transactions:", error);
  } finally {
    // Encerrar a conexão com o banco de dados
    process.exit(0);
  }
}

// Executar a função
addTransactionColumns();