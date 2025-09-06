/**
 * Script para corrigir senhas de TODOS os usuários principais do sistema
 * Garante que todos os tipos de usuários (admin, client, merchant) possam fazer login
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function fixAllUserPasswords() {
  try {
    console.log('🔧 Iniciando correção de senhas para todos os usuários...');
    
    // Lista de usuários principais com suas senhas corretas
    const usersToFix = [
      // Administradores
      { email: 'admin@valecashback.com', password: 'admin123', type: 'admin' },
      { email: 'admin@cashback.com', password: 'admin123', type: 'admin' },
      { email: 'admin.principal@valecashback.com', password: 'admin123', type: 'admin' },
      { email: 'admin.tecnico@valecashback.com', password: 'admin123', type: 'admin' },
      { email: 'admin.financeiro@valecashback.com', password: 'admin123', type: 'admin' },
      { email: 'admin.operacional@valecashback.com', password: 'admin123', type: 'admin' },
      { email: 'sistema@valecashback.com', password: 'admin123', type: 'admin' },
      
      // Clientes
      { email: 'cliente@valecashback.com', password: 'senha123', type: 'client' },
      { email: 'joao.silva@email.com', password: 'senha123', type: 'client' },
      { email: 'maria.costa@email.com', password: 'senha123', type: 'client' },
      { email: 'ana.carolina@email.com', password: 'senha123', type: 'client' },
      { email: 'joao.pedro@email.com', password: 'senha123', type: 'client' },
      { email: 'maria.silva@email.com', password: 'senha123', type: 'client' },
      { email: 'alexsandro.client@valecashback.com', password: 'senha123', type: 'client' },
      { email: 'patricia.santos.costa@email.com', password: 'senha123', type: 'client' },
      { email: 'alexsandro.usaplaster@gmail.com', password: 'senha123', type: 'client' },
      
      // Merchants
      { email: 'lojista@valecashback.com', password: 'senha123', type: 'merchant' },
      { email: 'contato@supercentral.com.br', password: 'senha123', type: 'merchant' },
      { email: 'vendas@techstore.com.br', password: 'senha123', type: 'merchant' },
      { email: 'loja@modaestilo.com.br', password: 'senha123', type: 'merchant' },
      { email: 'atendimento@casadecor.com.br', password: 'senha123', type: 'merchant' },
      { email: 'pedidos@bomsabor.com', password: 'senha123', type: 'merchant' },
      { email: 'farmacia@farmaciasaopaulo.com', password: 'senha123', type: 'merchant' },
      { email: 'vendas@supermercadocentral.com', password: 'senha123', type: 'merchant' }
    ];
    
    let fixedCount = 0;
    let notFoundCount = 0;
    
    for (const userData of usersToFix) {
      try {
        // Verificar se o usuário existe
        const userQuery = await pool.query(
          'SELECT id, name, email, type FROM users WHERE email = $1',
          [userData.email]
        );
        
        if (userQuery.rows.length === 0) {
          console.log(`⚠️  Usuário não encontrado: ${userData.email}`);
          notFoundCount++;
          continue;
        }
        
        const user = userQuery.rows[0];
        
        // Hash da nova senha
        const hashedPassword = await hashPassword(userData.password);
        
        // Atualizar senha
        await pool.query(
          'UPDATE users SET password = $1, password_updated = true WHERE email = $2',
          [hashedPassword, userData.email]
        );
        
        console.log(`✅ Senha corrigida para ${user.name} (${user.type}): ${userData.email}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Erro ao corrigir senha para ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n📊 RESUMO DA CORREÇÃO:');
    console.log(`✅ Senhas corrigidas: ${fixedCount}`);
    console.log(`⚠️  Usuários não encontrados: ${notFoundCount}`);
    console.log(`📝 Total processado: ${usersToFix.length}`);
    
    // Verificar algumas senhas corrigidas
    console.log('\n🔍 Testando algumas senhas corrigidas...');
    
    const testUsers = [
      { email: 'admin@valecashback.com', password: 'admin123' },
      { email: 'cliente@valecashback.com', password: 'senha123' },
      { email: 'lojista@valecashback.com', password: 'senha123' }
    ];
    
    for (const testUser of testUsers) {
      try {
        const userQuery = await pool.query(
          'SELECT password FROM users WHERE email = $1',
          [testUser.email]
        );
        
        if (userQuery.rows.length > 0) {
          const storedHash = userQuery.rows[0].password;
          const isValid = await bcrypt.compare(testUser.password, storedHash);
          console.log(`🔑 ${testUser.email}: ${isValid ? '✅ OK' : '❌ FALHOU'}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao testar ${testUser.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Correção de senhas concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral na correção de senhas:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
fixAllUserPasswords();