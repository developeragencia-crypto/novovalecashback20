import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard,
  PieChart,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  activeMerchants: number;
  activeClients: number;
  totalCashback: number;
  totalCommissions: number;
  pendingWithdrawals: number;
  approvedWithdrawals: number;
  totalFees: number;
  platformFee: number;
}

interface TransactionReport {
  id: number;
  date: string;
  merchant: string;
  client: string;
  amount: number;
  cashback: number;
  commission: number;
  fee: number;
  status: string;
  type: string;
}

interface FeeReport {
  type: string;
  amount: number;
  percentage: number;
  description: string;
  period: string;
}

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [reportType, setReportType] = useState("overview");

  // Fetch financial summary usando APIs limpas
  const { data: financialSummary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/admin/reports/financial-summary-clean'],
    enabled: true,
  });

  // Fetch transactions report usando APIs limpas
  const { data: transactionsReport, isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery<TransactionReport[]>({
    queryKey: ['/api/admin/reports/transactions-clean'],
    enabled: true,
  });

  // Fetch fees report usando APIs limpas
  const { data: feesReport, isLoading: loadingFees, refetch: refetchFees } = useQuery<FeeReport[]>({
    queryKey: ['/api/admin/reports/fees-clean'],
    enabled: true,
  });

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) return '$0,00';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(value).replace('US', '').replace('$', '$');
  };

  const handleExportReport = () => {
    if (!financialSummary || !transactionsReport || !feesReport) {
      console.error("Dados não carregados para exportação");
      return;
    }

    // Criar dados do relatório com dados reais das APIs
    const reportData = {
      resumoFinanceiro: {
        receita_total: formatCurrency(financialSummary.totalRevenue),
        total_transacoes: financialSummary.totalTransactions,
        lojistas_ativos: financialSummary.activeMerchants,
        clientes_ativos: financialSummary.activeClients,
        cashback_total: formatCurrency(financialSummary.totalCashback),
        comissoes_total: formatCurrency(financialSummary.totalCommissions),
        taxa_plataforma: formatCurrency(financialSummary.platformFee),
        saques_pendentes: formatCurrency(financialSummary.pendingWithdrawals),
        saques_aprovados: formatCurrency(financialSummary.approvedWithdrawals),
        data_geracao: new Date().toLocaleString('pt-BR')
      },
      transacoes: transactionsReport.map(tx => ({
        id: tx.id,
        data: tx.date,
        lojista: tx.merchant,
        cliente: tx.client,
        valor: tx.amount,
        cashback: tx.cashback,
        comissao: tx.commission,
        taxa: tx.fee,
        status: tx.status,
        tipo: tx.type
      })),
      taxas: feesReport.map(fee => ({
        tipo: fee.type,
        valor: fee.amount,
        porcentagem: fee.percentage,
        descricao: fee.description,
        periodo: fee.period
      }))
    };

    // Criar arquivo CSV com dados reais
    const csvContent = [
      // Cabeçalho do resumo
      ['RESUMO FINANCEIRO VALE CASHBACK'],
      ['Receita Total', reportData.resumoFinanceiro.receita_total],
      ['Total de Transações', reportData.resumoFinanceiro.total_transacoes],
      ['Lojistas Ativos', reportData.resumoFinanceiro.lojistas_ativos],
      ['Clientes Ativos', reportData.resumoFinanceiro.clientes_ativos],
      ['Cashback Total', reportData.resumoFinanceiro.cashback_total],
      ['Comissões Total', reportData.resumoFinanceiro.comissoes_total],
      ['Taxa da Plataforma', reportData.resumoFinanceiro.taxa_plataforma],
      ['Saques Pendentes', reportData.resumoFinanceiro.saques_pendentes],
      ['Saques Aprovados', reportData.resumoFinanceiro.saques_aprovados],
      ['Data de Geração', reportData.resumoFinanceiro.data_geracao],
      [''],
      // Cabeçalho das transações
      ['TRANSAÇÕES'],
      ['ID', 'Data', 'Lojista', 'Cliente', 'Valor', 'Cashback', 'Comissão', 'Taxa', 'Status', 'Tipo'],
      ...reportData.transacoes.map(tx => [
        tx.id, tx.data, tx.lojista, tx.cliente, 
        formatCurrency(tx.valor), formatCurrency(tx.cashback), 
        formatCurrency(tx.comissao), formatCurrency(tx.taxa), 
        tx.status, tx.tipo
      ]),
      [''],
      // Cabeçalho das taxas
      ['TAXAS'],
      ['Tipo', 'Valor', 'Porcentagem', 'Descrição', 'Período'],
      ...reportData.taxas.map(fee => [
        fee.tipo, formatCurrency(fee.valor), `${fee.porcentagem}%`, fee.descricao, fee.periodo
      ])
    ];

    // Converter para CSV
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    
    // Criar e baixar arquivo
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-vale-cashback-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    console.log(`✅ Relatório exportado com ${transactionsReport.length} transações reais`);
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async () => {
    console.log("🔄 Botão Atualizar clicado - iniciando refresh dos dados...");
    setIsRefreshing(true);
    
    try {
      // Forçar refresh de todas as queries invalidando o cache
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/financial-summary-clean'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/transactions-clean'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/fees-clean'] });
      
      // Refetch manual das queries
      await Promise.all([
        refetchSummary(),
        refetchTransactions(), 
        refetchFees()
      ]);
      
      console.log("✅ Dados atualizados com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao atualizar dados:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Garantir dados padrão para evitar erros
  const summary = financialSummary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0,
    activeMerchants: 0,
    activeClients: 0,
    totalCashback: 0,
    totalCommissions: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    totalFees: 0,
    platformFee: 0
  };
  const transactions = transactionsReport || [];
  const fees = feesReport || [];

  return (
    <DashboardLayout title="Relatórios" type="admin">
      <div className="space-y-4 p-4 sm:p-6">
        {/* Header Actions - Otimizado para Mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg sm:text-xl font-semibold">Análise Financeira</h2>
            <p className="text-sm text-muted-foreground">Performance do sistema em tempo real</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRefreshData} 
              variant="outline" 
              size="sm"
              disabled={isRefreshing}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button onClick={handleExportReport} size="sm" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="period">Período</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === "custom" && (
                <>
                  <div>
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PP", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PP", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Visão Geral</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                    <SelectItem value="transactions">Transações</SelectItem>
                    <SelectItem value="fees">Taxas e Comissões</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary?.totalRevenue || 0)}</div>
              <p className="text-xs text-gray-500">+12.5% do mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <p className="text-xs text-gray-500">-3.2% do mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialSummary?.netProfit || 0)}</div>
              <p className="text-xs text-gray-500">+18.7% do mês anterior</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{(financialSummary?.totalTransactions || 0).toLocaleString()}</div>
              <p className="text-xs text-gray-500">+8.3% do mês anterior</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Relatórios */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="fees">Taxas & Comissões</TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usuários Ativos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuários Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{financialSummary?.activeMerchants || 0}</div>
                      <div className="text-sm text-gray-600">Lojistas Ativos</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{financialSummary?.activeClients || 0}</div>
                      <div className="text-sm text-gray-600">Clientes Ativos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cashback e Comissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Cashback & Comissões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Cashback Pago</span>
                      <span className="font-bold text-green-600">{formatCurrency(financialSummary?.totalCashback || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Comissões</span>
                      <span className="font-bold text-blue-600">{formatCurrency(financialSummary?.totalCommissions || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taxa da Plataforma</span>
                      <span className="font-bold text-orange-600">{formatCurrency(financialSummary?.platformFee || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Saques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  Status de Saques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-semibold text-yellow-800">Saques Pendentes</div>
                        <div className="text-sm text-yellow-600">Aguardando aprovação</div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-700">{formatCurrency(financialSummary?.pendingWithdrawals || 0)}</div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-semibold text-green-800">Saques Aprovados</div>
                        <div className="text-sm text-green-600">Processados com sucesso</div>
                      </div>
                      <div className="text-2xl font-bold text-green-700">{formatCurrency(financialSummary?.approvedWithdrawals || 0)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-700">
                        {(() => {
                          const approved = financialSummary?.approvedWithdrawals || 0;
                          const pending = financialSummary?.pendingWithdrawals || 0;
                          const total = approved + pending;
                          if (total === 0) return "0.0";
                          return ((approved / total) * 100).toFixed(1);
                        })()}%
                      </div>
                      <div className="text-sm text-gray-500">Taxa de Aprovação</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Financeiro */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Fluxo de Caixa
                  </CardTitle>
                  <CardDescription>Entradas e saídas financeiras do período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Gráfico de fluxo de caixa será implementado aqui</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Metas Financeiras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Receita Mensal</span>
                      <span>84%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Novos Usuários</span>
                      <span>67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Transações</span>
                      <span>92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Transações */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Histórico de Transações
                </CardTitle>
                <CardDescription>Lista detalhada de todas as transações do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Lojista</th>
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-right p-2">Cashback</th>
                        <th className="text-right p-2">Comissão</th>
                        <th className="text-right p-2">Taxa</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">{format(new Date(transaction.date), "dd/MM/yyyy")}</td>
                          <td className="p-2 text-sm">{transaction.merchant}</td>
                          <td className="p-2 text-sm">{transaction.client}</td>
                          <td className="p-2 text-sm text-right font-medium">{formatCurrency(transaction.amount)}</td>
                          <td className="p-2 text-sm text-right text-green-600">{formatCurrency(transaction.cashback)}</td>
                          <td className="p-2 text-sm text-right text-blue-600">{formatCurrency(transaction.commission)}</td>
                          <td className="p-2 text-sm text-right text-orange-600">{formatCurrency(transaction.fee)}</td>
                          <td className="p-2 text-center">
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                              {transaction.status === 'completed' ? 'Concluída' : 'Pendente'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Taxas & Comissões */}
          <TabsContent value="fees" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Estrutura de Taxas
                  </CardTitle>
                  <CardDescription>Configuração atual das taxas do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fees.map((fee, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{fee.type}</div>
                          <div className="text-sm text-gray-600">{fee.description}</div>
                          <div className="text-xs text-gray-500">{fee.period}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{fee.percentage}%</div>
                          <div className="text-sm text-gray-600">{formatCurrency(fee.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribuição de Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Gráfico de distribuição será implementado aqui</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo de Taxas */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Arrecadação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalFees)}</div>
                    <div className="text-sm opacity-90">Taxas Arrecadadas</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalCommissions)}</div>
                    <div className="text-sm opacity-90">Comissões Geradas</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(summary.platformFee)}</div>
                    <div className="text-sm opacity-90">Taxa da Plataforma</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}