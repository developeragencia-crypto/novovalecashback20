// Netlify serverless function para API do Vale Cashback
const express = require('express');
const serverless = require('serverless-http');
const { Pool } = require('pg');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');

// Criar aplicação Express
const app = express();

// Configurações do middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicializar banco de dados
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'vale-cashback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware de autenticação
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Usuário não autenticado" });
};

// Rota básica de verificação
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint de login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, type } = req.body;
    // Usuários de teste para demonstração
    const testUsers = {
      'admin@valecashback.com': {
        id: 1,
        password: 'senha123',
        name: 'Administrador',
        type: 'admin',
        email: 'admin@valecashback.com'
      },
      'cliente@valecashback.com': {
        id: 2,
        password: 'senha123',
        name: 'Cliente Teste',
        type: 'client',
        email: 'cliente@valecashback.com'
      },
      'lojista@valecashback.com': {
        id: 3,
        password: 'senha123',
        name: 'Lojista Teste',
        type: 'merchant',
        email: 'lojista@valecashback.com'
      }
    };

    const user = testUsers[email];
    if (!user || user.password !== password || user.type !== type) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Login bem-sucedido
    req.session.userId = user.id;
    req.session.userType = user.type;

    // Retornar informações do usuário (exceto senha)
    const { password: _, ...userInfo } = user;
    res.json(userInfo);
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Endpoint de logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.status(200).json({ message: 'Logout realizado com sucesso' });
});

// Endpoint para obter informações do usuário atual
app.get('/api/user', isAuthenticated, (req, res) => {
  // Usando usuários de teste para demonstração
  const testUsers = {
    1: {
      id: 1,
      name: 'Administrador',
      email: 'admin@valecashback.com',
      type: 'admin'
    },
    2: {
      id: 2,
      name: 'Cliente Teste',
      email: 'cliente@valecashback.com',
      type: 'client'
    },
    3: {
      id: 3,
      name: 'Lojista Teste',
      email: 'lojista@valecashback.com',
      type: 'merchant'
    }
  };
  
  const user = testUsers[req.session.userId];
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }
  
  res.json(user);
});

// Endpoint para dashboard do cliente
app.get('/api/client/dashboard', isAuthenticated, (req, res) => {
  // Dados de demonstração
  res.json({
    cashbackBalance: 157.35,
    earnedThisMonth: 35.80,
    totalCashbackEarned: 420.15,
    recentTransactions: [
      {
        id: 32,
        storeName: "Loja do Lojista Teste",
        amount: 94.50,
        cashbackAmount: 1.89,
        date: "2025-05-11T14:32:00Z",
        status: "completed"
      },
      {
        id: 31,
        storeName: "Loja do Lojista Teste",
        amount: 58.50,
        cashbackAmount: 1.17,
        date: "2025-05-10T10:15:00Z",
        status: "completed"
      }
    ]
  });
});

// Endpoint para dashboard do lojista
app.get('/api/merchant/dashboard', isAuthenticated, (req, res) => {
  // Dados de demonstração
  res.json({
    dailySales: 1250.75,
    monthlyIncome: 28450.30,
    pendingWithdrawals: 0,
    walletBalance: 1540.25,
    recentTransactions: [
      {
        id: 32,
        customerName: "Cliente Teste",
        amount: 94.50,
        cashbackAmount: 1.89,
        date: "2025-05-11T14:32:00Z"
      },
      {
        id: 31,
        customerName: "Cliente Teste",
        amount: 58.50,
        cashbackAmount: 1.17,
        date: "2025-05-10T10:15:00Z"
      }
    ]
  });
});

// Endpoint para dashboard do admin
app.get('/api/admin/dashboard', isAuthenticated, (req, res) => {
  // Dados de demonstração
  res.json({
    userCount: "68",
    merchantCount: "15",
    transactionCount: "32",
    transactionTotal: "12450.75",
    pendingTransfersCount: "0"
  });
});

// Criar o handler serverless
const handler = serverless(app);

// Exportar o handler
exports.handler = async (event, context) => {
  return await handler(event, context);
};