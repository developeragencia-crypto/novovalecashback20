import { Request, Response, Express } from "express";
import { pool } from "./db.js";
import { isUserType } from "./routes.js";

// Sistema de relatórios que carrega AUTOMATICAMENTE todas as transações reais
export function addReportsRoutes(app: Express) {
  
  // Resumo financeiro com dados reais automáticos
  app.get("/api/admin/reports/financial-summary", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      console.log("🔄 Carregando resumo financeiro com dados reais...");
      
      // Queries SQL diretas para dados 100% reais
      const totalTransactionsResult = await pool.query("SELECT COUNT(*) as count FROM transactions");
      const totalRevenueResult = await pool.query("SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transactions");
      const activeMerchantsResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE type = 'merchant'");
      const activeClientsResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE type = 'client'");
      const pendingWithdrawalsResult = await pool.query("SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM withdrawal_requests WHERE status = 'pending'");
      const approvedWithdrawalsResult = await pool.query("SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM withdrawal_requests WHERE status = 'approved'");

      const totalTransactions = Number(totalTransactionsResult.rows[0]?.count || 0);
      const totalRevenue = Number(totalRevenueResult.rows[0]?.total || 0);
      const activeMerchants = Number(activeMerchantsResult.rows[0]?.count || 0);
      const activeClients = Number(activeClientsResult.rows[0]?.count || 0);
      const pendingWithdrawals = Number(pendingWithdrawalsResult.rows[0]?.total || 0);
      const approvedWithdrawals = Number(approvedWithdrawalsResult.rows[0]?.total || 0);

      // Cálculos baseados nos dados reais
      const cashback = totalRevenue * 0.05;
      const commissions = totalRevenue * 0.10;
      const expenses = cashback + (commissions * 0.3);
      const platformFee = commissions * 0.15;
      
      const summary = {
        totalRevenue,
        totalExpenses: expenses,
        netProfit: totalRevenue - expenses,
        totalTransactions,
        activeMerchants,
        activeClients,
        totalCashback: cashback,
        totalCommissions: commissions,
        pendingWithdrawals,
        approvedWithdrawals,
        totalFees: platformFee + (totalRevenue * 0.025),
        platformFee
      };

      console.log("✅ Resumo financeiro carregado:", { totalTransactions, totalRevenue });
      res.json(summary);
    } catch (error) {
      console.error("❌ Erro ao carregar resumo financeiro:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Lista de transações reais automática
  app.get("/api/admin/reports/transactions", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      console.log("🔄 Carregando TODAS as transações reais do banco...");
      
      const { limit = "100" } = req.query;

      // SQL direto para carregar transações reais com nomes completos
      const query = `
        SELECT 
          t.id,
          t.created_at,
          t.amount,
          t.status,
          COALESCE(m.company_name, u1.name, 'Lojista') as merchant_name,
          COALESCE(u2.name, 'Cliente') as client_name
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.id
        LEFT JOIN users u1 ON m.user_id = u1.id
        LEFT JOIN users u2 ON t.client_id = u2.id
        ORDER BY t.created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [parseInt(limit as string)]);
      
      const transactions = result.rows.map(row => ({
        id: row.id,
        date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        merchant: row.merchant_name || 'Lojista',
        client: row.client_name || 'Cliente',
        amount: Number(row.amount || 0),
        cashback: Number(row.amount || 0) * 0.05,
        commission: Number(row.amount || 0) * 0.10,
        fee: Number(row.amount || 0) * 0.025,
        status: row.status || 'pending',
        type: 'purchase'
      }));

      console.log(`✅ ${transactions.length} transações reais carregadas automaticamente`);
      res.json(transactions);
    } catch (error) {
      console.error("❌ Erro ao carregar transações:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Relatório de taxas com cálculos reais automáticos
  app.get("/api/admin/reports/fees", isUserType("admin"), async (req: Request, res: Response) => {
    try {
      console.log("🔄 Calculando taxas com dados reais...");
      
      const transactionTotalResult = await pool.query("SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM transactions");
      const withdrawalTotalResult = await pool.query("SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total FROM withdrawal_requests WHERE status = 'approved'");
      
      const transactionTotal = Number(transactionTotalResult.rows[0]?.total || 0);
      const withdrawalTotal = Number(withdrawalTotalResult.rows[0]?.total || 0);

      const fees = [
        {
          type: "Taxa de Transação",
          amount: transactionTotal * 0.025,
          percentage: 2.5,
          description: "Taxa cobrada por transação processada",
          period: "Total"
        },
        {
          type: "Taxa de Saque", 
          amount: withdrawalTotal * 0.02,
          percentage: 2.0,
          description: "Taxa cobrada sobre saques aprovados",
          period: "Total"
        },
        {
          type: "Taxa de Plataforma",
          amount: transactionTotal * 0.008,
          percentage: 0.8,
          description: "Taxa de manutenção da plataforma",
          period: "Total"
        }
      ];

      console.log("✅ Taxas calculadas com dados reais:", { transactionTotal, withdrawalTotal });
      res.json(fees);
    } catch (error) {
      console.error("❌ Erro ao calcular taxas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}