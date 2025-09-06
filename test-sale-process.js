/**
 * Teste para verificar o processamento completo de vendas
 * Simula uma venda real no sistema
 */

import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function testSaleProcess() {
  console.log('🧪 Iniciando teste de processamento de vendas...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Verificar estrutura das tabelas
    console.log('📋 1. Verificando estrutura das tabelas...');
    
    const tablesCheck = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('transactions', 'cashbacks', 'users', 'merchants')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('✅ Tabelas encontradas:', tablesCheck.rows.length, 'colunas');
    
    // 2. Verificar usuários de teste
    console.log('👥 2. Verificando usuários de teste...');
    
    const users = await pool.query(`
      SELECT id, name, email, type 
      FROM users 
      WHERE email IN ('lojista@valecashback.com', 'alexsandro@email.com')
    `);
    
    console.log('✅ Usuários encontrados:', users.rows);
    
    // 3. Verificar merchant demo
    console.log('🏪 3. Verificando merchant demo...');
    
    const merchant = await pool.query(`
      SELECT m.id, m.store_name, m.user_id, u.name 
      FROM merchants m 
      JOIN users u ON m.user_id = u.id 
      WHERE u.email = 'lojista@valecashback.com'
    `);
    
    console.log('✅ Merchant encontrado:', merchant.rows[0]);
    
    // 4. Verificar transações recentes
    console.log('💰 4. Verificando transações recentes...');
    
    const recentTransactions = await pool.query(`
      SELECT t.id, t.amount, t.cashback_amount, t.created_at::text, 
             u.name as client_name, m.store_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN merchants m ON t.merchant_id = m.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    
    console.log('✅ Transações recentes:');
    recentTransactions.rows.forEach(tx => {
      console.log(`  - ID: ${tx.id}, Valor: R$ ${tx.amount}, Cashback: R$ ${tx.cashback_amount}`);
      console.log(`    Cliente: ${tx.client_name}, Loja: ${tx.store_name}`);
      console.log(`    Data: ${tx.created_at}`);
    });
    
    // 5. Verificar saldos de cashback
    console.log('💳 5. Verificando saldos de cashback...');
    
    const cashbacks = await pool.query(`
      SELECT c.user_id, c.balance, c.total_earned, u.name, u.email
      FROM cashbacks c
      JOIN users u ON c.user_id = u.id
      WHERE c.balance > 0
      ORDER BY c.balance DESC
      LIMIT 10
    `);
    
    console.log('✅ Saldos de cashback:');
    cashbacks.rows.forEach(cb => {
      console.log(`  - ${cb.name} (${cb.email}): Saldo: R$ ${cb.balance}, Total: R$ ${cb.total_earned}`);
    });
    
    // 6. Teste de inserção de nova venda
    console.log('🛒 6. Testando inserção de nova venda...');
    
    const testCustomerId = users.rows.find(u => u.email === 'alexsandro@email.com')?.id;
    const testMerchantId = merchant.rows[0]?.id;
    
    if (testCustomerId && testMerchantId) {
      const testAmount = 50.00;
      const testCashback = testAmount * 0.02; // 2%
      
      const newTransaction = await pool.query(`
        INSERT INTO transactions (user_id, merchant_id, amount, cashback_amount, payment_method, status, created_at)
        VALUES ($1, $2, $3, $4, 'pix', 'completed', NOW())
        RETURNING id, amount, cashback_amount, created_at::text
      `, [testCustomerId, testMerchantId, testAmount, testCashback]);
      
      console.log('✅ Nova transação criada:', newTransaction.rows[0]);
      
      // Atualizar cashback do cliente
      await pool.query(`
        INSERT INTO cashbacks (user_id, balance, total_earned, updated_at)
        VALUES ($1, $2, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          balance = CAST(cashbacks.balance AS DECIMAL) + $2,
          total_earned = CAST(cashbacks.total_earned AS DECIMAL) + $2,
          updated_at = NOW()
      `, [testCustomerId, testCashback]);
      
      console.log('✅ Cashback atualizado para o cliente');
    }
    
    // 7. Verificar configurações do sistema
    console.log('⚙️ 7. Verificando configurações do sistema...');
    
    const settings = await pool.query(`
      SELECT * FROM commission_settings LIMIT 1
    `);
    
    if (settings.rows.length > 0) {
      console.log('✅ Configurações encontradas:', settings.rows[0]);
    } else {
      console.log('❌ Nenhuma configuração encontrada');
    }
    
    console.log('✅ Teste de processamento de vendas concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await pool.end();
  }
}

// Executar teste
testSaleProcess().catch(console.error);