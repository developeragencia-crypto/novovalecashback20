import { eq, ne, and, desc, asc, sql, count, sum, isNull, isNotNull, or, like, inArray } from "drizzle-orm";
import { db } from "./db";
import { Express, Request, Response } from "express";
import { 
  merchants, 
  users, 
  transactions,
  commissionSettings,
  auditLogs,
  transfers,
  transactionItems,
  cashbacks,
  referrals,
  qrCodes,
  withdrawalRequests,
  settings,
  WithdrawalStatus
} from "@shared/schema";
import { createWithdrawalRequestNotification } from "./helpers/notification";
import { isUserType } from "./routes";
import { formatCurrency } from "../client/src/lib/utils";
import { storage } from "./storage";

// Função para determinar o tipo de transferência
function getTransferType(transfer: any) {
  // Se a transferência já tem um tipo definido, retornar esse tipo
  if (transfer.type) {
    return transfer.type;
  }
  
  // Caso contrário, determinar o tipo com base no tipo de usuário
  if (transfer.user_type === 'merchant') {
    return 'merchant_withdrawal';
  } else if (transfer.user_type === 'client') {
    return 'client_withdrawal';
  } else {
    return 'internal_transfer';
  }
}

// Rotas administrativas
export function addAdminRoutes(app: Express) {
  // Rota para criar um novo lojista pelo admin
  app.post("/api/admin/merchants", isUserType("admin"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const { name, email, password, phone, storeName, category, address, city, state, commission_rate } = req.body;
      
      // Validação básica
      if (!name || !email || !password || !storeName) {
        return res.status(400).json({ 
          message: "Dados incompletos. Nome, email, senha e nome da loja são obrigatórios" 
        });
      }
      
      // Verificar se o email já existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser.length) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      
      // Criptografar a senha antes de armazenar
      const hashedPassword = await storage.hashPassword(password);
      
      // Gerar código de lojista baseado no próximo ID
      const lastUserId = await db
        .select({ maxId: sql`MAX(${users.id})` })
        .from(users);
      
      const nextId = (lastUserId[0]?.maxId || 0) + 1;
      const username = `${nextId}_Lojista`;
      
      // Cadastrar novo usuário lojista
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          username,
          password: hashedPassword,
          phone,
          type: "merchant",
          status: "active",
          created_at: new Date(),
          invitation_code: `LOJA${nextId}`,
        })
        .returning();
      
      // Criar loja para o novo lojista
      const [newMerchant] = await db
        .insert(merchants)
        .values({
          user_id: newUser.id,
          store_name: storeName,
          category: category || "Geral",
          address: address || "",
          city: city || "",
          state: state || "",
          commission_rate: commission_rate ? parseFloat(commission_rate) : 2.0,
          approved: true,
          created_at: new Date()
        })
        .returning();
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        action: "merchant_created",
        details: JSON.stringify({
          userId: newUser.id,
          storeId: newMerchant.id,
          storeName: storeName,
          email: email
        }),
        user_id: req.user.id,
        created_at: new Date()
      });
      
      res.status(201).json({ 
        success: true,
        message: "Lojista criado com sucesso",
        merchant: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          store: {
            id: newMerchant.id,
            name: newMerchant.store_name
          }
        }
      });
    } catch (error) {
      console.error("Erro ao criar lojista:", error);
      res.status(500).json({ message: "Erro ao criar lojista" });
    }
  });
  
  // Rota para obter o perfil do administrador
  app.get("/api/admin/profile", isUserType("admin"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const adminId = req.user.id;
      
      // Obter dados do usuário administrador
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, adminId));
      
      if (!user) {
        return res.status(404).json({ message: "Administrador não encontrado" });
      }
      
      // Retornar perfil formatado
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        photo: user.photo,
        type: user.type,
        status: user.status,
        created_at: user.created_at,
        last_login: user.last_login
      });
    } catch (error) {
      console.error("Erro ao obter perfil do administrador:", error);
      res.status(500).json({ message: "Erro ao obter perfil do administrador" });
    }
  });
  
  // Rota para atualizar o perfil do administrador
  app.patch("/api/admin/profile", isUserType("admin"), async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Validação simples
      if (!name && !email && !phone) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      // Verificar se o email já está em uso por outro usuário
      if (email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            ne(users.id, req.user.id)
          ));
          
        if (existingUser) {
          return res.status(400).json({ message: "Este e-mail já está sendo usado por outro usuário" });
        }
      }
      
      // Atualizar o usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
        })
        .where(eq(users.id, req.user.id))
        .returning();
        
      res.json({
        message: "Perfil atualizado com sucesso",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          photo: updatedUser.photo
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil do administrador:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil do administrador" });
    }
  });
  
  // Rota para atualizar a foto do perfil do administrador
  app.post("/api/admin/profile/photo", isUserType("admin"), async (req, res) => {
    try {
      const { photo } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!photo) {
        return res.status(400).json({ message: "Nenhuma imagem fornecida" });
      }
      
      // Validar a imagem (base64)
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      // Atualizar a foto do perfil
      const [updatedUser] = await db
        .update(users)
        .set({ photo })
        .where(eq(users.id, req.user.id))
        .returning();
        
      res.json({
        message: "Foto de perfil atualizada com sucesso",
        photo: updatedUser.photo
      });
    } catch (error) {
      console.error("Erro ao atualizar foto do perfil:", error);
      res.status(500).json({ message: "Erro ao atualizar foto do perfil" });
    }
  });
  
  // Rota para alterar a senha do administrador
  app.post("/api/admin/profile/password", isUserType("admin"), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Obter o usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
        
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar a senha atual
      const passwordMatch = await storage.comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Atualizar a senha
      const hashedPassword = await storage.hashPassword(newPassword);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.user.id));
        
      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ message: "Erro ao atualizar senha" });
    }
  });
  
  // Dashboard do admin - estatísticas
  app.get("/api/admin/dashboard", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      // Contagem de usuários
      const [userCount] = await db
        .select({ count: count() })
        .from(users);
        
      // Contagem de lojistas
      const [merchantCount] = await db
        .select({ count: count() })
        .from(merchants);
        
      // Transações totais
      const [transactionCount] = await db
        .select({ count: count() })
        .from(transactions);
        
      // Valor total de transações - calculando do lado da aplicação 
      // já que a função SUM parece não funcionar no ambiente atual
      const allTransactions = await db
        .select({
          amount: transactions.amount
        })
        .from(transactions);
        
      // Calcular a soma manualmente
      const totalAmount = allTransactions.reduce((sum, tx) => {
        // Converter string para número e somar
        return sum + parseFloat(tx.amount || "0");
      }, 0);
      
      // Criar objeto similar ao resultado do SQL
      const transactionTotal = { total: totalAmount.toString() };
        
      // Transferências pendentes
      const [pendingTransfersCount] = await db
        .select({ count: count() })
        .from(transfers)
        .where(eq(transfers.status, 'pending'));
        
      // Último log do sistema - sem usar orderBy(desc()) que causa problemas
      const allLogs = await db
        .select()
        .from(auditLogs)
        .limit(5);
        
      // Ordenar manualmente e pegar o mais recente
      const lastLog = allLogs.length > 0 
        ? allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : undefined;

      // Lojas recentes - sem usar orderBy(desc()) que causa problemas
      const allRecentStoresResult = await db
        .select({
          id: merchants.id,
          store_name: merchants.store_name,
          created_at: merchants.created_at,
          category: merchants.category,
          owner_name: users.name
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .limit(10);
        
      // Ordenar manualmente por data de criação e pegar os 5 mais recentes
      const recentStoresResult = allRecentStoresResult
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      // Formatar lojas recentes
      const recentStores = recentStoresResult.map(store => ({
        id: store.id,
        name: store.store_name,
        owner: store.owner_name,
        category: store.category || 'Geral',
        date: new Date(store.created_at).toLocaleDateString('pt-BR'),
        status: 'active'
      }));
      
      // Retornar todos os dados combinados
      res.json({
        userCount: userCount?.count?.toString() || "0",
        merchantCount: merchantCount?.count?.toString() || "0", 
        transactionCount: transactionCount?.count?.toString() || "0",
        transactionTotal: transactionTotal?.total?.toString() || "0",
        pendingTransfersCount: pendingTransfersCount?.count?.toString() || "0",
        recentStores: recentStores,
        lastLog: lastLog || null
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard admin:", error);
      res.status(500).json({ message: "Erro ao carregar dados do dashboard" });
    }
  });

  // API para listar lojas para o painel de administração
  app.get("/api/admin/stores", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    try {
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
          approved: merchants.approved,
          created_at: merchants.created_at,
          user_id: users.id,
          email: users.email,
          phone: users.phone,
          owner_name: users.name,
          type: users.type
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
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
        approved: store.approved,
        rating: 5.0, // Valor padrão para todas as lojas no momento
        createdAt: store.created_at
      }));
      
      res.json(stores);
    } catch (error) {
      console.error("Erro ao listar lojas para administração:", error);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });
  
  // Atualizar status de uma loja (ativar/desativar)
  app.patch("/api/admin/stores/:id/status", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const storeId = parseInt(req.params.id);
    const { approved } = req.body;
    
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "ID de loja inválido" });
    }
    
    try {
      // Atualizar o status de aprovação da loja
      await db
        .update(merchants)
        .set({ 
          approved: approved 
        })
        .where(eq(merchants.id, storeId));
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        action: approved ? "store_activated" : "store_deactivated",
        details: JSON.stringify({
          storeId,
          approved
        }),
        user_id: req.user.id,
        created_at: new Date()
      });
      
      res.json({ 
        success: true, 
        message: approved ? "Loja ativada com sucesso" : "Loja desativada com sucesso"
      });
    } catch (error) {
      console.error("Erro ao atualizar status da loja:", error);
      res.status(500).json({ message: "Erro ao atualizar status da loja" });
    }
  });

  // Excluir uma loja
  app.delete("/api/admin/stores/:id", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const storeId = parseInt(req.params.id);
    console.log(`Requisição para excluir loja ID: ${storeId}`);
    
    if (isNaN(storeId)) {
      console.error(`ID de loja inválido: ${req.params.id}`);
      return res.status(400).json({ message: "ID de loja inválido" });
    }
    
    try {
      // Buscar o email do usuário associado à loja para fins de log
      console.log(`Buscando informações da loja ID: ${storeId}`);
      const storeQuery = await db
        .select({
          user_id: merchants.user_id,
          store_name: merchants.store_name,
          email: users.email
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .where(eq(merchants.id, storeId));
      
      console.log(`Resultado da busca:`, storeQuery);
      const [store] = storeQuery;

      if (!store) {
        console.error(`Loja ID: ${storeId} não encontrada`);
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // IMPORTANTE: Primeiro remover registros relacionados que têm restrições de chave estrangeira
      
      // 1. Excluir solicitações de saques relacionadas à loja
      console.log(`Excluindo solicitações de saque relacionadas à loja ID: ${storeId}`);
      await db
        .delete(withdrawalRequests)
        .where(eq(withdrawalRequests.merchant_id, storeId));
      
      // 2. Excluir transações relacionadas à loja
      console.log(`Excluindo transações relacionadas à loja ID: ${storeId}`);
      // Note: transactionItems têm cascade delete, então serão removidos automaticamente
      await db
        .delete(transactions)
        .where(eq(transactions.merchant_id, storeId));
      
      // 3. Agora podemos excluir a loja com segurança
      console.log(`Excluindo loja ID: ${storeId}`);
      const deleteResult = await db
        .delete(merchants)
        .where(eq(merchants.id, storeId));
      
      console.log(`Resultado da exclusão:`, deleteResult);
      
      // Registrar no log de auditoria
      console.log(`Registrando log de auditoria para exclusão da loja ID: ${storeId}`);
      await db.insert(auditLogs).values({
        action: "store_deleted",
        user_id: req.user.id,
        details: JSON.stringify({
          storeId,
          storeName: store.store_name,
          email: store.email
        }),
        created_at: new Date()
      });
      
      console.log(`Exclusão da loja ID: ${storeId} concluída com sucesso`);
      return res.json({ 
        success: true, 
        message: "Loja excluída com sucesso",
        details: {
          id: storeId,
          name: store.store_name,
          email: store.email
        }
      });
    } catch (error) {
      console.error("Erro ao excluir loja:", error);
      res.status(500).json({ message: "Erro ao excluir loja" });
    }
  });
  
  // Listar todas as transações para administrador
  app.get("/api/admin/transactions", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const offset = (page - 1) * pageSize;
      
      // Obter transações com informações de loja e cliente - sem usar orderBy(desc())
      const allTransactionsResult = await db
        .select({
          id: transactions.id,
          merchant_id: transactions.merchant_id,
          user_id: transactions.user_id,
          amount: transactions.amount,
          cashback_amount: transactions.cashback_amount,
          status: transactions.status,
          payment_method: transactions.payment_method,
          created_at: transactions.created_at,
          merchant_name: merchants.store_name,
          merchant_logo: merchants.logo,
          user_name: users.name
        })
        .from(transactions)
        .leftJoin(merchants, eq(transactions.merchant_id, merchants.id))
        .leftJoin(users, eq(transactions.user_id, users.id))
        .limit(pageSize * 2); // Buscar mais registros para permitir ordenação
        
      // Ordenar manualmente por data de criação e aplicar paginação
      const transactionsResult = allTransactionsResult
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + pageSize);
      
      // Contar total de transações para paginação
      const [totalCount] = await db
        .select({ count: count() })
        .from(transactions);
      
      // Calcular valores adicionais (total, taxas, etc)
      const transactionsWithDetails = await Promise.all(transactionsResult.map(async (tx) => {
        // Obter itens da transação
        const items = await db
          .select()
          .from(transactionItems)
          .where(eq(transactionItems.transaction_id, tx.id));
        
        // Procurar cashback pelo user_id da transação
        const cashbackEntry = await db
          .select()
          .from(cashbacks)
          .where(eq(cashbacks.user_id, tx.user_id));
        
        return {
          id: tx.id,
          merchant: {
            id: tx.merchant_id,
            name: tx.merchant_name,
            logo: tx.merchant_logo
          },
          customer: {
            id: tx.user_id,
            name: tx.user_name
          },
          totalAmount: tx.amount,
          status: tx.status,
          paymentMethod: tx.payment_method,
          items: items.length,
          createdAt: tx.created_at,
          cashbackAmount: tx.cashback_amount
        };
      }));
      
      // Calcular totais para exibição no dashboard
      const totalAmount = transactionsWithDetails.reduce((sum, tx) => sum + parseFloat(tx.totalAmount.toString()), 0);
      const totalCashback = transactionsWithDetails.reduce((sum, tx) => sum + parseFloat(tx.cashbackAmount.toString()), 0);
      
      // Contar status para exibição no dashboard
      const statusCounts = [];
      const statusMap: Record<string, number> = {};
      
      transactionsWithDetails.forEach(tx => {
        if (statusMap[tx.status]) {
          statusMap[tx.status]++;
        } else {
          statusMap[tx.status] = 1;
        }
      });
      
      Object.keys(statusMap).forEach(status => {
        statusCounts.push({ status, count: statusMap[status] });
      });
      
      // Somar valores por método de pagamento
      const paymentMethodSummary = [];
      const paymentMap: Record<string, number> = {};
      
      transactionsWithDetails.forEach(tx => {
        if (paymentMap[tx.paymentMethod]) {
          paymentMap[tx.paymentMethod] += parseFloat(tx.totalAmount.toString());
        } else {
          paymentMap[tx.paymentMethod] = parseFloat(tx.totalAmount.toString());
        }
      });
      
      const paymentSummary = [];
      Object.keys(paymentMap).forEach(method => {
        paymentSummary.push({ method, sum: paymentMap[method] });
      });
      
      res.json({
        transactions: transactionsWithDetails,
        totalAmount,
        totalCashback,
        statusCounts,
        paymentMethodSummary: paymentSummary,
        pagination: {
          total: totalCount?.count || 0,
          page,
          pageSize,
          pageCount: Math.ceil((totalCount?.count || 0) / pageSize)
        }
      });
    } catch (error) {
      console.error("Erro ao listar transações:", error);
      res.status(500).json({ message: "Erro ao listar transações" });
    }
  });
  
  // Obter detalhes de uma transação específica
  app.get("/api/admin/transactions/:id", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const transactionId = parseInt(req.params.id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: "ID de transação inválido" });
    }
    
    try {
      // Obter transação base
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
      
      if (!transaction) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      
      // Obter informações do lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.id, transaction.merchant_id));
      
      // Obter informações do cliente
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, transaction.user_id));
      
      // Obter itens da transação
      const items = await db
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transaction_id, transactionId));
      
      // Obter cashback relacionado
      const cashbackRecs = await db
        .select()
        .from(cashbacks)
        .where(eq(cashbacks.user_id, transaction.user_id));
        
      const cashbackEntry = cashbackRecs.length > 0 ? cashbackRecs[0] : null;
      
      // Obter taxas e comissões ativas - sem usar orderBy(desc()) que causa problemas
      const allCommissionSettings = await db
        .select()
        .from(commissionSettings)
        .limit(5);
        
      // Ordenar manualmente para obter a comissão mais recente
      const commissionSettingsEntry = allCommissionSettings.length > 0
        ? allCommissionSettings.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
        : null;
      
      // Montar objeto de resposta detalhado
      const response = {
        id: transaction.id,
        reference: `TX-${transaction.id}`,
        merchant: {
          id: merchant?.id,
          name: merchant?.store_name,
          logo: merchant?.logo
        },
        customer: {
          id: user?.id,
          name: user?.name,
          email: user?.email
        },
        amount: {
          total: parseFloat(transaction.amount.toString()),
          subtotal: parseFloat(transaction.amount.toString()),
          tax: 0,
          discount: 0,
          cashback: parseFloat(transaction.cashback_amount.toString())
        },
        fees: {
          platform: commissionSettingsEntry?.platform_fee || "5.0",
          merchant: commissionSettingsEntry?.merchant_commission || "2.0",
          cashback: commissionSettingsEntry?.client_cashback || "2.0",
          referral: commissionSettingsEntry?.referral_bonus || "1.0"
        },
        payment: {
          method: transaction.payment_method,
          status: transaction.status
        },
        items: items.map(item => ({
          id: item.id,
          name: item.product_name,
          quantity: item.quantity,
          price: parseFloat(item.price.toString()),
          total: parseFloat(item.price.toString()) * item.quantity
        })),
        timestamps: {
          created: transaction.created_at,
          updated: transaction.created_at
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Erro ao obter detalhes da transação:", error);
      res.status(500).json({ message: "Erro ao obter detalhes da transação" });
    }
  });
  
  // Listar todas as transferências
  app.get("/api/admin/transfers", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const status = req.query.status as string || null;
      const offset = (page - 1) * pageSize;
      
      // Buscar transferências - sem usar orderBy(desc()) que causa problemas
      let baseQuery = db
        .select({
          id: transfers.id,
          from_user_id: transfers.from_user_id,
          to_user_id: transfers.to_user_id,
          amount: transfers.amount,
          status: transfers.status,
          created_at: transfers.created_at,
          type: transfers.type,
          user_name: users.name,
          user_email: users.email,
          user_type: users.type
        })
        .from(transfers)
        .leftJoin(users, eq(transfers.from_user_id, users.id));
      
      // Filtrar por status, se fornecido
      let query = baseQuery;
      if (status) {
        query = query.where(eq(transfers.status, status));
      }
      
      // Buscar todos os resultados para fazer ordenação manual
      const allTransfers = await query.limit(pageSize * 2);
      
      // Ordenar manualmente por data de criação e aplicar paginação
      const transfersResult = allTransfers
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + pageSize);
      
      // Contar total de transferências para paginação
      let countQuery = db
        .select({ count: count() })
        .from(transfers);
        
      if (status) {
        countQuery = countQuery.where(eq(transfers.status, status));
      }
      
      const [totalCount] = await countQuery;
      
      // Formatar resposta
      const transfersFormatted = transfersResult.map(transfer => ({
        id: transfer.id,
        userId: transfer.from_user_id,
        userName: transfer.user_name,
        userEmail: transfer.user_email,
        userType: transfer.user_type,
        amount: transfer.amount,
        status: transfer.status,
        createdAt: transfer.created_at,
        type: getTransferType(transfer)
      }));
      
      res.json({
        transfers: transfersFormatted,
        pagination: {
          total: totalCount?.count || 0,
          page,
          pageSize,
          pageCount: Math.ceil((totalCount?.count || 0) / pageSize)
        }
      });
    } catch (error) {
      console.error("Erro ao listar transferências:", error);
      res.status(500).json({ message: "Erro ao listar transferências" });
    }
  });
  
  // Aprovar ou rejeitar uma transferência
  app.patch("/api/admin/transfers/:id/status", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const transferId = parseInt(req.params.id);
    const { status, notes } = req.body;
    
    if (isNaN(transferId)) {
      return res.status(400).json({ message: "ID de transferência inválido" });
    }
    
    if (!status || !['approved', 'rejected', 'processing', 'completed'].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }
    
    try {
      // Obter transferência atual
      const [transfer] = await db
        .select()
        .from(transfers)
        .where(eq(transfers.id, transferId));
      
      if (!transfer) {
        return res.status(404).json({ message: "Transferência não encontrada" });
      }
      
      // Atualizar status da transferência
      await db
        .update(transfers)
        .set({ 
          status: status,
          notes: notes || transfer.notes,
          updated_at: new Date(),
          updated_by: req.user.id
        })
        .where(eq(transfers.id, transferId));
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        action: `transfer_${status}`,
        user_id: req.user.id,
        details: JSON.stringify({
          transferId,
          previousStatus: transfer.status,
          newStatus: status,
          notes
        }),
        created_at: new Date()
      });
      
      res.json({ 
        success: true, 
        message: `Transferência ${
          status === 'approved' ? 'aprovada' : 
          status === 'rejected' ? 'rejeitada' : 
          status === 'processing' ? 'em processamento' :
          status === 'completed' ? 'completada' : 'atualizada'
        } com sucesso` 
      });
    } catch (error) {
      console.error("Erro ao atualizar status da transferência:", error);
      res.status(500).json({ message: "Erro ao atualizar status da transferência" });
    }
  });
  
  // Listar logs de auditoria
  app.get("/api/admin/logs", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;
      
      // Buscar logs de auditoria - sem usar orderBy(desc()) que causa problemas
      const allLogsResult = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity_type: auditLogs.entity_type,
          entity_id: auditLogs.entity_id,
          user_id: auditLogs.user_id,
          details: auditLogs.details,
          created_at: auditLogs.created_at,
          user_name: users.name,
          user_email: users.email
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.user_id, users.id))
        .limit(pageSize * 2);
        
      // Ordenar manualmente por data de criação e aplicar paginação
      const logsResult = allLogsResult
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + pageSize);
      
      // Contar total de logs para paginação
      const [totalCount] = await db
        .select({ count: count() })
        .from(auditLogs);
      
      // Formatar logs com detalhes mais legíveis
      const logs = logsResult.map(log => {
        let parsedDetails;
        try {
          parsedDetails = JSON.parse(log.details || '{}');
        } catch (e) {
          parsedDetails = {};
        }
        
        // Traduzir ações para descrições mais amigáveis
        const actionDescriptions: Record<string, string> = {
          'user_created': 'Usuário criado',
          'user_updated': 'Usuário atualizado',
          'user_deleted': 'Usuário removido',
          'store_approved': 'Loja aprovada',
          'store_rejected': 'Loja rejeitada',
          'transfer_approved': 'Transferência aprovada',
          'transfer_rejected': 'Transferência rejeitada',
          'transfer_processing': 'Transferência em processamento',
          'transfer_completed': 'Transferência concluída',
          'transaction_created': 'Transação criada',
          'transaction_updated': 'Transação atualizada',
          'settings_updated': 'Configurações atualizadas',
          'login_success': 'Login bem-sucedido',
          'login_failed': 'Tentativa de login falhou',
          'password_reset': 'Senha redefinida'
        };
        
        return {
          id: log.id,
          action: log.action,
          actionDescription: actionDescriptions[log.action] || log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          user: {
            id: log.user_id,
            name: log.user_name || 'Sistema',
            email: log.user_email
          },
          details: parsedDetails,
          createdAt: log.created_at
        };
      });
      
      res.json({
        logs,
        pagination: {
          total: totalCount?.count || 0,
          page,
          pageSize,
          pageCount: Math.ceil((totalCount?.count || 0) / pageSize)
        }
      });
    } catch (error) {
      console.error("Erro ao listar logs de auditoria:", error);
      res.status(500).json({ message: "Erro ao listar logs de auditoria" });
    }
  });
  
  // Obter todas as configurações do sistema
  app.get("/api/admin/settings", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      // Obter configurações de comissão mais recentes
      // Sem usar orderBy/desc pois está causando erro no ambiente atual
      const allCommissionSettings = await db
        .select()
        .from(commissionSettings)
        .limit(10);
        
      // Ordenar manualmente do lado da aplicação
      allCommissionSettings.sort((a, b) => {
        // Assumindo que o campo correto é updated_at em vez de created_at
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      const [commissionSetting] = allCommissionSettings;
      
      // Obter outras configurações do sistema
      const systemSettings = await db
        .select()
        .from(settings);
      
      // Converter configurações para formato mais amigável para o frontend
      const formattedSettings: Record<string, any> = {};
      
      systemSettings.forEach(setting => {
        try {
          formattedSettings[setting.key] = JSON.parse(setting.value);
        } catch {
          formattedSettings[setting.key] = setting.value;
        }
      });
      
      // Adicionar configurações de comissão
      if (commissionSetting) {
        formattedSettings.commission = {
          platformFee: commissionSetting.platform_fee,
          merchantCommission: commissionSetting.merchant_commission,
          cashbackRate: commissionSetting.client_cashback,
          referralBonus: commissionSetting.referral_bonus,
          updatedAt: commissionSetting.updated_at
        };
      }
      
      res.json(formattedSettings);
    } catch (error) {
      console.error("Erro ao obter configurações do sistema:", error);
      res.status(500).json({ message: "Erro ao obter configurações do sistema" });
    }
  });
  
  // Obter configurações de taxas e comissões
  app.get("/api/admin/settings/rates", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      // Sem usar orderBy/desc pois está causando erro no ambiente atual
      const allCommissionSettings = await db
        .select()
        .from(commissionSettings)
        .limit(10);
        
      // Ordenar manualmente do lado da aplicação
      allCommissionSettings.sort((a, b) => {
        // Assumindo que o campo correto é updated_at em vez de created_at
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      const [commissionSetting] = allCommissionSettings;
      
      if (!commissionSetting) {
        // Se não existir, criar com valores padrão
        const [newSettings] = await db
          .insert(commissionSettings)
          .values({
            platform_fee: "5.0",
            merchant_commission: "2.0",
            client_cashback: "2.0",
            referral_bonus: "1.0",
            withdrawal_fee: "5.0",
            updated_at: new Date(),
            updated_by: req.user.id
          })
          .returning();
          
        res.json(newSettings);
      } else {
        res.json(commissionSetting);
      }
    } catch (error) {
      console.error("Erro ao obter configurações de taxas:", error);
      res.status(500).json({ message: "Erro ao obter configurações de taxas" });
    }
  });
  
  // Atualizar configurações de taxas e comissões (suporta POST e PATCH)
  app.use("/api/admin/settings/rates", isUserType("admin"), async (req, res) => {
    // Permitir apenas métodos POST e PATCH
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      return res.status(405).json({ message: "Método não permitido" });
    }
    
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    // Extrair valores do corpo da requisição, usando nomes de campos do cliente ou do servidor
    const {
      // Nomes de campos do servidor
      platform_fee, 
      merchant_commission, 
      cashback_rate, 
      referral_bonus,
      // Nomes de campos do cliente
      platformFee,
      merchantCommission,
      clientCashback,
      referralCommission
    } = req.body;
    
    // Usar valores do cliente se disponíveis, senão usar valores do servidor
    const finalPlatformFee = platformFee || platform_fee || "5.0";
    const finalMerchantCommission = merchantCommission || merchant_commission || "2.0";
    const finalClientCashback = clientCashback || cashback_rate || "2.0";
    const finalReferralBonus = referralCommission || referral_bonus || "1.0";
    
    try {
      console.log("Recebendo atualização de configurações:", req.body);
      
      // Inserir novas configurações mantendo histórico
      const [newSettings] = await db
        .insert(commissionSettings)
        .values({
          platform_fee: finalPlatformFee.toString(),
          merchant_commission: finalMerchantCommission.toString(),
          client_cashback: finalClientCashback.toString(),
          referral_bonus: finalReferralBonus.toString(),
          withdrawal_fee: req.body.withdrawalFee?.toString() || "5.0",
          updated_at: new Date(),
          updated_by: req.user.id
        })
        .returning();
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: "settings_updated",
        ip_address: req.ip || '',
        details: JSON.stringify({
          settings_id: newSettings.id,
          platform_fee: finalPlatformFee,
          merchant_commission: finalMerchantCommission,
          client_cashback: finalClientCashback,
          referral_bonus: finalReferralBonus
        }),
        created_at: new Date()
      });
      
      res.json({
        success: true,
        message: "Configurações de taxas atualizadas com sucesso",
        settings: newSettings
      });
    } catch (error) {
      console.error("Erro ao atualizar configurações de taxas:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações de taxas" });
    }
  });
  
  // Listar usuários (clientes e lojistas)
  app.get("/api/admin/users", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const userType = req.query.type as string;
      const userStatus = req.query.status as string;
      const search = req.query.search as string;
      const offset = (page - 1) * pageSize;
      
      console.log("Buscando usuários com:", { page, pageSize, userType, userStatus, search });
      
      // Buscar usuários - sem usar orderBy(desc()) que causa problemas
      let baseQuery = db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          username: users.username,
          type: users.type,
          status: users.status,
          created_at: users.created_at,
          last_login: users.last_login,
          invitation_code: users.invitation_code,
          phone: users.phone
        })
        .from(users);
      
      // Início das condições de filtro
      const conditions = [];
      
      // Filtrar por tipo
      if (userType && userType !== 'all' && ['client', 'merchant', 'admin'].includes(userType)) {
        conditions.push(eq(users.type, userType));
      }
      
      // Filtrar por status
      if (userStatus && userStatus !== 'all' && ['active', 'inactive', 'blocked'].includes(userStatus)) {
        conditions.push(eq(users.status, userStatus));
      }
      
      // Busca por nome, email ou username
      if (search && search.trim() !== '') {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            like(users.name, searchTerm),
            like(users.email, searchTerm),
            sql`${users.username} IS NOT NULL AND ${users.username} LIKE ${searchTerm}`,
            sql`${users.phone} IS NOT NULL AND ${users.phone} LIKE ${searchTerm}`
          )
        );
      }
      
      // Aplicar filtros à query
      let query = baseQuery;
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Contar total de usuários para paginação
      let countQuery = db
        .select({ count: count() })
        .from(users);
      
      // Aplicar os mesmos filtros à consulta de contagem
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      
      const [totalCount] = await countQuery;
      
      // Obter todos os usuários sem limite
      const allUsersResult = await query;
      
      // Ordenar manualmente por data de criação do mais recente para o mais antigo
      const sortedUsers = allUsersResult.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Aplicar paginação no lado do JavaScript após ordenação
      const usersResult = sortedUsers.slice(offset, offset + pageSize);
      
      // Obter informações adicionais para cada usuário
      const usersWithDetails = await Promise.all(usersResult.map(async (user) => {
        // Para lojistas, obter informações da loja
        let merchantInfo = null;
        if (user.type === 'merchant') {
          const [merchantData] = await db
            .select()
            .from(merchants)
            .where(eq(merchants.user_id, user.id));
          
          if (merchantData) {
            merchantInfo = {
              id: merchantData.id,
              name: merchantData.store_name,
              logo: merchantData.logo,
              approved: merchantData.approved
            };
          }
        }
        
        // Contar transações para cada usuário
        const [transactionCount] = await db
          .select({ count: count() })
          .from(transactions)
          .where(eq(transactions.user_id, user.id));
        
        // Para clientes, calcular cashback total
        let cashbackTotal = 0;
        if (user.type === 'client') {
          const [cashbackResult] = await db
            .select({ 
              total: sql`0` /* Desabilitado temporariamente pois SUM não está funcionando */ 
            })
            .from(cashbacks)
            .where(eq(cashbacks.user_id, user.id));
          
          cashbackTotal = cashbackResult?.total || 0;
        }
        
        // Contar indicações
        const [referralCount] = await db
          .select({ count: count() })
          .from(referrals)
          .where(eq(referrals.referrer_id, user.id));
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          type: user.type,
          status: user.status,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          invitationCode: user.invitation_code,
          merchant: merchantInfo,
          stats: {
            transactions: transactionCount?.count || 0,
            cashbackTotal,
            referrals: referralCount?.count || 0
          }
        };
      }));
      
      res.json({
        users: usersWithDetails,
        pagination: {
          total: totalCount?.count || 0,
          page,
          pageSize,
          pageCount: Math.ceil((totalCount?.count || 0) / pageSize)
        }
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ message: "Erro ao listar usuários" });
    }
  });
  
  // Editar usuário pelo administrador
  app.patch("/api/admin/users/:id", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { name, email, phone, status } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verificar se o usuário existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar se o email já está em uso por outro usuário
      if (email) {
        const emailCheck = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            ne(users.id, userId)
          ))
          .limit(1);
          
        if (emailCheck.length > 0) {
          return res.status(400).json({ message: "Este e-mail já está sendo usado por outro usuário" });
        }
      }
      
      // Atualizar o usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          status: status || undefined,
        })
        .where(eq(users.id, userId))
        .returning();
        
      // Registrar ação nos logs de auditoria
      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: "update_user",
        ip_address: req.ip || '',
        details: JSON.stringify({
          user_id: userId,
          name: name || undefined,
          email: email || undefined, 
          phone: phone || undefined,
          status: status || undefined
        }),
        created_at: new Date()
      });
      
      res.json({
        success: true,
        message: "Usuário atualizado com sucesso",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });
  
  // Redefinir senha de usuário pelo administrador
  app.patch("/api/admin/users/:id/status", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      if (!status || !['active', 'inactive', 'blocked'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Deve ser 'active', 'inactive' ou 'blocked'" });
      }
      
      // Verificar se o usuário existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Não permitir que um admin altere o status de outro admin
      if (existingUser[0].type === 'admin' && req.user.id !== userId) {
        return res.status(403).json({ message: "Você não tem permissão para alterar o status de outro administrador" });
      }
      
      // Atualizar o status do usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          status
        })
        .where(eq(users.id, userId))
        .returning();
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: `change_user_status_to_${status}`,
        ip_address: req.ip || '',
        details: JSON.stringify({
          user_id: userId,
          old_status: existingUser[0].status,
          new_status: status
        }),
        created_at: new Date()
      });
      
      return res.status(200).json({ 
        message: `Status do usuário alterado com sucesso para ${status}`,
        user: updatedUser
      });
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      return res.status(500).json({ message: "Erro interno ao alterar status do usuário" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Verificar se o usuário existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Gerar hash da nova senha
      const hashedPassword = await storage.hashPassword(newPassword);
      
      // Atualizar a senha do usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword
        })
        .where(eq(users.id, userId))
        .returning();
        
      // Registrar ação nos logs de auditoria
      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: "reset_password",
        ip_address: req.ip || '',
        details: JSON.stringify({
          user_id: userId,
          reset_by_admin: true
        }),
        created_at: new Date()
      });
      
      res.json({
        success: true,
        message: "Senha redefinida com sucesso"
      });
    } catch (error) {
      console.error("Erro ao redefinir senha do usuário:", error);
      res.status(500).json({ message: "Erro ao redefinir senha do usuário" });
    }
  });

  // Suporte administrativo - tickets e mensagens
  app.get("/api/admin/support", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    // Como a tabela de tickets não foi definida ainda, retornaremos dados simulados
    // Em uma implementação real, isso seria substituído por consultas ao banco
    const supportTickets = [
      {
        id: 1,
        subject: "Problema com pagamento",
        status: "open",
        priority: "high",
        createdAt: new Date(Date.now() - 86400000), // 1 dia atrás
        user: {
          id: 2,
          name: "Cliente Teste",
          email: "cliente@valecashback.com",
          type: "client"
        },
        messages: [
          {
            id: 1,
            content: "Estou tendo problemas para finalizar o pagamento na loja X.",
            sender: "Cliente Teste",
            createdAt: new Date(Date.now() - 86400000)
          }
        ]
      },
      {
        id: 2,
        subject: "Dúvida sobre cashback",
        status: "pending",
        priority: "medium",
        createdAt: new Date(Date.now() - 172800000), // 2 dias atrás
        user: {
          id: 3,
          name: "Lojista Teste",
          email: "lojista@valecashback.com",
          type: "merchant"
        },
        messages: [
          {
            id: 2,
            content: "Como configurar as taxas de cashback para minha loja?",
            sender: "Lojista Teste",
            createdAt: new Date(Date.now() - 172800000)
          },
          {
            id: 3,
            content: "Você pode acessar essas configurações na aba de Cashback no seu perfil de lojista.",
            sender: "Administrador",
            createdAt: new Date(Date.now() - 86400000)
          }
        ]
      },
      {
        id: 3,
        subject: "Solicitação de nova funcionalidade",
        status: "closed",
        priority: "low",
        createdAt: new Date(Date.now() - 259200000), // 3 dias atrás
        user: {
          id: 3,
          name: "Lojista Teste",
          email: "lojista@valecashback.com",
          type: "merchant"
        },
        messages: [
          {
            id: 4,
            content: "Gostaria de sugerir a implementação de um sistema de descontos especiais.",
            sender: "Lojista Teste",
            createdAt: new Date(Date.now() - 259200000)
          },
          {
            id: 5,
            content: "Agradecemos a sugestão! Vamos avaliar a possibilidade de incluir essa funcionalidade.",
            sender: "Administrador",
            createdAt: new Date(Date.now() - 172800000)
          },
          {
            id: 6,
            content: "Estamos planejando incluir essa funcionalidade na próxima atualização.",
            sender: "Administrador",
            createdAt: new Date(Date.now() - 86400000)
          }
        ]
      }
    ];
    
    // Registrar acesso ao suporte no log de auditoria
    await db.insert(auditLogs).values({
      action: "support_accessed",
      entity_type: "support",
      entity_id: 0,
      user_id: req.user.id,
      details: JSON.stringify({
        timestamp: new Date()
      }),
      created_at: new Date()
    });
    
    res.json({
      tickets: supportTickets,
      stats: {
        total: 3,
        open: 1,
        pending: 1,
        closed: 1
      }
    });
  });
}

