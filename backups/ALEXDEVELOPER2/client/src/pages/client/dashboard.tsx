import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LineChartComponent } from "@/components/ui/charts";
import { Wallet, ArrowRightLeft, QrCode, History, Tag, Gift, Loader2, Download } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { InstallButton } from "@/components/ui/install-button";

// Interfaces para tipagem
interface Transaction {
  id: number;
  merchant: string;
  date: string;
  amount: number;
  cashback: number;
  status: string;
}

interface DashboardData {
  cashbackBalance: number;
  referralBalance: number;
  transactionsCount: number;
  recentTransactions: Transaction[];
  monthStats?: {
    earned: number;
    transferred: number;
    received: number;
  };
  balanceHistory?: Array<{
    month: string;
    value: number;
  }>;
}

export default function ClientDashboard() {
  // Consulta para obter dados do dashboard do cliente
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/client/dashboard'],
    retry: 2, // Aumenta o número de tentativas
    staleTime: 30000, // Dados são considerados atualizados por 30 segundos
    refetchOnWindowFocus: false, // Evita requisições em excesso
  });

  // Estado de carregamento
  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" type="client">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
        </div>
      </DashboardLayout>
    );
  }

  // Log dos dados recebidos para debug
  console.log("Dados do dashboard cliente:", dashboardData);
  
  // Garantir que os dados do mês estejam disponíveis
  const data = {
    cashbackBalance: dashboardData?.cashbackBalance || 0,
    referralBalance: dashboardData?.referralBalance || 0,
    transactionsCount: dashboardData?.transactionsCount || 0,
    recentTransactions: dashboardData?.recentTransactions || [],
    // Garantimos que monthStats sempre tenha um valor válido
    monthStats: dashboardData?.monthStats || {
      earned: 0,
      transferred: 0,
      received: 0
    },
    // Garantimos que balanceHistory sempre tenha um valor válido
    balanceHistory: dashboardData?.balanceHistory || []
  };
  
  // Log dos dados processados para debug
  console.log("Dados processados do dashboard:", data);

  return (
    <DashboardLayout title="Dashboard" type="client">
      {/* Balance Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <p className="text-muted-foreground mb-1">Seu saldo de cashback</p>
              <h2 className="text-3xl font-bold text-primary">
                {formatCurrency(data.cashbackBalance)}
              </h2>
              {data.referralBalance > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  + {formatCurrency(data.referralBalance)} em bônus de indicação
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <Link href="/client/transfers">
                <Button className="bg-secondary">
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
                </Button>
              </Link>
              <Link href="/client/qr-code">
                <Button className="bg-secondary">
                  <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
                </Button>
              </Link>
              <Link href="/client/transactions">
                <Button variant="outline">
                  <History className="mr-2 h-4 w-4" /> Ver Histórico
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Balance Evolution Chart */}
        <LineChartComponent
          title="Evolução do Saldo"
          data={data.balanceHistory || []}
          lines={[
            { dataKey: "value", name: "Saldo ($)" }
          ]}
          xAxisDataKey="month"
        />

        {/* Month Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center text-muted-foreground">
                <div className="mr-2 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Total Ganho</span>
              </div>
              <div className="font-medium">{formatCurrency(data.monthStats?.earned || 0)}</div>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center text-muted-foreground">
                <div className="mr-2 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Total Transferido</span>
              </div>
              <div className="font-medium">{formatCurrency(data.monthStats?.transferred || 0)}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center text-muted-foreground">
                <div className="mr-2 text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Total Recebido</span>
              </div>
              <div className="font-medium">{formatCurrency(data.monthStats?.received || 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="mb-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Transações Recentes</CardTitle>
          <Link href="/client/transactions">
            <Button variant="ghost" className="text-secondary">Ver todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-muted-foreground text-left border-b">
                    <th className="pb-2 font-medium">Loja</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium text-right">Cashback</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="py-3">{transaction.merchant}</td>
                      <td className="py-3">{transaction.date}</td>
                      <td className="py-3 text-right">{formatCurrency(transaction.amount)}</td>
                      <td className="py-3 text-right">{formatCurrency(transaction.cashback)}</td>
                      <td className="py-3">
                        <span className={`status-${transaction.status}`}>
                          {transaction.status === 'completed' ? 'Concluída' : 
                           transaction.status === 'pending' ? 'Pendente' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promoções e Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações e Dicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start p-3 bg-secondary/10 rounded-lg">
            <Tag className="text-secondary mt-1 mr-3 h-5 w-5" />
            <div>
              <h4 className="font-medium">Como Funciona o Vale Cashback</h4>
              <p className="text-sm text-muted-foreground">
                Em cada compra que você faz, recebe 2% de volta como cashback. Indique amigos e ganhe 1% do valor de compras deles.
              </p>
            </div>
          </div>
          <div className="flex items-start p-3 bg-accent/10 rounded-lg">
            <Gift className="text-accent mt-1 mr-3 h-5 w-5" />
            <div>
              <h4 className="font-medium">Acompanhe Seu Saldo</h4>
              <p className="text-sm text-muted-foreground">
                Você pode transferir seu saldo de cashback para outras pessoas ou utilizá-lo em novos pagamentos através de QR Code.
              </p>
            </div>
          </div>
          
          {/* Botão de instalação */}
          <div className="flex items-start p-3 bg-primary/10 rounded-lg">
            <Download className="text-primary mt-1 mr-3 h-5 w-5" />
            <div className="flex-1">
              <h4 className="font-medium">Instale o Vale Cashback</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Instale nosso app para ter uma experiência completa e mais prática no seu dispositivo.
              </p>
              <InstallButton />
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
