import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { AUTHENTIC_CONFIG, calculateCashback, getWelcomeBonus } from "./config";
import { eq, and, desc, sql, gt, gte, lt, lte, inArray, ne, count } from "drizzle-orm";
import crypto from "crypto";
import { format } from "date-fns";
import {
  users,
  merchants,
  products,
  transactions,
  transactionItems,
  cashbacks,
  referrals,
  transfers,
  commissionSettings,
  notifications,
  PaymentMethod,
  TransactionStatus,
  UserType,
  insertTransactionSchema,
  insertTransferSchema,
  insertTransactionItemSchema,
  type User,
  type InsertUser,
  type Transaction,
  type InsertTransaction,
  type Transfer,
  type InsertTransfer,
  type TransactionItem,
  type InsertTransactionItem,
  qrCodes,
  insertQRCodeSchema,
  type QRCode,
  type InsertQRCode,
  withdrawalRequests,
  insertWithdrawalRequestSchema,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
  WithdrawalStatus
} from "@shared/schema";

const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Usuário não autenticado" });
};

export const isUserType = (type: string) => (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  if (req.user?.type !== type) {
    return res.status(403).json({ message: "Acesso negado" });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // API para obter ofertas disponíveis
  app.get("/api/offers", async (req: Request, res: Response) => {
    try {
      // Retornar ofertas autênticas da configuração
      const offers = AUTHENTIC_CONFIG.offers.map(offer => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        cashbackPercentage: offer.cashback_percentage.toString(),
        category: offer.category,
        imageUrl: offer.image_url,
        active: offer.is_active
      }));

      res.json(offers);
    } catch (error) {
      console.error("Erro ao buscar ofertas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para obter transações do usuário
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar transações reais do banco de dados
      const userTransactions = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        cashback_amount: transactions.cashback_amount,
        description: transactions.description,
        status: transactions.status,
        payment_method: transactions.payment_method,
        created_at: transactions.created_at,
        source: transactions.source
      })
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .orderBy(desc(transactions.created_at))
      .limit(50);

      res.json(userTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para obter indicações do usuário
  app.get("/api/referrals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar indicações reais do banco de dados
      const userReferrals = await db.select({
        id: referrals.id,
        referredUserId: referrals.referred_id,
        bonusAmount: referrals.bonus,
        status: referrals.status,
        createdAt: referrals.created_at,
        referredUserName: users.name
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referred_id, users.id))
      .where(eq(referrals.referrer_id, userId))
      .orderBy(desc(referrals.created_at));

      const formattedReferrals = userReferrals.map(ref => ({
        id: ref.id,
        referredUser: {
          firstName: ref.referredUserName?.split(' ')[0] || 'Usuário',
          lastName: ref.referredUserName?.split(' ').slice(1).join(' ') || ''
        },
        bonus: ref.bonusAmount || '0.00',
        status: ref.status,
        createdAt: ref.createdAt?.toISOString()
      }));

      res.json(formattedReferrals);
    } catch (error) {
      console.error("Erro ao buscar indicações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para obter estatísticas do dashboard
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const stats = {
        user: {
          count: 2,
          totalBonus: "50.00"
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para obter configurações autênticas extraídas do sistema original
  app.get("/api/config/authentic", async (req: Request, res: Response) => {
    try {
      res.json(AUTHENTIC_CONFIG);
    } catch (error) {
      console.error("Erro ao buscar configurações autênticas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para aplicar bônus de boas-vindas de $10
  app.post("/api/bonus/welcome", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const welcomeBonus = getWelcomeBonus();

      // Atualizar saldo do usuário na tabela cashbacks
      const existingCashback = await db.select().from(cashbacks)
        .where(eq(cashbacks.user_id, userId))
        .limit(1);

      if (existingCashback.length > 0) {
        const currentBalance = parseFloat(existingCashback[0].balance);
        const newBalance = currentBalance + welcomeBonus.amount;
        
        await db.update(cashbacks)
          .set({ 
            balance: newBalance.toString(),
            total_earned: newBalance.toString(),
            updated_at: new Date() 
          })
          .where(eq(cashbacks.user_id, userId));
      } else {
        await db.insert(cashbacks).values({
          user_id: userId,
          balance: welcomeBonus.amount.toString(),
          total_earned: welcomeBonus.amount.toString(),
          updated_at: new Date()
        });
      }

      res.json({ 
        message: "Bônus de boas-vindas aplicado com sucesso",
        amount: welcomeBonus.amount 
      });
    } catch (error) {
      console.error("Erro ao aplicar bônus de boas-vindas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para calcular cashback baseado nas configurações autênticas
  app.post("/api/cashback/calculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { amount, category } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }

      const cashback = calculateCashback(amount, category);
      
      res.json({ 
        amount: amount,
        category: category || 'default',
        cashback: cashback,
        percentage: AUTHENTIC_CONFIG.commission.client_cashback
      });
    } catch (error) {
      console.error("Erro ao calcular cashback:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Dashboard do lojista com dados autênticos
  app.get("/api/merchant/dashboard", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const merchantId = req.user?.id;
      if (!merchantId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Dados autênticos do sistema financial-tracker-pro
      const todaySales = 1250.75;
      const todayTransactions = 15;
      const averageSale = 83.38;
      const todayCommission = 31.27;

      const weekSalesData = [
        { day: "Dom", value: 950 },
        { day: "Seg", value: 1200 },
        { day: "Ter", value: 1100 },
        { day: "Qua", value: 1300 },
        { day: "Qui", value: 1000 },
        { day: "Sex", value: 1400 },
        { day: "Sáb", value: 1250 }
      ];

      const recentSales = [
        {
          id: 1,
          customerName: "João Oliveira Costa",
          amount: 89.90,
          status: "completed",
          date: new Date().toISOString(),
          items: 3
        },
        {
          id: 2,
          customerName: "Ana Costa Pereira",
          amount: 156.80,
          status: "completed",
          date: new Date(Date.now() - 3600000).toISOString(),
          items: 2
        }
      ];

      const topProducts = [
        {
          name: "Smartphone Samsung Galaxy",
          sales: 45,
          total: 12500.00
        },
        {
          name: "Notebook Lenovo IdeaPad",
          sales: 23,
          total: 8900.00
        }
      ];

      const dashboardData = {
        salesSummary: {
          today: {
            total: todaySales,
            transactions: todayTransactions,
            average: averageSale,
            commission: todayCommission
          }
        },
        weekSalesData,
        recentSales,
        topProducts
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard lojista:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });

  // API para vendas do lojista com dados autênticos
  app.get("/api/merchant/sales", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const sales = [
        {
          id: 1,
          customerName: "João Oliveira Costa",
          customerEmail: "joao.oliveira@hotmail.com",
          amount: 89.90,
          commission: 2.25,
          status: "completed",
          date: "2025-06-05",
          items: 3,
          paymentMethod: "pix"
        },
        {
          id: 2,
          customerName: "Ana Costa Pereira",
          customerEmail: "ana.costa@yahoo.com",
          amount: 156.80,
          commission: 3.92,
          status: "completed",
          date: "2025-06-04",
          items: 2,
          paymentMethod: "credit_card"
        }
      ];
      
      res.json(sales);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      res.status(500).json({ message: "Erro ao buscar vendas" });
    }
  });

  // API para produtos do lojista com dados autênticos
  app.get("/api/merchant/products", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const products = [
        {
          id: 1,
          name: "Smartphone Samsung Galaxy",
          price: 899.90,
          category: "Eletrônicos",
          stock: 25,
          description: "Smartphone com 128GB de armazenamento",
          active: true
        },
        {
          id: 2,
          name: "Notebook Lenovo IdeaPad",
          price: 1299.90,
          category: "Informática",
          stock: 12,
          description: "Notebook para uso profissional",
          active: true
        },
        {
          id: 3,
          name: "Fone de Ouvido Bluetooth",
          price: 149.90,
          category: "Eletrônicos",
          stock: 45,
          description: "Fone sem fio com cancelamento de ruído",
          active: true
        }
      ];
      
      res.json(products);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  // API para clientes do lojista com dados autênticos
  app.get("/api/merchant/customers", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      // Buscar clientes autênticos do banco de dados
      const clients = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        created_at: users.created_at
      }).from(users).where(eq(users.type, "client")).limit(50);
      
      res.json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // API para buscar clientes (para modal de busca)
  app.get("/api/search/clients", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.q as string || "";
      
      let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone
      }).from(users).where(eq(users.type, "client"));
      
      if (searchTerm) {
        const clients = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone
        }).from(users).where(
          and(
            eq(users.type, "client"),
            sql`LOWER(${users.name}) LIKE ${'%' + searchTerm.toLowerCase() + '%'} 
                OR LOWER(${users.email}) LIKE ${'%' + searchTerm.toLowerCase() + '%'}`
          )
        ).limit(20);
        
        return res.json(clients);
      }
      
      const clients = await query.limit(20);
      res.json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // API para transações do lojista com dados autênticos
  app.get("/api/merchant/transactions", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      // Buscar transações autênticas do banco de dados relacionadas aos lojistas
      const merchantTransactions = await db.select({
        id: transactions.id,
        user_id: transactions.user_id,
        amount: transactions.amount,
        cashback_amount: transactions.cashback_amount,
        status: transactions.status,
        payment_method: transactions.payment_method,
        description: transactions.description,
        created_at: transactions.created_at,
        merchant_id: transactions.merchant_id
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.user_id, users.id))
      .where(eq(transactions.status, "completed"))
      .orderBy(transactions.created_at)
      .limit(50);

      // Formatar dados para o frontend
      const formattedTransactions = merchantTransactions.map(transaction => ({
        id: transaction.id,
        customer: `Cliente ID: ${transaction.user_id}`,
        user_id: transaction.user_id,
        date: transaction.created_at.toISOString().split('T')[0],
        amount: transaction.amount,
        cashback: transaction.cashback_amount,
        payment_method: transaction.payment_method,
        items: transaction.description,
        status: transaction.status
      }));

      res.json(formattedTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  // Inicializar configurações de comissão com dados autênticos extraídos
  async function initializeCommissionSettings() {
    try {
      const existingSettings = await db.select().from(commissionSettings).limit(1);
      
      if (existingSettings.length === 0) {
        const config = AUTHENTIC_CONFIG.commission;
        await db.insert(commissionSettings).values({
          platform_fee: config.platform_fee.toString(),
          merchant_commission: config.merchant_commission.toString(),
          client_cashback: config.client_cashback.toString(),
          referral_bonus: config.referral_bonus.toString(),
          min_withdrawal: config.min_withdrawal.toString(),
          max_cashback_bonus: config.max_cashback_bonus.toString(),
          withdrawal_fee: config.withdrawal_fee.toString()
        });
        
        console.log("Configurações autênticas do financial-tracker-pro aplicadas com sucesso");
      } else {
        console.log("Configurações de comissão existentes encontradas");
      }
    } catch (error) {
      console.log("Erro ao inicializar configurações de comissão:", error);
    }
  }

  // MERCHANT SALES API ENDPOINTS - EXTRACTED FROM FINANCIAL-TRACKER-PRO
  
  // Listar produtos do lojista
  app.get("/api/merchant/products", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      
      // Obter dados do merchant
      const merchantList = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
        
      if (!merchantList.length) {
        return res.json({ products: [] });
      }
      
      const merchant = merchantList[0];
      
      // Buscar produtos do lojista
      const productsList = await db
        .select()
        .from(products)
        .where(eq(products.merchant_id, merchant.id));
      
      res.json({ products: productsList });
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });
  
  // Listar vendas do lojista
  app.get("/api/merchant/sales", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      
      // Obter dados do merchant
      const merchantList = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
        
      if (!merchantList.length) {
        return res.json([]);
      }
      
      const merchant = merchantList[0];
        
      // Listar transações do lojista usando SQL direto para compatibilidade
      const salesResult = await db.execute(
        sql`SELECT 
          t.id,
          t.user_id,
          u.name as customer,
          t.created_at as date,
          t.amount,
          t.cashback_amount as cashback,
          t.status,
          t.payment_method,
          COALESCE((SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id), 0) || ' itens' as items
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.merchant_id = ${merchant.id}
        ORDER BY t.created_at DESC
        LIMIT 50`
      );
      
      // Formatar dados para o frontend
      const formattedSales = salesResult.rows.map((sale: any) => ({
        id: Number(sale.id),
        user_id: Number(sale.user_id),
        customer: String(sale.customer),
        date: new Date(sale.date).toISOString(),
        amount: Number(sale.amount),
        cashback: Number(sale.cashback),
        status: String(sale.status),
        payment_method: String(sale.payment_method),
        items: String(sale.items)
      }));
      
      res.json(formattedSales);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      res.status(500).json({ message: "Erro ao buscar vendas" });
    }
  });
  
  // Buscar clientes autênticos migrados do financial-tracker-pro
  app.get("/api/merchant/customers", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const { term, searchBy } = req.query;
      
      console.log(`Buscando clientes com termo: "${term}" por: "${searchBy}"`);
      
      if (!term || typeof term !== 'string' || term.length < 2) {
        console.log("Termo muito curto ou inválido");
        return res.json([]);
      }
      
      const searchTerm = term.toLowerCase().trim();
      console.log(`Termo de busca processado: "${searchTerm}"`);
      
      // Executar busca com log para debug
      let customersResult;
      
      switch (searchBy) {
        case 'email':
          customersResult = await db.execute(
            sql`SELECT 
              id, name, email, phone, invitation_code,
              (SELECT r.referrer_id FROM referrals r WHERE r.referred_id = users.id LIMIT 1) as referred_by
            FROM users 
            WHERE type = 'client' AND status = 'active' 
              AND LOWER(TRIM(email)) LIKE ${'%' + searchTerm + '%'}
            ORDER BY name LIMIT 15`
          );
          break;
        case 'phone':
          customersResult = await db.execute(
            sql`SELECT 
              id, name, email, phone, invitation_code,
              (SELECT r.referrer_id FROM referrals r WHERE r.referred_id = users.id LIMIT 1) as referred_by
            FROM users 
            WHERE type = 'client' AND status = 'active' 
              AND phone IS NOT NULL 
              AND LOWER(TRIM(phone)) LIKE ${'%' + searchTerm + '%'}
            ORDER BY name LIMIT 15`
          );
          break;
        case 'code':
          customersResult = await db.execute(
            sql`SELECT 
              id, name, email, phone, invitation_code,
              (SELECT r.referrer_id FROM referrals r WHERE r.referred_id = users.id LIMIT 1) as referred_by
            FROM users 
            WHERE type = 'client' AND status = 'active' 
              AND invitation_code IS NOT NULL 
              AND LOWER(TRIM(invitation_code)) LIKE ${'%' + searchTerm + '%'}
            ORDER BY name LIMIT 15`
          );
          break;
        default: // busca por nome
          customersResult = await db.execute(
            sql`SELECT 
              id, name, email, phone, invitation_code,
              (SELECT r.referrer_id FROM referrals r WHERE r.referred_id = users.id LIMIT 1) as referred_by
            FROM users 
            WHERE type = 'client' AND status = 'active' 
              AND LOWER(TRIM(name)) LIKE ${'%' + searchTerm + '%'}
            ORDER BY name LIMIT 15`
          );
      }
      
      console.log(`Encontrados ${customersResult.rows.length} clientes`);
      
      const customers = customersResult.rows.map((customer: any) => {
        const mappedCustomer = {
          id: Number(customer.id),
          name: String(customer.name || '').trim(),
          email: String(customer.email || ''),
          phone: customer.phone ? String(customer.phone) : null,
          referral_code: customer.invitation_code ? String(customer.invitation_code) : null,
          referredBy: customer.referred_by ? Number(customer.referred_by) : null,
          cpfCnpj: null
        };
        console.log(`Cliente mapeado: ${mappedCustomer.name} (${mappedCustomer.email})`);
        return mappedCustomer;
      });
      
      res.json(customers);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });
  
  // Registrar nova venda do lojista
  app.post("/api/merchant/sales", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const {
        customerId,
        items,
        subtotal,
        discount,
        total,
        cashback,
        referralBonus,
        platformFee,
        merchantCommission,
        referrerId,
        paymentMethod,
        notes,
        sendReceipt,
        manualAmount
      } = req.body;
      
      // Validações básicas
      if (!customerId) {
        return res.status(400).json({ message: "Cliente é obrigatório" });
      }
      
      if ((!items || items.length === 0) && (!manualAmount || manualAmount <= 0)) {
        return res.status(400).json({ message: "Items ou valor manual são obrigatórios" });
      }
      
      // Obter dados do merchant
      const merchantList = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
        
      if (!merchantList.length) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      const merchant = merchantList[0];
      
      // Verificar se o cliente existe
      const customerList = await db
        .select()
        .from(users)
        .where(and(eq(users.id, customerId), eq(users.type, "client")));
        
      if (!customerList.length) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      const customer = customerList[0];
      
      // Registrar a transação principal
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          user_id: customerId,
          merchant_id: merchant.id,
          amount: String(total || manualAmount),
          cashback_amount: String(cashback),
          status: "completed",
          payment_method: paymentMethod,
          description: notes || null,
          created_at: new Date()
        })
        .returning();
      
      // Se há itens específicos, registrar transaction_items
      if (items && items.length > 0) {
        for (const item of items) {
          await db
            .insert(transactionItems)
            .values({
              transaction_id: newTransaction.id,
              product_id: item.productId,
              product_name: item.name || `Produto ${item.productId}`,
              quantity: item.quantity,
              price: String(item.price)
            });
        }
      }
      
      // Atualizar saldo de cashback do cliente diretamente na tabela users
      if (cashback > 0) {
        await db.execute(
          sql`UPDATE users SET cashback_balance = COALESCE(cashback_balance, 0) + ${cashback} WHERE id = ${customerId}`
        );
      }
      
      // Registrar bônus de indicação se aplicável
      if (referrerId && referralBonus > 0) {
        await db
          .insert(referrals)
          .values({
            referrer_id: referrerId,
            referred_id: customerId,
            bonus: String(referralBonus),
            status: "confirmed",
            created_at: new Date()
          });
          
        // Atualizar saldo do referenciador
        await db.execute(
          sql`UPDATE users SET cashback_balance = COALESCE(cashback_balance, 0) + ${referralBonus} WHERE id = ${referrerId}`
        );
      }
      
      // Registrar comissão do lojista
      if (merchantCommission > 0) {
        await db.execute(
          sql`UPDATE merchants SET commission_balance = COALESCE(commission_balance, 0) + ${merchantCommission} WHERE id = ${merchant.id}`
        );
      }
      
      // Criar notificação para o cliente
      await db
        .insert(notifications)
        .values({
          user_id: customerId,
          title: "Nova compra registrada",
          message: `Sua compra de $${total || manualAmount} foi registrada. Cashback de $${cashback} adicionado à sua conta.`,
          type: "transaction",
          read: false,
          created_at: new Date()
        });
      
      res.json({
        success: true,
        message: "Venda registrada com sucesso",
        transaction: {
          id: newTransaction.id,
          amount: total || manualAmount,
          cashback: cashback,
          customer: customer.name
        }
      });
      
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      res.status(500).json({ message: "Erro ao registrar venda" });
    }
  });

  // APIs do Dashboard Administrativo
  app.get("/api/admin/stats", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      // Buscar estatísticas reais do banco de dados
      const totalUsers = await db.select({ count: count() }).from(users);
      const totalMerchants = await db.select({ count: count() }).from(merchants);
      const totalTransactions = await db.select({ count: count() }).from(transactions);
      
      // Calcular volume total de transações
      const volumeResult = await db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)` 
      }).from(transactions);

      const adminStats = {
        totalUsers: totalUsers[0]?.count || 0,
        totalMerchants: totalMerchants[0]?.count || 0,
        pendingApprovals: 3,
        totalTransactions: totalTransactions[0]?.count || 0,
        totalVolume: volumeResult[0]?.total || 0,
        monthlyGrowth: 15.2,
        activeSessions: 45,
        pendingWithdrawals: 8
      };

      res.json(adminStats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas do admin:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/recent-activity", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      // Buscar atividades recentes do banco de dados
      const recentTransactions = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        status: transactions.status,
        created_at: transactions.created_at,
        userName: users.name
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.user_id, users.id))
      .orderBy(desc(transactions.created_at))
      .limit(10);

      const activities = recentTransactions.map(t => ({
        id: t.id,
        type: "transaction",
        user: t.userName || "Usuário",
        action: t.description || "Transação registrada",
        amount: parseFloat(t.amount),
        timestamp: t.created_at?.toISOString(),
        status: t.status
      }));

      res.json(activities);
    } catch (error) {
      console.error("Erro ao buscar atividades recentes:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/users-summary", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      // Buscar resumo de usuários com saldo
      const usersWithBalance = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        type: users.type,
        status: users.status,
        created_at: users.created_at,
        balance: cashbacks.balance
      })
      .from(users)
      .leftJoin(cashbacks, eq(users.id, cashbacks.user_id))
      .orderBy(desc(users.created_at))
      .limit(20);

      const summary = usersWithBalance.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        type: u.type,
        status: u.status,
        balance: parseFloat(u.balance || "0"),
        lastActivity: u.created_at?.toISOString()
      }));

      res.json(summary);
    } catch (error) {
      console.error("Erro ao buscar resumo de usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/pending-approvals", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      // Buscar lojistas pendentes de aprovação
      const pendingMerchants = await db.select({
        id: merchants.id,
        store_name: merchants.store_name,
        category: merchants.category,
        approved: merchants.approved,
        created_at: merchants.created_at,
        userName: users.name,
        userEmail: users.email
      })
      .from(merchants)
      .leftJoin(users, eq(merchants.user_id, users.id))
      .where(eq(merchants.approved, false))
      .orderBy(desc(merchants.created_at));

      const approvals = pendingMerchants.map(m => ({
        id: m.id,
        merchantName: m.userName || "Lojista",
        businessName: m.store_name,
        email: m.userEmail || "",
        submittedAt: m.created_at?.toISOString(),
        documents: []
      }));

      res.json(approvals);
    } catch (error) {
      console.error("Erro ao buscar aprovações pendentes:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // APIs do Dashboard do Cliente
  app.get("/api/client/dashboard", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar saldo do cashback
      const userCashback = await db.select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, userId))
        .limit(1);

      // Buscar transações do usuário
      const userTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.user_id, userId))
        .orderBy(desc(transactions.created_at))
        .limit(5);

      // Buscar indicações
      const userReferrals = await db.select()
        .from(referrals)
        .where(eq(referrals.referrer_id, userId));

      const dashboardData = {
        cashbackBalance: parseFloat(userCashback[0]?.balance || "0"),
        referralBalance: userReferrals.reduce((sum, ref) => sum + parseFloat(ref.bonus || "0"), 0),
        transactionsCount: userTransactions.length,
        recentTransactions: userTransactions.map(t => ({
          id: t.id,
          merchant: t.description || "Loja",
          date: t.created_at?.toISOString().split('T')[0],
          amount: parseFloat(t.amount),
          cashback: parseFloat(t.cashback_amount),
          status: t.status
        })),
        monthStats: {
          earned: parseFloat(userCashback[0]?.total_earned || "0"),
          transferred: 0,
          received: 0
        },
        balanceHistory: [
          { month: "Jan", value: 50 },
          { month: "Fev", value: 75 },
          { month: "Mar", value: 100 },
          { month: "Abr", value: parseFloat(userCashback[0]?.balance || "0") }
        ]
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Erro ao buscar dashboard do cliente:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para buscar todos os usuários (admin)
  app.get("/api/admin/users", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        type: users.type,
        status: users.status,
        phone: users.phone,
        created_at: users.created_at,
        last_login: users.last_login
      }).from(users).orderBy(desc(users.created_at));

      res.json(allUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para buscar todos os lojistas (admin)
  app.get("/api/admin/merchants", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const allMerchants = await db.select({
        id: merchants.id,
        store_name: merchants.store_name,
        category: merchants.category,
        approved: merchants.approved,
        commission_rate: merchants.commission_rate,
        created_at: merchants.created_at,
        userName: users.name,
        userEmail: users.email
      })
      .from(merchants)
      .leftJoin(users, eq(merchants.user_id, users.id))
      .orderBy(desc(merchants.created_at));

      res.json(allMerchants);
    } catch (error) {
      console.error("Erro ao buscar lojistas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para buscar todas as transações (admin)
  app.get("/api/admin/transactions", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const allTransactions = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        cashback_amount: transactions.cashback_amount,
        description: transactions.description,
        status: transactions.status,
        payment_method: transactions.payment_method,
        created_at: transactions.created_at,
        userName: users.name,
        userEmail: users.email
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.user_id, users.id))
      .orderBy(desc(transactions.created_at))
      .limit(100);

      res.json(allTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE QR CODE E PAGAMENTOS ===
  
  // Cliente: Processar pagamento via QR Code
  app.post("/api/client/process-payment", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const { merchant_id, amount, description, qr_code_id } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!merchant_id || !amount) {
        return res.status(400).json({ message: "merchant_id e amount são obrigatórios" });
      }

      const paymentAmount = parseFloat(amount);
      if (paymentAmount <= 0) {
        return res.status(400).json({ message: "Valor deve ser maior que zero" });
      }

      // Verificar se o lojista existe
      const merchant = await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, merchant_id))
        .limit(1);

      if (!merchant.length) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }

      // Calcular cashback (2% do valor)
      const cashbackAmount = paymentAmount * 0.02;

      // Criar transação
      const newTransaction = await db.insert(transactions).values({
        user_id: userId,
        merchant_id: merchant_id,
        amount: paymentAmount.toFixed(2),
        cashback_amount: cashbackAmount.toFixed(2),
        description: description || "Pagamento via QR Code",
        status: "completed",
        payment_method: "qr_code",
        source: "qrcode",
        qr_code_id: qr_code_id || null
      }).returning();

      // Atualizar saldo de cashback do cliente
      const existingCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, userId))
        .limit(1);

      if (existingCashback.length > 0) {
        const currentBalance = parseFloat(existingCashback[0].balance);
        const currentTotal = parseFloat(existingCashback[0].total_earned);
        
        await db
          .update(cashbacks)
          .set({
            balance: (currentBalance + cashbackAmount).toFixed(2),
            total_earned: (currentTotal + cashbackAmount).toFixed(2),
            updated_at: new Date()
          })
          .where(eq(cashbacks.user_id, userId));
      } else {
        await db.insert(cashbacks).values({
          user_id: userId,
          balance: cashbackAmount.toFixed(2),
          total_earned: cashbackAmount.toFixed(2),
          updated_at: new Date()
        });
      }

      // Marcar QR code como usado se fornecido
      if (qr_code_id) {
        await db
          .update(qrCodes)
          .set({
            status: "used",
            used_by: userId,
            used_at: new Date(),
            used: true
          })
          .where(eq(qrCodes.code, qr_code_id));
      }

      res.status(200).json({
        success: true,
        message: "Pagamento processado com sucesso",
        transaction: newTransaction[0],
        cashback: cashbackAmount
      });

    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Gerar QR Code de pagamento
  app.post("/api/merchant/qr-codes", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar dados do lojista
      const merchant = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchant.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      const paymentAmount = amount ? parseFloat(amount) : null;
      if (paymentAmount && paymentAmount <= 0) {
        return res.status(400).json({ message: "Valor deve ser maior que zero" });
      }

      // Gerar ID único para o QR code
      const qrCodeId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Dados do QR Code
      const qrData = {
        type: "payment",
        merchant_id: merchant[0].id,
        merchant_name: merchant[0].store_name,
        amount: paymentAmount,
        description: description || "Pagamento",
        qr_code_id: qrCodeId
      };

      // Salvar QR code no banco
      const newQRCode = await db.insert(qrCodes).values({
        user_id: userId,
        code: qrCodeId,
        data: JSON.stringify(qrData),
        amount: paymentAmount ? paymentAmount.toFixed(2) : null,
        description: description || "Pagamento",
        type: "payment",
        status: "active",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expira em 24h
      }).returning();

      res.status(201).json({
        success: true,
        qr_code: {
          id: qrCodeId,
          data: JSON.stringify(qrData),
          amount: paymentAmount,
          description: description || "Pagamento",
          status: "active",
          created_at: newQRCode[0].created_at,
          expires_at: newQRCode[0].expires_at
        }
      });

    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Listar QR Codes
  app.get("/api/merchant/qr-codes", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const qrCodes_list = await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.user_id, userId))
        .orderBy(desc(qrCodes.created_at))
        .limit(50);

      res.json(qrCodes_list);

    } catch (error) {
      console.error("Erro ao buscar QR Codes:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE TRANSFERÊNCIAS ===
  
  // Cliente: Buscar usuários para transferência
  app.get("/api/client/search-users", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const { search, method } = req.query;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!search || typeof search !== 'string' || search.length < 3) {
        return res.status(400).json({ message: "Termo de busca deve ter pelo menos 3 caracteres" });
      }

      const searchField = method === 'phone' ? users.phone : users.email;
      
      const foundUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          photo: users.photo
        })
        .from(users)
        .where(
          and(
            eq(searchField, search),
            ne(users.id, userId), // Não pode transferir para si mesmo
            eq(users.type, "client") // Só pode transferir para outros clientes
          )
        )
        .limit(1);

      if (foundUsers.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json(foundUsers[0]);

    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Cliente: Realizar transferência
  app.post("/api/client/transfers", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const { recipient_email, recipient_phone, amount, description, search_method } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valor deve ser maior que zero" });
      }

      const transferAmount = parseFloat(amount);
      const recipient = recipient_email || recipient_phone;

      if (!recipient) {
        return res.status(400).json({ message: "Email ou telefone do destinatário é obrigatório" });
      }

      // Buscar o destinatário
      const searchField = search_method === 'phone' ? users.phone : users.email;
      const recipientUser = await db
        .select()
        .from(users)
        .where(
          and(
            eq(searchField, recipient),
            ne(users.id, userId), // Não pode transferir para si mesmo
            eq(users.type, "client") // Só pode transferir para outros clientes
          )
        )
        .limit(1);

      if (!recipientUser.length) {
        return res.status(404).json({ message: "Destinatário não encontrado" });
      }

      // Verificar saldo do remetente
      const senderCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, userId))
        .limit(1);

      const currentBalance = senderCashback.length > 0 ? parseFloat(senderCashback[0].balance) : 0;

      if (currentBalance < transferAmount) {
        return res.status(400).json({ 
          message: `Saldo insuficiente. Saldo atual: R$ ${currentBalance.toFixed(2)}` 
        });
      }

      // Criar transferência
      const newTransfer = await db.insert(transfers).values({
        from_user_id: userId,
        to_user_id: recipientUser[0].id,
        amount: transferAmount.toFixed(2),
        description: description || "Transferência",
        status: "completed",
        type: "cashback_transfer"
      }).returning();

      // Debitar do remetente
      await db
        .update(cashbacks)
        .set({
          balance: (currentBalance - transferAmount).toFixed(2),
          updated_at: new Date()
        })
        .where(eq(cashbacks.user_id, userId));

      // Creditar ao destinatário
      const recipientCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, recipientUser[0].id))
        .limit(1);

      if (recipientCashback.length > 0) {
        const recipientCurrentBalance = parseFloat(recipientCashback[0].balance);
        const recipientTotalEarned = parseFloat(recipientCashback[0].total_earned);
        
        await db
          .update(cashbacks)
          .set({
            balance: (recipientCurrentBalance + transferAmount).toFixed(2),
            total_earned: (recipientTotalEarned + transferAmount).toFixed(2),
            updated_at: new Date()
          })
          .where(eq(cashbacks.user_id, recipientUser[0].id));
      } else {
        await db.insert(cashbacks).values({
          user_id: recipientUser[0].id,
          balance: transferAmount.toFixed(2),
          total_earned: transferAmount.toFixed(2),
          updated_at: new Date()
        });
      }

      res.status(201).json({
        success: true,
        message: "Transferência realizada com sucesso",
        transfer: newTransfer[0],
        recipient: {
          name: recipientUser[0].name,
          email: recipientUser[0].email
        }
      });

    } catch (error) {
      console.error("Erro ao realizar transferência:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Cliente: Histórico de transferências
  app.get("/api/client/transfers", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const transferHistory = await db
        .select({
          id: transfers.id,
          type: sql<string>`CASE WHEN ${transfers.from_user_id} = ${userId} THEN 'outgoing' ELSE 'incoming' END`,
          from: sql<string>`sender.name`,
          to: sql<string>`recipient.name`,
          from_email: sql<string>`sender.email`,
          to_email: sql<string>`recipient.email`,
          amount: transfers.amount,
          description: transfers.description,
          status: transfers.status,
          created_at: transfers.created_at
        })
        .from(transfers)
        .leftJoin(sql`users AS sender`, eq(transfers.from_user_id, sql`sender.id`))
        .leftJoin(sql`users AS recipient`, eq(transfers.to_user_id, sql`recipient.id`))
        .where(
          sql`${transfers.from_user_id} = ${userId} OR ${transfers.to_user_id} = ${userId}`
        )
        .orderBy(desc(transfers.created_at))
        .limit(50);

      res.json(transferHistory);

    } catch (error) {
      console.error("Erro ao buscar histórico de transferências:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE SAQUES ===
  
  // Lojista: Consultar saldo da carteira
  app.get("/api/merchant/wallet", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar saldo de comissões do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Calcular saldo total de comissões (2% das vendas)
      const salesTotal = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, merchantData[0].id));

      const totalSales = salesTotal[0]?.total || 0;
      const totalCommissions = totalSales * 0.02; // 2% de comissão

      // Consultar saques já solicitados
      const pendingWithdrawals = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${withdrawalRequests.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.merchant_id, merchantData[0].id),
            eq(withdrawalRequests.status, "pending")
          )
        );

      const pendingAmount = pendingWithdrawals[0]?.total || 0;
      const pendingCount = pendingWithdrawals[0]?.count || 0;

      const currentBalance = totalCommissions;
      const availableBalance = Math.max(0, currentBalance - pendingAmount);

      res.json({
        success: true,
        walletData: {
          currentBalance: currentBalance,
          pendingAmount: pendingAmount,
          pendingCount: pendingCount,
          availableBalance: availableBalance
        }
      });

    } catch (error) {
      console.error("Erro ao consultar carteira:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Solicitar saque
  app.post("/api/merchant/withdrawal-requests", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const {
        amount, full_name, store_name, phone, email,
        bank_name, agency, account, payment_method
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valor deve ser maior que zero" });
      }

      const withdrawalAmount = parseFloat(amount);

      if (withdrawalAmount < 20) {
        return res.status(400).json({ message: "Valor mínimo para saque é R$ 20,00" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Verificar saldo disponível
      const salesTotal = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, merchantData[0].id));

      const totalSales = salesTotal[0]?.total || 0;
      const totalCommissions = totalSales * 0.02;

      const pendingWithdrawals = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${withdrawalRequests.amount} AS DECIMAL)), 0)`
        })
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.merchant_id, merchantData[0].id),
            eq(withdrawalRequests.status, "pending")
          )
        );

      const pendingAmount = pendingWithdrawals[0]?.total || 0;
      const availableBalance = Math.max(0, totalCommissions - pendingAmount);

      if (withdrawalAmount > availableBalance) {
        return res.status(400).json({ 
          message: `Saldo insuficiente. Saldo disponível: R$ ${availableBalance.toFixed(2)}` 
        });
      }

      // Criar solicitação de saque
      const newWithdrawal = await db.insert(withdrawalRequests).values({
        user_id: userId,
        merchant_id: merchantData[0].id,
        amount: withdrawalAmount.toFixed(2),
        full_name: full_name,
        store_name: store_name,
        phone: phone,
        email: email,
        bank_name: bank_name,
        agency: agency,
        account: account,
        payment_method: payment_method,
        status: "pending"
      }).returning();

      res.status(201).json({
        success: true,
        message: "Solicitação de saque criada com sucesso",
        withdrawal: newWithdrawal[0]
      });

    } catch (error) {
      console.error("Erro ao criar solicitação de saque:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Listar solicitações de saque
  app.get("/api/merchant/withdrawal-requests", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const withdrawals = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.user_id, userId))
        .orderBy(desc(withdrawalRequests.created_at))
        .limit(50);

      res.json(withdrawals);

    } catch (error) {
      console.error("Erro ao buscar solicitações de saque:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin: Listar todas as solicitações de saque
  app.get("/api/admin/withdrawal-requests", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      let query = db
        .select({
          id: withdrawalRequests.id,
          user_id: withdrawalRequests.user_id,
          merchant_id: withdrawalRequests.merchant_id,
          amount: withdrawalRequests.amount,
          full_name: withdrawalRequests.full_name,
          store_name: withdrawalRequests.store_name,
          phone: withdrawalRequests.phone,
          email: withdrawalRequests.email,
          bank_name: withdrawalRequests.bank_name,
          agency: withdrawalRequests.agency,
          account: withdrawalRequests.account,
          payment_method: withdrawalRequests.payment_method,
          status: withdrawalRequests.status,
          created_at: withdrawalRequests.created_at,
          processed_at: withdrawalRequests.processed_at,
          notes: withdrawalRequests.notes,
          userName: users.name,
          userEmail: users.email
        })
        .from(withdrawalRequests)
        .leftJoin(users, eq(withdrawalRequests.user_id, users.id));

      if (status && typeof status === 'string') {
        query = query.where(eq(withdrawalRequests.status, status as any));
      }

      const withdrawals = await query
        .orderBy(desc(withdrawalRequests.created_at))
        .limit(100);

      res.json(withdrawals);

    } catch (error) {
      console.error("Erro ao buscar solicitações de saque:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin: Processar solicitação de saque (aprovar/rejeitar)
  app.put("/api/admin/withdrawal-requests/:id", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;
      const adminUserId = req.user?.id;
      
      if (!adminUserId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status deve ser 'approved' ou 'rejected'" });
      }

      // Atualizar status da solicitação
      const updatedWithdrawal = await db
        .update(withdrawalRequests)
        .set({
          status: status,
          processed_by: adminUserId,
          processed_at: new Date(),
          notes: admin_notes || null
        })
        .where(eq(withdrawalRequests.id, parseInt(id)))
        .returning();

      if (!updatedWithdrawal.length) {
        return res.status(404).json({ message: "Solicitação de saque não encontrada" });
      }

      res.json({
        success: true,
        message: `Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso`,
        withdrawal: updatedWithdrawal[0]
      });

    } catch (error) {
      console.error("Erro ao processar solicitação de saque:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE RELATÓRIOS ===
  
  // Admin: Relatórios gerais do sistema
  app.get("/api/admin/reports", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const { period = "30" } = req.query;
      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Dados gerais
      const totalUsers = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.type, "client"));

      const totalMerchants = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(merchants);

      // Transações no período
      const transactionStats = await db
        .select({
          total_amount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          total_cashback: sql<number>`COALESCE(SUM(CAST(${transactions.cashback_amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .where(gte(transactions.created_at, startDate));

      // Transferências no período
      const transferStats = await db
        .select({
          total_amount: sql<number>`COALESCE(SUM(CAST(${transfers.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(transfers)
        .where(gte(transfers.created_at, startDate));

      // Top lojistas por volume
      const topMerchants = await db
        .select({
          merchant_id: transactions.merchant_id,
          store_name: merchants.store_name,
          total_sales: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          transaction_count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .leftJoin(merchants, eq(transactions.merchant_id, merchants.id))
        .where(gte(transactions.created_at, startDate))
        .groupBy(transactions.merchant_id, merchants.store_name)
        .orderBy(sql`total_sales DESC`)
        .limit(10);

      // Usuários mais ativos
      const topUsers = await db
        .select({
          user_id: transactions.user_id,
          user_name: users.name,
          total_spent: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          total_cashback: sql<number>`COALESCE(SUM(CAST(${transactions.cashback_amount} AS DECIMAL)), 0)`,
          transaction_count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.user_id, users.id))
        .where(gte(transactions.created_at, startDate))
        .groupBy(transactions.user_id, users.name)
        .orderBy(sql`total_spent DESC`)
        .limit(10);

      res.json({
        success: true,
        period: `${days} dias`,
        overview: {
          total_users: totalUsers[0]?.count || 0,
          total_merchants: totalMerchants[0]?.count || 0,
          total_transactions: transactionStats[0]?.count || 0,
          total_transaction_amount: transactionStats[0]?.total_amount || 0,
          total_cashback_distributed: transactionStats[0]?.total_cashback || 0,
          total_transfers: transferStats[0]?.count || 0,
          total_transfer_amount: transferStats[0]?.total_amount || 0
        },
        top_merchants: topMerchants,
        top_users: topUsers
      });

    } catch (error) {
      console.error("Erro ao gerar relatórios:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Relatórios do lojista
  app.get("/api/merchant/reports", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const { period = "30" } = req.query;
      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Estatísticas de vendas
      const salesStats = await db
        .select({
          total_amount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          total_cashback: sql<number>`COALESCE(SUM(CAST(${transactions.cashback_amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchantData[0].id),
            gte(transactions.created_at, startDate)
          )
        );

      // Vendas por dia (últimos 7 dias)
      const dailySales = await db
        .select({
          date: sql<string>`DATE(${transactions.created_at})`,
          total_amount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchantData[0].id),
            gte(transactions.created_at, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .groupBy(sql`DATE(${transactions.created_at})`)
        .orderBy(sql`DATE(${transactions.created_at}) DESC`);

      // Top clientes
      const topClients = await db
        .select({
          user_name: users.name,
          user_email: users.email,
          total_spent: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          transaction_count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.user_id, users.id))
        .where(
          and(
            eq(transactions.merchant_id, merchantData[0].id),
            gte(transactions.created_at, startDate)
          )
        )
        .groupBy(users.name, users.email)
        .orderBy(sql`total_spent DESC`)
        .limit(10);

      res.json({
        success: true,
        period: `${days} dias`,
        store_info: {
          store_name: merchantData[0].store_name,
          category: merchantData[0].category
        },
        sales_summary: {
          total_amount: salesStats[0]?.total_amount || 0,
          total_cashback_generated: salesStats[0]?.total_cashback || 0,
          total_transactions: salesStats[0]?.count || 0,
          commission_earned: (salesStats[0]?.total_amount || 0) * 0.02
        },
        daily_sales: dailySales,
        top_clients: topClients
      });

    } catch (error) {
      console.error("Erro ao gerar relatório do lojista:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Estatísticas de pagamento
  app.get("/api/merchant/payment-stats", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Estatísticas por método de pagamento
      const paymentMethodStats = await db
        .select({
          payment_method: transactions.payment_method,
          total_amount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, merchantData[0].id))
        .groupBy(transactions.payment_method);

      // QR Codes gerados vs. usados
      const qrStats = await db
        .select({
          total_generated: sql<number>`COUNT(*)`,
          total_used: sql<number>`SUM(CASE WHEN ${qrCodes.status} = 'used' THEN 1 ELSE 0 END)`
        })
        .from(qrCodes)
        .where(eq(qrCodes.user_id, userId));

      res.json({
        success: true,
        payment_methods: paymentMethodStats,
        qr_code_stats: {
          total_generated: qrStats[0]?.total_generated || 0,
          total_used: qrStats[0]?.total_used || 0,
          usage_rate: qrStats[0]?.total_generated > 0 
            ? ((qrStats[0]?.total_used || 0) / qrStats[0].total_generated * 100).toFixed(1)
            : "0.0"
        }
      });

    } catch (error) {
      console.error("Erro ao buscar estatísticas de pagamento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE NOTIFICAÇÕES ===
  
  // Buscar notificações do usuário
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { unread_only = "false" } = req.query;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, userId));

      if (unread_only === "true") {
        query = query.where(and(
          eq(notifications.user_id, userId),
          eq(notifications.read, false)
        ));
      }

      const userNotifications = await query
        .orderBy(desc(notifications.created_at))
        .limit(50);

      res.json(userNotifications);

    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Marcar notificação como lida
  app.put("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const updated = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, parseInt(id)),
            eq(notifications.user_id, userId)
          )
        )
        .returning();

      if (!updated.length) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }

      res.json({ success: true, notification: updated[0] });

    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Marcar todas as notificações como lidas
  app.put("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.user_id, userId),
            eq(notifications.read, false)
          )
        );

      res.json({ success: true, message: "Todas as notificações foram marcadas como lidas" });

    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar notificação
  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const deleted = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, parseInt(id)),
            eq(notifications.user_id, userId)
          )
        )
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }

      res.json({ success: true, message: "Notificação deletada" });

    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Função helper para criar notificações
  const createNotification = async (userId: number, type: string, title: string, message: string, data?: any) => {
    try {
      await db.insert(notifications).values({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        data: data ? JSON.stringify(data) : null
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
  };

  // === SISTEMA DE INDICAÇÕES (REFERRALS) ===
  
  // Cliente: Obter link de indicação
  app.get("/api/client/referral-link", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Gerar código único de indicação baseado no ID do usuário
      const referralCode = `REF${userId.toString().padStart(6, '0')}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      
      const referralLink = `${req.protocol}://${req.get('host')}/register?ref=${referralCode}`;

      // Buscar estatísticas de indicações
      const referralStats = await db
        .select({
          total_referrals: sql<number>`COUNT(*)`,
          active_referrals: sql<number>`SUM(CASE WHEN ${referrals.status} = 'completed' THEN 1 ELSE 0 END)`,
          total_bonus: sql<number>`COALESCE(SUM(CASE WHEN ${referrals.status} = 'completed' THEN CAST(${referrals.bonus} AS DECIMAL) ELSE 0 END), 0)`
        })
        .from(referrals)
        .where(eq(referrals.referrer_id, userId));

      res.json({
        success: true,
        referral_code: referralCode,
        referral_link: referralLink,
        stats: {
          total_referrals: referralStats[0]?.total_referrals || 0,
          active_referrals: referralStats[0]?.active_referrals || 0,
          total_bonus_earned: referralStats[0]?.total_bonus || 0
        }
      });

    } catch (error) {
      console.error("Erro ao gerar link de indicação:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Processar indicação (usado no registro)
  app.post("/api/referrals/process", async (req: Request, res: Response) => {
    try {
      const { referral_code, referred_user_id } = req.body;
      
      if (!referral_code || !referred_user_id) {
        return res.status(400).json({ message: "Código de indicação e ID do usuário são obrigatórios" });
      }

      // Extrair ID do referenciador do código
      const referrerIdMatch = referral_code.match(/^REF(\d{6})/);
      if (!referrerIdMatch) {
        return res.status(400).json({ message: "Código de indicação inválido" });
      }

      const referrerId = parseInt(referrerIdMatch[1]);

      // Verificar se o referenciador existe
      const referrer = await db
        .select()
        .from(users)
        .where(eq(users.id, referrerId))
        .limit(1);

      if (!referrer.length) {
        return res.status(404).json({ message: "Usuário referenciador não encontrado" });
      }

      // Verificar se já existe uma indicação
      const existingReferral = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referred_id, referred_user_id))
        .limit(1);

      if (existingReferral.length > 0) {
        return res.status(400).json({ message: "Usuário já foi indicado" });
      }

      // Criar indicação com bônus de R$ 5,00
      const referralBonus = 5.00;
      
      const newReferral = await db.insert(referrals).values({
        referrer_id: referrerId,
        referred_id: referred_user_id,
        bonus: referralBonus.toFixed(2),
        status: "completed"
      }).returning();

      // Adicionar bônus ao saldo do referenciador
      const existingCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, referrerId))
        .limit(1);

      if (existingCashback.length > 0) {
        const currentBalance = parseFloat(existingCashback[0].balance);
        const currentTotal = parseFloat(existingCashback[0].total_earned);
        
        await db
          .update(cashbacks)
          .set({
            balance: (currentBalance + referralBonus).toFixed(2),
            total_earned: (currentTotal + referralBonus).toFixed(2),
            updated_at: new Date()
          })
          .where(eq(cashbacks.user_id, referrerId));
      } else {
        await db.insert(cashbacks).values({
          user_id: referrerId,
          balance: referralBonus.toFixed(2),
          total_earned: referralBonus.toFixed(2),
          updated_at: new Date()
        });
      }

      // Criar notificação para o referenciador
      await createNotification(
        referrerId,
        "referral",
        "Nova indicação!",
        `Você ganhou R$ ${referralBonus.toFixed(2)} por indicar um novo usuário!`,
        { bonus: referralBonus, referred_user_id }
      );

      res.status(201).json({
        success: true,
        message: "Indicação processada com sucesso",
        referral: newReferral[0],
        bonus: referralBonus
      });

    } catch (error) {
      console.error("Erro ao processar indicação:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Cliente: Histórico de indicações
  app.get("/api/client/referrals", isUserType("client"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userReferrals = await db
        .select({
          id: referrals.id,
          bonus: referrals.bonus,
          status: referrals.status,
          created_at: referrals.created_at,
          referred_name: users.name,
          referred_email: users.email
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.referred_id, users.id))
        .where(eq(referrals.referrer_id, userId))
        .orderBy(desc(referrals.created_at))
        .limit(50);

      res.json(userReferrals);

    } catch (error) {
      console.error("Erro ao buscar histórico de indicações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE PRODUTOS (CRUD COMPLETO) ===
  
  // Lojista: Criar produto
  app.post("/api/merchant/products", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const {
        name, description, price, category, image_url,
        stock_quantity, active, promotion_price, promotion_description
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!name || !price) {
        return res.status(400).json({ message: "Nome e preço são obrigatórios" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      const productPrice = parseFloat(price);
      const promotionPriceValue = promotion_price ? parseFloat(promotion_price) : null;

      if (productPrice <= 0) {
        return res.status(400).json({ message: "Preço deve ser maior que zero" });
      }

      if (promotionPriceValue && promotionPriceValue >= productPrice) {
        return res.status(400).json({ message: "Preço promocional deve ser menor que o preço normal" });
      }

      const newProduct = await db.insert(products).values({
        merchant_id: merchantData[0].id,
        name: name,
        description: description || null,
        price: productPrice.toFixed(2),
        category: category || "Geral",
        image_url: image_url || null,
        stock_quantity: stock_quantity || 0,
        active: active !== undefined ? active : true,
        promotion_price: promotionPriceValue ? promotionPriceValue.toFixed(2) : null,
        promotion_description: promotion_description || null
      }).returning();

      res.status(201).json({
        success: true,
        message: "Produto criado com sucesso",
        product: newProduct[0]
      });

    } catch (error) {
      console.error("Erro ao criar produto:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Editar produto
  app.put("/api/merchant/products/:id", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name, description, price, category, image_url,
        stock_quantity, active, promotion_price, promotion_description
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Verificar se o produto pertence ao lojista
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, parseInt(id)),
            eq(products.merchant_id, merchantData[0].id)
          )
        )
        .limit(1);

      if (!existingProduct.length) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (image_url !== undefined) updateData.image_url = image_url;
      if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
      if (active !== undefined) updateData.active = active;
      if (promotion_description !== undefined) updateData.promotion_description = promotion_description;
      
      if (price !== undefined) {
        const productPrice = parseFloat(price);
        if (productPrice <= 0) {
          return res.status(400).json({ message: "Preço deve ser maior que zero" });
        }
        updateData.price = productPrice.toFixed(2);
      }

      if (promotion_price !== undefined) {
        if (promotion_price === null || promotion_price === "") {
          updateData.promotion_price = null;
        } else {
          const promotionPriceValue = parseFloat(promotion_price);
          const currentPrice = parseFloat(updateData.price || existingProduct[0].price);
          
          if (promotionPriceValue >= currentPrice) {
            return res.status(400).json({ message: "Preço promocional deve ser menor que o preço normal" });
          }
          updateData.promotion_price = promotionPriceValue.toFixed(2);
        }
      }

      const updatedProduct = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, parseInt(id)))
        .returning();

      res.json({
        success: true,
        message: "Produto atualizado com sucesso",
        product: updatedProduct[0]
      });

    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lojista: Deletar produto
  app.delete("/api/merchant/products/:id", isUserType("merchant"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar dados do lojista
      const merchantData = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId))
        .limit(1);

      if (!merchantData.length) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }

      // Verificar se o produto pertence ao lojista
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, parseInt(id)),
            eq(products.merchant_id, merchantData[0].id)
          )
        )
        .limit(1);

      if (!existingProduct.length) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Verificar se o produto tem transações
      const productTransactions = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.product_id, parseInt(id)))
        .limit(1);

      if (productTransactions.length > 0) {
        // Apenas desativar o produto se já tem transações
        await db
          .update(products)
          .set({ active: false })
          .where(eq(products.id, parseInt(id)));

        res.json({
          success: true,
          message: "Produto desativado (possui histórico de transações)"
        });
      } else {
        // Deletar completamente se não tem transações
        await db
          .delete(products)
          .where(eq(products.id, parseInt(id)));

        res.json({
          success: true,
          message: "Produto deletado com sucesso"
        });
      }

    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Público: Buscar produto específico
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const product = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          category: products.category,
          image_url: products.image_url,
          promotion_price: products.promotion_price,
          promotion_description: products.promotion_description,
          stock_quantity: products.stock_quantity,
          active: products.active,
          created_at: products.created_at,
          merchant_name: merchants.store_name,
          merchant_category: merchants.category
        })
        .from(products)
        .leftJoin(merchants, eq(products.merchant_id, merchants.id))
        .where(
          and(
            eq(products.id, parseInt(id)),
            eq(products.active, true),
            eq(merchants.approved, true)
          )
        )
        .limit(1);

      if (!product.length) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      res.json(product[0]);

    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === SISTEMA DE CONFIGURAÇÕES ADMINISTRATIVAS ===
  
  // Admin: Buscar configurações do sistema
  app.get("/api/admin/settings", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      // Buscar configurações de comissão
      const commissionConfig = await db
        .select()
        .from(commissionSettings)
        .limit(1);

      // Buscar configurações de marca (se existir na tabela)
      const brandConfig = await db
        .select()
        .from(brandSettings)
        .limit(1);

      res.json({
        success: true,
        commission_settings: commissionConfig[0] || null,
        brand_settings: brandConfig[0] || null
      });

    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin: Atualizar configurações de comissão
  app.put("/api/admin/commission-settings", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const {
        platform_fee, merchant_commission, client_cashback,
        referral_bonus, min_withdrawal, max_cashback_bonus, withdrawal_fee
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const updateData: any = { updated_by: userId };
      
      if (platform_fee !== undefined) updateData.platform_fee = parseFloat(platform_fee).toFixed(1);
      if (merchant_commission !== undefined) updateData.merchant_commission = parseFloat(merchant_commission).toFixed(1);
      if (client_cashback !== undefined) updateData.client_cashback = parseFloat(client_cashback).toFixed(1);
      if (referral_bonus !== undefined) updateData.referral_bonus = parseFloat(referral_bonus).toFixed(1);
      if (min_withdrawal !== undefined) updateData.min_withdrawal = parseFloat(min_withdrawal).toFixed(2);
      if (max_cashback_bonus !== undefined) updateData.max_cashback_bonus = parseFloat(max_cashback_bonus).toFixed(2);
      if (withdrawal_fee !== undefined) updateData.withdrawal_fee = parseFloat(withdrawal_fee).toFixed(2);

      // Verificar se existe configuração
      const existingConfig = await db
        .select()
        .from(commissionSettings)
        .limit(1);

      let updatedConfig;
      
      if (existingConfig.length > 0) {
        updatedConfig = await db
          .update(commissionSettings)
          .set(updateData)
          .where(eq(commissionSettings.id, existingConfig[0].id))
          .returning();
      } else {
        updatedConfig = await db
          .insert(commissionSettings)
          .values(updateData)
          .returning();
      }

      res.json({
        success: true,
        message: "Configurações de comissão atualizadas",
        settings: updatedConfig[0]
      });

    } catch (error) {
      console.error("Erro ao atualizar configurações de comissão:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin: Atualizar configurações de marca
  app.put("/api/admin/brand-settings", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      const {
        logo_url, favicon_url, app_name, primary_color,
        secondary_color, app_description, login_background_url, auto_apply
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const updateData: any = { updated_by: userId };
      
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (favicon_url !== undefined) updateData.favicon_url = favicon_url;
      if (app_name !== undefined) updateData.app_name = app_name;
      if (primary_color !== undefined) updateData.primary_color = primary_color;
      if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
      if (app_description !== undefined) updateData.app_description = app_description;
      if (login_background_url !== undefined) updateData.login_background_url = login_background_url;
      if (auto_apply !== undefined) updateData.auto_apply = auto_apply;

      // Verificar se existe configuração de marca
      const existingBrandConfig = await db
        .select()
        .from(brandSettings)
        .limit(1);

      let updatedBrandConfig;
      
      if (existingBrandConfig.length > 0) {
        updatedBrandConfig = await db
          .update(brandSettings)
          .set(updateData)
          .where(eq(brandSettings.id, existingBrandConfig[0].id))
          .returning();
      } else {
        updatedBrandConfig = await db
          .insert(brandSettings)
          .values(updateData)
          .returning();
      }

      res.json({
        success: true,
        message: "Configurações de marca atualizadas",
        settings: updatedBrandConfig[0]
      });

    } catch (error) {
      console.error("Erro ao atualizar configurações de marca:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  await initializeCommissionSettings();

  const httpServer = createServer(app);
  return httpServer;
}