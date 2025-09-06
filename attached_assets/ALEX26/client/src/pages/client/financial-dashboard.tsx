import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Receipt,
  Smartphone,
  QrCode,
  Gift,
  Star,
  Wallet,
  Plus,
  CreditCard,
  PiggyBank
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface DashboardData {
  availableBalance: number;
  totalCashback: number;
  totalTransactions: number;
  pendingTransactions: number;
  referralCount: number;
  monthlyEarnings: number;
  recentTransactions: Transaction[];
  topStores: Store[];
  weeklyStats: WeeklyStats[];
}

interface Transaction {
  id: number;
  amount: number;
  cashback: number;
  store: string;
  date: string;
  status: string;
  type: string;
}

interface Store {
  id: number;
  name: string;
  cashbackRate: number;
  logo: string;
  category: string;
}

interface WeeklyStats {
  day: string;
  earnings: number;
  transactions: number;
}

export default function FinancialDashboard() {
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard/stats']
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <MainLayout title="Dashboard Financeiro" subtitle="Carregando seus dados financeiros...">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3db54e]"></div>
        </div>
      </MainLayout>
    );
  }

  const actions = (
    <div className="flex gap-2">
      <Link href="/client/scanner">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <Smartphone className="h-4 w-4" />
          Pagar com QR
        </Button>
      </Link>
      <Link href="/client/qr-code">
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Meu QR Code
        </Button>
      </Link>
    </div>
  );

  return (
    <MainLayout 
      title="Dashboard Financeiro" 
      subtitle="Acompanhe seus ganhos, transações e saldo em tempo real"
      actions={actions}
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Cartão Principal - Saldo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-[#3db54e] via-[#36a146] to-[#2d8f3d] text-white border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="h-8 w-8 text-white/80" />
                    <h3 className="text-xl font-semibold text-white/90">Saldo Total</h3>
                  </div>
                  <p className="text-4xl font-bold mb-2">
                    {formatCurrency(dashboardData?.availableBalance || 0)}
                  </p>
                  <p className="text-white/80">
                    Disponível para saque e transferência
                  </p>
                </div>
                <div className="text-right space-y-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-white/80 text-sm">Ganhos do Mês</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(dashboardData?.monthlyEarnings || 0)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full">
                    Solicitar Saque
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-[#f58220]/20 bg-gradient-to-br from-[#f58220]/5 to-[#e37718]/5 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Total Cashback
                </CardTitle>
                <PiggyBank className="h-5 w-5 text-[#f58220]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData?.totalCashback || 0)}
                </div>
                <p className="text-xs text-[#f58220] mt-1 font-medium">
                  Acumulado em cashback
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Transações
                </CardTitle>
                <Receipt className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.totalTransactions || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData?.pendingTransactions || 0} pendentes
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Indicações Ativas
                </CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.referralCount || 0}
                </div>
                <p className="text-xs text-purple-600 mt-1 font-medium">
                  Amigos indicados
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Taxa Média
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  5.2%
                </div>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Cashback médio
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transações Recentes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#f58220]" />
                    Transações Recentes
                  </CardTitle>
                  <Link href="/client/transactions">
                    <Button variant="outline" size="sm">
                      Ver Todas
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentTransactions?.length ? (
                  <div className="space-y-4">
                    {dashboardData.recentTransactions.slice(0, 6).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${
                            transaction.type === 'cashback' 
                              ? 'bg-[#3db54e]/10' 
                              : 'bg-blue-100'
                          }`}>
                            {transaction.type === 'cashback' ? (
                              <ArrowUpRight className="h-5 w-5 text-[#3db54e]" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{transaction.store}</p>
                            <p className="text-xs text-gray-500">{transaction.date}</p>
                            <Badge 
                              variant="secondary" 
                              className={`mt-1 text-xs ${
                                transaction.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {transaction.status === 'completed' ? 'Concluída' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(transaction.amount)}
                          </p>
                          {transaction.cashback > 0 && (
                            <p className="text-sm text-[#3db54e] font-medium">
                              +{formatCurrency(transaction.cashback)} cashback
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma transação ainda
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Comece a usar o Vale Cashback para ganhar dinheiro de volta
                    </p>
                    <Link href="/client/stores">
                      <Button className="bg-[#3db54e] hover:bg-[#36a146]">
                        Explorar Lojas
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Lojas Favoritas */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Lojas Favoritas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.topStores?.length ? (
                  <div className="space-y-4">
                    {dashboardData.topStores.slice(0, 5).map((store, index) => (
                      <div key={store.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#f58220] to-[#e37718] flex items-center justify-center text-white font-semibold">
                            {store.name.charAt(0)}
                          </div>
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                              <Star className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{store.name}</p>
                          <p className="text-xs text-gray-500">{store.category}</p>
                          <Badge className="mt-1 bg-[#3db54e]/10 text-[#3db54e] text-xs">
                            {store.cashbackRate}% cashback
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Link href="/client/stores">
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        Ver Todas as Lojas
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Descubra lojas parceiras</p>
                    <Link href="/client/stores">
                      <Button size="sm" variant="outline">
                        Explorar Lojas
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Link href="/client/scanner">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-3 w-full hover:border-[#3db54e] hover:text-[#3db54e] hover:bg-[#3db54e]/5 transition-all"
                  >
                    <Smartphone className="h-8 w-8" />
                    <span className="text-sm font-medium">Pagar com QR</span>
                  </Button>
                </Link>
                
                <Link href="/client/transfers">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-3 w-full hover:border-[#f58220] hover:text-[#f58220] hover:bg-[#f58220]/5 transition-all"
                  >
                    <ArrowDownRight className="h-8 w-8" />
                    <span className="text-sm font-medium">Transferir</span>
                  </Button>
                </Link>
                
                <Link href="/client/referrals">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-3 w-full hover:border-purple-600 hover:text-purple-600 hover:bg-purple-600/5 transition-all"
                  >
                    <Users className="h-8 w-8" />
                    <span className="text-sm font-medium">Indicar Amigo</span>
                  </Button>
                </Link>
                
                <Link href="/client/stores">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-3 w-full hover:border-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/5 transition-all"
                  >
                    <Gift className="h-8 w-8" />
                    <span className="text-sm font-medium">Ver Ofertas</span>
                  </Button>
                </Link>
                
                <Link href="/client/qr-code">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-3 w-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-500/5 transition-all"
                  >
                    <QrCode className="h-8 w-8" />
                    <span className="text-sm font-medium">Meu QR Code</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}