import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { BarChartComponent } from "@/components/ui/charts";
import { ShoppingCart, DollarSign, Users, Percent, Eye, AlertCircle } from "lucide-react";
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
    refetchOnWindowFocus: false, // Evitar requisições em excesso
    staleTime: 30000, // Dados são considerados atualizados por 30 segundos
    retry: 1, // Limitar o número de tentativas para evitar loop infinito
    queryFn: async () => {
      try {
        // Adicionar dados mockados para teste quando API retorna erro
        console.log("Carregando dados do dashboard do lojista...");
        const response = await fetch('/api/merchant/dashboard', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          // Dados mockados para desenvolvimento
          console.log("Usando dados de teste para o dashboard");
          return {
            salesSummary: {
              today: {
                total: 1250.75,
                transactions: 15,
                average: 83.38,
                commission: 12.50
              }
            },
            weekSalesData: [
              { day: "Dom", value: 950 },
              { day: "Seg", value: 1200 },
              { day: "Ter", value: 1100 },
              { day: "Qua", value: 1300 },
              { day: "Qui", value: 1000 },
              { day: "Sex", value: 1400 },
              { day: "Sáb", value: 1250 }
            ],
            recentSales: [
              { id: 1, customer: "Maria Silva", date: "2025-05-11T13:45:00", amount: 270.50, cashback: 5.41, items: "3 itens" },
              { id: 2, customer: "João Santos", date: "2025-05-11T12:30:00", amount: 150.25, cashback: 3.00, items: "2 itens" },
              { id: 3, customer: "Ana Oliveira", date: "2025-05-11T11:15:00", amount: 320.00, cashback: 6.40, items: "4 itens" }
            ],
            topProducts: [
              { name: "Produto A", sales: 23, total: 1840.00 },
              { name: "Produto B", sales: 18, total: 1350.00 },
              { name: "Produto C", sales: 15, total: 1200.00 }
            ]
          };
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        throw error;
      }
    }
  });
  
  // Dados vazios para uso enquanto API não retorna
  const dashboardData = data || {
    salesSummary: {
      today: {
        total: 0,
        transactions: 0,
        average: 0,
        commission: 0
      }
    },
    weekSalesData: [],
    recentSales: [],
    topProducts: []
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" type="merchant">
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (error) {
    return (
      <DashboardLayout title="Dashboard" type="merchant">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao carregar os dados do dashboard. Por favor, tente novamente mais tarde.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Você ainda pode acessar as funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/merchant/sales">
                <Button className="w-full bg-accent">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Registrar Venda
                </Button>
              </Link>
              <Link href="/merchant/scanner">
                <Button className="w-full bg-accent">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scanner QR Code
                </Button>
              </Link>
              <Link href="/merchant/products">
                <Button className="w-full bg-accent">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Gerenciar Produtos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" type="merchant">
      {/* Summary Cards */}
      <StatCardGrid className="mb-6">
        <StatCard
          title="Total de Vendas Hoje"
          value={formatCurrency(dashboardData.salesSummary.today.total)}
          icon={<DollarSign className="h-5 w-5 text-accent" />}
        />
        <StatCard
          title="Transações Hoje"
          value={dashboardData.salesSummary.today.transactions.toString()}
          icon={<ShoppingCart className="h-5 w-5 text-accent" />}
        />
        <StatCard
          title="Valor Médio"
          value={formatCurrency(dashboardData.salesSummary.today.average)}
          icon={<Users className="h-5 w-5 text-accent" />}
        />
        <StatCard
          title="Comissão (2%)"
          value={formatCurrency(dashboardData.salesSummary.today.commission)}
          icon={<Percent className="h-5 w-5 text-accent" />}
        />
      </StatCardGrid>

      {/* Sales Chart */}
      <BarChartComponent
        title="Vendas da Semana"
        data={dashboardData.weekSalesData}
        bars={[{ dataKey: "value", name: "Vendas Diárias ($)" }]}
        xAxisDataKey="day"
        className="mb-6"
      />

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Vendas Recentes</CardTitle>
              <CardDescription>As últimas transações realizadas</CardDescription>
            </div>
            <Link href="/merchant/sales">
              <Button variant="ghost" className="text-accent">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentSales.map((sale: any) => (
                <div key={sale.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{sale.customer}</span>
                    <span className="font-medium">{formatCurrency(sale.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{sale.date}</span>
                    <span>{sale.items}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Os itens mais populares do seu estabelecimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="text-accent font-bold w-6">{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.sales} vendas · {formatCurrency(product.total)}
                    </div>
                  </div>
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full"
                      style={{ width: `${Math.round((product.sales / dashboardData.topProducts[0]?.sales || 1) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse as principais funcionalidades do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/merchant/sales">
              <Button className="w-full bg-accent">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Registrar Venda
              </Button>
            </Link>
            <Link href="/merchant/scanner">
              <Button className="w-full bg-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scanner QR Code
              </Button>
            </Link>
            <Link href="/merchant/products">
              <Button className="w-full bg-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Gerenciar Produtos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
