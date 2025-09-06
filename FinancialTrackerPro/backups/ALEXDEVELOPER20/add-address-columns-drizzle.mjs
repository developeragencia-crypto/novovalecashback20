/**
 * Script para adicionar as colunas de endereço à tabela users usando Drizzle ORM
 */
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function addAddressColumns() {
  try {
    console.log("Iniciando migração de colunas de endereço...");

    // Verificar se as colunas já existem
    const checkColumnsQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (column_name = 'address' OR column_name = 'city' OR column_name = 'state')
    `;
    
    const existingColumns = await db.execute(checkColumnsQuery);
    console.log("Colunas existentes:", existingColumns.rows);
    
    // Se todas as colunas já existem, não fazer nada
    if (existingColumns.rows.length === 3) {
      console.log('Colunas de endereço já existem na tabela users');
      return;
    }
    
    // Adicionar as colunas que não existem
    const columnNames = existingColumns.rows.map(row => row.column_name);
    
    if (!columnNames.includes('address')) {
      console.log("Adicionando coluna 'address'...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
    }
    
    if (!columnNames.includes('city')) {
      console.log("Adicionando coluna 'city'...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`);
    }
    
    if (!columnNames.includes('state')) {
      console.log("Adicionando coluna 'state'...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`);
    }
    
    console.log("Migração de colunas de endereço concluída com sucesso!");
  } catch (error) {
    console.error('Erro ao adicionar colunas de endereço:', error);
    process.exit(1);
  }
}

addAddressColumns();