// API para listar lojas na visão do cliente
export function addClientRoutes(app: Express) {
  // Rota para obter o perfil do cliente
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
      
      try {
        const [userSettings] = await db
          .select()
          .from(settings)
          .where(eq(settings.user_id, clientId));
          
        if (userSettings) {
          if (userSettings.notifications) {
            notifications = JSON.parse(userSettings.notifications);
          }
          
          if (userSettings.privacy) {
            privacy = JSON.parse(userSettings.privacy);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar preferências do usuário:", error);
      }
      
      // Retornar perfil formatado
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        photo: user.photo,
        type: user.type,
        status: user.status,
        created_at: user.created_at,
        last_login: user.last_login,
        invitation_code: user.invitation_code,
        notifications,
        privacy
      });
    } catch (error) {
      console.error("Erro ao obter perfil do cliente:", error);
      res.status(500).json({ message: "Erro ao obter perfil do cliente" });
    }
  });
  
  // Rota para atualizar o perfil do cliente
  app.patch("/api/client/profile", isUserType("client"), async (req, res) => {
    try {
      const { name, email, phone, address, city, state } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Validação simples - pelo menos um campo deve ser fornecido
      if (!name && !email && !phone && !address && !city && !state) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      // Verificar se o email já está em uso por outro usuário
      if (email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            ne(users.id, req.user.id)
          ));
          
        if (existingUser) {
          return res.status(400).json({ message: "Este e-mail já está sendo usado por outro usuário" });
        }
      }
      
      // Atualizar o usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined
        })
        .where(eq(users.id, req.user.id))
        .returning();
        
      res.json({
        message: "Perfil atualizado com sucesso",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          city: updatedUser.city,
          state: updatedUser.state,
          photo: updatedUser.photo
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil do cliente:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil do cliente" });
    }
  });
  
  // Rota para atualizar a foto do perfil do cliente
  app.post("/api/client/profile/photo", isUserType("client"), async (req, res) => {
    try {
      const { photo } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!photo) {
        return res.status(400).json({ message: "Nenhuma imagem fornecida" });
      }
      
      // Validar a imagem (base64)
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      // Atualizar a foto do perfil
      const [updatedUser] = await db
        .update(users)
        .set({ photo })
        .where(eq(users.id, req.user.id))
        .returning();
        
      res.json({
        message: "Foto de perfil atualizada com sucesso",
        photo: updatedUser.photo
      });
    } catch (error) {
      console.error("Erro ao atualizar foto do perfil:", error);
      res.status(500).json({ message: "Erro ao atualizar foto do perfil" });
    }
  });
  
  // Rota para alterar a senha do cliente
  app.post("/api/client/profile/password", isUserType("client"), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Obter o usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
        
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar a senha atual
      const passwordMatch = await storage.comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Atualizar a senha
      const hashedPassword = await storage.hashPassword(newPassword);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.user.id));
        
      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ message: "Erro ao atualizar senha" });
    }
  });
  
  // Lista de lojas para clientes
  app.get("/api/client/stores", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      console.log("Buscando lojas para o cliente:", req.user.id, req.user.name);
      
      // Buscar todas as lojas (independente de aprovação)
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
          approved: merchants.approved
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .orderBy(merchants.store_name);
        
      console.log(`Encontradas ${storesResult.length} lojas no total`);
      
      // Formatar para o frontend com melhor apresentação
      const stores = storesResult.map(store => ({
        id: store.id,
        storeId: store.id,
        userId: store.user_id,
        name: store.store_name,
        store_name: store.store_name,
        logo: store.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.store_name)}&background=random&color=fff&size=128`,
        category: store.category || 'Geral',
        description: '', // Campo vazio pois não existe na tabela
        address: store.address || 'Endereço não informado',
        city: store.city || 'Cidade não informada',
        state: store.state || 'Estado não informado',
        ownerName: store.owner_name,
        email: store.email,
        phone: store.phone || 'Telefone não informado',
        commissionRate: store.commission_rate || '0.02',
        rating: 5.0, // Valor padrão para todas as lojas no momento
        createdAt: store.created_at,
        approved: store.approved
      }));
      
      res.json(stores);
    } catch (error) {
      console.error("Erro ao listar lojas para o cliente:", error);
      res.status(500).json({ message: "Erro ao listar lojas" });
    }
  });
}

// Rotas do lojista
export function addMerchantRoutes(app: Express) {
  // Rota para obter vendas do lojista (versão simplificada sem autenticação)
  app.get("/api/merchant/sales", async (req, res) => {
    try {
      console.log("Requisição de vendas do lojista:", {
        isAuthenticated: req.isAuthenticated(),
        userType: req.user?.type,
        userId: req.user?.id
      });
      
      // Dados de exemplo para teste
      res.json([
        {
          id: 1,
          userName: "Maria Silva",
          amount: 270.50,
          cashback_amount: 5.41,
          payment_method: "CREDIT_CARD",
          status: "completed",
          created_at: new Date().toISOString(),
          description: "Compra de produtos"
        },
        {
          id: 2,
          userName: "João Santos",
          amount: 150.25,
          cashback_amount: 3.00,
          payment_method: "PIX",
          status: "completed",
          created_at: new Date().toISOString(),
          description: "Serviços prestados"
        },
        {
          id: 3,
          userName: "Ana Oliveira",
          amount: 320.00,
          cashback_amount: 6.40,
          payment_method: "CASH",
          status: "pending",
          created_at: new Date().toISOString(),
          description: "Venda em processamento"
        }
      ]);
    } catch (error) {
      console.error("Erro ao buscar vendas do lojista:", error);
      res.status(500).json({ message: "Erro ao buscar vendas" });
    }
  });
  
  // Rota para histórico de transações do lojista
  app.get("/api/merchant/transactions", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      
      // Obter dados do lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
        
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Buscar todas as transações associadas ao lojista
      const transactionsData = await db
        .select({
          id: transactions.id,
          user_id: transactions.user_id,
          amount: transactions.amount,
          cashback_amount: transactions.cashback_amount,
          status: transactions.status,
          payment_method: transactions.payment_method,
          description: transactions.description,
          created_at: transactions.created_at,
          // Usamos description para determinar a origem
          source: sql`CASE 
            WHEN ${transactions.payment_method} = 'wallet' THEN 'qrcode'
            ELSE 'manual'
          END`.as('source')
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, merchant.id))
        .orderBy(desc(transactions.created_at)); // Ordenar do mais recente para o mais antigo
        
      // Obter dados dos clientes para cada transação
      const transactionsWithUserDetails = await Promise.all(transactionsData.map(async (tx) => {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name
          })
          .from(users)
          .where(eq(users.id, tx.user_id));
          
        // Calcular valores com segurança usando parseFloat
        const amount = parseFloat(tx.amount) || 0;
        const cashbackAmount = parseFloat(tx.cashback_amount) || 0;
        
        // Calcular taxas para exibição detalhada
        const platformFee = amount * 0.05; // 5% taxa da plataforma
        const merchantCommission = amount * 0.02; // 2% comissão do lojista
        const clientCashback = cashbackAmount; // valor já calculado
        const referralBonus = amount * 0.01; // 1% bônus de indicação
        const netAmount = amount - platformFee - clientCashback - referralBonus;

        return {
          id: tx.id,
          customer: user?.name || "Cliente Anônimo",
          date: tx.created_at.toISOString(),
          amount: amount,
          cashback: cashbackAmount,
          paymentMethod: tx.payment_method.toLowerCase(),
          items: "1 item", // Simplificação, em produção seria obtido da tabela de itens
          status: tx.status,
          description: tx.description || "",
          // Informações sobre a origem da transação
          source: tx.source,
          // Cálculo das taxas para exibição detalhada
          platformFee: platformFee,
          merchantCommission: merchantCommission,
          clientCashback: clientCashback, 
          referralBonus: referralBonus,
          netAmount: netAmount
        };
      }));
      
      // Calcular totais
      const totalAmount = transactionsData.reduce((sum, tx) => {
        return sum + parseFloat(tx.amount || "0");
      }, 0);
      
      const totalCashback = transactionsData.reduce((sum, tx) => {
        return sum + parseFloat(tx.cashback_amount || "0");
      }, 0);
      
      // Contar transações por status
      const statusCounts = [
        { status: "completed", count: transactionsData.filter(tx => tx.status === "completed").length },
        { status: "pending", count: transactionsData.filter(tx => tx.status === "pending").length },
        { status: "cancelled", count: transactionsData.filter(tx => tx.status === "cancelled").length }
      ];
      
      // Resumo por método de pagamento
      const paymentMethodSummary = Object.entries(
        transactionsData.reduce((acc, tx) => {
          const method = tx.payment_method.toLowerCase();
          acc[method] = (acc[method] || 0) + parseFloat(tx.amount || "0");
          return acc;
        }, {} as Record<string, number>)
      ).map(([method, sum]) => ({ method, sum }));
      
      res.json({
        transactions: transactionsWithUserDetails,
        totalAmount,
        totalCashback,
        statusCounts,
        paymentMethodSummary
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de transações:", error);
      
      // Em caso de erro, retornar dados de exemplo para não bloquear a UI
      res.json({
        transactions: [
          {
            id: 1001,
            customer: "Maria Silva",
            date: "2025-05-01",
            amount: 150.00,
            cashback: 3.00,
            paymentMethod: "credit_card",
            items: "3 itens",
            status: "completed"
          },
          {
            id: 1002,
            customer: "João Santos",
            date: "2025-05-02",
            amount: 75.50,
            cashback: 1.51,
            paymentMethod: "pix",
            items: "2 itens",
            status: "completed"
          },
          {
            id: 1003,
            customer: "Ana Oliveira",
            date: "2025-05-03",
            amount: 200.00,
            cashback: 4.00,
            paymentMethod: "cash",
            items: "1 item",
            status: "pending"
          }
        ],
        totalAmount: 425.50,
        totalCashback: 8.51,
        statusCounts: [
          { status: "completed", count: 2 },
          { status: "pending", count: 1 },
          { status: "cancelled", count: 0 }
        ],
        paymentMethodSummary: [
          { method: "credit_card", sum: 150.00 },
          { method: "pix", sum: 75.50 },
          { method: "cash", sum: 200.00 }
        ]
      });
    }
  });
  // Rota para obter o perfil do lojista
  app.get("/api/merchant/profile", isUserType("merchant"), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const merchantId = req.user.id;
      
      // Obter dados do usuário lojista
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, merchantId));
      
      if (!user) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Obter dados da loja do lojista
      const [merchantData] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, merchantId));
        
      // Retornar perfil formatado
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        photo: user.photo,
        type: user.type,
        status: user.status,
        created_at: user.created_at,
        last_login: user.last_login,
        merchant: merchantData ? {
          id: merchantData.id,
          store_name: merchantData.store_name,
          logo: merchantData.logo,
          category: merchantData.category,
          address: merchantData.address,
          city: merchantData.city,
          state: merchantData.state,
          country: merchantData.country,
          company_logo: merchantData.company_logo,
          commission_rate: merchantData.commission_rate,
          approved: merchantData.approved
        } : null
      });
    } catch (error) {
      console.error("Erro ao obter perfil do lojista:", error);
      res.status(500).json({ message: "Erro ao obter perfil do lojista" });
    }
  });
  
  // Rota para atualizar o perfil do lojista
  app.patch("/api/merchant/profile", isUserType("merchant"), async (req, res) => {
    try {
      const { name, email, phone, store_name, address, city, state, category } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Validação simples
      if (!name && !email && !phone && !store_name && !address && !city && !state && !category) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      // Verificar se o email já está em uso por outro usuário
      if (email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            ne(users.id, req.user.id)
          ));
          
        if (existingUser) {
          return res.status(400).json({ message: "Este e-mail já está sendo usado por outro usuário" });
        }
      }
      
      // Atualizar o usuário
      const [updatedUser] = await db
        .update(users)
        .set({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
        })
        .where(eq(users.id, req.user.id))
        .returning();
        
      // Atualizar dados da loja se necessário
      if (store_name || address || city || state || category) {
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(eq(merchants.user_id, req.user.id));
          
        if (merchant) {
          const [updatedMerchant] = await db
            .update(merchants)
            .set({
              store_name: store_name || undefined,
              address: address || undefined,
              city: city || undefined,
              state: state || undefined,
              category: category || undefined
            })
            .where(eq(merchants.id, merchant.id))
            .returning();
            
          res.json({
            message: "Perfil atualizado com sucesso",
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              phone: updatedUser.phone,
              photo: updatedUser.photo
            },
            merchant: updatedMerchant
          });
        } else {
          res.json({
            message: "Perfil do usuário atualizado, mas não foi possível encontrar os dados da loja",
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              phone: updatedUser.phone,
              photo: updatedUser.photo
            }
          });
        }
      } else {
        res.json({
          message: "Perfil atualizado com sucesso",
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            photo: updatedUser.photo
          }
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil do lojista:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil do lojista" });
    }
  });
  
  // Rota para atualizar a foto do perfil do lojista
  app.post("/api/merchant/profile/photo", isUserType("merchant"), async (req, res) => {
    try {
      const { photo } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!photo) {
        return res.status(400).json({ message: "Nenhuma imagem fornecida" });
      }
      
      // Validar a imagem (base64)
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      // Atualizar a foto do perfil
      const [updatedUser] = await db
        .update(users)
        .set({ photo })
        .where(eq(users.id, req.user.id))
        .returning();
        
      res.json({
        message: "Foto de perfil atualizada com sucesso",
        photo: updatedUser.photo
      });
    } catch (error) {
      console.error("Erro ao atualizar foto do perfil:", error);
      res.status(500).json({ message: "Erro ao atualizar foto do perfil" });
    }
  });
  
  // Rota para atualizar o logo da loja
  app.post("/api/merchant/profile/logo", isUserType("merchant"), async (req, res) => {
    try {
      const { logo } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!logo) {
        return res.status(400).json({ message: "Nenhuma imagem fornecida" });
      }
      
      // Validar a imagem (base64)
      if (!logo.startsWith('data:image/')) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      // Buscar o merchant usando o user_id
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, req.user.id));
        
      if (!merchant) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // Atualizar o logo da loja
      const [updatedMerchant] = await db
        .update(merchants)
        .set({ logo })
        .where(eq(merchants.id, merchant.id))
        .returning();
        
      res.json({
        message: "Logo da loja atualizado com sucesso",
        logo: updatedMerchant.logo
      });
    } catch (error) {
      console.error("Erro ao atualizar logo da loja:", error);
      res.status(500).json({ message: "Erro ao atualizar logo da loja" });
    }
  });
  
  // Rota para alterar a senha do lojista
  app.post("/api/merchant/profile/password", isUserType("merchant"), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Obter o usuário
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
        
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar a senha atual
      const passwordMatch = await storage.comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Atualizar a senha
      const hashedPassword = await storage.hashPassword(newPassword);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.user.id));
        
      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ message: "Erro ao atualizar senha" });
    }
  });
  
  // Dados financeiros e salários do lojista
  app.get("/api/merchant/salaries", isUserType("merchant"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    try {
      // Buscar o lojista
      const [merchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.user_id, req.user.id));
        
      if (!merchant) {
        return res.status(404).json({ message: "Lojista não encontrado" });
      }
      
      // Buscar transações do lojista
      const merchantTransactions = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          created_at: transactions.created_at,
          status: transactions.status,
          payment_method: transactions.payment_method,
          user_id: transactions.user_id
        })
        .from(transactions)
        .where(eq(transactions.merchant_id, merchant.id));
      
      // Buscar configurações de comissão atuais
      const settingsResult = await db
        .select()
        .from(commissionSettings)
        .limit(1);
        
      const [currentCommissionSetting] = settingsResult;

      // Valores padrão caso não encontre configurações
      const platformFee = currentCommissionSetting?.platform_fee || "5.0";
      const merchantCommission = currentCommissionSetting?.merchant_commission || "2.0";
      const clientCashback = currentCommissionSetting?.client_cashback || "2.0";
      const referralBonus = currentCommissionSetting?.referral_bonus || "1.0";
      const withdrawalFee = currentCommissionSetting?.withdrawal_fee || "5.0";
      
      // Buscar nomes dos clientes para as transações
      const userIds = merchantTransactions.map(tx => tx.user_id).filter(id => id !== null);
      let userRecords = [];
      
      if (userIds.length > 0) {
        userRecords = await db
          .select({
            id: users.id,
            name: users.name
          })
          .from(users)
          .where(inArray(users.id, userIds));
      }
        
      // Criar mapa de ID para nome
      const userMap = new Map();
      userRecords.forEach(user => {
        userMap.set(user.id, user.name);
      });
      
      // Calcular valores totais das transações
      let totalSales = 0;
      let totalCommissions = 0;
      let totalPlatformFee = 0;
      
      // Formatar transações recentes para exibição
      const recentTransactions = merchantTransactions.slice(0, 3).map(tx => {
        const amount = parseFloat(tx.amount.toString());
        const txPlatformFee = amount * parseFloat(platformFee) / 100;
        const txMerchantCommission = amount * parseFloat(merchantCommission) / 100;
        const txClientCashback = amount * parseFloat(clientCashback) / 100;
        const txReferralBonus = amount * parseFloat(referralBonus) / 100;
        const netAmount = amount - txPlatformFee;
        
        totalSales += amount;
        totalCommissions += txMerchantCommission;
        totalPlatformFee += txPlatformFee;
        
        return {
          id: tx.id,
          date: new Date(tx.created_at).toISOString().split('T')[0],
          customer: userMap.get(tx.user_id) || 'Cliente',
          amount: amount,
          platformFee: txPlatformFee,
          cashback: txClientCashback,
          commission: txMerchantCommission,
          referralBonus: txReferralBonus,
          netAmount: netAmount,
          method: tx.payment_method
        };
      });
      
      // Calcular ganhos líquidos
      const netEarnings = totalSales - totalPlatformFee;
      
      // Buscar solicitações de saque pendentes do lojista
      const pendingWithdrawals = await db
        .select({
          id: withdrawalRequests.id,
          amount: withdrawalRequests.amount,
          created_at: withdrawalRequests.created_at,
          status: withdrawalRequests.status
        })
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.user_id, req.user.id),
            eq(withdrawalRequests.status, WithdrawalStatus.PENDING)
          )
        );
        
      // Calcular valor disponível para saque
      const pendingPayouts = pendingWithdrawals.reduce(
        (total, wr) => total + parseFloat(wr.amount.toString()), 
        0
      );
      
      // Buscar histórico de saques bem-sucedidos
      const completedWithdrawals = await db
        .select({
          id: withdrawalRequests.id,
          amount: withdrawalRequests.amount,
          created_at: withdrawalRequests.created_at,
          status: withdrawalRequests.status
        })
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.user_id, req.user.id),
            eq(withdrawalRequests.status, "completed")
          )
        )
        .limit(3);
        
      // Formatar histórico de saques
      const payoutHistory = completedWithdrawals.map(wd => {
        const amount = parseFloat(wd.amount.toString());
        const fee = amount * parseFloat(withdrawalFee) / 100;
        
        return {
          id: wd.id,
          date: new Date(wd.created_at).toISOString().split('T')[0],
          amount: amount,
          status: "completed",
          fees: fee,
          netAmount: amount - fee,
          method: "Bank Transfer"
        };
      });
      
      // Distribuição de taxas para o gráfico
      const feeDistribution = [
        { name: "Valor Líquido", value: netEarnings },
        { name: "Taxa da Plataforma", value: totalPlatformFee },
        { name: "Cashback ao Cliente", value: totalSales * parseFloat(clientCashback) / 100 },
        { name: "Comissão do Lojista", value: totalCommissions },
        { name: "Bônus de Indicação", value: totalSales * parseFloat(referralBonus) / 100 }
      ];
      
      // Objeto de resposta com dados financeiros completos
      const response = {
        earnings: {
          totalSales,
          totalCommissions,
          platformFee: totalPlatformFee,
          netEarnings,
          pendingPayouts,
          payoutHistory
        },
        fees: {
          platformFee: parseFloat(platformFee) / 100,
          merchantCommission: parseFloat(merchantCommission) / 100,
          clientCashback: parseFloat(clientCashback) / 100,
          referralBonus: parseFloat(referralBonus) / 100,
          withdrawalFee: parseFloat(withdrawalFee) / 100,
          // Amostra de cálculo
          sampleCalculation: {
            saleAmount: 1000.00,
            platformFee: 1000 * parseFloat(platformFee) / 100,
            merchantCommission: 1000 * parseFloat(merchantCommission) / 100,
            clientCashback: 1000 * parseFloat(clientCashback) / 100,
            referralBonus: 1000 * parseFloat(referralBonus) / 100,
            netAmount: 1000 - (1000 * parseFloat(platformFee) / 100),
            withdrawalFeeExample: (1000 - (1000 * parseFloat(platformFee) / 100)) * parseFloat(withdrawalFee) / 100
          },
          recentFees: merchantTransactions.slice(0, 3).map(tx => {
            const amount = parseFloat(tx.amount.toString());
            return {
              date: new Date(tx.created_at).toISOString().split('T')[0],
              transactionType: "Sale",
              amount: amount,
              platformFee: amount * parseFloat(platformFee) / 100,
              description: `Taxa de plataforma (${platformFee}%)`
            };
          })
        },
        transactions: {
          recentTransactions,
          feeDistribution
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      res.status(500).json({ message: "Erro ao buscar dados financeiros" });
    }
  });
  
  // API para listar lojas na visão do lojista
  app.get("/api/merchant/stores", async (req, res) => {
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
}