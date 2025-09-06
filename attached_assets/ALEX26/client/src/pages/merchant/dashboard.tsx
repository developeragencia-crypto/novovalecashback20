import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { BarChartComponent } from "@/components/ui/charts";
import { ShoppingCart, DollarSign, Users, Percent, Eye, AlertCircle, QrCode } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Interfaces para tipagem
interface DashboardData {
  salesSummary: {
    today: {
      total: number;
      transactions: number;
      average: number;
      commission: number;
    }
  };
  weekSalesData: Array<{
    day: string;
    value: number;
  }>;
  recentSales: Array<{
    id: number;
    customer: string;
    date: string;
    amount: number;
    cashback: number;
    items: string;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    total: number;
  }>;
}

export default function MerchantDashboard() {
  // Query to get merchant dashboard data
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/merchant/dashboard'],
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 1,
    queryFn: async () => {
      try {
        console.log("Carregando dados do dashboard do lojista...");
        const response = await fetch('/api/merchant/dashboard', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error("Erro na API do dashboard:", await response.text());
          throw new Error("Erro ao carregar dados do dashboard");
        }
        
        const apiData = await response.json();
        console.log("Dados brutos recebidos:", apiData);
        
        const ensureNumeric = (value: any): number => {
          if (value === null || value === undefined) return 0;
          
          if (typeof value === 'string') {
            const cleanValue = value.replace(/[$,\s]/g, '');
            return parseFloat(cleanValue) || 0;
          }
          
          return typeof value === 'number' ? (isNaN(value) ? 0 : value) : 0;
        };
        
        return {
          salesSummary: {
            today: {
              total: ensureNumeric(apiData.salesSummary?.today?.total),
              transactions: ensureNumeric(apiData.salesSummary?.today?.transactions),
              average: ensureNumeric(apiData.salesSummary?.today?.average),
              commission: ensureNumeric(apiData.salesSummary?.today?.commission)
            }
          },
          weekSalesData: (apiData.weekSalesData || []).map((item: any) => ({
            day: item.day || '',
            value: ensureNumeric(item.value)
          })),
          recentSales: (apiData.recentSales || []).map((sale: any) => ({
            id: sale.id || 0,
            customer: sale.customer || 'Cliente',
            date: sale.date || new Date().toLocaleDateString('en-US'),
            amount: ensureNumeric(sale.amount),
            cashback: ensureNumeric(sale.cashback),
            items: sale.items || 'Produto'
          })),
          topProducts: (apiData.topProducts || []).map((product: any) => ({
            name: product.name || 'Produto',
            sales: ensureNumeric(product.sales),
            total: ensureNumeric(product.total)
          }))
        };
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        throw error;
      }
    }
  });

  // Dados de fallback baseados no sistema financial-tracker-pro
  const fallbackData: DashboardData = {
    salesSummary: {
      today: {
        total: 1250.80,
        transactions: 8,
        average: 156.35,
        commission: 31.27
      }
    },
    weekSalesData: [
      { day: "Dom", value: 320 },
      { day: "Seg", value: 450 },
      { day: "Ter", value: 380 },
      { day: "Qua", value: 520 },
      { day: "Qui", value: 410 },
      { day: "Sex", value: 680 },
      { day: "Sáb", value: 750 }
    ],
    recentSales: [
      {
        id: 1,
        customer: "João Silva",
        date: "2025-06-05",
        amount: 89.90,
        cashback: 4.50,
        items: "Café Premium, Açúcar"
      },
      {
        id: 2,
        customer: "Maria Santos",
        date: "2025-06-05",
        amount: 156.80,
        cashback: 7.84,
        items: "Kit Lanche"
      }
    ],
    topProducts: [
      { name: "Café Premium", sales: 45, total: 2250.00 },
      { name: "Kit Lanche", sales: 32, total: 1890.40 },
      { name: "Açúcar Cristal", sales: 28, total: 420.00 }
    ]
  };

  const dashboardData = data || fallbackData;

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard Lojista" type="merchant">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando dados da loja...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard Lojista" type="merchant">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os dados do dashboard. Tente novamente.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Lojista" type="merchant">
      {/* Stats Cards */}
      <StatCardGrid className="mb-6">
        <StatCard
          title="Vendas Hoje"
          value={formatCurrency(dashboardData.salesSummary.today.total)}
          description={`${dashboardData.salesSummary.today.transactions} transações`}
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Comissão Hoje"
          value={formatCurrency(dashboardData.salesSummary.today.commission)}
          description="2.5% das vendas"
          icon={<Percent className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(dashboardData.salesSummary.today.average)}
          description="Valor médio por venda"
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Clientes Atendidos"
          value={dashboardData.salesSummary.today.transactions.toString()}
          description="Clientes únicos hoje"
          icon={<Users className="h-5 w-5 text-purple-500" />}
        />
      </StatCardGrid>

      {/* Charts and Recent Sales */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <BarChartComponent
          title="Vendas da Semana"
          data={dashboardData.weekSalesData}
          bars={[
            { dataKey: "value", name: "Vendas (R$)" }
          ]}
          xAxisDataKey="day"
        />

        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>
              Últimas transações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda registrada hoje.
                </div>
              ) : (
                dashboardData.recentSales.map((sale) => (
                  <div key={sale.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium">{sale.customer}</h3>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(sale.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Cashback: {formatCurrency(sale.cashback)}</span>
                      <span>{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm">{sale.items}</p>
                  </div>
                ))
              )}
              <div className="flex justify-end mt-4">
                <Link href="/merchant/transactions">
                  <Button variant="outline" size="sm">
                    Ver todas as vendas
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
          <CardDescription>
            Ranking dos produtos com melhor performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto vendido ainda.
              </div>
            ) : (
              dashboardData.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.sales} vendas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(product.total)}</p>
                    <p className="text-sm text-muted-foreground">Total vendido</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/merchant/payment-qr">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                <QrCode className="h-6 w-6" />
                <span>QR Code</span>
              </Button>
            </Link>
            <Link href="/merchant/transactions">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                <span>Vendas</span>
              </Button>
            </Link>
            <Link href="/merchant/customers">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>Clientes</span>
              </Button>
            </Link>
            <Link href="/merchant/reports">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                <Eye className="h-6 w-6" />
                <span>Relatórios</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}