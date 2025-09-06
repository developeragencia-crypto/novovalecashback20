import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

/**
 * Script para adicionar a coluna withdrawal_fee à tabela commission_settings
 */
async function addWithdrawalFeeColumn() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definida!');
    }

    console.log('Conectando ao banco de dados...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Verificando se a coluna withdrawal_fee já existe...');
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'commission_settings' 
        AND column_name = 'withdrawal_fee'
    `);

    if (result.rows.length > 0) {
      console.log('A coluna withdrawal_fee já existe na tabela commission_settings.');
      await pool.end();
      return;
    }

    console.log('Adicionando a coluna withdrawal_fee à tabela commission_settings...');
    
    await db.execute(sql`
      ALTER TABLE commission_settings 
      ADD COLUMN IF NOT EXISTS withdrawal_fee NUMERIC NOT NULL DEFAULT '5.0'
    `);

    // Atualizar o valor nas configurações existentes
    await db.execute(sql`
      UPDATE commission_settings
      SET withdrawal_fee = '5.0'
      WHERE withdrawal_fee IS NULL
    `);

    console.log('Coluna withdrawal_fee adicionada com sucesso à tabela commission_settings!');
    await pool.end();
  } catch (error) {
    console.error('Erro ao adicionar coluna withdrawal_fee:', error);
    process.exit(1);
  }
}

// Executar a função principal
addWithdrawalFeeColumn().catch(error => {
  console.error('Erro na execução:', error);
  process.exit(1);
});