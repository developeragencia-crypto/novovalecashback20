/**
 * Script para corrigir senhas de usuários que não estão no formato hash correto
 */
import { Pool } from '@neondatabase/serverless';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function fixUserPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Iniciando correção de senhas...');
    
    // Buscar usuários com senhas não hashadas
    const usersResult = await pool.query(`
      SELECT id, name, email, type, password 
      FROM users 
      WHERE status = 'active' 
      AND (password NOT LIKE '%.%' OR LENGTH(password) < 50)
      ORDER BY type, id
    `);
    
    const users = usersResult.rows;
    console.log(`📊 Encontrados ${users.length} usuários com senhas a corrigir`);
    
    let fixed = 0;
    
    for (const user of users) {
      try {
        let newPassword;
        
        // Determinar senha padrão baseada no tipo e senha atual
        if (user.password === 'senha123' || user.password.length === 8) {
          newPassword = 'senha123';
        } else if (user.password === 'admin123') {
          newPassword = 'admin123';
        } else if (user.password.includes('@')) {
          // Se a senha atual parece ser um email, usar senha123
          newPassword = 'senha123';
        } else {
          // Manter a senha atual se for uma string válida
          newPassword = user.password || 'senha123';
        }
        
        // Criar hash da senha
        const hashedPassword = await hashPassword(newPassword);
        
        // Atualizar no banco
        await pool.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
        
        fixed++;
        console.log(`✅ Corrigido: ${user.name} (${user.email}) - ${user.type}`);
        
      } catch (error) {
        console.error(`❌ Erro ao corrigir usuário ${user.email}:`, error);
      }
    }
    
    console.log(`\n🎉 Correção concluída!`);
    console.log(`🔧 ${fixed} senhas corrigidas`);
    console.log(`👥 ${users.length} usuários processados`);
    
    // Verificar se ainda há problemas
    const remainingProblems = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE status = 'active' 
      AND (password NOT LIKE '%.%' OR LENGTH(password) < 50)
    `);
    
    console.log(`📊 Usuários restantes com problemas: ${remainingProblems.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro geral no script:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
fixUserPasswords();