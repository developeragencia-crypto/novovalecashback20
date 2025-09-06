import { eq, ne, and, desc, asc, sql, count, sum, isNull, isNotNull, or, like } from "drizzle-orm";
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
          platform: commissionSettingsEntry?.platform_fee || "2.0",
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
            platform_fee: "2.0",
            merchant_commission: "2.0",
            client_cashback: "2.0",
            referral_bonus: "1.0",
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
  
  // Atualizar configurações de taxas e comissões
  app.post("/api/admin/settings/rates", isUserType("admin"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const { platform_fee, merchant_commission, cashback_rate, referral_bonus } = req.body;
    
    // Validar valores
    if (!platform_fee || !merchant_commission || !cashback_rate || !referral_bonus) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }
    
    try {
      // Inserir novas configurações mantendo histórico
      const [newSettings] = await db
        .insert(commissionSettings)
        .values({
          platform_fee: platform_fee.toString(),
          merchant_commission: merchant_commission.toString(),
          client_cashback: cashback_rate.toString(),
          referral_bonus: referral_bonus.toString(),
          updated_at: new Date(),
          updated_by: req.user.id
        })
        .returning();
      
      // Registrar no log de auditoria
      await db.insert(auditLogs).values({
        action: "settings_updated",
        entity_type: "commission_settings",
        entity_id: newSettings.id,
        user_id: req.user.id,
        details: JSON.stringify({
          platform_fee,
          merchant_commission,
          cashback_rate,
          referral_bonus
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
      const search = req.query.search as string;
      const offset = (page - 1) * pageSize;
      
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
          invitation_code: users.invitation_code
        })
        .from(users);
      
      // Filtrar por tipo se especificado
      let query = baseQuery;
      if (userType && ['client', 'merchant', 'admin'].includes(userType)) {
        query = query.where(eq(users.type, userType));
      }
      
      // Busca por nome ou email
      if (search) {
        query = query.where(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.username || '', `%${search}%`)
          )
        );
      }
      
      // Obter usuários com paginação
      const allUsersResult = await query.limit(100);
      
      // Ordenar manualmente por data de criação do mais recente para o mais antigo
      const sortedUsers = allUsersResult.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Aplicar paginação no lado do JavaScript após ordenação
      const usersResult = sortedUsers.slice(offset, offset + pageSize);
      
      // Contar total de usuários para paginação
      let countQuery = db
        .select({ count: count() })
        .from(users);
        
      if (userType && ['client', 'merchant', 'admin'].includes(userType)) {
        countQuery = countQuery.where(eq(users.type, userType));
      }
      
      if (search) {
        countQuery = countQuery.where(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.username || '', `%${search}%`)
          )
        );
      }
      
      const [totalCount] = await countQuery;
      
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
          // Adicionar outros campos conforme necessário
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
      
      // Buscar todas as lojas aprovadas
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
          owner_name: users.name
        })
        .from(merchants)
        .innerJoin(users, eq(merchants.user_id, users.id))
        .where(eq(merchants.approved, true))
        .orderBy(merchants.store_name);
      
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