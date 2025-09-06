import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Eye, 
  Edit, 
  Ban, 
  Lock, 
  RotateCw, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Activity,
  Clock,
  Loader2,
  Filter,
  RotateCcw,
  UserPlus,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  Users,
  Store,
  Save
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: '',
    type: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Debounce para a pesquisa (aguarda 500ms após parar de digitar)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query para buscar usuários autênticos do financial-tracker-pro
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/admin/users', debouncedSearchTerm, filterType, filterStatus, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      if (filterType && filterType !== 'all') {
        params.append('type', filterType);
      }
      
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      params.append('page', currentPage.toString());
      params.append('pageSize', '100');
      
      console.log("Fazendo requisição para:", `/api/admin/users?${params.toString()}`);
      
      try {
        // Usar proxy do Vite para acessar a API na porta 3000
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log("Status da resposta:", response.status);
        
        if (!response.ok) {
          console.error("Erro na resposta:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("Conteúdo do erro:", errorText);
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log("Resposta bruta da API:", responseText);
        
        if (!responseText) {
          throw new Error('Resposta vazia da API');
        }
        
        const result = JSON.parse(responseText);
        console.log("Dados parseados da API:", result);
        console.log("Número de usuários retornados:", result.users?.length || 0);
        
        if (!result.users || !Array.isArray(result.users)) {
          console.error("Formato inválido da resposta:", result);
          throw new Error('Formato inválido de resposta da API');
        }
        
        return result;
      } catch (error) {
        console.error("Erro na requisição:", error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Função para atualizar dados com feedback
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Dados atualizados",
        description: "Lista de usuários e saldos foram atualizados com sucesso.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Função para limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setCurrentPage(1);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram removidos.",
      variant: "default"
    });
  };

  const handleViewUser = async (user: any) => {
    try {
      // Buscar detalhes completos do usuário incluindo saldos
      const response = await fetch(`/api/admin/user-details/${user.id}`);
      if (response.ok) {
        const userDetails = await response.json();
        setSelectedUser(userDetails);
      } else {
        setSelectedUser(user);
      }
      setIsDialogOpen(true);
    } catch (error) {
      setSelectedUser(user);
      setIsDialogOpen(true);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || '',
      type: user.type || ''
    });
    setIsEditDialogOpen(true);
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(numValue || 0);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "client": return "Cliente";
      case "merchant": return "Lojista";
      case "admin": return "Admin";
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "inactive": return "Inativo";
      case "blocked": return "Bloqueado";
      default: return status;
    }
  };

  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "client": return <Users className="h-4 w-4" />;
      case "merchant": return <Store className="h-4 w-4" />;
      case "admin": return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "blocked": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const allUsers = data?.users || [];
  
  console.log("Estado atual da página:");
  console.log("- isLoading:", isLoading);
  console.log("- data:", data);
  console.log("- allUsers.length:", allUsers.length);
  console.log("- totalUsers:", data?.totalUsers);

  if (isLoading) {
    return (
      <DashboardLayout title="Gestão de Usuários" type="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Carregando usuários e saldos...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gestão de Usuários" type="admin">
      <div className="space-y-6">
        {/* Header with Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{data?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{data?.merchantCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Lojistas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{data?.clientCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(data?.totalBalance || 0)}</p>
                  <p className="text-xs text-muted-foreground">Saldo Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo de usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="merchant">Lojista</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  disabled={searchTerm === '' && filterType === 'all' && filterStatus === 'all'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allUsers.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-all duration-200 h-fit">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.photo} alt={user.name} />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{user.name}</h3>
                    <div className="flex items-center space-x-1 mt-1">
                      <Badge variant="outline" className={`text-xs px-1 py-0 ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                        {getTypeIcon(user.type)}
                        <span className="ml-1">{getTypeLabel(user.type)}</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-2 mb-3">
                  {user.type === 'client' && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center space-x-1">
                        <Wallet className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-700">Cashback</span>
                      </div>
                      <span className="text-xs font-bold text-green-800">
                        {formatCurrency(user.total_cashback || 0)}
                      </span>
                    </div>
                  )}
                  
                  {user.type === 'merchant' && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 text-orange-600" />
                        <span className="text-xs text-orange-700">Vendas</span>
                      </div>
                      <span className="text-xs font-bold text-orange-800">
                        {formatCurrency(user.sales_total || 0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div className="flex items-center space-x-1">
                      <CreditCard className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-blue-700">Transações</span>
                    </div>
                    <span className="text-xs font-bold text-blue-800">
                      {user.transaction_count || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-purple-700">Volume</span>
                    </div>
                    <span className="text-xs font-bold text-purple-800">
                      {formatCurrency(user.transaction_total || 0)}
                    </span>
                  </div>
                </div>

                {/* User Actions */}
                <div className="flex space-x-1 mb-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewUser(user)}
                    className="flex-1 text-xs h-7"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Detalhes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="text-xs h-7 px-2"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>ID: {user.id}</span>
                    <span>Cadastro</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <p className="truncate">{user.email}</p>
                    <p>{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {allUsers.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou termos de busca
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">Debug info:</p>
                <p className="text-xs">isLoading: {isLoading.toString()}</p>
                <p className="text-xs">data: {JSON.stringify(data, null, 2)}</p>
                <p className="text-xs">allUsers.length: {allUsers.length}</p>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterStatus('all');
                refetch();
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas e saldos atualizados
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUser.photo} alt={selectedUser.name} />
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className={getStatusColor(selectedUser.status)}>
                      {getStatusLabel(selectedUser.status)}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {getTypeIcon(selectedUser.type)}
                      <span className="ml-1">{getTypeLabel(selectedUser.type)}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedUser.type === 'client' && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Wallet className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-800">
                          {formatCurrency(selectedUser.total_cashback || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Cashback</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {selectedUser.type === 'merchant' && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-800">
                          {formatCurrency(selectedUser.sales_total || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Vendas</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-800">
                        {selectedUser.transaction_count || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Transações</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-800">
                        {formatCurrency(selectedUser.transaction_total || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Volume Total</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                      <p className="text-base">{selectedUser.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base">{selectedUser.email}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <p className="text-base">{selectedUser.phone || 'Não informado'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">País</label>
                      <p className="text-base">{selectedUser.country || 'Não informado'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                      <p className="text-base">{new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Último Login</label>
                      <p className="text-base">
                        {selectedUser.last_login 
                          ? new Date(selectedUser.last_login).toLocaleDateString('pt-BR')
                          : 'Nunca'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merchant Info */}
              {selectedUser.type === 'merchant' && selectedUser.merchant && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informações da Loja</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nome da Loja</label>
                        <p className="text-base">{selectedUser.merchant.store_name}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                        <p className="text-base">{selectedUser.merchant.category}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Taxa de Comissão</label>
                        <p className="text-base">{selectedUser.merchant.commission_rate}%</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Status da Loja</label>
                        <Badge variant="outline" className={selectedUser.merchant.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {selectedUser.merchant.approved ? 'Aprovada' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsDialogOpen(false);
              setIsEditDialogOpen(true);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Usuário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Nome do usuário"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  type="email"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({...editForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Usuário</label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({...editForm, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="merchant">Lojista</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              try {
                const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(editForm),
                });

                if (response.ok) {
                  toast({
                    title: "Usuário atualizado",
                    description: "As informações foram salvas com sucesso.",
                    variant: "default"
                  });
                  setIsEditDialogOpen(false);
                  refetch(); // Recarregar a lista
                } else {
                  throw new Error('Erro ao atualizar usuário');
                }
              } catch (error) {
                toast({
                  title: "Erro ao atualizar",
                  description: "Não foi possível salvar as alterações.",
                  variant: "destructive"
                });
              }
            }}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}