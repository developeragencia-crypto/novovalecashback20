/**
 * Script para corrigir senhas dos usuários principais do sistema
 */
import bcrypt from 'bcrypt';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function fixMainUserPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('🔧 Corrigindo senhas dos usuários principais...');
  
  // Usuários principais com suas senhas corretas
  const mainUsers = [
    { email: 'admin@valecashback.com', password: 'admin123', type: 'admin' },
    { email: 'cliente@valecashback.com', password: 'cliente123', type: 'client' },
    { email: 'lojista@valecashback.com', password: 'lojista123', type: 'merchant' },
    { email: 'admin@cashback.com', password: 'admin123', type: 'admin' }
  ];
  
  for (const user of mainUsers) {
    try {
      // Hashear a nova senha
      const hashedPassword = await hashPassword(user.password);
      
      // Atualizar no banco
      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, user.email]
      );
      
      if (result.rowCount > 0) {
        console.log(`✅ Senha atualizada para ${user.email} (${user.type})`);
      } else {
        console.log(`⚠️ Usuário não encontrado: ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${user.email}:`, error.message);
    }
  }
  
  await pool.end();
  console.log('🎯 Correção de senhas concluída!');
}

fixMainUserPasswords().catch(console.error);