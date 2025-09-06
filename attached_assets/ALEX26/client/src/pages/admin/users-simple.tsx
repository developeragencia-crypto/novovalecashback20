import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Filter, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface User {
  id: number;
  name: string;
  email: string;
  type: string;
  status: string;
  created_at: string;
  transaction_count?: number;
  transaction_total?: number;
  total_cashback?: number;
  sales_total?: number;
}

export default function AdminUsersSimple() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Buscando usuários autênticos do financial-tracker-pro...");
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('pageSize', '100');

      // Tentar diferentes abordagens para acessar a API
      let response;
      let data;

      // Direct database access for authentic users
      response = await fetch(`/api/direct/users`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error(`Database access failed: ${response.status}`);
      }

      console.log("Dados recebidos:", data);
      
      if (data && data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        console.log(`${data.users.length} usuários autênticos carregados com sucesso`);
      } else {
        console.error("Formato inválido de resposta:", data);
        // Fallback: carregar dados de exemplo se a API falhar
        setUsers([
          {
            id: 1,
            name: "Sistema em manutenção",
            email: "manutencao@valecashback.com",
            type: "admin",
            status: "active",
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      // Em caso de erro, mostrar mensagem informativa
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterType, filterStatus]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-yellow-100 text-yellow-800",
      blocked: "bg-red-100 text-red-800"
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      admin: "bg-purple-100 text-purple-800",
      client: "bg-blue-100 text-blue-800",
      merchant: "bg-orange-100 text-orange-800"
    };
    return variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || user.type === filterType;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <DashboardLayout title="Gestão de Usuários" type="admin">
      <div className="space-y-6">
        {/* Header com estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.type === 'client').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Lojistas</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.type === 'merchant').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.type === 'admin').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filtros de Busca</span>
              <Button onClick={fetchUsers} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="merchant">Lojistas</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p>Carregando usuários autênticos...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Nenhum usuário encontrado</p>
                <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          <Badge className={getTypeBadge(user.type)}>
                            {user.type === 'client' ? 'Cliente' : 
                             user.type === 'merchant' ? 'Lojista' : 'Administrador'}
                          </Badge>
                          <Badge className={getStatusBadge(user.status)}>
                            {user.status === 'active' ? 'Ativo' : 
                             user.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {user.type === 'client' && (
                          <div className="text-sm">
                            <p className="font-medium">Cashback: R$ {(user.total_cashback || 0).toFixed(2)}</p>
                            <p className="text-muted-foreground">{user.transaction_count || 0} transações</p>
                          </div>
                        )}
                        {user.type === 'merchant' && (
                          <div className="text-sm">
                            <p className="font-medium">Vendas: R$ {(user.sales_total || 0).toFixed(2)}</p>
                            <p className="text-muted-foreground">{user.transaction_count || 0} transações</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}