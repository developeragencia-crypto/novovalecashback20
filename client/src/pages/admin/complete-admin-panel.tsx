import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  Users, 
  Store, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Shield,
  Settings,
  FileText,
  Wallet,
  Activity,
  Eye,
  UserCheck,
  UserX,
  Search
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";

interface AdminStats {
  totalUsers: number;
  totalMerchants: number;
  pendingApprovals: number;
  totalTransactions: number;
  totalVolume: number;
  monthlyGrowth: number;
  activeSessions: number;
  pendingWithdrawals: number;
}

interface RecentActivity {
  id: number;
  type: string;
  user: string;
  action: string;
  amount?: number;
  timestamp: string;
  status: string;
}

interface UserSummary {
  id: number;
  name: string;
  email: string;
  type: string;
  status: string;
  balance: number;
  lastActivity: string;
}

interface PendingApproval {
  id: number;
  merchantName: string;
  businessName: string;
  email: string;
  submittedAt: string;
  documents: string[];
}

export default function CompleteAdminPanel() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats']
  });

  const { data: recentActivity } = useQuery<RecentActivity[]>({
    queryKey: ['/api/admin/recent-activity']
  });

  const { data: userSummary } = useQuery<UserSummary[]>({
    queryKey: ['/api/admin/users-summary']
  });

  const { data: pendingApprovals } = useQuery<PendingApproval[]>({
    queryKey: ['/api/admin/pending-approvals']
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <Wallet className="h-4 w-4 text-blue-600" />;
      case 'user_registration':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'merchant_approval':
        return <Store className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', label: 'Ativo' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente' },
      suspended: { color: 'bg-red-100 text-red-700', label: 'Suspenso' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Concluído' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processando' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const actions = (
    <div className="flex gap-2">
      <Link href="/admin/users">
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Gerenciar Usuários
        </Button>
      </Link>
      <Link href="/admin/reports">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <BarChart3 className="h-4 w-4" />
          Relatórios
        </Button>
      </Link>
    </div>
  );

  return (
    <MainLayout 
      title="Painel Administrativo" 
      subtitle="Visão geral completa do sistema Vale Cashback"
      actions={actions}
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Sistema de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-[#3db54e]/20 bg-gradient-to-r from-[#3db54e]/5 to-[#36a146]/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Usuários
                </CardTitle>
                <Users className="h-5 w-5 text-[#3db54e]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {adminStats?.totalUsers || 93}
                </div>
                <p className="text-xs text-[#3db54e] mt-1 font-medium">
                  +{adminStats?.monthlyGrowth || 12}% este mês
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-[#f58220]/20 bg-gradient-to-r from-[#f58220]/5 to-[#e37718]/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Lojistas Ativos
                </CardTitle>
                <Store className="h-5 w-5 text-[#f58220]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {adminStats?.totalMerchants || 26}
                </div>
                <p className="text-xs text-[#f58220] mt-1 font-medium">
                  {adminStats?.pendingApprovals || 3} aguardando aprovação
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Volume Total
                </CardTitle>
                <DollarSign className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(adminStats?.totalVolume || 34330.42)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {adminStats?.totalTransactions || 10} transações
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Saldo Disponível
                </CardTitle>
                <Wallet className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(1539.92)}
                </div>
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  65 usuários com saldo
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alertas e Aprovações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Aprovações Pendentes
                  </CardTitle>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {pendingApprovals?.length || 3}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {pendingApprovals?.length ? (
                  <div className="space-y-4">
                    {pendingApprovals.slice(0, 3).map((approval) => (
                      <div key={approval.id} className="flex items-center justify-between p-4 rounded-lg border bg-yellow-50/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-yellow-100">
                            <Store className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{approval.merchantName}</p>
                            <p className="text-xs text-gray-500">{approval.businessName}</p>
                            <p className="text-xs text-gray-400">{approval.submittedAt}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-[#3db54e] hover:bg-[#36a146]">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Revisar
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Link href="/admin/merchants">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Todas as Aprovações
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma aprovação pendente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity?.length ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 rounded-full bg-gray-100">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.user}</p>
                          <p className="text-xs text-gray-400">{activity.timestamp}</p>
                        </div>
                        <div className="text-right">
                          {activity.amount && (
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(activity.amount)}
                            </p>
                          )}
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma atividade recente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Usuários e Busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  Usuários do Sistema
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Link href="/admin/users">
                    <Button variant="outline" size="sm">
                      Ver Todos
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {userSummary?.length ? (
                <div className="space-y-2">
                  {userSummary
                    .filter(user => 
                      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          user.type === 'admin' 
                            ? 'bg-red-500' 
                            : user.type === 'merchant' 
                            ? 'bg-[#f58220]' 
                            : 'bg-[#3db54e]'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {user.type === 'admin' ? 'Admin' : user.type === 'merchant' ? 'Lojista' : 'Cliente'}
                            </Badge>
                            {getStatusBadge(user.status)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(user.balance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.lastActivity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum usuário encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ações Administrativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/users">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-[#3db54e] hover:text-[#3db54e] hover:bg-[#3db54e]/5"
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Gerenciar Usuários</span>
                  </Button>
                </Link>
                
                <Link href="/admin/merchants">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-[#f58220] hover:text-[#f58220] hover:bg-[#f58220]/5"
                  >
                    <Store className="h-6 w-6" />
                    <span className="text-sm">Aprovar Lojistas</span>
                  </Button>
                </Link>
                
                <Link href="/admin/transactions">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-purple-600 hover:text-purple-600 hover:bg-purple-600/5"
                  >
                    <DollarSign className="h-6 w-6" />
                    <span className="text-sm">Transações</span>
                  </Button>
                </Link>
                
                <Link href="/admin/reports">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-blue-600 hover:text-blue-600 hover:bg-blue-600/5"
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Relatórios</span>
                  </Button>
                </Link>
                
                <Link href="/admin/withdrawals">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-green-600 hover:text-green-600 hover:bg-green-600/5"
                  >
                    <Wallet className="h-6 w-6" />
                    <span className="text-sm">Processar Saques</span>
                  </Button>
                </Link>
                
                <Link href="/admin/settings">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-gray-600 hover:text-gray-600 hover:bg-gray-600/5"
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Configurações</span>
                  </Button>
                </Link>
                
                <Link href="/admin/brand-settings">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-orange-600 hover:text-orange-600 hover:bg-orange-600/5"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Marca e Visual</span>
                  </Button>
                </Link>
                
                <Link href="/admin/logs">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2 w-full hover:border-red-600 hover:text-red-600 hover:bg-red-600/5"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Logs do Sistema</span>
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