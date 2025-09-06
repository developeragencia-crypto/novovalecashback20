/**
 * Script para adicionar o sistema de redefinição de senha e notificações
 */
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function addPasswordResetSystem() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Criando tabelas do sistema de redefinição de senha...');
    
    // Criar tabela de tokens de redefinição de senha
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        is_used BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Criar índices para melhor performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
    `);
    
    // Criar tabela de notificações do sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read_at TIMESTAMP,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        metadata TEXT
      );
    `);
    
    // Criar índices para notificações
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_notifications_user_id ON system_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
      CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read ON system_notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_system_notifications_sent_at ON system_notifications(sent_at);
    `);
    
    console.log('✅ Tabelas do sistema de redefinição de senha criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const resetTokensCount = await pool.query('SELECT COUNT(*) FROM password_reset_tokens');
    const notificationsCount = await pool.query('SELECT COUNT(*) FROM system_notifications');
    
    console.log(`📊 Tokens de redefinição: ${resetTokensCount.rows[0].count}`);
    console.log(`📊 Notificações: ${notificationsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar sistema de redefinição de senha:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
addPasswordResetSystem();