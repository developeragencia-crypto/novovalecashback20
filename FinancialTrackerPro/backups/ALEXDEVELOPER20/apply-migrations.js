import { db } from './server/db.js';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './shared/schema.js';

// Esta função cria tabelas no banco de dados baseadas no schema
async function applyMigrations() {
  console.log('Aplicando migrações...');
  
  try {
    // Aplica migrações usando o schema importado
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        merchant_id INTEGER NOT NULL REFERENCES merchants(id),
        amount TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        agency TEXT NOT NULL,
        account TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        admin_notes TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Migrações aplicadas com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migrações:', error);
  } finally {
    process.exit(0);
  }
}

applyMigrations();