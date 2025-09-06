import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
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
  NotificationType,
  auditLogs
} from "@shared/schema";
import { addAdminRoutes, addMerchantRoutes, addClientRoutes } from "./routes.admin";
import { addWithdrawalRoutes } from "./routes.withdrawal";

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }
  next();
};

// Middleware para verificar tipo de usuário
export const isUserType = (type: string) => (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }
  if (req.user.type !== type) {
    return res.status(403).json({ message: `Acesso restrito para ${type}` });
  }
  next();
};

// Configurações globais do sistema (defaults)
const DEFAULT_SETTINGS = {
  platformFee: 0.02, // 2%
  merchantCommission: 0.02, // 2%
  clientCashback: 0.02, // 2%
  referralBonus: 0.01, // 1%
  minWithdrawal: 50, // R$ 50,00
  maxCashbackBonus: 10.0, // 10%
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação e rotas relacionadas
  setupAuth(app);
  
  // Adicionar rotas administrativas, de lojista e de cliente
  addAdminRoutes(app);
  addMerchantRoutes(app);
  addClientRoutes(app);
  
  // Adicionar rotas de solicitação de saque
  addWithdrawalRoutes(app);
  
  // ======== ROTAS DE NOTIFICAÇÕES ========

  // Obter notificações do usuário atual
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      // Verificamos se o usuário está definido
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar todas as notificações do usuário, ordenadas por data de criação (mais recentes primeiro)
      // Aumentado o limite para garantir que todas as notificações sejam exibidas
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, req.user.id))
        .orderBy(desc(notifications.created_at))
        .limit(100);

      // Contar notificações não lidas
      const unreadCount = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.user_id, req.user.id),
          eq(notifications.read, false)
        ));

      res.json({
        notifications: userNotifications,
        unreadCount: Number(unreadCount[0].count) || 0
      });
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  // Marcar notificação como lida
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      // Verificamos se o usuário está definido
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const notificationId = parseInt(req.params.id);
      
      // Verificar se a notificação existe e pertence ao usuário atual
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, req.user.id)
        ))
        .limit(1);
      
      if (notification.length === 0) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      // Marcar como lida
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId));
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ message: "Erro ao atualizar notificação" });
    }
  });

  // Marcar todas as notificações como lidas
  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      // Verificamos se o usuário está definido
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.user_id, req.user.id),
          eq(notifications.read, false)
        ));
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
      res.status(500).json({ message: "Erro ao atualizar notificações" });
    }
  });

  // Excluir notificação
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      // Verificamos se o usuário está definido
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const notificationId = parseInt(req.params.id);
      
      // Verificar se a notificação existe e pertence ao usuário atual
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, req.user.id)
        ))
        .limit(1);
      
      if (notification.length === 0) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      // Excluir notificação
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
      res.status(500).json({ message: "Erro ao excluir notificação" });
    }
  });
  
  // Inicializa as configurações de comissão
  await initializeCommissionSettings();
  
  // API para listar todas as lojas (pública)
  app.get("/api/stores", async (req, res) => {
    try {
      const allStores = await db
        .select({
          id: merchants.id,
          name: merchants.store_name,  // Usando o nome exato da coluna no banco
          logo: merchants.logo,
          category: merchants.category,
          address: merchants.address,
          city: merchants.city,
          state: merchants.state,
          commission_rate: merchants.commission_rate,
          approved: merchants.approved,
          created_at: merchants.created_at,
          user_id: merchants.user_id,
        })
        .from(merchants)
        .where(eq(merchants.approved, true));
        
      // Ordenar manualmente por nome da loja
      allStores.sort((a, b) => a.name.localeCompare(b.name));
      
      // Adicionar informações adicionais como avaliações e número de clientes
      const storesWithDetails = await Promise.all(
        allStores.map(async (store) => {
          // Obter informações do usuário associado (lojista)
          const [merchantUser] = await db
            .select({
              name: users.name,
              email: users.email,
              phone: users.phone,
              photo: users.photo,
              status: users.status
            })
            .from(users)
            .where(eq(users.id, store.user_id));
            
          // Contar o número de transações
          const [transactionCount] = await db
            .select({
              count: sql`COUNT(*)`,
            })
            .from(transactions)
            .where(eq(transactions.merchant_id, store.id));
          
          // Calcular o volume de vendas
          const [salesVolume] = await db
            .select({
              total: sql`COALESCE(SUM(amount), 0)`,
            })
            .from(transactions)
            .where(eq(transactions.merchant_id, store.id));
          
          return {
            id: store.id,
            name: store.name,
            logo: store.logo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(store.name) + "&background=random&color=fff&size=128",
            category: store.category,
            address: store.address,
            city: store.city,
            state: store.state,
            commission_rate: store.commission_rate,
            created_at: store.created_at,
            owner: merchantUser.name,
            email: merchantUser.email,
            phone: merchantUser.phone,
            photo: merchantUser.photo,
            status: merchantUser.status,
            transactions: Number(transactionCount.count) || 0,
            volume: Number(salesVolume.total) || 0,
            rating: 4.5, // Valor padrão, seria substituído por real no futuro
          };
        })
      );
      
      res.json(storesWithDetails);
    } catch (error) {
      console.error("Erro ao buscar lojas:", error);
      res.status(500).json({ message: "Erro ao buscar lojas" });
    }
  });
  
  // API para buscar detalhes de uma loja específica
  app.get("/api/stores/:id", async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      
      const [store] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, storeId));
      
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // Obter informações do usuário associado (lojista)
      const [merchantUser] = await db
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
          photo: users.photo,
        })
        .from(users)
        .where(eq(users.id, store.userId));
        
      // Obter produtos da loja
      const storeProducts = await db
        .select()
        .from(products)
        .where(eq(products.merchantId, storeId))
        .limit(10);
        
      // Obter transações recentes
      // Buscar transações sem usar orderBy(desc()) que está causando erros
      const allRecentTransactions = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.created_at,
          status: transactions.status,
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, storeId))
        .limit(10);
        
      // Ordenar manualmente por data de criação (decrescente)
      const recentTransactions = allRecentTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
        
      // Contar o número de transações
      const [transactionCount] = await db
        .select({
          count: sql`COUNT(*)`,
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, storeId));
      
      // Calcular o volume de vendas
      const [salesVolume] = await db
        .select({
          total: sql`COALESCE(SUM(amount), 0)`,
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, storeId));
      
      const storeDetails = {
        ...store,
        owner: merchantUser.name,
        email: merchantUser.email,
        phone: merchantUser.phone,
        photo: merchantUser.photo,
        products: storeProducts,
        recentTransactions,
        transactionCount: Number(transactionCount.count) || 0,
        salesVolume: Number(salesVolume.total) || 0,
        rating: 4.5, // Valor padrão, seria substituído por real no futuro
      };
      
      res.json(storeDetails);
    } catch (error) {
      console.error("Erro ao buscar detalhes da loja:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da loja" });
    }
  });
  
  // API para aprovar uma loja (admin)
  app.post("/api/admin/stores/:id/approve", isUserType("admin"), async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      
      const [updatedStore] = await db
        .update(merchants)
        .set({
          approved: true,
        })
        .where(eq(merchants.id, storeId))
        .returning();
        
      if (!updatedStore) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      res.json({ message: "Loja aprovada com sucesso", store: updatedStore });
    } catch (error) {
      console.error("Erro ao aprovar loja:", error);
      res.status(500).json({ message: "Erro ao aprovar loja" });
    }
  });
  
  // API para rejeitar uma loja (admin)
  app.post("/api/admin/stores/:id/reject", isUserType("admin"), async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Motivo da rejeição é obrigatório" });
      }
      
      // Obter dados da loja
      const [store] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, storeId));
      
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // Atualizar status do usuário lojista
      await db
        .update(users)
        .set({
          status: "rejected",
        })
        .where(eq(users.id, store.userId));
      
      // Em uma implementação real, enviaríamos um email com o motivo da rejeição
      
      res.json({ message: "Loja rejeitada com sucesso" });
    } catch (error) {
      console.error("Erro ao rejeitar loja:", error);
      res.status(500).json({ message: "Erro ao rejeitar loja" });
    }
  });
  
  // API para ativar/desativar uma loja (admin)
  app.post("/api/admin/stores/:id/toggle-status", isUserType("admin"), async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      
      // Obter dados da loja
      const [store] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, storeId));
      
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // Obter status atual do usuário
      const [merchantUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, store.userId));
      
      const newStatus = merchantUser.status === "active" ? "inactive" : "active";
      
      // Atualizar status do usuário lojista
      await db
        .update(users)
        .set({
          status: newStatus,
        })
        .where(eq(users.id, store.userId));
      
      res.json({ message: `Loja ${newStatus === "active" ? "ativada" : "desativada"} com sucesso` });
    } catch (error) {
      console.error("Erro ao alterar status da loja:", error);
      res.status(500).json({ message: "Erro ao alterar status da loja" });
    }
  });
  
  // API para atualizar taxa de comissão de uma loja (admin)
  app.post("/api/admin/stores/:id/commission", isUserType("admin"), async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const { commissionRate } = req.body;
      
      if (commissionRate === undefined || isNaN(Number(commissionRate))) {
        return res.status(400).json({ message: "Taxa de comissão inválida" });
      }
      
      const [updatedStore] = await db
        .update(merchants)
        .set({
          commission_rate: Number(commissionRate),
        })
        .where(eq(merchants.id, storeId))
        .returning();
        
      if (!updatedStore) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      res.json({ message: "Taxa de comissão atualizada com sucesso", store: updatedStore });
    } catch (error) {
      console.error("Erro ao atualizar taxa de comissão:", error);
      res.status(500).json({ message: "Erro ao atualizar taxa de comissão" });
    }
  });
  
  // Endpoint para obter dados do perfil autenticado
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      // Excluir senha e outros dados sensíveis
      const { password, ...userData } = req.user;
      return res.json(userData);
    }
    return res.status(401).json({ message: "Usuário não autenticado" });
  });
  
  // Inicializar configurações de comissão se não existirem
  async function initializeCommissionSettings() {
    try {
      // Verificar se já existem configurações
      const existingSettings = await db.select().from(commissionSettings).limit(1);
      
      if (existingSettings.length === 0) {
        // Criar configurações padrão
        await db.insert(commissionSettings).values({
          platformFee: DEFAULT_SETTINGS.platformFee,
          merchantCommission: DEFAULT_SETTINGS.merchantCommission,
          clientCashback: DEFAULT_SETTINGS.clientCashback,
          referralBonus: DEFAULT_SETTINGS.referralBonus,
          minWithdrawal: DEFAULT_SETTINGS.minWithdrawal,
          maxCashbackBonus: DEFAULT_SETTINGS.maxCashbackBonus,
        });
        
        console.log("Configurações de comissão padrão criadas com sucesso");
      }
    } catch (error) {
      console.error("Erro ao inicializar configurações de comissão:", error);
    }
  }
  
  // Inicializar as configurações na inicialização do servidor
  initializeCommissionSettings();
  
  // ROTAS DO ADMIN
  
  // Obter configurações de taxas
  app.get("/api/admin/settings/rates", isUserType("admin"), async (req, res) => {
    try {
      const settings = await db.select().from(commissionSettings).limit(1);
      
      if (settings.length === 0) {
        // Se não houver configurações, criar as padrões e retornar
        const [newSettings] = await db.insert(commissionSettings).values({
          platformFee: DEFAULT_SETTINGS.platformFee,
          merchantCommission: DEFAULT_SETTINGS.merchantCommission,
          clientCashback: DEFAULT_SETTINGS.clientCashback,
          referralBonus: DEFAULT_SETTINGS.referralBonus,
          minWithdrawal: DEFAULT_SETTINGS.minWithdrawal,
          maxCashbackBonus: DEFAULT_SETTINGS.maxCashbackBonus,
        }).returning();
        
        return res.json(newSettings);
      }
      
      res.json(settings[0]);
    } catch (error) {
      console.error("Erro ao buscar configurações de taxas:", error);
      res.status(500).json({ message: "Erro ao buscar configurações de taxas" });
    }
  });
  
  // Atualizar configurações de taxas
  app.patch("/api/admin/settings/rates", isUserType("admin"), async (req, res) => {
    try {
      const {
        platformFee,
        merchantCommission,
        clientCashback,
        referralBonus,
        minWithdrawal,
        maxCashbackBonus
      } = req.body;
      
      // Buscar configurações existentes
      const settings = await db.select().from(commissionSettings).limit(1);
      
      if (settings.length === 0) {
        // Se não houver configurações, criar as novas
        const [newSettings] = await db.insert(commissionSettings).values({
          platformFee: platformFee ?? DEFAULT_SETTINGS.platformFee,
          merchantCommission: merchantCommission ?? DEFAULT_SETTINGS.merchantCommission,
          clientCashback: clientCashback ?? DEFAULT_SETTINGS.clientCashback,
          referralBonus: referralBonus ?? DEFAULT_SETTINGS.referralBonus,
          minWithdrawal: minWithdrawal ?? DEFAULT_SETTINGS.minWithdrawal,
          maxCashbackBonus: maxCashbackBonus ?? DEFAULT_SETTINGS.maxCashbackBonus,
          updatedBy: req.user?.id,
        }).returning();
        
        return res.json(newSettings);
      }
      
      // Atualizar configurações existentes
      const [updatedSettings] = await db.update(commissionSettings)
        .set({
          ...(platformFee !== undefined && { platformFee }),
          ...(merchantCommission !== undefined && { merchantCommission }),
          ...(clientCashback !== undefined && { clientCashback }),
          ...(referralBonus !== undefined && { referralBonus }),
          ...(minWithdrawal !== undefined && { minWithdrawal }),
          ...(maxCashbackBonus !== undefined && { maxCashbackBonus }),
          updatedAt: new Date(),
          updatedBy: req.user?.id,
        })
        .where(eq(commissionSettings.id, settings[0].id))
        .returning();
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Erro ao atualizar configurações de taxas:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações de taxas" });
    }
  });
  
  // Dashboard do Admin
  app.get("/api/admin/dashboard", isUserType("admin"), async (req, res) => {
    try {
      // Implementar dashboard do administrador com métricas gerais
      const userCount = await db.select({ count: sql`COUNT(*)` }).from(users);
      const merchantCount = await db.select({ count: sql`COUNT(*)` }).from(merchants);
      const transactionCount = await db.select({ count: sql`COUNT(*)` }).from(transactions);
      const totalSales = await db.select({ sum: sql`SUM(amount)` }).from(transactions);
      
      // Buscar transações sem usar orderBy(desc()) que está causando erros
      const allRecentTransactions = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.created_at,
          customerName: users.name,
          merchantName: merchants.store_name,
          status: transactions.status
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.user_id, users.id))
        .innerJoin(merchants, eq(transactions.merchant_id, merchants.id))
        .limit(10);
        
      // Ordenar manualmente por data de criação (decrescente)
      const recentTransactions = allRecentTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      res.json({
        userCount: userCount[0].count,
        merchantCount: merchantCount[0].count,
        transactionCount: transactionCount[0].count,
        totalSales: totalSales[0].sum || 0,
        recentTransactions
      });
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard admin:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });
  
  // ROTAS DO LOJISTA
  
  // Dashboard do Lojista
  app.get("/api/merchant/dashboard", isUserType("merchant"), async (req, res) => {
    try {
      // Implementar dashboard do lojista com métricas das vendas
      const merchantId = req.user?.id;
      
      if (!merchantId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar merchant_id usando SQL direto para evitar problemas de nomenclatura das colunas
      const merchantResult = await db.execute(
        sql`SELECT id FROM merchants WHERE user_id = ${merchantId}`
      );
      
      if (merchantResult.rows.length === 0) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      const merchant_id = merchantResult.rows[0].id;
      
      // Obter estatísticas de vendas usando SQL direto
      const salesData = await db.execute(
        sql`SELECT 
          COUNT(*) as transactions_count,
          COALESCE(SUM(amount), 0) as total_sales,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_sales,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0) as today_transactions
        FROM transactions 
        WHERE merchant_id = ${merchant_id}`
      );
      
      // Calcular valor médio de vendas do dia
      const todayTransactions = parseInt(salesData.rows[0].today_transactions) || 0;
      const todaySales = parseFloat(salesData.rows[0].today_sales) || 0;
      const averageSale = todayTransactions > 0 ? todaySales / todayTransactions : 0;
      
      // Calcular comissão do dia (2%)
      const todayCommission = todaySales * 0.02;
      
      // Obter vendas dos últimos 7 dias
      const weekSalesResult = await db.execute(
        sql`SELECT 
          TO_CHAR(DATE(created_at), 'Dy') as day, 
          COALESCE(SUM(amount), 0) as value
        FROM transactions 
        WHERE 
          merchant_id = ${merchant_id} AND 
          created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(created_at), TO_CHAR(DATE(created_at), 'Dy')
        ORDER BY DATE(created_at)`
      );
      
      // Obter vendas recentes com informações do cliente
      const recentSalesResult = await db.execute(
        sql`SELECT 
          t.id, 
          t.amount, 
          t.cashback_amount as cashback, 
          t.created_at as date, 
          u.name as customer, 
          t.status,
          (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as items_count
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.merchant_id = ${merchant_id}
        ORDER BY t.created_at DESC
        LIMIT 5`
      );
      
      // Obter produtos mais vendidos
      const topProductsResult = await db.execute(
        sql`SELECT 
          p.name, 
          COUNT(*) as sales,
          COALESCE(SUM(ti.price * ti.quantity), 0) as total
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.merchant_id = ${merchant_id}
        GROUP BY p.name
        ORDER BY sales DESC
        LIMIT 5`
      );
      
      // Formatar dados para o frontend com tratamento de tipos
      const recentSales = recentSalesResult.rows.map(sale => {
        // Conversão segura dos tipos desconhecidos
        const saleId = typeof sale.id === 'number' ? sale.id : parseInt(String(sale.id || 0));
        const customerName = String(sale.customer || '');
        const saleDate = sale.date ? new Date(String(sale.date)) : new Date();
        const amount = typeof sale.amount === 'number' ? sale.amount : parseFloat(String(sale.amount || 0));
        const cashback = typeof sale.cashback === 'number' ? sale.cashback : parseFloat(String(sale.cashback || 0));
        const itemsCount = typeof sale.items_count === 'number' ? sale.items_count : parseInt(String(sale.items_count || 0));
        
        return {
          id: saleId,
          customer: customerName,
          date: saleDate.toLocaleDateString('pt-BR'),
          amount: amount,
          cashback: cashback,
          items: `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`
        };
      });
      
      const weekSalesData = weekSalesResult.rows.map(day => {
        const dayName = String(day.day || '');
        const value = typeof day.value === 'number' ? day.value : parseFloat(String(day.value || 0));
        
        return {
          day: dayName,
          value: value
        };
      });
      
      const topProducts = topProductsResult.rows.map(product => {
        const productName = String(product.name || '');
        const sales = typeof product.sales === 'number' ? product.sales : parseInt(String(product.sales || 0));
        const total = typeof product.total === 'number' ? product.total : parseFloat(String(product.total || 0));
        
        return {
          name: productName,
          sales: sales,
          total: total
        };
      });
      
      // Preparar resposta completa para o dashboard
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
  
  // Obter saldo da carteira do lojista
  app.get("/api/merchant/wallet", isUserType("merchant"), async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Buscar saldo atual
      const [walletData] = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, userId));
      
      if (!walletData) {
        return res.status(404).json({ 
          success: false, 
          message: "Carteira não encontrada" 
        });
      }
      
      // Buscar solicitações de saque pendentes
      const pendingWithdrawals = await db
        .select({
          total: sql`COALESCE(SUM(CAST(amount as DECIMAL(10,2))), 0)`.as("total"),
          count: sql`COUNT(*)`.as("count")
        })
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.user_id, userId),
            eq(withdrawalRequests.status, "pending")
          )
        );
      
      const currentBalance = parseFloat(walletData.balance);
      const pendingAmount = parseFloat(pendingWithdrawals[0]?.total?.toString() || "0");
      const pendingCount = parseInt(pendingWithdrawals[0]?.count?.toString() || "0");
      
      res.json({
        success: true,
        walletData: {
          currentBalance,
          pendingAmount,
          pendingCount,
          availableBalance: Math.max(0, currentBalance - pendingAmount)
        }
      });
    } catch (error) {
      console.error("Erro ao buscar saldo do lojista:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar dados da carteira" 
      });
    }
  });
  
  // Listar produtos do lojista
  app.get("/api/merchant/products", isUserType("merchant"), async (req, res) => {
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
        
      // Listar produtos do lojista
      const allProductsList = await db
        .select()
        .from(products)
        .where(eq(products.merchant_id, merchant.id));
        
      // Ordenar manualmente por nome do produto
      const productsList = allProductsList.sort((a, b) => 
        a.name.localeCompare(b.name));
        
      res.json(productsList);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });
  
  // Listar vendas do lojista
  app.get("/api/merchant/sales", isUserType("merchant"), async (req, res) => {
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
        return res.json({ transactions: [] });
      }
      
      const merchant = merchantList[0];
        
      // Listar transações sem usar orderBy(desc()) - apenas transações válidas
      const all_transactions_list = await db
        .select({
          id: transactions.id,
          user_id: transactions.user_id,
          customer: users.name,
          date: transactions.created_at,
          amount: transactions.amount,
          cashback: transactions.cashback_amount,
          status: transactions.status,
          payment_method: transactions.payment_method,
          items: sql`COUNT(${transactionItems.id})::text || ' itens'`.as("items")
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.user_id, users.id))
        .leftJoin(transactionItems, eq(transactions.id, transactionItems.transaction_id))
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending'])
          )
        )
        .groupBy(transactions.id, users.name);
        
      console.log(`Buscando vendas válidas para lojista (ID ${merchant.id}): ${all_transactions_list.length} encontradas`);
        
      // Ordenar manualmente por data de criação (decrescente)
      const transactions_list = all_transactions_list
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      res.json({ transactions: transactions_list });
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      res.status(500).json({ message: "Erro ao buscar vendas" });
    }
  });
  
  // Gerenciar status de uma venda (cancelar, reembolsar)
  app.put("/api/merchant/sales/:transactionId/status", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantUserId = req.user.id;
      const transactionId = parseInt(req.params.transactionId);
      const { status, reason } = req.body;
      
      if (!transactionId || isNaN(transactionId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      if (!status || !["completed", "cancelled", "refunded"].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Utilize 'completed', 'cancelled' ou 'refunded'" });
      }
      
      // Obter dados do merchant
      const merchantResults = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantUserId));
        
      if (merchantResults.length === 0) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }
      
      const merchant = merchantResults[0];
      
      // Verificar se a transação existe e pertence a este lojista
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transactionId),
            eq(transactions.merchant_id, merchant.id)
          )
        );
        
      if (!transaction) {
        return res.status(404).json({ message: "Transação não encontrada ou não pertence a este lojista" });
      }
      
      // Obter status atual
      const currentStatus = transaction.status;
      
      // Verificar se a mudança de status é válida
      if (currentStatus === status) {
        return res.status(400).json({ message: `A transação já está com status '${status}'` });
      }
      
      // Lógica específica para cada tipo de mudança de status
      if (status === "cancelled") {
        // Apenas transações com status 'completed' ou 'pending' podem ser canceladas
        if (![TransactionStatus.COMPLETED, TransactionStatus.PENDING].includes(currentStatus)) {
          return res.status(400).json({ 
            message: `Não é possível cancelar uma transação com status '${currentStatus}'` 
          });
        }
        
        // Atualizar status da transação
        await db
          .update(transactions)
          .set({ 
            status: TransactionStatus.CANCELLED,
            updated_at: new Date(),
            notes: reason ? `${transaction.notes || ''} | Cancelado: ${reason}` : transaction.notes 
          })
          .where(eq(transactions.id, transactionId));
          
        // Se houver cashback associado, reverter
        if (parseFloat(transaction.cashback_amount) > 0) {
          // Verificar cashback atual do cliente
          const [cashback] = await db
            .select()
            .from(cashbacks)
            .where(eq(cashbacks.user_id, transaction.user_id));
            
          if (cashback) {
            // Calcular novo saldo (não permitir saldo negativo)
            const currentBalance = parseFloat(cashback.balance);
            const cashbackAmount = parseFloat(transaction.cashback_amount);
            const newBalance = Math.max(0, currentBalance - cashbackAmount).toString();
            
            // Atualizar cashback
            await db
              .update(cashbacks)
              .set({ 
                balance: newBalance,
                updated_at: new Date()
              })
              .where(eq(cashbacks.user_id, transaction.user_id));
              
            // Registrar transação de reversão de cashback
            await db.insert(cashbacks).values({
              user_id: transaction.user_id,
              transaction_id: transaction.id,
              amount: (-parseFloat(transaction.cashback_amount)).toString(),
              status: "reversed",
              description: "Cancelamento de transação",
              created_at: new Date()
            });
          }
        }
        
        // Registrar log
        console.log(`Transação ${transactionId} cancelada por ${merchantUserId}. Motivo: ${reason || 'Não informado'}`);
        
        return res.json({ 
          message: "Transação cancelada com sucesso",
          transaction: {
            id: transactionId,
            status: TransactionStatus.CANCELLED
          }
        });
      }
      else if (status === "refunded") {
        // Apenas transações com status 'completed' podem ser reembolsadas
        if (currentStatus !== TransactionStatus.COMPLETED) {
          return res.status(400).json({ 
            message: `Não é possível reembolsar uma transação com status '${currentStatus}'` 
          });
        }
        
        // Atualizar status da transação
        await db
          .update(transactions)
          .set({ 
            status: TransactionStatus.REFUNDED,
            updated_at: new Date(),
            notes: reason ? `${transaction.notes || ''} | Reembolsado: ${reason}` : transaction.notes 
          })
          .where(eq(transactions.id, transactionId));
          
        // Registrar log
        console.log(`Transação ${transactionId} reembolsada por ${merchantUserId}. Motivo: ${reason || 'Não informado'}`);
        
        return res.json({ 
          message: "Transação reembolsada com sucesso",
          transaction: {
            id: transactionId,
            status: TransactionStatus.REFUNDED
          }
        });
      } 
      else if (status === "completed") {
        // Apenas transações com status 'pending' podem ser completadas
        if (currentStatus !== TransactionStatus.PENDING) {
          return res.status(400).json({ 
            message: `Não é possível completar uma transação com status '${currentStatus}'` 
          });
        }
        
        // Atualizar status da transação
        await db
          .update(transactions)
          .set({ 
            status: TransactionStatus.COMPLETED,
            updated_at: new Date()
          })
          .where(eq(transactions.id, transactionId));
          
        // Registrar log
        console.log(`Transação ${transactionId} completada por ${merchantUserId}`);
        
        return res.json({ 
          message: "Transação completada com sucesso",
          transaction: {
            id: transactionId,
            status: TransactionStatus.COMPLETED
          }
        });
      }
      
      // Caso chegue aqui, é um status não implementado
      return res.status(400).json({ message: "Operação não suportada para este status" });
      
    } catch (error) {
      console.error("Erro ao atualizar status da transação:", error);
      res.status(500).json({ message: "Erro ao atualizar status da transação" });
    }
  });
  
  // Excluir uma transação (apenas se estiver com status adequado)
  app.delete("/api/merchant/sales/:transactionId", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantUserId = req.user.id;
      const transactionId = parseInt(req.params.transactionId);
      
      if (!transactionId || isNaN(transactionId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      // Obter dados do merchant
      const merchantResults = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantUserId));
        
      if (merchantResults.length === 0) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }
      
      const merchant = merchantResults[0];
      
      // Verificar se a transação existe e pertence a este lojista
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transactionId),
            eq(transactions.merchant_id, merchant.id)
          )
        );
        
      if (!transaction) {
        return res.status(404).json({ message: "Transação não encontrada ou não pertence a este lojista" });
      }
      
      // Apenas transações com status 'cancelled' ou 'refunded' podem ser excluídas
      if (![TransactionStatus.CANCELLED, TransactionStatus.REFUNDED].includes(transaction.status)) {
        return res.status(400).json({ 
          message: `Não é possível excluir uma transação com status '${transaction.status}'. Cancele ou reembolse primeiro.` 
        });
      }
      
      // Excluir itens da transação
      await db
        .delete(transactionItems)
        .where(eq(transactionItems.transaction_id, transactionId));
        
      // Excluir a transação
      await db
        .delete(transactions)
        .where(eq(transactions.id, transactionId));
        
      // Registrar log
      console.log(`Transação ${transactionId} excluída por ${merchantUserId}`);
      
      return res.json({ 
        message: "Transação excluída com sucesso"
      });
      
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      res.status(500).json({ message: "Erro ao excluir transação" });
    }
  });
  
  // Editar uma transação
  app.put("/api/merchant/sales/:transactionId", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantUserId = req.user.id;
      const transactionId = parseInt(req.params.transactionId);
      const { notes, payment_method } = req.body;
      
      if (!transactionId || isNaN(transactionId)) {
        return res.status(400).json({ message: "ID de transação inválido" });
      }
      
      // Obter dados do merchant
      const merchantResults = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantUserId));
        
      if (merchantResults.length === 0) {
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }
      
      const merchant = merchantResults[0];
      
      // Verificar se a transação existe e pertence a este lojista
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transactionId),
            eq(transactions.merchant_id, merchant.id)
          )
        );
        
      if (!transaction) {
        return res.status(404).json({ message: "Transação não encontrada ou não pertence a este lojista" });
      }
      
      // Apenas transações com status 'completed' ou 'pending' podem ser editadas
      if (![TransactionStatus.COMPLETED, TransactionStatus.PENDING].includes(transaction.status)) {
        return res.status(400).json({ 
          message: `Não é possível editar uma transação com status '${transaction.status}'` 
        });
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        updated_at: new Date()
      };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (payment_method !== undefined && Object.values(PaymentMethod).includes(payment_method)) {
        updateData.payment_method = payment_method;
      }
      
      
      // Verificar se há dados para atualizar
      if (Object.keys(updateData).length === 1) { // apenas updated_at está presente
        return res.status(400).json({ message: "Nenhum dado válido para atualização" });
      }
      
      // Atualizar a transação
      await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, transactionId));
        
      // Registrar log
      console.log(`Transação ${transactionId} editada por ${merchantUserId}`);
      
      // Buscar a transação atualizada
      const [updatedTransaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
        
      return res.json({ 
        message: "Transação atualizada com sucesso",
        transaction: updatedTransaction
      });
      
    } catch (error) {
      console.error("Erro ao editar transação:", error);
      res.status(500).json({ message: "Erro ao editar transação" });
    }
  });
  
  // Registrar uma nova venda
  app.post("/api/merchant/sales", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantUserId = req.user.id;
      
      // Obter dados do merchant
      const merchantResults = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantUserId));
        
      if (merchantResults.length === 0) {
        console.error(`Lojista não encontrado para o usuário ID ${merchantUserId}`);
        return res.status(404).json({ message: "Dados do lojista não encontrados" });
      }
      
      const merchant = merchantResults[0];
      console.log("Merchant encontrado:", merchant);
      
      // Extrair dados da venda
      const { 
        customerId, 
        items, 
        subtotal,
        discount,
        total, 
        cashback, 
        referralBonus,
        referrerId,
        paymentMethod, 
        notes,
        manualAmount
      } = req.body;
      
      console.log("Dados da venda:", { customerId, total, cashback, paymentMethod });
      
      // Verificar se o cliente existe
      const customer = await db
        .select()
        .from(users)
        .where(eq(users.id, customerId));
        
      if (customer.length === 0) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Iniciar transação
      // Preparar valores para inserção (garantindo que são strings)
      const saleAmount = total ? total.toString() : '0';
      const saleCashbackAmount = cashback ? cashback.toString() : '0';
      
      // Criar objeto de inserção base
      // Criar objeto de inserção base
      let insertValues: any = {
        user_id: customerId,
        merchant_id: merchant.id,
        amount: saleAmount,
        cashback_amount: saleCashbackAmount,
        status: TransactionStatus.COMPLETED,
        payment_method: paymentMethod,
        description: notes || null,
        created_at: new Date()
      };
      
      // Adicionar manual_amount se existir
      if (manualAmount) {
        insertValues.manual_amount = manualAmount.toString();
      }
      
      console.log("Inserindo transação com valores:", insertValues);
      
      console.log("Iniciando inserção da transação...");
      
      // Registrar a transação com manejo de erro mais detalhado
      let transaction;
      try {
        const [transactionResult] = await db.insert(transactions).values(insertValues).returning();
        transaction = transactionResult;
        console.log("Transação registrada com sucesso:", transaction);
      } catch (dbError) {
        console.error("Erro ao inserir transação:", dbError);
        throw new Error(`Falha ao registrar transação: ${dbError.message}`);
      }
      
      // Registrar os itens da transação
      if (items && items.length > 0 && transaction) {
        for (const item of items) {
          await db.insert(transactionItems).values({
            transaction_id: transaction.id,
            product_id: item.productId || null,
            product_name: item.productName || `Produto ${item.id}`,
            quantity: item.quantity,
            price: item.price.toString(),
            created_at: new Date()
          });
        }
      }
      
      // Atualizar o cashback do cliente
      const existingCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, customerId));
        
      if (existingCashback.length > 0) {
        // Atualizar cashback existente
        const currentBalance = parseFloat(existingCashback[0].balance.toString());
        const currentTotalEarned = parseFloat(existingCashback[0].total_earned.toString());
        
        await db
          .update(cashbacks)
          .set({
            balance: (currentBalance + parseFloat(cashback.toString())).toString(),
            total_earned: (currentTotalEarned + parseFloat(cashback.toString())).toString(),
            updated_at: new Date()
          })
          .where(eq(cashbacks.user_id, customerId));
      } else {
        // Criar novo registro de cashback
        await db.insert(cashbacks).values({
          user_id: customerId,
          balance: cashback.toString(),
          total_earned: cashback.toString(),
          updated_at: new Date()
        });
      }
      
      // Verifica se há referrerId e referralBonus explícitos
      let referrerUserToBonus = referrerId;
      let calculatedReferralBonus = referralBonus;
      
      // Se não houver referrerId explícito, verifica se o cliente possui um referenciador
      if (!referrerUserToBonus) {
        try {
          // Buscamos todos os registros e depois ordenamos manualmente
          const allReferrers = await db
            .select({
              referrer_id: referrals.referrer_id,
              created_at: referrals.created_at
            })
            .from(referrals)
            .where(eq(referrals.referred_id, customerId));
            
          // Ordenamos por data de criação e pegamos o mais recente
          const referrerResult = allReferrers
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 1);
          
          if (referrerResult.length > 0) {
            referrerUserToBonus = referrerResult[0].referrer_id;
            
            // Calcula o bônus de 1% sobre o valor da compra
            // Obtém a configuração do sistema para o bônus de referência
            let referralBonusRate = DEFAULT_SETTINGS.referralBonus; // 0.01 = 1%
            
            try {
              const commissionResult = await db
                .select()
                .from(commissionSettings)
                .limit(1);
                
              if (commissionResult.length > 0 && commissionResult[0].referral_bonus) {
                try {
                  const valueStr = String(commissionResult[0].referral_bonus);
                  const parsedValue = parseFloat(valueStr);
                  if (!isNaN(parsedValue)) {
                    referralBonusRate = parsedValue;
                  }
                } catch (parseError) {
                  console.error("Erro ao converter valor da comissão:", parseError);
                }
              }
            } catch (err) {
              console.error("Erro ao buscar configuração de comissão de referência:", err);
            }
            
            calculatedReferralBonus = parseFloat(saleAmount) * referralBonusRate;
            console.log(`Bônus de referência calculado para o usuário ${referrerUserToBonus}: ${calculatedReferralBonus}`);
          }
        } catch (err) {
          console.error("Erro ao buscar referenciador do cliente:", err);
        }
      }
      
      // Se houver bônus de indicação, registra e atualiza o cashback do referenciador
      if (referrerUserToBonus && calculatedReferralBonus > 0) {
        try {
          // Formatar valor do bônus com precisão de 2 casas decimais
          const formattedBonus = parseFloat(calculatedReferralBonus.toFixed(2));
          console.log(`✅ Processando bônus de indicação de ${formattedBonus} para o referenciador ${referrerUserToBonus}`);
          
          // Registra a transação de referência
          try {
            await db.insert(referrals).values({
              referrer_id: referrerUserToBonus,
              referred_id: customerId,
              bonus: formattedBonus.toString(),
              status: "active",
              created_at: new Date()
            });
            
            console.log(`✅ Bônus de referência no valor de ${formattedBonus} registrado para o usuário ${referrerUserToBonus}`);
          } catch (refError) {
            console.error(`❌ Erro ao registrar bônus de referência: ${refError.message}`);
            // Continuar mesmo se falhar para tentar atualizar o cashback
          }
          
          // Atualiza o cashback do referenciador
          const referrerCashback = await db
            .select()
            .from(cashbacks)
            .where(eq(cashbacks.user_id, referrerUserToBonus));
            
          if (referrerCashback.length > 0) {
            // Atualiza o cashback existente do referenciador
            let currentBalance = 0;
            let currentTotalEarned = 0;
            
            try {
              currentBalance = parseFloat(referrerCashback[0].balance?.toString() || "0");
              currentTotalEarned = parseFloat(referrerCashback[0].total_earned?.toString() || "0");
            } catch (error) {
              console.error(`Erro ao converter valores de cashback para o usuário ${referrerUserToBonus}:`, error);
            }
            
            // Formatar valores finais com precisão de 2 casas decimais
            const newBalance = (currentBalance + formattedBonus).toFixed(2);
            const newTotalEarned = (currentTotalEarned + formattedBonus).toFixed(2);
            
            await db
              .update(cashbacks)
              .set({
                balance: newBalance,
                total_earned: newTotalEarned,
                updated_at: new Date()
              })
              .where(eq(cashbacks.user_id, referrerUserToBonus));
              
            console.log(`Cashback do referenciador ${referrerUserToBonus} atualizado: saldo ${currentBalance} -> ${newBalance}, total ganho ${currentTotalEarned} -> ${newTotalEarned}`);
          } else {
            // Cria um novo registro de cashback para o referenciador
            await db.insert(cashbacks).values({
              user_id: referrerUserToBonus,
              balance: formattedBonus.toString(),
              total_earned: formattedBonus.toString(),
              updated_at: new Date()
            });
            
            console.log(`Novo cashback criado para referenciador ${referrerUserToBonus} com bônus inicial de ${formattedBonus}`);
          }
        } catch (error) {
          console.error(`Erro ao processar bônus de referência para o usuário ${referrerUserToBonus}:`, error);
        }
      }
      
      res.status(201).json({ 
        message: "Venda registrada com sucesso", 
        transaction 
      });
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      res.status(500).json({ message: "Erro ao registrar venda" });
    }
  });
  
  // Buscar clientes (para registro de vendas)
  app.get("/api/merchant/customers", isUserType("merchant"), async (req, res) => {
    try {
      const { term, searchBy } = req.query;
      
      if (!term || term.toString().length < 2) {
        return res.json([]);
      }

      // Lista de clientes simplificada para resolver o problema
      const clientsList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone
        })
        .from(users)
        .where(
          and(
            eq(users.type, "client"),
            searchBy === "name" 
              ? sql`${users.name} ILIKE ${`%${term}%`}` 
              : searchBy === "email" 
                ? sql`${users.email} ILIKE ${`%${term}%`}`
                : searchBy === "phone"
                  ? sql`${users.phone} ILIKE ${`%${term}%`}`
                  : undefined
          )
        )
        .limit(10);
        
      // Adicionar código de referência
      const clientsWithReferralCode = clientsList.map(client => ({
        ...client,
        referralCode: `CL${client.id}`
      }));
      
      res.json(clientsWithReferralCode);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });
  
  // Perfil do Lojista
  app.get("/api/merchant/profile", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const merchantId = req.user.id;
      
      // Obter dados do merchant
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Obter dados do usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, merchantId));
      
      // Combinar dados do merchant com dados do usuário
      const { user_id, ...merchantData } = merchant;
      
      // Criar objeto enriquecido para o frontend
      const enrichedData = {
        ...merchantData,
        email: user.email,
        phone: user.phone,
        owner: user.name,
        name: merchantData.store_name, // Para compatibilidade com o frontend
        // Dados padrão para o campo business_hours se não existir
        business_hours: "09:00 - 18:00",
        // Status fictício de ativação da loja
        active: true,
        // Cashback promocional
        cashbackPromotions: {
          enabled: false,
          doubleOnWeekends: false,
          specialCategories: false,
          minimumPurchase: 0
        }
      };
      
      res.json(enrichedData);
    } catch (error) {
      console.error("Erro ao buscar perfil do lojista:", error);
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });
  
  // Atualizar perfil do lojista
  app.patch("/api/merchant/profile", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { 
        name, 
        description, 
        address, 
        phone, 
        email, 
        website, 
        category,
        city,
        state,
        businessHours,
        owner
      } = req.body;
      
      // Obter dados do merchant
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      console.log("Atualizando perfil do lojista:", { 
        merchantId, 
        name: name || merchant.store_name,
        category: category || merchant.category
      });
      
      // Atualizar dados do merchant
      const [updatedMerchant] = await db
        .update(merchants)
        .set({
          store_name: name || merchant.store_name,
          address: address,
          city: city,
          state: state,
          category: category || merchant.category
        })
        .where(eq(merchants.user_id, merchantId))
        .returning();
      
      // Atualizar dados do usuário se necessário
      if (phone || email || owner) {
        await db
          .update(users)
          .set({
            name: owner,
            email: email,
            phone: phone
          })
          .where(eq(users.id, merchantId));
      }
      
      // Excluir dados sensíveis
      const { user_id, ...merchantData } = updatedMerchant;
      
      // Adicionar atributos extras para o frontend
      const enrichedData = {
        ...merchantData,
        email,
        phone,
        website,
        owner,
        name: merchantData.store_name // Mandar nome como store_name para compatibilidade
      };
      
      res.json(enrichedData);
    } catch (error) {
      console.error("Erro ao atualizar perfil do lojista:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });
  
  // Endpoint para upload de logo do lojista
  app.post("/api/merchant/profile/logo", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      
      // Em vez de usar logo como uma string, vamos tratar como base64
      // No FormData, o campo 'logo' contém um arquivo, mas quando enviado via JSON,
      // esperamos que seja uma string base64 da imagem
      let logoData = null;
      
      // Verificar formato do corpo da requisição (FormData ou JSON)
      if (req.headers['content-type']?.includes('application/json')) {
        // Request é JSON
        logoData = req.body.logo;
      } else {
        // Assumimos que é FormData
        logoData = req.body.logo;
      }
      
      if (!logoData) {
        return res.status(400).json({ message: "Nenhuma imagem foi fornecida" });
      }
      
      // Buscar registro do lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      console.log("Atualizando logo do lojista:", { merchantId });
      
      // Atualizar logo do lojista
      const [updatedMerchant] = await db
        .update(merchants)
        .set({
          logo: logoData
        })
        .where(eq(merchants.id, merchant.id))
        .returning();
      
      // Importar auditLogs do schema
      const { auditLogs } = await import("@shared/schema");
      
      // Registrar a atualização no log de auditoria
      await db.insert(auditLogs).values({
        action: "merchant_logo_updated",
        entity_type: "merchant",
        entity_id: merchant.id,
        user_id: merchantId,
        details: JSON.stringify({
          timestamp: new Date()
        }),
        created_at: new Date()
      });
      
      res.json({
        success: true,
        logo: updatedMerchant.logo
      });
    } catch (error) {
      console.error("Erro ao atualizar logo do lojista:", error);
      res.status(500).json({ message: "Erro ao atualizar logo" });
    }
  });
  
  // Atualizar status do lojista (ativo/inativo)
  app.patch("/api/merchant/profile/status", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { active } = req.body;
      
      if (active === undefined) {
        return res.status(400).json({ message: "Status não informado" });
      }
      
      // Buscar registro do lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Determinar o novo status com base no valor 'active'
      const newStatus = active ? "active" : "inactive";
      
      // Atualizar status no registro do usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          status: newStatus,
        })
        .where(eq(users.id, merchantId))
        .returning();
      
      // Importar auditLogs do schema
      const { auditLogs } = await import("@shared/schema");
      
      // Registrar a atualização no log de auditoria
      await db.insert(auditLogs).values({
        action: active ? "merchant_activated" : "merchant_deactivated",
        entity_type: "merchant",
        entity_id: merchant.id,
        user_id: merchantId,
        details: JSON.stringify({
          timestamp: new Date(),
          previous_status: req.user.status,
          new_status: newStatus
        }),
        created_at: new Date()
      });
      
      res.json({
        success: true,
        status: newStatus
      });
    } catch (error) {
      console.error("Erro ao atualizar status do lojista:", error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });
  
  // Atualizar configurações de cashback do lojista
  app.patch("/api/merchant/settings/cashback", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { cashbackPromotions } = req.body;
      
      // Validar dados recebidos
      if (!cashbackPromotions) {
        return res.status(400).json({ message: "Dados inválidos" });
      }
      
      // Obter dados do lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      console.log("Atualizando configurações de cashback:", { 
        merchantId, 
        cashbackPromotions
      });
      
      // Armazenar configurações na tabela settings como JSON
      // Verificar se já existe uma configuração para este lojista
      // Importar settings da schema
      const { settings } = await import("@shared/schema");
      
      const existingSettings = await db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.key, `merchant_${merchant.id}_cashback_promotions`)
          )
        );
      
      if (existingSettings && existingSettings.length > 0) {
        // Atualizar configurações existentes
        await db
          .update(settings)
          .set({
            value: JSON.stringify(cashbackPromotions),
            updated_at: new Date()
          })
          .where(
            and(
              eq(settings.key, `merchant_${merchant.id}_cashback_promotions`)
            )
          );
      } else {
        // Criar novas configurações
        await db
          .insert(settings)
          .values({
            key: `merchant_${merchant.id}_cashback_promotions`,
            value: JSON.stringify(cashbackPromotions),
            updated_at: new Date()
          });
      }
      
      res.json({ 
        success: true, 
        message: "Configurações de cashback atualizadas com sucesso",
        cashbackPromotions
      });
    } catch (error) {
      console.error("Erro ao atualizar configurações de cashback:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações de cashback" });
    }
  });
  
  // Obter histórico de transações do lojista
  app.get("/api/merchant/transactions", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const userId = req.user.id;
      const { status, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;
      
      // Obter dados do merchant
      const merchantResults = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, userId));
      
      if (!merchantResults || merchantResults.length === 0) {
        return res.status(404).json({ message: "Merchant não encontrado" });
      }
      
      const merchant = merchantResults[0];
      
      // Construir a query - mostrando apenas transações válidas
      let query = db
        .select({
          id: transactions.id,
          customer: users.name,
          date: transactions.created_at,
          amount: transactions.amount,
          cashback: transactions.cashback_amount,
          paymentMethod: transactions.payment_method,
          status: transactions.status,
          items: sql`(SELECT COUNT(*) FROM ${transactionItems} WHERE ${transactionItems.transaction_id} = ${transactions.id})`.as("items")
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.user_id, users.id))
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending'])
          )
        );
        
      // Aplicar filtros
      if (status) {
        query = query.where(eq(transactions.status, status as string));
      }
      
      if (paymentMethod) {
        query = query.where(eq(transactions.payment_method, paymentMethod as string));
      }
      
      if (startDate && endDate) {
        query = query.where(
          and(
            sql`${transactions.created_at} >= ${startDate as string}`,
            sql`${transactions.created_at} <= ${endDate as string}`
          )
        );
      }
      
      // Calcular totais (independente da paginação) - apenas para transações válidas
      const totalAmount = await db
        .select({ sum: sql`SUM(${transactions.amount})` })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending', 'cancelled'])
          )
        );
      
      const totalCashback = await db
        .select({ sum: sql`SUM(${transactions.cashback_amount})` })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending', 'cancelled'])
          )
        );
      
      // Agrupar por status - apenas transações válidas
      const statusCounts = await db
        .select({
          status: transactions.status,
          count: sql`COUNT(*)`.as("count")
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending', 'cancelled'])
          )
        )
        .groupBy(transactions.status);
      
      // Agrupar por método de pagamento - apenas transações válidas
      const paymentMethodSummary = await db
        .select({
          method: transactions.payment_method,
          sum: sql`SUM(${transactions.amount})`.as("sum")
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.merchant_id, merchant.id),
            inArray(transactions.status, ['completed', 'pending', 'cancelled'])
          )
        )
        .groupBy(transactions.payment_method);
      
      // Aplicar paginação sem usar orderBy(desc())
      const offset = (Number(page) - 1) * Number(limit);
      query = query.limit(Number(limit) * 2).offset(offset); // Buscamos mais itens para depois ordenar manualmente
      
      // Executar a consulta
      const allTransactions = await query;
      
      // Ordenar manualmente por data de criação e aplicar o limite correto
      const transactions_list = allTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, Number(limit));
      
      res.json({
        transactions: transactions_list,
        totalAmount: totalAmount[0]?.sum || 0,
        totalCashback: totalCashback[0]?.sum || 0,
        statusCounts,
        paymentMethodSummary
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de transações:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de transações" });
    }
  });
  
  // Obter relatórios financeiros do lojista
  app.get("/api/merchant/reports", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { period, startDate, endDate, type = "sales" } = req.query;
      
      // Obter dados do merchant
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      // Determinar datas de início e fim com base no período
      let start_date, end_date;
      const now = new Date();
      
      switch (period) {
        case "today":
          start_date = new Date(now.setHours(0, 0, 0, 0));
          end_date = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "week":
          start_date = new Date(now);
          start_date.setDate(start_date.getDate() - 7);
          end_date = new Date(now);
          break;
        case "month":
          start_date = new Date(now);
          start_date.setMonth(start_date.getMonth() - 1);
          end_date = new Date(now);
          break;
        case "quarter":
          start_date = new Date(now);
          start_date.setMonth(start_date.getMonth() - 3);
          end_date = new Date(now);
          break;
        case "year":
          start_date = new Date(now);
          start_date.setFullYear(start_date.getFullYear() - 1);
          end_date = new Date(now);
          break;
        case "custom":
          if (startDate && endDate) {
            start_date = new Date(startDate as string);
            end_date = new Date(endDate as string);
          } else {
            start_date = new Date();
            start_date.setMonth(start_date.getMonth() - 1);
            end_date = new Date();
          }
          break;
        default:
          start_date = new Date();
          start_date.setMonth(start_date.getMonth() - 1);
          end_date = new Date();
          break;
      }
      
      let response = {};
      
      // Relatórios de vendas
      if (type === "sales") {
        // Total de vendas no período
        const totalSales = await db
          .select({ sum: sql`SUM(${transactions.amount})` })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Quantidade de vendas no período
        const salesCount = await db
          .select({ count: sql`COUNT(*)` })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Total de cashback concedido no período
        const totalCashback = await db
          .select({ sum: sql`SUM(${transactions.cashback_amount})` })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Vendas agregadas por dia para gráfico de timeline
        const timeline = await db
          .select({
            date: sql`DATE_TRUNC('day', ${transactions.created_at})`.as("date"),
            value: sql`SUM(${transactions.amount})`.as("value")
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          )
          .groupBy(sql`DATE_TRUNC('day', ${transactions.created_at})`)
          .orderBy(sql`DATE_TRUNC('day', ${transactions.created_at})`);
        
        // Vendas por método de pagamento
        const byPaymentMethod = await db
          .select({
            name: transactions.payment_method,
            value: sql`SUM(${transactions.amount})`.as("value")
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          )
          .groupBy(transactions.payment_method);
        
        // Top produtos vendidos
        const topProducts = await db
          .select({
            name: sql`${transactionItems.product_name}`.as("name"),
            value: sql`SUM(${transactionItems.quantity})`.as("value"),
            revenue: sql`SUM(${transactionItems.price} * ${transactionItems.quantity})`.as("revenue")
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transaction_id, transactions.id))
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          )
          .groupBy(sql`${transactionItems.product_name}`)
          .orderBy(sql`SUM(${transactionItems.quantity})`, "desc")
          .limit(5);
        
        response = {
          salesData: {
            total: totalSales[0]?.sum || 0,
            count: salesCount[0]?.count || 0,
            average: salesCount[0]?.count ? (totalSales[0]?.sum || 0) / salesCount[0]?.count : 0,
            cashback: totalCashback[0]?.sum || 0,
            timeline: timeline.map(item => ({
              date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              value: parseFloat(item.value as string)
            })),
            byPaymentMethod: byPaymentMethod.map(item => ({
              name: item.name === PaymentMethod.CREDIT_CARD ? "Cartão de Crédito" :
                   item.name === PaymentMethod.DEBIT_CARD ? "Cartão de Débito" :
                   item.name === PaymentMethod.CASH ? "Dinheiro" :
                   item.name === PaymentMethod.PIX ? "Pix" :
                   item.name === PaymentMethod.CASHBACK ? "Cashback" : item.name,
              value: parseFloat(item.value as string)
            })),
            topProducts
          }
        };
      }
      
      // Relatórios de clientes
      else if (type === "customers") {
        // Total de clientes únicos
        const totalCustomers = await db
          .select({
            count: sql`COUNT(DISTINCT ${transactions.user_id})`.as("count")
          })
          .from(transactions)
          .where(eq(transactions.merchant_id, merchant.id));
        
        // Clientes que compraram no período atual (novos)
        const newCustomers = await db
          .select({
            count: sql`COUNT(DISTINCT ${transactions.user_id})`.as("count")
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Clientes recorrentes (que já compraram antes)
        const returningCustomers = totalCustomers[0]?.count - newCustomers[0]?.count;
        
        // Evolução mensal da base de clientes
        const timeline = await db
          .select({
            date: sql`DATE_TRUNC('month', ${transactions.created_at})`.as("date"),
            value: sql`COUNT(DISTINCT ${transactions.user_id})`.as("value")
          })
          .from(transactions)
          .where(eq(transactions.merchant_id, merchant.id))
          .groupBy(sql`DATE_TRUNC('month', ${transactions.created_at})`)
          .orderBy(sql`DATE_TRUNC('month', ${transactions.created_at})`);
        
        // Clientes por frequência de compras
        const byFrequency = await db
          .select({
            customerId: transactions.user_id,
            visits: sql`COUNT(*)`.as("visits")
          })
          .from(transactions)
          .where(eq(transactions.merchant_id, merchant.id))
          .groupBy(transactions.user_id);
        
        const frequencyDistribution = {
          "1 compra": 0,
          "2-5 compras": 0,
          "6-10 compras": 0,
          "11+ compras": 0
        };
        
        byFrequency.forEach(item => {
          const visits = parseInt(item.visits as string);
          if (visits === 1) frequencyDistribution["1 compra"]++;
          else if (visits >= 2 && visits <= 5) frequencyDistribution["2-5 compras"]++;
          else if (visits >= 6 && visits <= 10) frequencyDistribution["6-10 compras"]++;
          else frequencyDistribution["11+ compras"]++;
        });
        
        // Top 5 clientes
        const topCustomers = await db
          .select({
            customerId: transactions.user_id,
            name: users.name,
            visits: sql`COUNT(*)`.as("visits"),
            spent: sql`SUM(${transactions.amount})`.as("spent")
          })
          .from(transactions)
          .innerJoin(users, eq(transactions.user_id, users.id))
          .where(eq(transactions.merchant_id, merchant.id))
          .groupBy(transactions.user_id, users.name)
          .orderBy(sql`SUM(${transactions.amount})`, "desc")
          .limit(5);
        
        response = {
          customersData: {
            total: totalCustomers[0]?.count || 0,
            new: newCustomers[0]?.count || 0,
            returning: returningCustomers > 0 ? returningCustomers : 0,
            timeline: timeline.map(item => ({
              date: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short' }),
              value: parseInt(item.value as string)
            })),
            byFrequency: Object.entries(frequencyDistribution).map(([name, value]) => ({ name, value })),
            topCustomers: topCustomers.map(customer => ({
              name: customer.name,
              visits: parseInt(customer.visits as string),
              spent: parseFloat(customer.spent as string)
            }))
          }
        };
      }
      
      // Relatórios de cashback
      else if (type === "cashback") {
        // Total de cashback no período
        const totalCashback = await db
          .select({ sum: sql`SUM(${transactions.cashback_amount})` })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Quantidade de transações com cashback
        const cashbackCount = await db
          .select({ count: sql`COUNT(*)` })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.cashback_amount} > 0`,
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          );
        
        // Cashback diário para timeline
        const timeline = await db
          .select({
            date: sql`DATE_TRUNC('day', ${transactions.created_at})`.as("date"),
            value: sql`SUM(${transactions.cashback_amount})`.as("value")
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.merchant_id, merchant.id),
              sql`${transactions.created_at} >= ${start_date.toISOString()}`,
              sql`${transactions.created_at} <= ${end_date.toISOString()}`
            )
          )
          .groupBy(sql`DATE_TRUNC('day', ${transactions.created_at})`)
          .orderBy(sql`DATE_TRUNC('day', ${transactions.created_at})`);
        
        // Dados fictícios para a distribuição de cashback por tipo
        const distribution = [
          { name: "Cashback Direto", value: (totalCashback[0]?.sum || 0) * 0.8 },
          { name: "Bônus de Indicação", value: (totalCashback[0]?.sum || 0) * 0.15 },
          { name: "Promoções", value: (totalCashback[0]?.sum || 0) * 0.05 }
        ];
        
        response = {
          cashbackData: {
            total: totalCashback[0]?.sum || 0,
            count: cashbackCount[0]?.count || 0,
            average: cashbackCount[0]?.count ? (totalCashback[0]?.sum || 0) / cashbackCount[0]?.count : 0,
            timeline: timeline.map(item => ({
              date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              value: parseFloat(item.value as string)
            })),
            distribution
          }
        };
      }
      
      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ message: "Erro ao buscar relatórios" });
    }
  });
  
  // Obter referências e indicações do lojista
  app.get("/api/merchant/referrals", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      let userReferralCode = "";
      let referrals_list = [];
      let totalEarned = 0;
      let pendingReferrals = 0;
      let activeReferrals = 0;
      let referralsCount = 0;
      
      try {
        // Buscar dados do usuário com SQL direto
        const userResult = await db.execute(
          sql`SELECT id, name, email, invitation_code FROM users WHERE id = ${merchantId}`
        );
        
        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        const userData = userResult.rows[0];
        
        // Se não houver código de referência, gerar um e salvar
        userReferralCode = userData.invitation_code;
        if (!userReferralCode) {
          userReferralCode = "LJ" + merchantId.toString().padStart(4, '0');
          
          // Atualizar código de referência do usuário com SQL direto
          await db.execute(
            sql`UPDATE users SET invitation_code = ${userReferralCode} WHERE id = ${merchantId}`
          );
        }
      } catch (error) {
        console.error("Erro ao buscar/gerar código de referência:", error);
        // Se ocorrer erro, gerar um código baseado apenas no ID
        userReferralCode = "LJ" + merchantId.toString().padStart(4, '0');
      }
      
      try {
        // Obter dados do merchant
        const merchantResult = await db.execute(
          sql`SELECT id FROM merchants WHERE user_id = ${merchantId}`
        );
        
        if (merchantResult.rows.length === 0) {
          throw new Error("Dados do lojista não encontrados");
        }
        
        const merchantStoreId = merchantResult.rows[0].id;
        
        // Buscar referrals do lojista - incluindo todos os usuários indicados, sem duplicação
        const referralsResult = await db.execute(
          sql`
          SELECT DISTINCT ON (r.id)
            r.id, 
            r.referrer_id,
            r.referred_id, 
            r.bonus, 
            r.status, 
            r.created_at,
            u.name as referred_name,
            u.type as user_type,
            u.email,
            u.phone,
            m.store_name as store_name
          FROM referrals r
          JOIN users u ON r.referred_id = u.id
          LEFT JOIN merchants m ON u.type = 'merchant' AND m.user_id = u.id
          WHERE r.referrer_id = ${merchantId}
          ORDER BY r.id, r.created_at DESC
          LIMIT 100
          `
        );
        
        // Log para debug
        console.log(`Encontradas ${referralsResult.rows.length} indicações para o lojista ${merchantId}`);
        for (const ref of referralsResult.rows) {
          console.log(`- ID: ${ref.id}, Referred: ${ref.referred_id}, Name: ${ref.referred_name}, Type: ${ref.user_type}, Status: ${ref.status}`);
        }
        
        // Formatar lista de referências para o frontend, incluindo usuários que ainda não entraram
        referrals_list = referralsResult.rows.map(ref => ({
          id: ref.id,
          name: ref.referred_name || 'Usuário registrado',
          store_name: ref.store_name || (ref.user_type === 'merchant' ? 'Loja sem nome' : ''),
          email: ref.email || 'Email não informado',
          phone: ref.phone || 'Telefone não informado',
          user_type: ref.user_type || 'merchant', // Assume lojista por padrão para o painel de merchant
          date: format(new Date(ref.created_at), 'dd/MM/yyyy'),
          status: ref.status || 'pending',
          commission: parseFloat(ref.bonus || '0').toFixed(2)
        }));
        
        // Calcular estatísticas
        const totalEarnedResult = await db.execute(
          sql`SELECT COALESCE(SUM(bonus), 0) as total
              FROM referrals
              WHERE referrer_id = ${merchantId} AND status = 'active'`
        );
        totalEarned = parseFloat(totalEarnedResult.rows[0]?.total || '0');
        
        const pendingResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM referrals
              WHERE referrer_id = ${merchantId} AND status = 'pending'`
        );
        pendingReferrals = parseInt(pendingResult.rows[0]?.count || '0');
        
        const activeResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM referrals
              WHERE referrer_id = ${merchantId} AND status = 'active'`
        );
        activeReferrals = parseInt(activeResult.rows[0]?.count || '0');
        
        // Contar total de referências
        const refCountResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM referrals
              WHERE referrer_id = ${merchantId}`
        );
        referralsCount = parseInt(refCountResult.rows[0]?.count || '0');
      } catch (error) {
        console.error("Erro ao buscar dados de referência:", error);
        // Em caso de erro, manter valores padrão (já inicializados acima)
      }
      
      // Buscar configuração de comissão para referências (com tratamento de erro)
      let commissionRate = DEFAULT_SETTINGS.merchantCommission;
      try {
        const commissionResult = await db
          .select()
          .from(commissionSettings)
          .limit(1);
        
        // Usar o valor padrão do sistema se não houver configuração
        if (commissionResult.length > 0) {
          commissionRate = parseFloat(commissionResult[0].merchant_commission);
        }
      } catch (error) {
        console.error("Erro ao buscar configuração de comissão:", error);
      }
      
      // Construir URL completa com base no host da requisição
      const host = req.get('host') || 'valecashback.com';
      const protocol = req.protocol || 'https';
      const referralUrl = `${protocol}://${host}/convite/${userReferralCode}`;
      
      res.json({
        referralCode: userReferralCode,
        referralUrl,
        referralsCount,
        pendingReferrals,
        activeReferrals,
        totalEarned: totalEarned.toFixed(2),
        commission: (commissionRate * 100).toFixed(1),
        referrals: referrals_list,
        monthlyEarnings: [
          { month: "Jan", value: 0 },
          { month: "Fev", value: 0 },
          { month: "Mar", value: 0 },
          { month: "Abr", value: 0 },
          { month: "Mai", value: 0 },
          { month: "Jun", value: 0 },
          { month: "Jul", value: 0 },
          { month: "Ago", value: 0 },
          { month: "Set", value: 0 },
          { month: "Out", value: 0 },
          { month: "Nov", value: 0 },
          { month: "Dez", value: 0 }
        ]
      });
    } catch (error) {
      console.error("Erro ao buscar referências:", error);
      
      // Em caso de erro, retornar pelo menos o código de referência básico
      const merchantId = req.user?.id || 0;
      const userReferralCode = "LJ" + merchantId.toString().padStart(4, '0');
      const host = req.get('host') || 'valecashback.com';
      const protocol = req.protocol || 'https';
      const referralUrl = `${protocol}://${host}/convite/${userReferralCode}`;
      
      res.json({
        referralCode: userReferralCode,
        referralUrl,
        referralsCount: 0,
        pendingReferrals: 0,
        activeReferrals: 0,
        totalEarned: "0.00",
        commission: (DEFAULT_SETTINGS.merchantCommission * 100).toFixed(1),
        referrals: [],
        monthlyEarnings: [
          { month: "Jan", value: 0 },
          { month: "Fev", value: 0 },
          { month: "Mar", value: 0 },
          { month: "Abr", value: 0 },
          { month: "Mai", value: 0 },
          { month: "Jun", value: 0 },
          { month: "Jul", value: 0 },
          { month: "Ago", value: 0 },
          { month: "Set", value: 0 },
          { month: "Out", value: 0 },
          { month: "Nov", value: 0 },
          { month: "Dez", value: 0 }
        ]
      });
    }
  });
  
  // Atualizar configurações do lojista
  app.patch("/api/merchant/settings/payment", isUserType("merchant"), async (req, res) => {
    try {
      const merchantId = req.user.id;
      const {
        acceptCashback,
        cashbackBonus,
        acceptCreditCard,
        acceptDebitCard,
        acceptPix,
        acceptCash,
        minimumValue,
        autoWithdraw,
        bankName,
        bankAccount,
        bankAgency,
        pixKey
      } = req.body;
      
      // Obter dados do merchant
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      // Atualizar configurações
      const paymentSettings = {
        acceptCashback,
        cashbackBonus,
        acceptCreditCard,
        acceptDebitCard,
        acceptPix,
        acceptCash,
        minimumValue,
        autoWithdraw,
        bankName,
        bankAccount,
        bankAgency,
        pixKey
      };
      
      // Atualizar o merchant
      const [updatedMerchant] = await db
        .update(merchants)
        .set({
          paymentSettings: JSON.stringify(paymentSettings),
          updatedAt: new Date()
        })
        .where(eq(merchants.user_id, merchantId))
        .returning();
      
      res.json({ message: "Configurações de pagamento atualizadas", paymentSettings });
    } catch (error) {
      console.error("Erro ao atualizar configurações de pagamento:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });
  
  app.patch("/api/merchant/settings/notifications", isUserType("merchant"), async (req, res) => {
    try {
      const merchantId = req.user.id;
      const notificationSettings = req.body;
      
      // Obter dados do merchant
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      // Atualizar o merchant
      const [updatedMerchant] = await db
        .update(merchants)
        .set({
          notificationSettings: JSON.stringify(notificationSettings),
          updatedAt: new Date()
        })
        .where(eq(merchants.user_id, merchantId))
        .returning();
      
      res.json({ message: "Configurações de notificações atualizadas", notificationSettings });
    } catch (error) {
      console.error("Erro ao atualizar configurações de notificações:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });
  
  // Alterar senha do lojista
  app.post("/api/merchant/change-password", isUserType("merchant"), async (req, res) => {
    try {
      const merchantId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Verificar senha atual
      const user = await storage.getUserByUsername(req.user.email);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar senha atual (usando a função do auth.ts)
      const isPasswordValid = await storage.comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Gerar hash da nova senha
      const hashedPassword = await storage.hashPassword(newPassword);
      
      // Atualizar senha
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updated_at: new Date()
        })
        .where(eq(users.id, merchantId));
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });
  
  // Listar todas as lojas para exibição nos painéis
  app.get("/api/merchant/stores", isUserType("merchant"), async (req, res) => {
    try {
      // Obter o ID do lojista atual
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const currentMerchantId = req.user.id;

      // Buscar todas as lojas ativas exceto a do próprio lojista
      const storesResult = await db
        .select({
          id: merchants.id,
          store_name: merchants.store_name,
          logo: merchants.logo,
          category: merchants.category,
          address: merchants.address,
          city: merchants.city,
          state: merchants.state,
          commission_rate: merchants.commission_rate,
          created_at: merchants.created_at,
          user_id: users.id,
          email: users.email,
          phone: users.phone,
          owner_name: users.name,
          type: users.type
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .where(and(
          eq(merchants.approved, true),
          ne(users.id, currentMerchantId)
        ))
        .orderBy(merchants.store_name);
      
      // Formatar para o frontend
      const stores = storesResult.map(store => ({
        id: store.id,
        storeId: store.id,
        userId: store.user_id,
        store_name: store.store_name,
        name: store.store_name,
        logo: store.logo || null,
        category: store.category || 'Geral',
        description: '', // Campo vazio pois não existe na tabela
        address: store.address,
        city: store.city,
        state: store.state,
        ownerName: store.owner_name,
        email: store.email,
        phone: store.phone,
        commissionRate: store.commission_rate,
        rating: 5.0, // Valor padrão para todas as lojas no momento
        createdAt: store.created_at
      }));
      
      res.json(stores);
    } catch (error) {
      console.error("Erro ao listar lojas para o lojista:", error);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });
  
  app.get("/api/merchant/stores/old", async (req, res) => {
    try {
      // Buscar todas as lojas ativas
      const storesResult = await db.execute(
        sql`
        SELECT 
          m.id, 
          m.store_name, 
          m.logo, 
          m.category, 
          u.name as owner_name,
          u.id as user_id,
          u.email,
          u.phone,
          u.type
        FROM merchants m
        JOIN users u ON m.user_id = u.id
        WHERE m.approved = true
        ORDER BY m.store_name ASC
        `
      );
      
      // Formatar para o frontend
      const stores = storesResult.rows.map(store => ({
        id: store.id,
        storeId: store.id,
        userId: store.user_id,
        name: store.store_name,
        logo: store.logo || null,
        category: store.category || 'Geral',
        description: store.description || '',
        ownerName: store.owner_name,
        email: store.email,
        phone: store.phone
      }));
      
      res.json(stores);
    } catch (error) {
      console.error("Erro ao listar lojas:", error);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });

  // Cliente - Listar todas as lojas para exibição nos painéis
  app.get("/api/client/stores", isUserType("client"), async (req, res) => {
    try {
      // Buscar todas as lojas ativas usando consulta select
      const storesResult = await db
        .select({
          id: merchants.id,
          store_name: merchants.store_name,
          logo: merchants.logo,
          category: merchants.category,
          commission_rate: merchants.commission_rate,
          created_at: merchants.created_at,
          user_id: users.id,
          email: users.email,
          phone: users.phone,
          owner_name: users.name,
          type: users.type
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .where(eq(merchants.approved, true))
        .orderBy(merchants.store_name);
      
      // Formatar para o frontend
      const stores = storesResult.map(store => ({
        id: store.id,
        storeId: store.id,
        userId: store.user_id,
        store_name: store.store_name,
        name: store.store_name,
        logo: store.logo || null,
        category: store.category || 'Geral',
        description: '', // Campo vazio pois não existe na tabela
        ownerName: store.owner_name,
        email: store.email,
        phone: store.phone,
        commissionRate: store.commission_rate,
        rating: 5.0, // Valor padrão para todas as lojas no momento
        createdAt: store.created_at
      }));
      
      res.json(stores);
    } catch (error) {
      console.error("Erro ao listar lojas:", error);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });

  // QR Code para lojista
  // Rota para processar QR code (usado pelo scanner do lojista)
  app.post("/api/merchant/process-qrcode", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { qrData } = req.body;
      
      if (!qrData) {
        return res.status(400).json({ message: "Dados do QR Code ausentes" });
      }
      
      // Obter o ID da loja do comerciante
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      let parsedData;
      
      try {
        // Tentar interpretar os dados do QR code como JSON
        parsedData = JSON.parse(qrData);
      } catch (e) {
        // Se não for JSON, verificar se é um código QR específico
        // Verificar se o qrData é um código de QR direto da tabela qr_codes
        const [qrCode] = await db
          .select()
          .from(qrCodes)
          .where(eq(qrCodes.code, qrData))
          .limit(1);
          
        if (qrCode) {
          // Se encontrou o QR code no banco de dados
          if (qrCode.used) {
            return res.status(400).json({ message: "Este QR Code já foi utilizado" });
          }
          
          if (new Date(qrCode.expires_at) < new Date()) {
            return res.status(400).json({ message: "Este QR Code está expirado" });
          }
          
          // Buscar o cliente associado ao QR Code
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, qrCode.user_id));
            
          if (!user) {
            return res.status(404).json({ message: "Cliente não encontrado" });
          }
          
          return res.json({
            type: "payment",
            code: qrCode.code,
            customer_id: user.id,
            customer_name: user.name,
            customer_email: user.email,
            amount: parseFloat(qrCode.amount.toString()),
            date: new Date().toLocaleDateString('pt-BR'),
            cashback: parseFloat(qrCode.amount.toString()) * 0.02, // 2% de cashback (uma simplificação)
          });
        }
        
        // Se não for JSON nem um código reconhecido, retornar erro
        return res.status(400).json({ message: "Formato de QR Code inválido" });
      }
      
      // Se for um JSON válido, verificar o tipo
      if (parsedData.type === "customer") {
        // Validar se o cliente existe
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, parsedData.id))
          .where(eq(users.type, "client"));
          
        if (!user) {
          return res.status(404).json({ message: "Cliente não encontrado" });
        }
        
        // Obter saldo cashback do cliente
        const [cashback] = await db
          .select()
          .from(cashbacks)
          .where(eq(cashbacks.user_id, user.id));
          
        const walletBalance = cashback ? parseFloat(cashback.balance.toString()) : 0;
        
        return res.json({
          type: "customer",
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "-",
          wallet_id: `WALLET${user.id}`,
          wallet_balance: walletBalance
        });
      }
      
      // Se chegou aqui, o tipo não é reconhecido
      return res.status(400).json({ message: "Tipo de QR Code não suportado" });
      
    } catch (error) {
      console.error("Erro ao processar QR Code:", error);
      res.status(500).json({ message: "Erro ao processar QR Code" });
    }
  });

  app.post("/api/merchant/qrcode", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      const { amount, description } = req.body;
      
      if (!amount || isNaN(parseFloat(amount.toString()))) {
        return res.status(400).json({ message: "Valor inválido" });
      }
      
      // Obter o ID da loja do comerciante
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Gerar um código único para o QR Code
      const code = crypto.randomBytes(16).toString('hex');
      
      // Definir data de expiração (1 hora a partir de agora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Criar o registro do QR Code
      const [qrCode] = await db
        .insert(qrCodes)
        .values({
          user_id: merchantId,
          code,
          amount: parseFloat(amount.toString()),
          description: description || `Pagamento para ${merchant.store_name}`,
          expires_at: expiresAt,
          created_at: new Date()
        })
        .returning();
      
      // Retornar os dados do QR Code
      res.status(201).json({
        id: qrCode.id,
        code: qrCode.code,
        amount: parseFloat(qrCode.amount.toString()),
        description: qrCode.description,
        expiresAt: qrCode.expires_at,
        merchant: {
          id: merchant.id,
          name: merchant.store_name
        }
      });
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      res.status(500).json({ message: "Erro ao gerar QR Code" });
    }
  });
  
  // Processar pagamento por QR Code
  app.post("/api/client/pay-qrcode", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      const { code, payment_method } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Código QR inválido" });
      }
      
      // Buscar o QR Code
      const [qrCode] = await db
        .select()
        .from(qrCodes)
        .where(
          and(
            eq(qrCodes.code, code),
            eq(qrCodes.used, false),
            gt(qrCodes.expires_at, new Date())
          )
        );
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR Code inválido ou expirado" });
      }
      
      // Obter dados do merchant (lojista que gerou o QR Code)
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, qrCode.user_id));
      
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Obter configurações de comissão
      const [settings] = await db
        .select()
        .from(commissionSettings)
        .limit(1);
      
      let platformFee = DEFAULT_SETTINGS.platformFee;
      let merchantCommission = DEFAULT_SETTINGS.merchantCommission;
      let clientCashback = DEFAULT_SETTINGS.clientCashback;
      
      if (settings) {
        platformFee = parseFloat(settings.platform_fee.toString());
        merchantCommission = parseFloat(settings.merchant_commission.toString());
        clientCashback = parseFloat(settings.client_cashback.toString());
      }
      
      // Calcular valores
      const amount = parseFloat(qrCode.amount.toString());
      const cashbackAmount = amount * clientCashback;
      
      // Registrar a transação
      const [transaction] = await db
        .insert(transactions)
        .values({
          user_id: clientId,
          merchant_id: merchant.id,
          amount: amount.toString(),
          cashback_amount: cashbackAmount.toString(),
          description: qrCode.description,
          status: "completed",
          payment_method: payment_method || PaymentMethod.CASH,
          created_at: new Date()
        })
        .returning();
      
      // Atualizar QR Code como usado
      await db
        .update(qrCodes)
        .set({
          used: true
        })
        .where(eq(qrCodes.id, qrCode.id));
      
      // Atualizar o cashback do cliente
      const existingCashback = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, clientId));
        
      if (existingCashback.length > 0) {
        // Atualizar cashback existente
        const currentBalance = parseFloat(existingCashback[0].balance.toString());
        const currentTotalEarned = parseFloat(existingCashback[0].total_earned.toString());
        
        await db
          .update(cashbacks)
          .set({
            balance: (currentBalance + cashbackAmount).toString(),
            total_earned: (currentTotalEarned + cashbackAmount).toString(),
            updated_at: new Date()
          })
          .where(eq(cashbacks.user_id, clientId));
      } else {
        // Criar novo registro de cashback
        await db.insert(cashbacks).values({
          user_id: clientId,
          balance: cashbackAmount.toString(),
          total_earned: cashbackAmount.toString(),
          updated_at: new Date()
        });
      }
      
      res.status(201).json({
        message: "Pagamento realizado com sucesso",
        transaction: {
          id: transaction.id,
          amount,
          cashback: cashbackAmount,
          merchant: merchant.store_name,
          date: transaction.created_at
        }
      });
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      res.status(500).json({ message: "Erro ao processar pagamento" });
    }
  });
  
  // ROTAS DO CLIENTE
  
  // Dashboard do Cliente
  app.get("/api/client/dashboard", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      
      // Obter saldo de cashback usando SQL direto
      const cashbackResult = await db.execute(
        sql`SELECT COALESCE(SUM(balance), 0) as sum FROM cashbacks WHERE user_id = ${clientId}`
      );
      const cashbackBaseBalance = parseFloat(cashbackResult.rows[0]?.sum || '0');
      
      // Calcular total de transferências enviadas
      const sentTransfersResult = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as sum FROM transfers 
            WHERE from_user_id = ${clientId} AND status = 'completed'`
      );
      const sentTransfersTotal = parseFloat(sentTransfersResult.rows[0]?.sum || '0');
      
      // Calcular total de transferências recebidas
      const receivedTransfersResult = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as sum FROM transfers 
            WHERE to_user_id = ${clientId} AND status = 'completed'`
      );
      const receivedTransfersTotal = parseFloat(receivedTransfersResult.rows[0]?.sum || '0');
      
      // Calcular saldo final considerando transferências
      const cashbackBalance = cashbackBaseBalance - sentTransfersTotal + receivedTransfersTotal;
      console.log(`Saldo calculado: Base ${cashbackBaseBalance} - Enviado ${sentTransfersTotal} + Recebido ${receivedTransfersTotal} = ${cashbackBalance}`);
      
      // Obter saldo de indicações usando SQL direto
      const referralResult = await db.execute(
        sql`SELECT COALESCE(SUM(bonus), 0) as sum 
            FROM referrals 
            WHERE referrer_id = ${clientId} AND status = 'active'`
      );
      const referralBalance = parseFloat(referralResult.rows[0]?.sum || '0');
      
      // Contar transações
      const transactionsCountResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM transactions WHERE user_id = ${clientId}`
      );
      const transactionsCount = parseInt(transactionsCountResult.rows[0]?.count || '0');
      
      // Obter transações recentes
      const recentTransactionsResult = await db.execute(
        sql`SELECT 
            t.id, 
            t.amount, 
            t.cashback_amount as "cashbackAmount", 
            t.created_at as "createdAt", 
            t.status,
            m.store_name as "merchant"
          FROM transactions t
          JOIN merchants m ON t.merchant_id = m.id
          WHERE t.user_id = ${clientId}
          ORDER BY t.created_at DESC
          LIMIT 5`
      );
      
      // Formatar transações recentes para o frontend
      const recentTransactions = recentTransactionsResult.rows.map(t => ({
        id: t.id,
        merchant: t.merchant || 'Lojista desconhecido',
        date: format(new Date(t.createdAt), 'dd/MM/yyyy'),
        amount: parseFloat(t.amount),
        cashback: parseFloat(t.cashbackAmount),
        status: t.status
      }));
      
      // Estatísticas do mês
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      console.log(`Calculando estatísticas do mês (${currentMonth.toISOString()}) para o cliente ID ${clientId}`);
      
      // Total de cashback ganho este mês
      const monthlyEarnedResult = await db.execute(
        sql`SELECT COALESCE(SUM(cashback_amount), 0) as sum
            FROM transactions
            WHERE user_id = ${clientId}
              AND created_at >= ${currentMonth}
              AND status = 'completed'`
      );
      const monthlyEarned = parseFloat(monthlyEarnedResult.rows[0]?.sum || '0');
      console.log(`Total de cashback ganho este mês: ${monthlyEarned} (SQL retornou: ${JSON.stringify(monthlyEarnedResult.rows[0])})`);
      
      // Total transferido este mês
      const monthlyTransferredResult = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as sum
            FROM transfers
            WHERE from_user_id = ${clientId}
              AND created_at >= ${currentMonth}`
      );
      const monthlyTransferred = parseFloat(monthlyTransferredResult.rows[0]?.sum || '0');
      console.log(`Total transferido este mês: ${monthlyTransferred} (SQL retornou: ${JSON.stringify(monthlyTransferredResult.rows[0])})`);
      
      // Total recebido este mês
      const monthlyReceivedResult = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as sum
            FROM transfers
            WHERE to_user_id = ${clientId}
              AND created_at >= ${currentMonth}`
      );
      const monthlyReceived = parseFloat(monthlyReceivedResult.rows[0]?.sum || '0');
      console.log(`Total recebido este mês: ${monthlyReceived} (SQL retornou: ${JSON.stringify(monthlyReceivedResult.rows[0])})`);
      
      // Converter valores NaN para 0
      const safeMonthlyEarned = isNaN(monthlyEarned) ? 0 : monthlyEarned;
      const safeMonthlyTransferred = isNaN(monthlyTransferred) ? 0 : monthlyTransferred;
      const safeMonthlyReceived = isNaN(monthlyReceived) ? 0 : monthlyReceived;
      
      // Histórico de saldos nos últimos 6 meses
      const balanceHistoryResult = await db.execute(
        sql`WITH months AS (
            SELECT generate_series(
              date_trunc('month', current_date - interval '5 months'),
              date_trunc('month', current_date),
              interval '1 month'
            ) as month_start
          )
          SELECT 
            to_char(m.month_start, 'Mon') as month,
            COALESCE(SUM(t.cashback_amount), 0) as monthly_sum
          FROM months m
          LEFT JOIN transactions t ON 
            t.user_id = ${clientId} AND 
            t.created_at >= m.month_start AND 
            t.created_at < m.month_start + interval '1 month' AND
            t.status = 'completed'
          GROUP BY m.month_start
          ORDER BY m.month_start`
      );
      
      // Mapear o histórico de saldos
      const balanceHistory = balanceHistoryResult.rows.map(row => ({
        month: row.month,
        value: parseFloat(row.monthly_sum)
      }));
      
      // Montar resposta final
      const response = {
        cashbackBalance,
        referralBalance,
        transactionsCount,
        recentTransactions,
        monthStats: {
          earned: safeMonthlyEarned,
          transferred: safeMonthlyTransferred,
          received: safeMonthlyReceived
        },
        balanceHistory
      };
      
      console.log("Resposta final do dashboard cliente:", JSON.stringify(response.monthStats));
      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard cliente:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });
  
  // Histórico de transações do cliente
  app.get("/api/client/transactions", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      
      // Buscar as colunas relevantes diretamente, sem erro de colunas inexistentes
      // Filtrando apenas transações válidas (status 'completed' ou 'pending')
      const result = await db.execute(
        sql`SELECT 
            t.id, 
            t.merchant_id as "merchantId", 
            t.created_at as "date", 
            t.amount, 
            t.cashback_amount as "cashback", 
            t.status, 
            t.payment_method as "paymentMethod",
            m.store_name as "merchantName"
          FROM transactions t
          JOIN merchants m ON t.merchant_id = m.id
          WHERE t.user_id = ${clientId}
          AND t.status IN ('completed', 'pending')`
      );
      
      console.log(`Buscando transações válidas para cliente ${clientId}: ${result.rows.length} encontradas`);
      
      // Ordenar manualmente por data de criação (decrescente)
      const sortedResults = [...result.rows].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Formatar transações para o formato esperado pelo frontend
      const formattedTransactions = sortedResults.map(t => ({
        id: t.id,
        merchant: t.merchantName || 'Lojista desconhecido',
        date: format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
        amount: parseFloat(t.amount),
        cashback: parseFloat(t.cashback),
        status: t.status,
        paymentMethod: t.paymentMethod
      }));
        
      res.json(formattedTransactions);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });
  
  // Histórico de cashbacks e saldos do cliente
  app.get("/api/client/cashbacks", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      
      // Consulta SQL direta para obter cashbacks (apenas ativos)
      const result = await db.execute(
        sql`SELECT 
            c.id, 
            c.transaction_id as "transactionId", 
            c.amount, 
            c.created_at as "date", 
            c.status,
            m.store_name as "merchant"
          FROM cashbacks c
          LEFT JOIN transactions t ON c.transaction_id = t.id
          LEFT JOIN merchants m ON t.merchant_id = m.id
          WHERE c.user_id = ${clientId}
          AND c.status = 'active'`
      );
      
      console.log(`Buscando cashbacks ativos para cliente ${clientId}: ${result.rows.length} encontrados`);
      
      // Ordenar manualmente por data de criação (decrescente)
      const sortedResults = [...result.rows].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Formatar cashbacks para o formato esperado pelo frontend
      const cashbacks_list = sortedResults.map(c => ({
        id: c.id,
        transactionId: c.transactionId,
        amount: parseFloat(c.amount),
        date: format(new Date(c.date), 'dd/MM/yyyy HH:mm'),
        status: c.status,
        merchant: c.merchant || 'Lojista desconhecido'
      }));
      
      // Consulta SQL direta para calcular saldo total
      const balanceResult = await db.execute(
        sql`SELECT SUM(amount) as total 
          FROM cashbacks 
          WHERE user_id = ${clientId} AND status = 'active'`
      );
      
      const balance = balanceResult.rows[0]?.total 
        ? parseFloat(balanceResult.rows[0].total) 
        : 0;
      
      res.json({
        cashbacks: cashbacks_list,
        balance: balance
      });
    } catch (error) {
      console.error("Erro ao buscar cashbacks:", error);
      res.status(500).json({ message: "Erro ao buscar cashbacks" });
    }
  });
  
  // Histórico de indicações do cliente
  app.get("/api/client/referrals", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      let userReferralCode = "";
      let referrals_list = [];
      let totalEarned = 0;
      let pendingReferrals = 0;
      let referralsCount = 0;
      
      try {
        // Buscar dados do usuário com SQL direto
        const userResult = await db.execute(
          sql`SELECT id, name, email, invitation_code FROM users WHERE id = ${clientId}`
        );
        
        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        const userData = userResult.rows[0];
        
        // Se não houver código de referência, gerar um e salvar
        userReferralCode = userData.invitation_code;
        if (!userReferralCode) {
          userReferralCode = "CL" + clientId.toString().padStart(4, '0');
          
          // Atualizar código de referência do usuário com SQL direto
          await db.execute(
            sql`UPDATE users SET invitation_code = ${userReferralCode} WHERE id = ${clientId}`
          );
        }
      } catch (error) {
        console.error("Erro ao buscar/gerar código de referência:", error);
        // Se ocorrer erro, gerar um código baseado apenas no ID
        userReferralCode = "CL" + clientId.toString().padStart(4, '0');
      }
      
      try {
        // Buscar todas as indicações do usuário com SQL direto (modificado para mostrar TODAS as indicações sem duplicação)
        const referralsResult = await db.execute(
          sql`SELECT DISTINCT ON (r.id)
              r.id, 
              r.referrer_id,
              r.referred_id, 
              r.bonus, 
              r.status, 
              r.created_at,
              u.name as referred_name,
              u.type as user_type,
              u.email as email,
              u.phone as phone,
              m.store_name
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            LEFT JOIN merchants m ON u.type = 'merchant' AND m.user_id = u.id
            WHERE r.referrer_id = ${clientId}
            ORDER BY r.id, r.created_at DESC
            LIMIT 100`
        );
        
        // Log para debug
        console.log(`Encontradas ${referralsResult.rows.length} indicações para o cliente ${clientId}`);
        for (const ref of referralsResult.rows) {
          console.log(`- ID: ${ref.id}, Referred: ${ref.referred_id}, Name: ${ref.referred_name}, Type: ${ref.user_type}, Status: ${ref.status}`);
        }
        
        // Ordenar manualmente por data de criação (decrescente)
        const sortedReferrals = [...referralsResult.rows].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Formatar lista de referências para o frontend, incluindo usuários que ainda não entraram
        referrals_list = sortedReferrals.map(ref => ({
          id: ref.id,
          name: ref.referred_name || 'Usuário registrado',
          store_name: ref.store_name || (ref.user_type === 'merchant' ? 'Loja sem nome' : ''),
          email: ref.email || 'Email não informado',
          phone: ref.phone || 'Telefone não informado',
          user_type: ref.user_type || 'client', // Assume cliente por padrão
          date: format(new Date(ref.created_at), 'dd/MM/yyyy'),
          status: ref.status || 'pending',
          commission: parseFloat(ref.bonus || '0').toFixed(2)
        }));
        
        // Calcular estatísticas
        const totalEarnedResult = await db.execute(
          sql`SELECT COALESCE(SUM(bonus), 0) as total
              FROM referrals
              WHERE referrer_id = ${clientId} AND status = 'active'`
        );
        totalEarned = parseFloat(totalEarnedResult.rows[0]?.total || '0');
        
        const pendingResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM referrals
              WHERE referrer_id = ${clientId} AND status = 'pending'`
        );
        pendingReferrals = parseInt(pendingResult.rows[0]?.count || '0');
        
        // Contar total de referências
        const refCountResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM referrals
              WHERE referrer_id = ${clientId}`
        );
        referralsCount = parseInt(refCountResult.rows[0]?.count || '0');
      } catch (error) {
        console.error("Erro ao buscar dados de referência:", error);
        // Em caso de erro, manter valores padrão (já inicializados acima)
      }
      
      // Buscar configuração de comissão para referências (com tratamento de erro)
      let commissionRate = DEFAULT_SETTINGS.referralBonus;
      try {
        const commissionResult = await db
          .select()
          .from(commissionSettings)
          .limit(1);
        
        // Usar o valor padrão do sistema se não houver configuração
        if (commissionResult.length > 0) {
          commissionRate = parseFloat(commissionResult[0].referral_bonus);
        }
      } catch (error) {
        console.error("Erro ao buscar configuração de comissão:", error);
      }
      
      // Construir URL completa com base no host da requisição
      const host = req.get('host') || 'valecashback.com';
      const protocol = req.protocol || 'https';
      const referralUrl = `${protocol}://${host}/convite/${userReferralCode}`;
      
      res.json({
        referralCode: userReferralCode,
        referralUrl,
        referralsCount,
        pendingReferrals,
        totalEarned: totalEarned.toFixed(2),
        commission: (commissionRate * 100).toFixed(1),
        referrals: referrals_list
      });
    } catch (error) {
      console.error("Erro ao buscar indicações:", error);
      
      // Em caso de erro, retornar pelo menos o código de referência básico
      const clientId = req.user?.id || 0;
      const userReferralCode = "CL" + clientId.toString().padStart(4, '0');
      const host = req.get('host') || 'valecashback.com';
      const protocol = req.protocol || 'https';
      const referralUrl = `${protocol}://${host}/convite/${userReferralCode}`;
      
      res.json({
        referralCode: userReferralCode,
        referralUrl,
        referralsCount: 0,
        pendingReferrals: 0,
        totalEarned: "0.00",
        commission: (DEFAULT_SETTINGS.referralBonus * 100).toFixed(1),
        referrals: []
      });
    }
  });
  
  // Perfil do Cliente
  app.get("/api/client/profile", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      
      // Obter dados do usuário cliente
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, clientId));
      
      if (!user) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Obter preferências do usuário (ou usar valores padrão)
      let notifications = {
        email: true, 
        push: true, 
        marketing: false
      };
      
      let privacy = {
        showBalance: true,
        showActivity: true
      };
      
      // Tentar obter configurações salvas do usuário
      try {
        const [userSettings] = await db
          .select()
          .from(settings)
          .where(eq(settings.userId, clientId));
          
        if (userSettings && userSettings.preferences) {
          const preferences = JSON.parse(userSettings.preferences);
          if (preferences.notifications) {
            notifications = {
              ...notifications,
              ...preferences.notifications
            };
          }
          if (preferences.privacy) {
            privacy = {
              ...privacy,
              ...preferences.privacy
            };
          }
        }
      } catch (error) {
        console.error("Erro ao buscar preferências do usuário:", error);
        // Continua usando os valores padrão
      }
      
      // Criar objeto com os dados do usuário para o frontend
      const clientProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        photo: user.photo || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        notifications,
        privacy
      };
      
      res.json(clientProfile);
    } catch (error) {
      console.error("Erro ao buscar perfil do cliente:", error);
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });
  
  // Busca de usuários por email ou telefone
  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const { term, by = "email" } = req.query;
      
      if (!term || typeof term !== "string" || term.length < 3) {
        return res.status(400).json({ message: "Termo de busca inválido. Mínimo de 3 caracteres." });
      }
      
      // O usuário atual não deve aparecer nos resultados
      const currentUserId = req.user?.id;
      
      let whereClause;
      if (by === "email") {
        whereClause = sql`email ILIKE ${`%${term}%`}`;
      } else if (by === "phone") {
        whereClause = sql`phone ILIKE ${`%${term}%`}`;
      } else {
        return res.status(400).json({ message: "Método de busca inválido" });
      }
      
      // Obter usuários que correspondem ao termo de busca
      const result = await db.execute(
        sql`SELECT id, name, email, phone, photo 
            FROM users 
            WHERE ${whereClause} AND id != ${currentUserId}
            AND type = 'client'
            ORDER BY name
            LIMIT 5`
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error("Erro na busca de usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Processar transferência entre clientes
  // Rota para buscar usuários por email ou telefone
  app.get("/api/client/search-users", isUserType("client"), async (req, res) => {
    try {
      const { search, method } = req.query;
      
      if (!search || !method) {
        return res.status(400).json({ message: "Parâmetros de busca obrigatórios não informados" });
      }
      
      let whereClause;
      if (method === "email") {
        whereClause = sql`email ILIKE ${`%${search}%`}`;
      } else if (method === "phone") {
        whereClause = sql`phone ILIKE ${`%${search}%`}`;
      } else {
        return res.status(400).json({ message: "Método de busca inválido" });
      }
      
      const userResult = await db.execute(
        sql`
        SELECT id, name, email, phone, type 
        FROM users 
        WHERE ${whereClause} AND type = 'client'
        LIMIT 1
        `
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Retorna os dados do usuário encontrado (sem informações sensíveis)
      res.status(200).json(userResult.rows[0]);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({ message: "Erro ao processar a busca" });
    }
  });

  app.post("/api/client/transfers", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const { recipient, recipientId, searchMethod, amount, description } = req.body;
      
      if (!recipient || !amount) {
        return res.status(400).json({ message: "Campos obrigatórios não informados" });
      }
      
      const fromUserId = req.user.id;
      let toUserId;
      
      // Se temos um ID direto do recipiente, usamos ele
      if (recipientId) {
        toUserId = recipientId;
      } else {
        // Caso contrário, buscamos o usuário pelo email ou telefone
        let whereClause;
        if (searchMethod === "email") {
          whereClause = sql`email = ${recipient}`;
        } else if (searchMethod === "phone") {
          whereClause = sql`phone = ${recipient}`;
        } else {
          return res.status(400).json({ message: "Método de busca inválido" });
        }
        
        // Buscar ID do destinatário
        const recipientResult = await db.execute(
          sql`SELECT id FROM users WHERE ${whereClause} AND type = 'client'`
        );
        
        if (recipientResult.rows.length === 0) {
          return res.status(404).json({ message: "Destinatário não encontrado" });
        }
        
        toUserId = recipientResult.rows[0].id;
      }
      
      // Verificar se não é o mesmo usuário
      if (fromUserId === toUserId) {
        return res.status(400).json({ message: "Não é possível transferir para si mesmo" });
      }
      
      // Verificar saldo disponível do usuário enviador
      // Obter o saldo do cashback
      const cashbackResult = await db.execute(
        sql`SELECT COALESCE(balance, '0') as balance FROM cashbacks WHERE user_id = ${fromUserId}`
      );
      
      // Se não houver registro de cashback, considerar como zero
      let cashbackBalance = 0;
      if (cashbackResult.rows.length > 0) {
        try {
          cashbackBalance = parseFloat(cashbackResult.rows[0]?.balance || '0');
          // Se for NaN, garantir que seja zero
          if (isNaN(cashbackBalance)) cashbackBalance = 0;
        } catch (e) {
          console.error("Erro ao converter saldo de cashback:", e);
          cashbackBalance = 0;
        }
      }
      
      // Obter o saldo de transferências (enviadas e recebidas)
      const transfersResult = await db.execute(
        sql`SELECT 
              COALESCE(SUM(
                CASE 
                  WHEN from_user_id = ${fromUserId} THEN -amount::numeric 
                  WHEN to_user_id = ${fromUserId} THEN amount::numeric
                  ELSE 0 
                END
              ), 0) as balance
            FROM transfers
            WHERE (from_user_id = ${fromUserId} OR to_user_id = ${fromUserId})
              AND status = 'completed'`
      );
      
      let transfersBalance = 0;
      try {
        transfersBalance = parseFloat(transfersResult.rows[0]?.balance || '0');
        // Se for NaN, garantir que seja zero
        if (isNaN(transfersBalance)) transfersBalance = 0;
      } catch (e) {
        console.error("Erro ao converter saldo de transferências:", e);
        transfersBalance = 0;
      }
      
      // Calcular o saldo total disponível
      const currentBalance = cashbackBalance + transfersBalance;
      console.log("Saldo do cliente para transferência:", {
        clientId: fromUserId,
        cashbackBalance,
        transfersBalance,
        currentBalance
      });
      
      const transferAmount = parseFloat(amount);
      
      if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ message: "Valor de transferência inválido" });
      }
      
      // Verificar se atende ao valor mínimo de 1 dólar
      if (transferAmount < 1) {
        return res.status(400).json({ message: "Valor mínimo para transferência é de $1.00" });
      }
      
      if (currentBalance < transferAmount) {
        return res.status(400).json({ message: "Saldo insuficiente para esta transferência" });
      }
      
      // Buscar informações dos usuários
      const fromUserResult = await db.select({ name: users.name }).from(users).where(eq(users.id, fromUserId)).limit(1);
      const toUserResult = await db.select({ name: users.name }).from(users).where(eq(users.id, toUserId)).limit(1);
      
      const fromUserName = fromUserResult[0]?.name || "Usuário";
      const toUserName = toUserResult[0]?.name || "Usuário";
      
      // Criar a transferência
      const [transfer] = await db
        .insert(transfers)
        .values({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          amount: transferAmount.toString(),
          status: "completed",
          description: description || "Transferência entre clientes",
          created_at: new Date(),
          type: "transfer" // Adicionando o campo type
        })
        .returning();
      
      // Importar os helpers de notificação
      const { createTransferSentNotification, createTransferReceivedNotification } = await import("./helpers/notification");
      
      // Criar notificações para remetente e destinatário
      await createTransferSentNotification(
        fromUserId,
        toUserName,
        transferAmount,
        transfer.id
      );
      
      await createTransferReceivedNotification(
        toUserId,
        fromUserName,
        transferAmount,
        transfer.id
      );
      
      res.status(201).json({
        id: transfer.id,
        fromUserId: transfer.from_user_id,
        toUserId: transfer.to_user_id,
        amount: parseFloat(transfer.amount),
        status: transfer.status,
        description: transfer.description,
        createdAt: transfer.created_at
      });
    } catch (error) {
      console.error("Erro ao processar transferência:", error);
      res.status(500).json({ message: "Erro ao processar transferência" });
    }
  });
  
  // Histórico de transferências do cliente
  app.get("/api/client/transfers", isUserType("client"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const clientId = req.user.id;
      
      // Usar SQL direto para evitar problemas com nomes de colunas
      const result = await db.execute(
        sql`SELECT 
            t.id, 
            t.amount, 
            t.from_user_id as "fromUserId", 
            t.to_user_id as "toUserId", 
            t.status, 
            t.created_at as "createdAt", 
            t.description,
            CASE 
              WHEN t.from_user_id = ${clientId} THEN 'outgoing'
              ELSE 'incoming'
            END as "type"
          FROM transfers t
          WHERE t.from_user_id = ${clientId} OR t.to_user_id = ${clientId}
          ORDER BY t.created_at DESC`
      );
      
      // Extrair IDs únicos de usuários
      const allTransfers = result.rows;
      const userIds = new Set([
        ...allTransfers.map(t => t.fromUserId),
        ...allTransfers.map(t => t.toUserId)
      ]);
      
      // Buscar dados dos usuários (convertendo o Set para array e depois para lista de valores separados por vírgula)
      const userIdsList = Array.from(userIds);
      let usersSql = 'SELECT id, name FROM users WHERE id IN (';
      
      // Se não houver IDs, evitamos erro de sintaxe
      if (userIdsList.length === 0) {
        usersSql += '-1)'; // um ID que não existe para retornar conjunto vazio
      } else {
        usersSql += userIdsList.join(',') + ')';
      }
      
      const usersResult = await db.execute(sql`${sql.raw(usersSql)}`);
      
      // Criar mapa para fácil acesso
      const usersMap = new Map(usersResult.rows.map(u => [u.id, u.name]));
      
      // Formatar transferências para o frontend
      const formattedTransfers = allTransfers.map(t => ({
        id: t.id,
        amount: parseFloat(t.amount),
        from: usersMap.get(t.fromUserId) || 'Usuário desconhecido',
        to: usersMap.get(t.toUserId) || 'Usuário desconhecido',
        date: format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
        description: t.description || (t.type === 'outgoing' ? 'Transferência enviada' : 'Transferência recebida'),
        status: t.status,
        type: t.type
      }));
      
      res.json(formattedTransfers);
    } catch (error) {
      console.error("Erro ao buscar transferências:", error);
      res.status(500).json({ message: "Erro ao buscar transferências" });
    }
  });
  
  // Rota para limpar transações inválidas
  app.delete("/api/admin/cleanup/transactions", isUserType("admin"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Manter apenas as transações para o usuário 2 (Cliente Teste)
      const validUserIds = [2, 3, 4, 5, 6];
      
      // Excluir todas as transações de usuários que não são os IDs válidos
      const deleteResult = await db.execute(
        sql`DELETE FROM transactions 
            WHERE user_id NOT IN (${validUserIds.join(',')})
            RETURNING id`
      );
      
      const deletedCount = deleteResult.rows.length;
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        action: "cleanup_transactions",
        user_id: req.user.id,
        details: `Removidas ${deletedCount} transações inválidas`,
        created_at: new Date()
      });
      
      res.json({
        success: true,
        message: `${deletedCount} transações inválidas foram removidas com sucesso.`
      });
    } catch (error) {
      console.error("Erro ao limpar transações:", error);
      res.status(500).json({ message: "Erro ao limpar transações" });
    }
  });

  // API para fornecer o primeiro lojista como referenciador padrão para convites via /merchant/referrals
  app.get("/api/merchants/first", async (req, res) => {
    try {
      // Buscar o primeiro lojista ativo do sistema como referência padrão
      const result = await db.execute(
        sql`SELECT u.id, u.name, u.invitation_code, u.type 
            FROM users u 
            JOIN merchants m ON u.id = m.user_id 
            WHERE u.type = 'merchant' AND u.status = 'active' 
            ORDER BY u.id ASC LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Nenhum lojista encontrado" });
      }
      
      const merchant = result.rows[0];
      
      // Verificar se o lojista tem um código de referência, caso contrário, criar um
      let referralCode = merchant.invitation_code;
      if (!referralCode) {
        referralCode = "LJ" + merchant.id.toString().padStart(4, '0');
        
        // Atualizar o código de referência do lojista
        await db.execute(
          sql`UPDATE users SET invitation_code = ${referralCode} WHERE id = ${merchant.id}`
        );
      }
      
      res.json({
        referrerId: merchant.id,
        referralCode: referralCode,
        inviterName: merchant.name,
        inviterType: 'merchant'
      });
    } catch (error) {
      console.error("Erro ao buscar lojista de referência:", error);
      res.status(500).json({ message: "Erro interno ao buscar lojista de referência" });
    }
  });
  
  // API para fornecer o primeiro cliente como referenciador padrão para convites via /client/referrals
  app.get("/api/clients/first", async (req, res) => {
    try {
      // Buscar o primeiro cliente ativo do sistema como referência padrão
      const result = await db.execute(
        sql`SELECT id, name, invitation_code, type 
            FROM users 
            WHERE type = 'client' AND status = 'active' 
            ORDER BY id ASC LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Nenhum cliente encontrado" });
      }
      
      const client = result.rows[0];
      
      // Verificar se o cliente tem um código de referência, caso contrário, criar um
      let referralCode = client.invitation_code;
      if (!referralCode) {
        referralCode = "CL" + client.id.toString().padStart(4, '0');
        
        // Atualizar o código de referência do cliente
        await db.execute(
          sql`UPDATE users SET invitation_code = ${referralCode} WHERE id = ${client.id}`
        );
      }
      
      res.json({
        referrerId: client.id,
        referralCode: referralCode,
        inviterName: client.name,
        inviterType: 'client'
      });
    } catch (error) {
      console.error("Erro ao buscar cliente de referência:", error);
      res.status(500).json({ message: "Erro interno ao buscar cliente de referência" });
    }
  });
  
  // Obter dados do código de convite
  app.get("/api/invite/:code", async (req, res) => {
    try {
      const referralCode = req.params.code;
      
      console.log(`Verificando código de convite: ${referralCode}`);
      
      // Verificar formato do código
      if (!referralCode || referralCode.length < 4) {
        console.warn(`Código de convite inválido (muito curto): ${referralCode}`);
        return res.status(404).json({ message: "Código de convite inválido" });
      }
      
      // Determinar tipo baseado no prefixo (case insensitive)
      const isClient = referralCode.toUpperCase().startsWith("CL");
      const isMerchant = referralCode.toUpperCase().startsWith("LJ");
      
      if (!isClient && !isMerchant) {
        console.warn(`Código de convite com formato inválido: ${referralCode}`);
        return res.status(404).json({ message: "Código de convite inválido" });
      }
      
      // Buscar usuário pelo código de referência com SQL direto (case insensitive)
      const userResult = await db.execute(
        sql`SELECT id, name, email, type, photo, invitation_code 
            FROM users 
            WHERE LOWER(invitation_code) = LOWER(${referralCode})`
      );
      
      if (userResult.rows.length === 0) {
        console.warn(`Nenhum usuário encontrado com código: ${referralCode}`);
        return res.status(404).json({ message: "Código de convite não encontrado" });
      }
      
      const referrerUser = userResult.rows[0];
      console.log(`Usuário encontrado: ID=${referrerUser.id}, Nome=${referrerUser.name}, Tipo=${referrerUser.type}`);
      
      // Verificar se o tipo do usuário corresponde ao prefixo do código
      const expectedType = isClient ? "client" : "merchant";
      
      // Apenas logamos o aviso mas não bloqueamos mais o acesso
      // Isso permite que links continuem funcionando mesmo se houver alguma inconsistência
      if (referrerUser.type !== expectedType) {
        console.warn(`Tipo de usuário (${referrerUser.type}) não corresponde ao tipo esperado (${expectedType})`);
      }
      
      // Dados do lojista, se for o caso
      let merchantData = null;
      if (referrerUser.type === "merchant") { // Usamos o tipo real do usuário
        const merchantResult = await db.execute(
          sql`SELECT 
              id, 
              store_name as "storeName", 
              logo, 
              category, 
              description
            FROM merchants
            WHERE user_id = ${referrerUser.id}`
        );
        
        if (merchantResult.rows.length > 0) {
          const merchantInfo = merchantResult.rows[0];
          merchantData = {
            id: merchantInfo.id,
            store_name: merchantInfo.storeName,
            logo: merchantInfo.logo || "https://via.placeholder.com/100",
            category: merchantInfo.category,
            description: merchantInfo.description
          };
          console.log(`Dados do lojista carregados com sucesso: ${JSON.stringify(merchantData)}`);
        } else {
          console.warn(`Nenhum dado de lojista encontrado para usuário ${referrerUser.id}`);
        }
      }
      
      // Retornar informações sobre o convite com o código exato do usuário
      // (não o da URL, para garantir consistência nos registros)
      res.json({
        referrerId: referrerUser.id,
        referrerName: referrerUser.name,
        referrerType: referrerUser.type,
        referralCode: referrerUser.invitation_code,
        merchantData
      });
    } catch (error) {
      console.error("Erro ao buscar dados do convite:", error);
      res.status(500).json({ message: "Erro ao buscar dados do convite" });
    }
  });
  
  // Obter código de convite de um usuário pelo ID
  app.get("/api/user/:id/invitecode", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Buscar usuário pelo ID
      const userResult = await db.execute(
        sql`SELECT id, name, type, invitation_code, photo
            FROM users 
            WHERE id = ${userId}`
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const user = userResult.rows[0];
      
      // Verificar se o usuário tem um código de convite
      if (!user.invitation_code) {
        return res.status(404).json({ message: "Este usuário não possui um código de convite" });
      }
      
      // Dados do lojista, se for o caso
      let merchantData = null;
      if (user.type === 'merchant') {
        const merchantResult = await db.execute(
          sql`SELECT store_name, logo, category
              FROM merchants
              WHERE user_id = ${user.id}`
        );
        
        if (merchantResult.rows.length > 0) {
          merchantData = merchantResult.rows[0];
        }
      }
      
      return res.json({
        userId: user.id,
        userName: user.name,
        userType: user.type,
        invitationCode: user.invitation_code,
        photo: user.photo || null,
        merchantData
      });
    } catch (error) {
      console.error("Erro ao buscar código de convite:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Esta implementação foi removida para evitar duplicação de rotas
  
  // Endpoint para cadastro de cliente via convite
  app.post("/api/register/client", async (req, res) => {
    try {
      console.log("Recebendo requisição de cadastro de cliente:", req.body);
      const { name, email, password, phone, referralCode, referralInfo } = req.body;
      
      // Verificar se o email já existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser.length) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      
      // Gerar código de cliente baseado no próximo ID
      const lastUserId = await db
        .select({ maxId: sql`MAX(${users.id})` })
        .from(users);
      
      const nextId = (lastUserId[0]?.maxId || 0) + 1;
      const username = `${nextId}_Cliente`;
      
      // Cadastrar novo usuário
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          username,
          password, // Em produção, usaríamos hashPassword(password)
          phone,
          type: "client",
          status: "active",
          invitation_code: `CL${nextId.toString().padStart(4, '0')}`, // Gerar código de convite para o novo usuário
          created_at: new Date()
        })
        .returning();
      
      // Processar código de referência, se fornecido (via URL ou via formulário)
      let refCode = null;
      // Prioridade 1: Verificar referralInfo que vem de inviteData
      if (referralInfo && referralInfo.referralCode) {
        refCode = referralInfo.referralCode;
        console.log("Usando código de referralInfo:", refCode);
      } 
      // Prioridade 2: Verificar referralCode do formulário
      else if (referralCode) {
        refCode = referralCode;
        console.log("Usando código de referralCode:", refCode);
      }
      // Prioridade 3: Tentar extrair da URL de referrer (caso o usuário entre direto pelo link)
      else if (req.headers.referer) {
        const refererUrl = new URL(req.headers.referer);
        const pathParts = refererUrl.pathname.split('/').filter(part => part.trim() !== '');
        
        console.log("Analisando URL de referência:", refererUrl.pathname);
        
        // Verificar se há algum código de indicação nos segmentos da URL
        for (const part of pathParts) {
          if (part.match(/^CL[0-9]+$/i) || part.match(/^LJ[0-9]+$/i)) {
            refCode = part;
            console.log("Código extraído da URL de referência:", refCode);
            break;
          }
        }
      }
      
      if (refCode) {
        console.log(`Processando indicação com código: ${refCode}`);
        
        // Buscar usuário que fez a indicação pelo código
        const referrerQuery = await db
          .select()
          .from(users)
          .where(eq(users.invitation_code, refCode))
          .limit(1);
          
        if (referrerQuery.length > 0) {
          const referrer = referrerQuery[0];
          console.log(`Cliente ${newUser.id} registrado com referência de ${referrer.id} (${referrer.name})`);
          
          // Verificar se já existe um registro para esta referência
          const existingReferral = await db
            .select()
            .from(referrals)
            .where(and(
              eq(referrals.referrer_id, referrer.id),
              eq(referrals.referred_id, newUser.id)
            ))
            .limit(1);
            
          if (existingReferral.length === 0) {
            // Registrar a referência apenas se não existir
            // Buscar a taxa de referral_bonus configurada no sistema
            let referralBonus = "0.01"; // Valor padrão de 1%
            try {
              const settingsResult = await db
                .select()
                .from(commissionSettings)
                .limit(1);
              
              if (settingsResult.length > 0) {
                referralBonus = settingsResult[0].referral_bonus.toString();
              }
            } catch (error) {
              console.error("Erro ao buscar taxa de referral_bonus:", error);
              // Mantém o valor padrão em caso de erro
            }
            
            // Converter o valor do bônus para número para operações seguras
            let bonusValue = 0.01;
            try {
              bonusValue = parseFloat(referralBonus);
              // Formatar com 2 casas decimais para consistência
              bonusValue = parseFloat(bonusValue.toFixed(2));
            } catch (error) {
              console.error("Erro ao converter valor do bônus:", error);
              bonusValue = 0.01; // Valor padrão seguro
            }
            
            // Incluir SEMPRE o bônus padrão mesmo se ocorrer algum erro
            await db.insert(referrals).values({
              referrer_id: referrer.id,
              referred_id: newUser.id,
              bonus: bonusValue.toString(), // Taxa de bônus configurada no sistema
              status: "active",
              created_at: new Date()
            });
            
            // Criar notificação para o usuário que fez a indicação
            const notificationTitle = "Nova indicação registrada";
            const notificationMessage = `O usuário ${newUser.name} se cadastrou usando seu código de indicação.`;
            
            try {
              await db.insert(notifications).values({
                user_id: referrer.id,
                title: notificationTitle,
                message: notificationMessage,
                type: "referral",
                read: false,
                created_at: new Date()
              });
              
              console.log(`Notificação de indicação criada para o usuário ${referrer.id}`);
            } catch (error) {
              console.error("Erro ao criar notificação de indicação:", error);
            }
            
            console.log(`Referência registrada com sucesso para o cliente ${newUser.id} com bônus de ${bonusValue}`);
            
            // Aplicar o bônus ao saldo de cashback do referenciador
            try {
              // Buscar cashback atual do referenciador
              const referrerCashback = await db
                .select()
                .from(cashbacks)
                .where(eq(cashbacks.user_id, referrer.id));
                
              if (referrerCashback.length > 0) {
                // Atualizar cashback existente
                let currentBalance = 0;
                let currentTotalEarned = 0;
                
                try {
                  currentBalance = parseFloat(referrerCashback[0].balance?.toString() || "0");
                  currentTotalEarned = parseFloat(referrerCashback[0].total_earned?.toString() || "0");
                } catch (parseError) {
                  console.error("Erro ao converter valores de cashback:", parseError);
                }
                
                // Adicionar bônus ao saldo atual
                const newBalance = (currentBalance + bonusValue).toFixed(2);
                const newTotalEarned = (currentTotalEarned + bonusValue).toFixed(2);
                
                await db
                  .update(cashbacks)
                  .set({
                    balance: newBalance,
                    total_earned: newTotalEarned,
                    updated_at: new Date()
                  })
                  .where(eq(cashbacks.user_id, referrer.id));
                  
                console.log(`Cashback do referenciador ${referrer.id} atualizado: saldo ${currentBalance} -> ${newBalance}`);
              } else {
                // Criar novo registro de cashback
                await db.insert(cashbacks).values({
                  user_id: referrer.id,
                  balance: bonusValue.toString(),
                  total_earned: bonusValue.toString(),
                  updated_at: new Date()
                });
                
                console.log(`Novo cashback criado para referenciador ${referrer.id} com bônus inicial de ${bonusValue}`);
              }
            } catch (cashbackError) {
              console.error("Erro ao atualizar cashback do referenciador:", cashbackError);
            }
          } else {
            console.log(`Referência já existente para o cliente ${newUser.id}, ignorando duplicação`);
          }
        } else {
          console.log(`Código de indicação ${refCode} não encontrado no banco de dados`);
        }
      }
      
      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        type: newUser.type,
        message: "Cadastro realizado com sucesso!"
      });
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error);
      res.status(500).json({ message: "Erro ao processar o cadastro" });
    }
  });
  
  // API para listar referências de um usuário específico (apenas para testes)
  app.get("/api/test/referrals/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Buscar referências onde o usuário é o referenciador
      const referralsResult = await db.execute(
        sql`
        SELECT 
          r.id, 
          r.referrer_id,
          r.referred_id, 
          r.bonus, 
          r.status, 
          r.created_at,
          u.name as referred_name,
          u.type as user_type,
          u.email,
          u.phone,
          m.store_name as store_name
        FROM referrals r
        JOIN users u ON r.referred_id = u.id
        LEFT JOIN merchants m ON m.user_id = u.id
        WHERE r.referrer_id = ${userId}
        ORDER BY r.created_at DESC
        `
      );
      
      // Formatar lista de referências para o frontend
      const referrals_list = referralsResult.rows.map(ref => ({
        id: ref.id,
        name: ref.referred_name || 'Usuário desconhecido',
        store_name: ref.store_name || (ref.user_type === 'merchant' ? 'Loja sem nome' : ''),
        email: ref.email || '',
        phone: ref.phone || '',
        user_type: ref.user_type || 'unknown',
        date: format(new Date(ref.created_at), 'dd/MM/yyyy'),
        status: ref.status,
        commission: parseFloat(ref.bonus || '0').toFixed(2)
      }));
      
      res.json({
        userId,
        referralsCount: referralsResult.rows.length,
        referrals: referrals_list
      });
    } catch (error) {
      console.error("Erro ao buscar referências:", error);
      res.status(500).json({ message: "Erro ao buscar referências" });
    }
  });
  
  // API para adicionar referência (apenas para testes)
  app.post("/api/test/referrals", async (req, res) => {
    try {
      const { referrer_id, referred_id, bonus, status } = req.body;
      
      if (!referrer_id || !referred_id) {
        return res.status(400).json({ message: "IDs de referenciador e referenciado são obrigatórios" });
      }
      
      // Verificar se já existe este registro
      const existingReferral = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.referrer_id, referrer_id),
          eq(referrals.referred_id, referred_id)
        ))
        .limit(1);
        
      if (existingReferral.length > 0) {
        return res.status(400).json({ message: "Esta referência já existe" });
      }
      
      // Buscar a taxa de referral_bonus configurada no sistema
      let referralBonus = bonus || "0.01"; // Valor padrão de 1% se não for especificado
      if (!bonus) {
        try {
          const settingsResult = await db
            .select()
            .from(commissionSettings)
            .limit(1);
          
          if (settingsResult.length > 0) {
            referralBonus = settingsResult[0].referral_bonus.toString();
          }
        } catch (error) {
          console.error("Erro ao buscar taxa de referral_bonus:", error);
          // Mantém o valor padrão em caso de erro
        }
      }
      
      // Adicionar nova referência
      const [newReferral] = await db.insert(referrals).values({
        referrer_id,
        referred_id,
        bonus: referralBonus,
        status: status || "active",
        created_at: new Date()
      }).returning();
      
      console.log(`Referência de teste adicionada: ${referrer_id} -> ${referred_id} com bonus ${referralBonus}`);
      res.status(201).json({ 
        message: "Referência adicionada com sucesso",
        referral: newReferral
      });
    } catch (error) {
      console.error("Erro ao adicionar referência:", error);
      res.status(500).json({ message: "Erro ao adicionar referência" });
    }
  });
  
  // Endpoint para cadastro de lojista via convite
  app.post("/api/register/merchant", async (req, res) => {
    try {
      const { name, email, password, phone, storeName, storeType, referralCode, referralInfo } = req.body;
      
      // Verificar se o email já existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser.length) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      
      // Gerar código de lojista baseado no próximo ID
      const lastUserId = await db
        .select({ maxId: sql`MAX(${users.id})` })
        .from(users);
      
      const nextId = (lastUserId[0]?.maxId || 0) + 1;
      const username = `${nextId}_Lojista`;
      
      // Cadastrar novo usuário
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          username,
          password, // Em produção, usaríamos hashPassword(password)
          phone,
          type: "merchant",
          status: "active", // Lojistas são aprovados automaticamente
          invitation_code: `LJ${nextId.toString().padStart(4, '0')}`, // Gerar código de convite para o novo lojista
          created_at: new Date()
        })
        .returning();
      
      // Registrar informações da loja
      await db
        .insert(merchants)
        .values({
          user_id: newUser.id,
          name: storeName,
          category: storeType,
          status: "active",
          approved: true,
          created_at: new Date()
        });
      
      // Processar código de referência, se fornecido (via URL ou via formulário)
      let refCode = null;
      // Prioridade 1: Verificar referralInfo que vem de inviteData
      if (referralInfo && referralInfo.referralCode) {
        refCode = referralInfo.referralCode;
        console.log("Usando código de referralInfo:", refCode);
      } 
      // Prioridade 2: Verificar referralCode do formulário
      else if (referralCode) {
        refCode = referralCode;
        console.log("Usando código de referralCode:", refCode);
      }
      // Prioridade 3: Tentar extrair da URL de referrer (caso o usuário entre direto pelo link)
      else if (req.headers.referer) {
        const refererUrl = new URL(req.headers.referer);
        const pathParts = refererUrl.pathname.split('/').filter(part => part.trim() !== '');
        
        console.log("Analisando URL de referência:", refererUrl.pathname);
        
        // Verificar se há algum código de indicação nos segmentos da URL
        for (const part of pathParts) {
          if (part.match(/^CL[0-9]+$/i) || part.match(/^LJ[0-9]+$/i)) {
            refCode = part;
            console.log("Código extraído da URL de referência:", refCode);
            break;
          }
        }
      }
      
      if (refCode) {
        console.log(`Processando indicação de lojista com código: ${refCode}`);
        
        // Buscar usuário que fez a indicação pelo código
        const referrerQuery = await db
          .select()
          .from(users)
          .where(eq(users.invitation_code, refCode))
          .limit(1);
          
        if (referrerQuery.length > 0) {
          const referrer = referrerQuery[0];
          console.log(`Lojista ${newUser.id} registrado com referência de ${referrer.id} (${referrer.name})`);
          
          // Verificar se já existe um registro para esta referência
          const existingReferral = await db
            .select()
            .from(referrals)
            .where(and(
              eq(referrals.referrer_id, referrer.id),
              eq(referrals.referred_id, newUser.id)
            ))
            .limit(1);
            
          if (existingReferral.length === 0) {
            // Buscar a taxa de referral_bonus configurada no sistema
            let referralBonus = "0.01"; // Valor padrão de 1%
            try {
              const settingsResult = await db
                .select()
                .from(commissionSettings)
                .limit(1);
              
              if (settingsResult.length > 0) {
                referralBonus = settingsResult[0].referral_bonus.toString();
              }
            } catch (error) {
              console.error("Erro ao buscar taxa de referral_bonus:", error);
              // Mantém o valor padrão em caso de erro
            }
            
            // Converter o valor do bônus para número para operações seguras
            let bonusValue = 0.01;
            try {
              bonusValue = parseFloat(referralBonus);
              // Formatar com 2 casas decimais para consistência
              bonusValue = parseFloat(bonusValue.toFixed(2));
            } catch (error) {
              console.error("Erro ao converter valor do bônus:", error);
              bonusValue = 0.01; // Valor padrão seguro
            }
            
            // Registrar a referência com o bônus apenas se não existir
            try {
              await db.insert(referrals).values({
                referrer_id: referrer.id,
                referred_id: newUser.id,
                bonus: bonusValue.toString(), // Taxa de bônus configurada no sistema
                status: "active",
                created_at: new Date()
              });
              
              console.log(`✅ Referência registrada com sucesso para o lojista ${newUser.id} com bônus de ${bonusValue}`);
            } catch (refError) {
              console.error(`❌ Erro ao registrar referência: ${refError.message}`);
              // Continuamos para tentar atualizar o cashback mesmo se o registro falhar
            }
            
            // Aplicar o bônus ao saldo de cashback do referenciador
            try {
              // Buscar cashback atual do referenciador
              const referrerCashback = await db
                .select()
                .from(cashbacks)
                .where(eq(cashbacks.user_id, referrer.id));
                
              if (referrerCashback.length > 0) {
                // Atualizar cashback existente
                let currentBalance = 0;
                let currentTotalEarned = 0;
                
                try {
                  currentBalance = parseFloat(referrerCashback[0].balance?.toString() || "0");
                  currentTotalEarned = parseFloat(referrerCashback[0].total_earned?.toString() || "0");
                } catch (parseError) {
                  console.error("Erro ao converter valores de cashback:", parseError);
                }
                
                // Adicionar bônus ao saldo atual
                const newBalance = (currentBalance + bonusValue).toFixed(2);
                const newTotalEarned = (currentTotalEarned + bonusValue).toFixed(2);
                
                await db
                  .update(cashbacks)
                  .set({
                    balance: newBalance,
                    total_earned: newTotalEarned,
                    updated_at: new Date()
                  })
                  .where(eq(cashbacks.user_id, referrer.id));
                  
                console.log(`Cashback do referenciador ${referrer.id} atualizado: saldo ${currentBalance} -> ${newBalance}`);
              } else {
                // Criar novo registro de cashback
                await db.insert(cashbacks).values({
                  user_id: referrer.id,
                  balance: bonusValue.toString(),
                  total_earned: bonusValue.toString(),
                  updated_at: new Date()
                });
                
                console.log(`Novo cashback criado para referenciador ${referrer.id} com bônus inicial de ${bonusValue}`);
              }
            } catch (cashbackError) {
              console.error("Erro ao atualizar cashback do referenciador:", cashbackError);
            }
          } else {
            console.log(`Referência já existente para o lojista ${newUser.id}, ignorando duplicação`);
          }
        } else {
          console.log(`Código de indicação ${refCode} não encontrado no banco de dados`);
        }
      }
      
      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        type: newUser.type,
        message: "Cadastro realizado com sucesso! Sua loja foi aprovada automaticamente."
      });
    } catch (error) {
      console.error("Erro ao cadastrar lojista:", error);
      res.status(500).json({ message: "Erro ao processar o cadastro" });
    }
  });

  // Rotas de notificações
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Buscar notificações do usuário
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, userId))
        .orderBy(desc(notifications.created_at))
        .limit(50);
      
      // Contar notificações não lidas
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.user_id, userId),
          eq(notifications.read, false)
        ));
      
      const unreadCount = result ? Number(result.count) : 0;
      
      res.json({
        notifications: userNotifications,
        unreadCount
      });
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });
  
  // Marcar notificação como lida
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "ID de notificação inválido" });
      }
      
      // Verificar se a notificação pertence ao usuário
      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, userId)
        ));
      
      if (!notification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      // Marcar como lida
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });
  
  // Marcar todas as notificações como lidas
  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Marcar todas as notificações do usuário como lidas
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.user_id, userId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
      res.status(500).json({ message: "Erro ao marcar todas notificações como lidas" });
    }
  });
  
  // Excluir notificação
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "ID de notificação inválido" });
      }
      
      // Verificar se a notificação pertence ao usuário
      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.user_id, userId)
        ));
      
      if (!notification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      // Excluir a notificação
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
      res.status(500).json({ message: "Erro ao excluir notificação" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
