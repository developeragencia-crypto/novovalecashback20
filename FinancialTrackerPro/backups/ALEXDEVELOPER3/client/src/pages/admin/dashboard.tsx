import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { 
  LineChartComponent,
  BarChartComponent,
  PieChartComponent 
} from "@/components/ui/charts";
import { 
  Users, 
  Store, 
  CreditCard, 
  BarChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Mock data - usado apenas quando a API não retorna dados
const stats = {
  totalUsers: 1250,
  activeToday: 315,
  newAccounts: 45,
  transactionsToday: 520,
  totalVolume: 85430.75,
  totalCashback: 1708.61
};

const userGrowthData = [
  { month: "Jan", clients: 200, merchants: 20 },
  { month: "Fev", clients: 350, merchants: 35 },
  { month: "Mar", clients: 500, merchants: 50 },
  { month: "Abr", clients: 650, merchants: 65 },
  { month: "Mai", clients: 800, merchants: 80 },
  { month: "Jun", clients: 950, merchants: 95 },
  { month: "Jul", clients: 1050, merchants: 105 }
];

const transactionVolumeData = [
  { month: "Jan", value: 12000 },
  { month: "Fev", value: 15000 },
  { month: "Mar", value: 18000 },
  { month: "Abr", value: 22000 },
  { month: "Mai", value: 25000 },
  { month: "Jun", value: 30000 },
  { month: "Jul", value: 35000 }
];

const userDistributionData = [
  { name: "Clientes", value: 1050, color: "hsl(var(--chart-2))" },
  { name: "Lojistas", value: 105, color: "hsl(var(--chart-3))" },
  { name: "Administradores", value: 5, color: "hsl(var(--chart-1))" }
];

const recentStores = [
  { id: 1, name: "Restaurante Sabor Brasil", owner: "Paulo Mendes", date: "20/07/2023", category: "Alimentação", status: "active" },
  { id: 2, name: "Auto Peças Expresso", owner: "Sandra Lima", date: "19/07/2023", category: "Automotivo", status: "active" }
];

export default function AdminDashboard() {
  const { toast } = useToast();
  
  // Query to get dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
    toast({
      title: "Erro",
      description: "Não foi possível carregar os dados do dashboard",
      variant: "destructive"
    });
  }

  // Usar dados da API ou fallback para dados de mock
  const dashboardData = data || {
    userCount: stats.totalUsers.toString(),
    merchantCount: "105",
    transactionCount: stats.transactionsToday.toString(),
    transactionTotal: stats.totalVolume.toString(),
    recentStores: recentStores,
    pendingTransfersCount: "0",
    lastLog: null
  } as {
    userCount: string;
    merchantCount: string;
    transactionCount: string;
    transactionTotal: string;
    recentStores: typeof recentStores;
    pendingTransfersCount: string;
    lastLog: any | null;
  };

  return (
    <DashboardLayout title="Dashboard" type="admin">
      {/* Stats Cards */}
      <StatCardGrid className="mb-6">
        <StatCard
          title="Total de Usuários"
          value={dashboardData.userCount || "0"}
          description={`${stats.activeToday} ativos hoje`}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Transações Totais"
          value={dashboardData.transactionCount || "0"}
          description={`${stats.newAccounts} novas contas (7 dias)`}
          icon={<CreditCard className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Volume Financeiro"
          value={`$ ${parseFloat(dashboardData.transactionTotal || "0").toFixed(2)}`}
          description={`${dashboardData.merchantCount || "0"} lojistas`}
          icon={<BarChart className="h-5 w-5 text-primary" />}
        />
      </StatCardGrid>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <LineChartComponent
          title="Crescimento de Usuários"
          data={userGrowthData}
          lines={[
            { dataKey: "clients", name: "Clientes" },
            { dataKey: "merchants", name: "Lojistas" }
          ]}
          xAxisDataKey="month"
        />
        <BarChartComponent
          title="Volume de Transações"
          data={transactionVolumeData}
          bars={[
            { dataKey: "value", name: "Volume de Transações ($)" }
          ]}
          xAxisDataKey="month"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <PieChartComponent
          title="Distribuição de Usuários"
          data={userDistributionData}
          donut={true}
          innerRadius={60}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lojas Recentes</CardTitle>
            <CardDescription>
              Lojas recentemente registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando lojas...
                </div>
              ) : dashboardData.recentStores?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Não há lojas recentemente registradas.
                </div>
              ) : (
                (dashboardData.recentStores || recentStores).map((store) => (
                  <div key={store.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium">{store.name}</h3>
                      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                        Ativa
                      </Badge>
                    </div>
                    <div className="flex flex-wrap justify-between text-sm text-muted-foreground mb-3">
                      <span>Responsável: {store.owner}</span>
                      <span>Categoria: {store.category}</span>
                      <span>Data: {store.date}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/stores/${store.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-4 w-4" /> Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-end mt-4">
                <Link href="/admin/stores">
                  <Button variant="outline" size="sm">
                    Ver todas as lojas
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>
            Visão geral do status atual do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500 text-white rounded-full">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Processamento</h3>
                  <p className="text-sm text-green-700">Funcionando normalmente</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500 text-white rounded-full">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Banco de Dados</h3>
                  <p className="text-sm text-green-700">Operacional</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-400 text-white rounded-full">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">API</h3>
                  <p className="text-sm text-yellow-700">Latência acima do normal</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500 text-white rounded-full">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">E-mail</h3>
                  <p className="text-sm text-green-700">Funcionando normalmente</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Link href="/admin/logs">
              <Button variant="outline">
                Ver logs do sistema
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button>
                Configurações
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
