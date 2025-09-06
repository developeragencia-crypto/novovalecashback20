import { MobileCard } from "@/components/mobile-card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/ui/mobile-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, ChevronRight, CreditCard, Receipt, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface CashbackHistoryItem {
  id: number;
  storeName: string;
  amount: number;
  percentage: number;
  date: string;
  status: 'pending' | 'completed';
}

export default function ClientCashbacks() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Cashback balance query
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['/api/client/dashboard'],
    enabled: !!user,
  });

  // Mock cashback history for demonstration
  const mockCashbackHistory: CashbackHistoryItem[] = [
    {
      id: 1,
      storeName: "Supermercado Boa Compra",
      amount: 3.45,
      percentage: 2,
      date: format(new Date(2025, 4, 5), 'dd/MM/yyyy'),
      status: 'completed'
    },
    {
      id: 2,
      storeName: "Farmácia Saúde",
      amount: 1.20,
      percentage: 1.5,
      date: format(new Date(2025, 4, 4), 'dd/MM/yyyy'),
      status: 'completed'
    },
    {
      id: 3,
      storeName: "Loja de Eletrônicos TechShop",
      amount: 12.99,
      percentage: 2,
      date: format(new Date(2025, 4, 3), 'dd/MM/yyyy'),
      status: 'completed'
    },
    {
      id: 4,
      storeName: "Restaurante Sabor Especial",
      amount: 2.50,
      percentage: 2.5,
      date: format(new Date(2025, 4, 2), 'dd/MM/yyyy'),
      status: 'completed'
    },
    {
      id: 5,
      storeName: "Posto de Combustível Rápido",
      amount: 5.00,
      percentage: 1,
      date: format(new Date(2025, 4, 1), 'dd/MM/yyyy'),
      status: 'pending'
    }
  ];

  // Decidimos se vamos usar o layout de desktop ou apenas o conteúdo
  if (!isMobile) {
    return (
      <DashboardLayout title="Meu Cashback" type="client">
        <div className="space-y-6">
        {/* Cashback Balance Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-6">
            <div className="flex flex-col items-center space-y-2">
              <BadgeDollarSign className="h-12 w-12" />
              <h3 className="text-lg">Saldo de Cashback</h3>
              {isBalanceLoading ? (
                <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
              ) : (
                <p className="text-3xl font-bold">$ {(balanceData?.cashbackBalance || 0).toFixed(2)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cashback Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col items-center space-y-1">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-medium">Ganho este mês</h3>
                {isBalanceLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">$ {(balanceData?.earnedThisMonth || 0).toFixed(2)}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col items-center space-y-1">
                <Receipt className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-medium">Total acumulado</h3>
                {isBalanceLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">$ {(balanceData?.totalCashbackEarned || 0).toFixed(2)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cashback History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Cashback</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <div className="px-4">
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1">Pendentes</TabsTrigger>
                  <TabsTrigger value="completed" className="flex-1">Aprovados</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex justify-between mb-1">
                        <div className="font-medium">{item.storeName}</div>
                        <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div>{item.date} • {item.percentage}%</div>
                        <div className={item.status === 'completed' ? 'text-green-600' : 'text-amber-600'}>
                          {item.status === 'completed' ? 'Aprovado' : 'Pendente'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pending" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory
                    .filter(item => item.status === 'pending')
                    .map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between mb-1">
                          <div className="font-medium">{item.storeName}</div>
                          <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div>{item.date} • {item.percentage}%</div>
                          <div className="text-amber-600">Pendente</div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory
                    .filter(item => item.status === 'completed')
                    .map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between mb-1">
                          <div className="font-medium">{item.storeName}</div>
                          <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div>{item.date} • {item.percentage}%</div>
                          <div className="text-green-600">Aprovado</div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* How Cashback Works */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona o Cashback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O Vale Cashback oferece retorno em dinheiro de 2% em todas as compras realizadas em lojas participantes.
            </p>
            <p className="text-sm text-muted-foreground">
              O cashback é calculado automaticamente e adicionado ao seu saldo, podendo ser utilizado para transferências ou novas compras.
            </p>
            <Button variant="outline" className="w-full mt-2">
              <span>Ver lojas participantes</span>
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
      </DashboardLayout>
    );
  } else {
    // Para mobile, retornamos apenas o conteúdo principal, sem nenhum layout adicional
    // porque ele será adicionado pelo ProtectedRouteMobile
    return (
      <div className="space-y-6">
        {/* Cashback Balance Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-6">
            <div className="flex flex-col items-center space-y-2">
              <BadgeDollarSign className="h-12 w-12" />
              <h3 className="text-lg">Saldo de Cashback</h3>
              {isBalanceLoading ? (
                <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
              ) : (
                <p className="text-3xl font-bold">$ {(balanceData?.cashbackBalance || 0).toFixed(2)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cashback Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col items-center space-y-1">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-medium">Ganho este mês</h3>
                {isBalanceLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">$ {(balanceData?.earnedThisMonth || 0).toFixed(2)}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col items-center space-y-1">
                <Receipt className="h-6 w-6 text-muted-foreground" />
                <h3 className="text-sm font-medium">Total acumulado</h3>
                {isBalanceLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">$ {(balanceData?.totalCashbackEarned || 0).toFixed(2)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cashback History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Cashback</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <div className="px-4">
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1">Pendentes</TabsTrigger>
                  <TabsTrigger value="completed" className="flex-1">Aprovados</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex justify-between mb-1">
                        <div className="font-medium">{item.storeName}</div>
                        <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div>{item.date} • {item.percentage}%</div>
                        <div className={item.status === 'completed' ? 'text-green-600' : 'text-amber-600'}>
                          {item.status === 'completed' ? 'Aprovado' : 'Pendente'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pending" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory
                    .filter(item => item.status === 'pending')
                    .map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between mb-1">
                          <div className="font-medium">{item.storeName}</div>
                          <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div>{item.date} • {item.percentage}%</div>
                          <div className="text-amber-600">Pendente</div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="m-0 p-0">
                <div className="divide-y">
                  {mockCashbackHistory
                    .filter(item => item.status === 'completed')
                    .map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between mb-1">
                          <div className="font-medium">{item.storeName}</div>
                          <div className="font-medium text-green-600">+$ {item.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div>{item.date} • {item.percentage}%</div>
                          <div className="text-green-600">Aprovado</div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* How Cashback Works */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona o Cashback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O Vale Cashback oferece retorno em dinheiro de 2% em todas as compras realizadas em lojas participantes.
            </p>
            <p className="text-sm text-muted-foreground">
              O cashback é calculado automaticamente e adicionado ao seu saldo, podendo ser utilizado para transferências ou novas compras.
            </p>
            <Button variant="outline" className="w-full mt-2">
              <span>Ver lojas participantes</span>
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}