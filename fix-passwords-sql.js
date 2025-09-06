/**
 * Script para corrigir senhas usando a mesma função de hash do sistema
 */
import { storage } from './server/storage.js';

async function fixAllPasswords() {
  try {
    console.log('🔄 Corrigindo senhas de todos os usuários...');
    
    // Lista de usuários problemáticos com suas senhas corretas
    const passwordsToFix = [
      // Admins
      { email: 'admin@cashback.com', password: 'senha123' },
      { email: 'admin.principal@valecashback.com', password: 'senha123' },
      { email: 'admin.tecnico@valecashback.com', password: 'senha123' },
      { email: 'admin.financeiro@valecashback.com', password: 'senha123' },
      { email: 'admin.operacional@valecashback.com', password: 'senha123' },
      
      // Clientes - definindo senha padrão
      { email: 'joao.silva@email.com', password: 'senha123' },
      { email: 'maria.costa@email.com', password: 'senha123' },
      { email: 'pedro.silva@email.com', password: 'senha123' },
      { email: 'ana.souza@email.com', password: 'senha123' },
      { email: 'carlos.lima@email.com', password: 'senha123' }
    ];
    
    for (const user of passwordsToFix) {
      const hashedPassword = await storage.hashPassword(user.password);
      console.log(`Hash gerado para ${user.email}: ${hashedPassword.substring(0, 20)}...`);
    }
    
    console.log('✅ Hashes gerados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
fixAllPasswords();