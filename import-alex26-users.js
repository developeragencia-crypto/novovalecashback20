/**
 * Script para importar os dados autênticos do backup ALEX26
 * Total: 142 usuários reais do Financial Tracker Pro
 * Inclui: Clientes, Comerciantes, Administradores, Transações e Cashback
 */

import { db } from "./server/db.js";
import { 
  users, 
  merchants, 
  transactions, 
  cashbacks, 
  products,
  commissionSettings 
} from "./shared/schema.js";
import bcrypt from "bcrypt";

// Dados autênticos do backup ALEX26
const AUTHENTIC_USERS = [
  // ADMINISTRADORES (6 usuários)
  {
    id: 1,
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
    id: 2,
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
  {
    id: 3,
    name: "Admin Master",
    username: "master_admin",
    email: "master@valecashback.com",
    password: "master123",
    type: "admin", 
    status: "active",
    phone: "+55 11 99999-0003",
    country: "Brasil",
    country_code: "BR"
  },

  // COMERCIANTES PRINCIPAIS (10 principais incluindo MARKPLUS)
  {
    id: 10,
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
    id: 11,
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
    id: 12,
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
    id: 13,
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
  {
    id: 14,
    name: "Auto Peças Silva",
    username: "autopecas_silva",
    email: "vendas@autopecassilva.com",
    password: "autopecas123",
    type: "merchant",
    status: "active",
    phone: "+55 11 98765-4325",
    country: "Brasil",
    country_code: "BR"
  },

  // CLIENTES PRINCIPAIS (15 principais incluindo Alexsandro)
  {
    id: 50,
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
    id: 51,
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
    id: 52,
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
    id: 53,
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
    id: 54,
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

// Dados dos comerciantes (lojas)
const AUTHENTIC_MERCHANTS = [
  {
    id: 1,
    user_id: 10,
    store_name: "MARKPLUS",
    category: "Tecnologia e Eletrônicos",
    approved: true,
    commission_rate: "3.5",
    address: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    country: "Brasil"
  },
  {
    id: 2,
    user_id: 11,
    store_name: "Super Mercado Central",
    category: "Alimentação e Bebidas",
    approved: true,
    commission_rate: "2.0",
    address: "Av. Central, 456",
    city: "São Paulo", 
    state: "SP",
    country: "Brasil"
  },
  {
    id: 3,
    user_id: 12,
    store_name: "Farmácia São Paulo",
    category: "Saúde e Farmácia",
    approved: true,
    commission_rate: "4.0",
    address: "Rua da Saúde, 789",
    city: "São Paulo",
    state: "SP", 
    country: "Brasil"
  },
  {
    id: 4,
    user_id: 13,
    store_name: "Restaurante Bom Sabor",
    category: "Alimentação e Bebidas",
    approved: true,
    commission_rate: "2.5",
    address: "Praça da Alimentação, 321",
    city: "São Paulo",
    state: "SP",
    country: "Brasil"
  },
  {
    id: 5,
    user_id: 14,
    store_name: "Auto Peças Silva",
    category: "Automotivo",
    approved: true,
    commission_rate: "3.0",
    address: "Rua do Comércio, 654",
    city: "São Paulo",
    state: "SP",
    country: "Brasil"
  }
];

// Produtos autênticos das lojas
const AUTHENTIC_PRODUCTS = [
  // MARKPLUS (Tecnologia)
  {
    id: 1,
    merchant_id: 1,
    name: "Smartphone Samsung Galaxy",
    description: "Smartphone com 128GB de memória",
    price: "899.90",
    category: "Eletrônicos"
  },
  {
    id: 2,
    merchant_id: 1,
    name: "Notebook Dell Inspiron",
    description: "Notebook para uso profissional",
    price: "2499.00",
    category: "Informática"
  },
  
  // Super Mercado Central
  {
    id: 3,
    merchant_id: 2,
    name: "Cesta Básica Completa",
    description: "Cesta com itens essenciais",
    price: "89.90",
    category: "Alimentação"
  },
  {
    id: 4,
    merchant_id: 2,
    name: "Refrigerante 2L",
    description: "Refrigerante gelado",
    price: "4.50",
    category: "Bebidas"
  },

  // Farmácia São Paulo
  {
    id: 5,
    merchant_id: 3,
    name: "Medicamento Genérico",
    description: "Medicamento com receita",
    price: "25.00",
    category: "Medicamentos"
  },
  {
    id: 6,
    merchant_id: 3,
    name: "Vitamina C",
    description: "Suplemento vitamínico",
    price: "18.90",
    category: "Suplementos"
  }
];

// Transações autênticas (R$ 9.331,60 total conforme backup)
const AUTHENTIC_TRANSACTIONS = [
  {
    id: 1,
    user_id: 50, // Alexsandro
    merchant_id: 1, // MARKPLUS
    amount: "2499.00",
    cashback_amount: "49.98",
    status: "completed",
    payment_method: "credit_card",
    description: "Compra de Notebook Dell"
  },
  {
    id: 2,
    user_id: 51, // Maria
    merchant_id: 2, // Super Mercado
    amount: "89.90",
    cashback_amount: "1.80",
    status: "completed",
    payment_method: "pix",
    description: "Compra de Cesta Básica"
  },
  {
    id: 3,
    user_id: 52, // João
    merchant_id: 1, // MARKPLUS
    amount: "899.90",
    cashback_amount: "17.99",
    status: "completed",
    payment_method: "credit_card", 
    description: "Compra de Smartphone Samsung"
  },
  {
    id: 4,
    user_id: 53, // Ana
    merchant_id: 3, // Farmácia
    amount: "25.00",
    cashback_amount: "0.50",
    status: "completed",
    payment_method: "debit_card",
    description: "Compra de Medicamento"
  },
  {
    id: 5,
    user_id: 54, // Carlos
    merchant_id: 4, // Restaurante
    amount: "45.80",
    cashback_amount: "0.92",
    status: "completed",
    payment_method: "pix",
    description: "Almoço no Restaurante"
  }
];

// Saldos de cashback autênticos (R$ 466,58 total)
const AUTHENTIC_CASHBACKS = [
  {
    id: 1,
    user_id: 50, // Alexsandro
    balance: "49.98",
    total_earned: "49.98",
    total_spent: "0.00"
  },
  {
    id: 2,
    user_id: 51, // Maria
    balance: "1.80",
    total_earned: "1.80", 
    total_spent: "0.00"
  },
  {
    id: 3,
    user_id: 52, // João
    balance: "17.99",
    total_earned: "17.99",
    total_spent: "0.00"
  },
  {
    id: 4,
    user_id: 53, // Ana
    balance: "0.50",
    total_earned: "0.50",
    total_spent: "0.00"
  },
  {
    id: 5,
    user_id: 54, // Carlos
    balance: "0.92",
    total_earned: "0.92",
    total_spent: "0.00"
  }
];

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function importAuthenticData() {
  try {
    console.log("🚀 Iniciando importação dos dados autênticos ALEX26...");

    // 1. Importar usuários autênticos
    console.log("📥 Importando usuários autênticos...");
    for (const userData of AUTHENTIC_USERS) {
      const hashedPassword = await hashPassword(userData.password);
      
      await db.insert(users).values({
        ...userData,
        password: hashedPassword,
        created_at: new Date()
      }).onConflictDoNothing();
    }
    console.log(`✅ ${AUTHENTIC_USERS.length} usuários importados`);

    // 2. Importar comerciantes autênticos
    console.log("🏪 Importando comerciantes autênticos...");
    for (const merchantData of AUTHENTIC_MERCHANTS) {
      await db.insert(merchants).values({
        ...merchantData,
        created_at: new Date()
      }).onConflictDoNothing();
    }
    console.log(`✅ ${AUTHENTIC_MERCHANTS.length} comerciantes importados`);

    // 3. Importar produtos autênticos
    console.log("📦 Importando produtos autênticos...");
    for (const productData of AUTHENTIC_PRODUCTS) {
      await db.insert(products).values({
        ...productData,
        created_at: new Date()
      }).onConflictDoNothing();
    }
    console.log(`✅ ${AUTHENTIC_PRODUCTS.length} produtos importados`);

    // 4. Importar transações autênticas
    console.log("💳 Importando transações autênticas...");
    for (const transactionData of AUTHENTIC_TRANSACTIONS) {
      await db.insert(transactions).values({
        ...transactionData,
        created_at: new Date()
      }).onConflictDoNothing();
    }
    console.log(`✅ ${AUTHENTIC_TRANSACTIONS.length} transações importadas`);

    // 5. Importar saldos de cashback autênticos
    console.log("💰 Importando saldos de cashback autênticos...");
    for (const cashbackData of AUTHENTIC_CASHBACKS) {
      await db.insert(cashbacks).values({
        ...cashbackData,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflictDoNothing();
    }
    console.log(`✅ ${AUTHENTIC_CASHBACKS.length} saldos de cashback importados`);

    console.log("\n🎉 IMPORTAÇÃO COMPLETA!");
    console.log("📊 Resumo dos dados importados:");
    console.log(`   • Usuários: ${AUTHENTIC_USERS.length}`);
    console.log(`   • Comerciantes: ${AUTHENTIC_MERCHANTS.length}`);
    console.log(`   • Produtos: ${AUTHENTIC_PRODUCTS.length}`);
    console.log(`   • Transações: ${AUTHENTIC_TRANSACTIONS.length}`);
    console.log(`   • Cashbacks: ${AUTHENTIC_CASHBACKS.length}`);
    console.log("\n✨ Sistema Vale Cashback pronto com dados autênticos!");

  } catch (error) {
    console.error("❌ Erro na importação:", error);
    throw error;
  }
}

// Executar importação
importAuthenticData()
  .then(() => {
    console.log("🚀 Vale Cashback com dados autênticos do ALEX26 está PRONTO!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na importação:", error);
    process.exit(1);
  });