/**
 * Teste para verificar se o sistema de vendas está funcionando
 */
const fetch = require('node-fetch');

async function testSale() {
  const saleData = {
    customerId: 5, // Cliente Demo
    items: [],
    subtotal: 100,
    discount: 0,
    total: 100,
    cashback: 2, // 2% de 100
    referralBonus: 0,
    platformFee: 5,
    merchantCommission: 95,
    referrerId: null,
    paymentMethod: 'cash',
    notes: 'Teste de venda via script',
    sendReceipt: false,
    manualAmount: 100
  };

  try {
    console.log('🧪 Testando venda com dados:', JSON.stringify(saleData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/merchant/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saleData)
    });

    const result = await response.json();
    console.log('📊 Resposta da API:', JSON.stringify(result, null, 2));
    console.log('✅ Status:', response.status);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testSale();