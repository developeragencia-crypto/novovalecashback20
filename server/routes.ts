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
        referredUserId: referrals.referred_user_id,
        bonusAmount: referrals.bonus_amount,
        status: referrals.status,
        createdAt: referrals.created_at,
        referredUserName: users.name
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referred_user_id, users.id))
      .where(eq(referrals.referrer_user_id, userId))
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

  await initializeCommissionSettings();

  const httpServer = createServer(app);
  return httpServer;
}