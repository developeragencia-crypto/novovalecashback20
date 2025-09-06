/**
 * Script para adicionar os novos campos à tabela qr_codes
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Configuração do pool de conexão
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function addQrCodeFields() {
  try {
    console.log('Adicionando campos à tabela qr_codes...');

    // Verificar se a coluna 'type' já existe
    const checkTypeColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'type'
    `);

    if (checkTypeColumn.length === 0) {
      console.log('Adicionando coluna "type"...');
      await db.execute(sql`ALTER TABLE qr_codes ADD COLUMN type TEXT NOT NULL DEFAULT 'payment'`);
    } else {
      console.log('Coluna "type" já existe.');
    }

    // Verificar se a coluna 'data' já existe
    const checkDataColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'data'
    `);

    if (checkDataColumn.length === 0) {
      console.log('Adicionando coluna "data"...');
      await db.execute(sql`ALTER TABLE qr_codes ADD COLUMN data TEXT`);
    } else {
      console.log('Coluna "data" já existe.');
    }

    // Verificar se a coluna 'status' já existe
    const checkStatusColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'status'
    `);

    if (checkStatusColumn.length === 0) {
      console.log('Adicionando coluna "status"...');
      await db.execute(sql`ALTER TABLE qr_codes ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
    } else {
      console.log('Coluna "status" já existe.');
    }

    // Verificar se a coluna 'used_at' já existe
    const checkUsedAtColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'used_at'
    `);

    if (checkUsedAtColumn.length === 0) {
      console.log('Adicionando coluna "used_at"...');
      await db.execute(sql`ALTER TABLE qr_codes ADD COLUMN used_at TIMESTAMP`);
    } else {
      console.log('Coluna "used_at" já existe.');
    }

    // Verificar se a coluna 'used_by' já existe
    const checkUsedByColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'used_by'
    `);

    if (checkUsedByColumn.length === 0) {
      console.log('Adicionando coluna "used_by"...');
      await db.execute(sql`ALTER TABLE qr_codes ADD COLUMN used_by INTEGER REFERENCES users(id)`);
    } else {
      console.log('Coluna "used_by" já existe.');
    }

    // Tornar o campo amount opcional
    const checkAmountNullable = await db.execute(sql`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'amount'
    `);

    if (checkAmountNullable.length > 0 && checkAmountNullable[0].is_nullable === 'NO') {
      console.log('Alterando coluna "amount" para aceitar valores nulos...');
      await db.execute(sql`ALTER TABLE qr_codes ALTER COLUMN amount DROP NOT NULL`);
    } else {
      console.log('Coluna "amount" já aceita valores nulos ou não existe.');
    }

    // Tornar o campo expires_at opcional
    const checkExpiresAtNullable = await db.execute(sql`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'qr_codes' AND column_name = 'expires_at'
    `);

    if (checkExpiresAtNullable.length > 0 && checkExpiresAtNullable[0].is_nullable === 'NO') {
      console.log('Alterando coluna "expires_at" para aceitar valores nulos...');
      await db.execute(sql`ALTER TABLE qr_codes ALTER COLUMN expires_at DROP NOT NULL`);
    } else {
      console.log('Coluna "expires_at" já aceita valores nulos ou não existe.');
    }

    console.log('Atualização da tabela qr_codes concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar campos à tabela qr_codes:', error);
  } finally {
    await pool.end();
  }
}

// Executar a função
addQrCodeFields();