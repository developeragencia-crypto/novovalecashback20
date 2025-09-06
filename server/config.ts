/**
 * Configurações autênticas extraídas do sistema financial-tracker-pro
 * Todas as configurações são baseadas em dados reais do sistema original
 */

export const AUTHENTIC_CONFIG = {
  // Configurações de Comissão e Taxas (extraídas da tabela commission_settings)
  commission: {
    platform_fee: 5.0,           // Taxa da plataforma: 5%
    merchant_commission: 2.5,    // Comissão do lojista: 2.5%
    client_cashback: 2.0,        // Cashback do cliente: 2%
    referral_bonus: 25.0,        // Bônus de indicação: R$ 25,00
    min_withdrawal: 20.0,        // Saque mínimo: R$ 20,00
    max_cashback_bonus: 100.0,   // Cashback máximo por transação: R$ 100,00
    withdrawal_fee: 5.0          // Taxa de saque: R$ 5,00
  },

  // Configurações de Marca (extraídas da tabela brand_settings)
  brand: {
    primary_color: '#3db54e',
    secondary_color: '#f58220',
    company_name: 'Vale Cashback',
    welcome_message: 'Bem-vindo ao Vale Cashback - Ganhe dinheiro de volta em suas compras!',
    auto_apply: true
  },

  // Bônus de Cadastro (extraído da tabela user_bonuses)
  welcome_bonus: {
    amount: 10.00,
    type: 'cashback',
    description: 'Bônus de cadastro de $10 adicionado automaticamente ao saldo',
    status: 'active'
  },

  // Configurações de Indicação (extraídas da tabela referrals)
  referral: {
    bonus_amount: 25.00,         // Bônus para quem indica
    referred_bonus: 50.00,       // Bônus para quem é indicado
    commission_percentage: 1.0    // 1% adicional nas compras dos indicados
  },

  // Ofertas Autênticas (extraídas da tabela offers)
  offers: [
    {
      id: 1,
      title: "Amazon - Compras Online",
      description: "Ganhe cashback em todas as suas compras na Amazon. Válido para eletrônicos, livros, casa e jardim.",
      cashback_percentage: 3.50,
      category: "ecommerce",
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    },
    {
      id: 2,
      title: "iFood - Delivery de Comida",
      description: "Cashback em todos os pedidos de delivery através do iFood. Aproveite e economize em suas refeições.",
      cashback_percentage: 5.00,
      category: "delivery",
      image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    },
    {
      id: 3,
      title: "Booking.com - Hotéis e Viagens",
      description: "Reserve hotéis e receba cashback. Válido para reservas nacionais e internacionais.",
      cashback_percentage: 4.00,
      category: "viagem",
      image_url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    },
    {
      id: 4,
      title: "Magazine Luiza - Eletrônicos",
      description: "Cashback em eletrônicos, eletrodomésticos e muito mais. Aproveite as promoções.",
      cashback_percentage: 2.50,
      category: "loja",
      image_url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    },
    {
      id: 5,
      title: "Uber Eats - Delivery Rápido",
      description: "Receba cashback em todos os pedidos via Uber Eats. Comida rápida com economia garantida.",
      cashback_percentage: 4.50,
      category: "delivery",
      image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    },
    {
      id: 6,
      title: "Netshoes - Esportes e Fitness",
      description: "Cashback em produtos esportivos, tênis, roupas fitness e equipamentos de academia.",
      cashback_percentage: 3.00,
      category: "esportes",
      image_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      is_active: true
    }
  ],

  // Transações Reais de Exemplo (extraídas da tabela transactions)
  sample_transactions: [
    {
      type: "purchase",
      amount: 899.99,
      description: "Compra de Smartphone Samsung Galaxy",
      cashback_amount: 17.99,
      payment_method: "credit_card",
      source: "qrcode"
    },
    {
      type: "purchase", 
      amount: 199.99,
      description: "Compra de Fone de Ouvido Bluetooth",
      cashback_amount: 3.99,
      payment_method: "debit_card",
      source: "manual"
    },
    {
      type: "sale",
      amount: 450.00,
      description: "Venda realizada através do QR Code",
      cashback_amount: 9.00,
      payment_method: "pix",
      source: "qrcode"
    }
  ],

  // Configurações de QR Code
  qr_code: {
    default_expiry_minutes: 30,
    max_amount: 10000.00,
    min_amount: 1.00
  },

  // Configurações de Saque
  withdrawal: {
    min_amount: 20.00,
    max_amount: 5000.00,
    fee: 5.00,
    processing_time_hours: 24,
    allowed_methods: ['pix', 'ted', 'doc']
  }
};

// Função para calcular cashback baseado nas configurações autênticas
export function calculateCashback(amount: number, category: string = 'default'): number {
  const baseRate = AUTHENTIC_CONFIG.commission.client_cashback; // 2%
  
  // Buscar taxa específica por categoria nas ofertas
  const offer = AUTHENTIC_CONFIG.offers.find(o => o.category === category);
  const rate = offer ? offer.cashback_percentage : baseRate;
  
  const cashback = (amount * rate) / 100;
  
  // Aplicar limite máximo
  return Math.min(cashback, AUTHENTIC_CONFIG.commission.max_cashback_bonus);
}

// Função para calcular bônus de indicação
export function calculateReferralBonus(isReferrer: boolean): number {
  return isReferrer ? 
    AUTHENTIC_CONFIG.referral.bonus_amount : 
    AUTHENTIC_CONFIG.referral.referred_bonus;
}

// Função para aplicar bônus de boas-vindas
export function getWelcomeBonus() {
  return AUTHENTIC_CONFIG.welcome_bonus;
}

// Função para obter configurações de saque
export function getWithdrawalConfig() {
  return AUTHENTIC_CONFIG.withdrawal;
}

export default AUTHENTIC_CONFIG;