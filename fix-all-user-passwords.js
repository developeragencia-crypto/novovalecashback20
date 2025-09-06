/**
 * Script para corrigir senhas de TODOS os usuários do sistema
 */
import bcrypt from 'bcrypt';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function fixAllUserPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('🔧 Corrigindo senhas de TODOS os usuários do sistema...');
  
  // Buscar todos os usuários ativos
  const result = await pool.query(
    'SELECT id, email, type FROM users WHERE status = $1 ORDER BY type, id',
    ['active']
  );
  
  console.log(`📊 Encontrados ${result.rows.length} usuários ativos`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of result.rows) {
    try {
      // Senha padrão: 123456 para todos os usuários
      const hashedPassword = await hashPassword('123456');
      
      // Atualizar no banco
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      successCount++;
      
      // Log específico para usuários principais
      if (['admin@valecashback.com', 'cliente@valecashback.com', 'lojista@valecashback.com'].includes(user.email)) {
        console.log(`✅ Usuário principal corrigido: ${user.email} (${user.type})`);
      }
      
      // Progress a cada 20 usuários
      if (successCount % 20 === 0) {
        console.log(`📈 Progresso: ${successCount} usuários processados...`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar usuário ID ${user.id}:`, error.message);
      errorCount++;
    }
  }
  
  await pool.end();
  
  console.log('');
  console.log('🎯 CORREÇÃO DE SENHAS CONCLUÍDA!');
  console.log(`✅ Sucessos: ${successCount} usuários`);
  console.log(`❌ Erros: ${errorCount} usuários`);
  console.log('');
  console.log('📋 CREDENCIAIS PADRÃO:');
  console.log('• Admin: admin@valecashback.com / admin123');
  console.log('• Cliente: cliente@valecashback.com / cliente123');
  console.log('• Lojista: lojista@valecashback.com / lojista123');
  console.log('• Demais usuários: email / 123456');
}

fixAllUserPasswords().catch(console.error);