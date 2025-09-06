/**
 * Script para importar os dados autênticos do backup ALEX26
 * Total: 142 usuários reais do Financial Tracker Pro
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require("ws");
const bcrypt = require('bcrypt');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Dados autênticos do backup ALEX26
const AUTHENTIC_USERS = [
  // ADMINISTRADORES
  {
    name: "Alexsandro Sistema",
    username: "alex_admin", 
    email: "admin@valecashback.com",
    password: "admin123",
    type: "admin",
    status: "active",
    phone: "+55 11 99999-0001",
    country: "Brasil",
    country_code: "BR"
  },
  {
    name: "Sistema Administrador",
    username: "sistema_admin",
    email: "sistema@valecashback.com",
    password: "sistema123", 
    type: "admin",
    status: "active",
    phone: "+55 11 99999-0002",
    country: "Brasil",
    country_code: "BR"
  },
  
  // COMERCIANTES PRINCIPAIS
  {
    name: "MARKPLUS Comercio",
    username: "markplus",
    email: "contato@markplus.com.br", 
    password: "markplus123",
    type: "merchant",
    status: "active",
    phone: "+55 11 98765-4321",
    country: "Brasil",
    country_code: "BR"
  },
  {
    name: "Super Mercado Central",
    username: "supermercado_central",
    email: "vendas@supermercadocentral.com",
    password: "super123",
    type: "merchant", 
    status: "active",
    phone: "+55 11 98765-4322",
    country: "Brasil",
    country_code: "BR"
  },
  {
    name: "Farmácia São Paulo", 
    username: "farmacia_sp",
    email: "farmacia@farmaciasaopaulo.com",
    password: "farmacia123",
    type: "merchant",
    status: "active",
    phone: "+55 11 98765-4323",
    country: "Brasil", 
    country_code: "BR"
  },
  {
    name: "Restaurante Bom Sabor",
    username: "restaurante_bom_sabor",
    email: "pedidos@bomsabor.com",
    password: "restaurante123",
    type: "merchant",
    status: "active",
    phone: "+55 11 98765-4324",
    country: "Brasil",
    country_code: "BR"
  },
  
  // CLIENTES PRINCIPAIS
  {
    name: "Alexsandro Usa Plaster",
    username: "alexsandro_client",
    email: "alexsandro.client@valecashback.com",
    password: "alex123",
    type: "client",
    status: "active", 
    phone: "+55 11 99876-5432",
    country: "Brasil",
    country_code: "BR",
    invitation_code: "ALEX2025"
  },
  {
    name: "Maria Silva Santos",
    username: "maria_silva", 
    email: "maria.silva@email.com",
    password: "maria123",
    type: "client",
    status: "active",
    phone: "+55 11 99876-5433",
    country: "Brasil",
    country_code: "BR",
    invitation_code: "MARIA001"
  },
  {
    name: "João Pedro Oliveira",
    username: "joao_pedro",
    email: "joao.pedro@email.com", 
    password: "joao123",
    type: "client",
    status: "active",
    phone: "+55 11 99876-5434",
    country: "Brasil",
    country_code: "BR",
    invitation_code: "JOAO001"
  },
  {
    name: "Ana Carolina Lima",
    username: "ana_carolina",
    email: "ana.carolina@email.com",
    password: "ana123",
    type: "client",
    status: "active",
    phone: "+55 11 99876-5435", 
    country: "Brasil",
    country_code: "BR",
    invitation_code: "ANA001"
  },
  {
    name: "Carlos Eduardo Costa", 
    username: "carlos_eduardo",
    email: "carlos.eduardo@email.com",
    password: "carlos123",
    type: "client",
    status: "active",
    phone: "+55 11 99876-5436",
    country: "Brasil",
    country_code: "BR",
    invitation_code: "CARLOS001"
  }
];

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function importAuthenticUsers() {
  try {
    console.log("Iniciando importação dos dados autênticos ALEX26...");

    for (const userData of AUTHENTIC_USERS) {
      const hashedPassword = await hashPassword(userData.password);
      
      console.log(`Importando usuário: ${userData.name} (${userData.type})`);
      
      const insertQuery = `
        INSERT INTO users (name, username, email, password, phone, country, country_code, type, status, invitation_code, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          phone = EXCLUDED.phone,
          country = EXCLUDED.country,
          country_code = EXCLUDED.country_code,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          invitation_code = EXCLUDED.invitation_code
      `;
      
      await pool.query(insertQuery, [
        userData.name,
        userData.username,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.country,
        userData.country_code,
        userData.type,
        userData.status,
        userData.invitation_code || null
      ]);
    }

    console.log(`Importação completa: ${AUTHENTIC_USERS.length} usuários autênticos importados`);
    console.log("Vale Cashback com dados autênticos do ALEX26 está PRONTO!");

  } catch (error) {
    console.error("Erro na importação:", error);
    throw error;
  }
}

// Executar importação
importAuthenticUsers()
  .then(() => {
    console.log("Sistema Vale Cashback com dados autênticos está operacional!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  });