/**
 * Script para atualizar senhas dos usuários autênticos com hash correto
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

// Senhas dos usuários autênticos
const USER_PASSWORDS = {
  'admin@valecashback.com': 'admin123',
  'cliente@valecashback.com': 'alex123', 
  'lojista@valecashback.com': 'markplus123',
  'vendas@supermercadocentral.com': 'super123',
  'farmacia@farmaciasaopaulo.com': 'farmacia123',
  'pedidos@bomsabor.com': 'restaurante123',
  'vendas@postoipiranga.com': 'posto123',
  'contato@oticavision.com': 'otica123',
  'vendas@happydog.com': 'petshop123',
  'vendas@modabrasil.com': 'moda123',
  'maria.silva@email.com': 'maria123',
  'joao.pedro@email.com': 'joao123',
  'ana.carolina@email.com': 'ana123',
  'carlos.eduardo@email.com': 'carlos123',
  'fernanda.souza@email.com': 'fernanda123',
  'ricardo.almeida@email.com': 'ricardo123',
  'patricia.santos@email.com': 'patricia123'
};

async function updateUserPasswords() {
  try {
    console.log("Atualizando senhas dos usuários autênticos...");
    
    for (const [email, password] of Object.entries(USER_PASSWORDS)) {
      const hashedPassword = await hashPassword(password);
      
      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING name, email',
        [hashedPassword, email]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Senha atualizada para: ${result.rows[0].name} (${email})`);
      } else {
        console.log(`❌ Usuário não encontrado: ${email}`);
      }
    }
    
    console.log("\n🎉 Todas as senhas autênticas foram atualizadas com sucesso!");
    console.log("Agora os usuários podem fazer login com as credenciais reais.");
    
  } catch (error) {
    console.error("Erro ao atualizar senhas:", error);
    throw error;
  }
}

// Executar atualização
updateUserPasswords()
  .then(() => {
    console.log("Sistema Vale Cashback com credenciais autênticas FUNCIONANDO!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Falha na atualização:", error);
    process.exit(1);
  });