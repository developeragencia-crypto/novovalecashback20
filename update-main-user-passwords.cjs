/**
 * Script para atualizar senhas dos principais usuários autênticos
 */

const { scrypt, randomBytes, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

// Senhas dos usuários principais do ALEX26
const MAIN_USER_PASSWORDS = {
  // Admin principal
  'sistema@valecashback.com': 'admin123',
  'admin@financial-tracker.com.br': 'admin123',
  
  // Cliente Alexsandro (usuário principal)
  'alexsandro@email.com': 'alex123',
  'alexsandro.plaster@email.com': 'alex123',
  
  // MARKPLUS (comerciante principal)
  'contato@markplus.com.br': 'markplus123',
  'markplus@comercio.com': 'markplus123',
  
  // Outros comerciantes principais
  'vendas@techsolutions.com.br': 'tech123',
  'contato@farmaciapopular.com.br': 'farmacia123',
  'vendas@supermercadocentral.com.br': 'super123',
  'contato@restaurantebonsabor.com.br': 'restaurante123',
  
  // Outros clientes principais  
  'ricardo.almeida@email.com': 'ricardo123',
  'fernanda.lima@email.com': 'fernanda123',
  'maria.silva@email.com': 'maria123',
  'joao.pedro@email.com': 'joao123',
  'ana.carolina@email.com': 'ana123',
  'carlos.eduardo@email.com': 'carlos123'
};

async function updateMainUserPasswords() {
  try {
    console.log("🔄 Atualizando senhas dos usuários principais autênticos...");
    
    // Primeiro, vamos ver quais usuários existem no banco
    const allUsersQuery = 'SELECT name, email, type FROM users ORDER BY type, name LIMIT 50';
    const allUsersResult = await pool.query(allUsersQuery);
    
    console.log("📋 Usuários encontrados no banco:");
    allUsersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.type}`);
    });
    
    console.log("\n🔧 Atualizando senhas...");
    
    let updatedCount = 0;
    
    for (const [email, password] of Object.entries(MAIN_USER_PASSWORDS)) {
      try {
        const hashedPassword = await hashPassword(password);
        
        const result = await pool.query(
          'UPDATE users SET password = $1 WHERE email = $2 RETURNING name, email, type',
          [hashedPassword, email]
        );
        
        if (result.rows.length > 0) {
          const user = result.rows[0];
          console.log(`✅ Senha atualizada: ${user.name} (${user.email}) - ${user.type}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Usuário não encontrado: ${email}`);
        }
        
      } catch (error) {
        console.warn(`❌ Erro ao atualizar ${email}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Senhas atualizadas: ${updatedCount} usuários principais`);
    console.log("🚀 Agora os usuários principais podem fazer login!");
    
  } catch (error) {
    console.error("❌ Erro na atualização:", error);
    throw error;
  }
}

// Executar atualização
updateMainUserPasswords()
  .then(() => {
    console.log("✅ Sistema Vale Cashback com credenciais dos usuários principais FUNCIONANDO!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na atualização:", error);
    process.exit(1);
  });