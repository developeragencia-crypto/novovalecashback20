import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

// Banco de dados de origem (aplicação funcionando)
const sourceDb = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_gzG0bsdTD2QN@ep-steep-lab-a4k59f3a.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Banco de dados de destino (aplicação atual)
const targetDb = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importRealUsers() {
  try {
    console.log('Iniciando importação de usuários reais...');
    
    // Buscar todos os usuários do banco de origem
    const sourceUsers = await sourceDb.query(`
      SELECT id, name, username, email, password, phone, address, city, state, country, country_code, 
             type, status, photo, security_question, security_answer, created_at, last_login, invitation_code
      FROM users 
      ORDER BY id
    `);
    
    console.log(`Encontrados ${sourceUsers.rows.length} usuários para importar`);
    
    // Limpar usuários existentes (exceto os padrão do sistema)
    await targetDb.query('DELETE FROM users WHERE id > 100');
    
    // Importar cada usuário
    for (const user of sourceUsers.rows) {
      const {
        id, name, username, email, password, phone, address, city, state, country, country_code,
        type, status, photo, security_question, security_answer, created_at, last_login, invitation_code
      } = user;
      
      // Inserir usuário no banco de destino
      await targetDb.query(`
        INSERT INTO users (
          id, name, username, email, password, phone, address, city, state, country, country_code,
          type, status, photo, security_question, security_answer, created_at, last_login, invitation_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          country_code = EXCLUDED.country_code,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          photo = EXCLUDED.photo,
          security_question = EXCLUDED.security_question,
          security_answer = EXCLUDED.security_answer,
          created_at = EXCLUDED.created_at,
          last_login = EXCLUDED.last_login,
          invitation_code = EXCLUDED.invitation_code
      `, [
        id, name, username, email, password, phone, address, city, state, country, country_code,
        type, status, photo, security_question, security_answer, created_at, last_login, invitation_code
      ]);
      
      console.log(`Importado usuário: ${name} (${type}) - ${email}`);
    }
    
    // Buscar clientes do banco de origem
    const sourceClients = await sourceDb.query(`
      SELECT id, user_id, cashback_balance, referral_code, referred_by_code, 
             total_cashback_earned, total_spent, total_transactions, created_at
      FROM clients 
      ORDER BY id
    `);
    
    console.log(`Encontrados ${sourceClients.rows.length} clientes para importar`);
    
    // Importar clientes
    for (const client of sourceClients.rows) {
      const {
        id, user_id, cashback_balance, referral_code, referred_by_code,
        total_cashback_earned, total_spent, total_transactions, created_at
      } = client;
      
      await targetDb.query(`
        INSERT INTO clients (
          id, user_id, cashback_balance, referral_code, referred_by_code,
          total_cashback_earned, total_spent, total_transactions, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          cashback_balance = EXCLUDED.cashback_balance,
          total_cashback_earned = EXCLUDED.total_cashback_earned,
          total_spent = EXCLUDED.total_spent,
          total_transactions = EXCLUDED.total_transactions
      `, [
        id, user_id, cashback_balance, referral_code, referred_by_code,
        total_cashback_earned, total_spent, total_transactions, created_at
      ]);
    }
    
    // Buscar merchants do banco de origem
    const sourceMerchants = await sourceDb.query(`
      SELECT id, user_id, business_name, cnpj, address, city, state, category,
             cashback_percentage, commission_rate, wallet_balance, total_sales,
             total_transactions, is_featured, created_at
      FROM merchants 
      ORDER BY id
    `);
    
    console.log(`Encontrados ${sourceMerchants.rows.length} merchants para importar`);
    
    // Importar merchants
    for (const merchant of sourceMerchants.rows) {
      const {
        id, user_id, business_name, cnpj, address, city, state, category,
        cashback_percentage, commission_rate, wallet_balance, total_sales,
        total_transactions, is_featured, created_at
      } = merchant;
      
      await targetDb.query(`
        INSERT INTO merchants (
          id, user_id, store_name, logo, category, address, city, state, country,
          company_logo, commission_rate, approved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          category = EXCLUDED.category,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          commission_rate = EXCLUDED.commission_rate
      `, [
        id, user_id, business_name, null, category, address, city, state, 'Brasil',
        null, commission_rate, true, created_at
      ]);
    }
    
    // Buscar transações do banco de origem
    const sourceTransactions = await sourceDb.query(`
      SELECT id, client_id, merchant_id, qr_code_id, amount, cashback_amount,
             commission_amount, referral_bonus, payment_method, status,
             description, source, created_at, processed_at
      FROM transactions 
      ORDER BY id
      LIMIT 100
    `);
    
    console.log(`Encontradas ${sourceTransactions.rows.length} transações para importar`);
    
    // Importar transações
    for (const transaction of sourceTransactions.rows) {
      const {
        id, client_id, merchant_id, qr_code_id, amount, cashback_amount,
        commission_amount, referral_bonus, payment_method, status,
        description, source, created_at, processed_at
      } = transaction;
      
      await targetDb.query(`
        INSERT INTO transactions (
          id, user_id, merchant_id, type, amount, description, status,
          offer_id, referral_id, created_at, cashback_amount, payment_method, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          cashback_amount = EXCLUDED.cashback_amount,
          status = EXCLUDED.status
      `, [
        id, client_id, merchant_id, 'purchase', amount, description, status,
        null, null, created_at, cashback_amount, payment_method, source || 'app'
      ]);
    }
    
    console.log('✅ Importação de usuários reais concluída com sucesso!');
    console.log(`Total importado:`);
    console.log(`- ${sourceUsers.rows.length} usuários`);
    console.log(`- ${sourceClients.rows.length} clientes`);
    console.log(`- ${sourceMerchants.rows.length} merchants`);
    console.log(`- ${sourceTransactions.rows.length} transações`);
    
  } catch (error) {
    console.error('Erro na importação:', error);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

importRealUsers();