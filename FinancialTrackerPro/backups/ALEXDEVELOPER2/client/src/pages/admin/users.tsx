import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
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
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Mock users data - would be replaced with real data from API
const users = [
  { 
    id: 1, 
    name: "João Silva", 
    email: "joao@email.com", 
    type: "client", 
    status: "active", 
    registered: "10/01/2023", 
    lastActivity: "21/07/2023",
    photo: "",
    phone: "(11) 98765-4321",
    cpf: "123.456.789-00",
    cashbackBalance: 235.50,
    totalCashbackEarned: 450.75,
    totalTransactions: 25,
    ipAddress: "192.168.1.100",
    device: "Chrome em Windows",
    loginHistory: [
      { date: "21/07/2023", time: "14:35", ip: "192.168.1.100", device: "Chrome em Windows", status: "success" },
      { date: "18/07/2023", time: "09:20", ip: "192.168.1.100", device: "Chrome em Windows", status: "success" },
      { date: "15/07/2023", time: "19:42", ip: "177.44.82.155", device: "Safari em iPhone", status: "success" }
    ]
  },
  { 
    id: 2, 
    name: "Mercado Central", 
    email: "contato@mercadocentral.com", 
    type: "merchant", 
    status: "active", 
    registered: "15/02/2023", 
    lastActivity: "21/07/2023",
    photo: "",
    phone: "(11) 3456-7890",
    cnpj: "12.345.678/0001-90",
    totalSales: 45500.25,
    totalTransactions: 325,
    storeCategory: "Supermercado"
  },
  { 
    id: 3, 
    name: "Maria Souza", 
    email: "maria@email.com", 
    type: "client", 
    status: "active", 
    registered: "05/03/2023", 
    lastActivity: "20/07/2023" 
  },
  { 
    id: 4, 
    name: "Farmácia Popular", 
    email: "contato@farmaciapopular.com", 
    type: "merchant", 
    status: "active", 
    registered: "20/03/2023", 
    lastActivity: "21/07/2023" 
  },
  { 
    id: 5, 
    name: "José Santos", 
    email: "jose@email.com", 
    type: "client", 
    status: "inactive", 
    registered: "12/04/2023", 
    lastActivity: "10/07/2023" 
  }
];

export default function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Query to get users data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: any) => {
    // This would navigate to an edit form in a real implementation
    toast({
      title: "Editar usuário",
      description: `Editando ${user.name}`,
    });
  };

  const handleOpenResetPasswordDialog = (user: any) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleOpenBlockDialog = (user: any) => {
    setSelectedUser(user);
    setIsBlockDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Senha resetada",
        description: `Um e-mail foi enviado para ${selectedUser.email} com as instruções.`,
      });
      
      setIsResetPasswordDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao resetar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = selectedUser.status === "blocked" ? "desbloqueado" : "bloqueado";
      
      toast({
        title: `Usuário ${action}`,
        description: `${selectedUser.name} foi ${action} com sucesso.`,
      });
      
      // Update the user status in the cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      
      setIsBlockDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao alterar o status do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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

  // Column configuration
  const columns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Nome",
      accessorKey: "name",
    },
    {
      header: "E-mail",
      accessorKey: "email",
    },
    {
      header: "Tipo",
      accessorKey: "type",
      cell: (row: any) => (
        <Badge 
          variant="outline"
          className={
            row.type === "client" 
              ? "bg-secondary/10 text-secondary border-secondary/20" 
              : row.type === "merchant"
              ? "bg-accent/10 text-accent border-accent/20"
              : "bg-primary/10 text-primary border-primary/20"
          }
        >
          {getTypeLabel(row.type)}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <Badge 
          variant="outline"
          className={
            row.status === "active" 
              ? "bg-green-100 text-green-800 border-green-200" 
              : row.status === "inactive"
              ? "bg-gray-100 text-gray-800 border-gray-200"
              : "bg-red-100 text-red-800 border-red-200"
          }
        >
          {getStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: "Cadastro",
      accessorKey: "registered",
    },
    {
      header: "Última Atividade",
      accessorKey: "lastActivity",
    },
  ];

  // Actions configuration
  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: handleViewUser,
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEditUser,
    },
    {
      label: "Resetar senha",
      icon: <RotateCw className="h-4 w-4" />,
      onClick: handleOpenResetPasswordDialog,
    },
    {
      label: "Bloquear/Desbloquear",
      icon: <Ban className="h-4 w-4" />,
      onClick: handleOpenBlockDialog,
    },
  ];

  // Filter options
  const typeOptions = [
    { label: "Todos", value: "all" },
    { label: "Cliente", value: "client" },
    { label: "Lojista", value: "merchant" },
    { label: "Admin", value: "admin" },
  ];

  const statusOptions = [
    { label: "Todos", value: "all" },
    { label: "Ativo", value: "active" },
    { label: "Inativo", value: "inactive" },
    { label: "Bloqueado", value: "blocked" },
  ];

  const filters = [
    {
      name: "Tipo",
      options: typeOptions,
      onChange: (value: string) => console.log("Type filter:", value),
    },
    {
      name: "Status",
      options: statusOptions,
      onChange: (value: string) => console.log("Status filter:", value),
    },
  ];

  return (
    <DashboardLayout title="Gestão de Usuários" type="admin">
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Gerencie todos os usuários cadastrados no Vale Cashback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.users || users}
            columns={columns}
            actions={actions}
            filters={filters}
            searchable={true}
            onSearch={(value) => console.log("Searching:", value)}
            pagination={{
              pageIndex: 0,
              pageSize: 10,
              pageCount: Math.ceil((data?.users || users).length / 10),
              onPageChange: (page) => console.log("Page:", page),
            }}
            exportable={true}
            onExport={() => console.log("Exporting users")}
          />
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o usuário
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <User className="mr-2 h-4 w-4" />
                  <span>Informações</span>
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Atividade</span>
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Segurança</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={selectedUser.photo} alt={selectedUser.name} />
                      <AvatarFallback className="text-lg bg-primary text-white">
                        {getInitials(selectedUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">{getTypeLabel(selectedUser.type)}</p>
                      
                      <Badge 
                        variant="outline"
                        className={
                          selectedUser.status === "active" 
                            ? "bg-green-100 text-green-800 border-green-200 mt-2" 
                            : selectedUser.status === "inactive"
                            ? "bg-gray-100 text-gray-800 border-gray-200 mt-2"
                            : "bg-red-100 text-red-800 border-red-200 mt-2"
                        }
                      >
                        {getStatusLabel(selectedUser.status)}
                      </Badge>
                    </div>
                    
                    <div className="w-full space-y-2">
                      <div className="flex items-center p-2 bg-muted rounded">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      
                      {selectedUser.phone && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedUser.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center p-2 bg-muted rounded">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Cadastro: {selectedUser.registered}</span>
                      </div>
                      
                      <div className="flex items-center p-2 bg-muted rounded">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Última atividade: {selectedUser.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    {selectedUser.type === "client" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/20 rounded-lg">
                            <h4 className="text-sm text-muted-foreground mb-1">Saldo de Cashback</h4>
                            <div className="text-2xl font-bold text-primary">
                              $ {selectedUser.cashbackBalance?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-muted/20 rounded-lg">
                            <h4 className="text-sm text-muted-foreground mb-1">Total Acumulado</h4>
                            <div className="text-2xl font-bold text-primary">
                              $ {selectedUser.totalCashbackEarned?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Informações Pessoais</h4>
                          <div className="space-y-2">
                            {selectedUser.cpf && (
                              <div className="flex justify-between border-b py-2">
                                <span className="text-muted-foreground">CPF:</span>
                                <span>{selectedUser.cpf}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between border-b py-2">
                              <span className="text-muted-foreground">Total de Transações:</span>
                              <span>{selectedUser.totalTransactions || 0}</span>
                            </div>
                            
                            {/* Add more personal information here */}
                          </div>
                        </div>
                      </div>
                    ) : selectedUser.type === "merchant" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/20 rounded-lg">
                            <h4 className="text-sm text-muted-foreground mb-1">Total em Vendas</h4>
                            <div className="text-2xl font-bold text-accent">
                              $ {selectedUser.totalSales?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-muted/20 rounded-lg">
                            <h4 className="text-sm text-muted-foreground mb-1">Nº de Transações</h4>
                            <div className="text-2xl font-bold text-accent">
                              {selectedUser.totalTransactions || 0}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Informações da Loja</h4>
                          <div className="space-y-2">
                            {selectedUser.cnpj && (
                              <div className="flex justify-between border-b py-2">
                                <span className="text-muted-foreground">CNPJ:</span>
                                <span>{selectedUser.cnpj}</span>
                              </div>
                            )}
                            
                            {selectedUser.storeCategory && (
                              <div className="flex justify-between border-b py-2">
                                <span className="text-muted-foreground">Categoria:</span>
                                <span>{selectedUser.storeCategory}</span>
                              </div>
                            )}
                            
                            {/* Add more store information here */}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <h4 className="font-medium mb-2">Administrador do Sistema</h4>
                        <p className="text-sm text-muted-foreground">
                          Este usuário possui permissões administrativas com acesso completo ao sistema.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-4 space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleEditUser(selectedUser)}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          handleOpenResetPasswordDialog(selectedUser);
                        }}
                      >
                        <RotateCw className="mr-2 h-4 w-4" /> Resetar Senha
                      </Button>
                      <Button 
                        variant={selectedUser.status === "blocked" ? "outline" : "destructive"}
                        onClick={() => {
                          setIsDialogOpen(false);
                          handleOpenBlockDialog(selectedUser);
                        }}
                      >
                        {selectedUser.status === "blocked" ? (
                          <>
                            <RotateCw className="mr-2 h-4 w-4" /> Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" /> Bloquear
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4">
                <h3 className="font-medium mb-4">Histórico de Login</h3>
                {selectedUser.loginHistory ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2">Data</th>
                        <th className="pb-2">Hora</th>
                        <th className="pb-2">IP</th>
                        <th className="pb-2">Dispositivo</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.loginHistory.map((login: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{login.date}</td>
                          <td className="py-2">{login.time}</td>
                          <td className="py-2">{login.ip}</td>
                          <td className="py-2">{login.device}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={login.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {login.status === "success" ? "Sucesso" : "Falha"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-muted-foreground border rounded-lg">
                    Não há histórico de login disponível.
                  </div>
                )}
                
                <h3 className="font-medium mt-6 mb-4">Informações da Sessão Atual</h3>
                <div className="p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">Endereço IP:</span>
                      <span>{selectedUser.ipAddress || "Não disponível"}</span>
                    </div>
                    
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">Dispositivo:</span>
                      <span>{selectedUser.device || "Não disponível"}</span>
                    </div>
                    
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">Última Atividade:</span>
                      <span>{selectedUser.lastActivity || "Não disponível"}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Alterar Status</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      O status atual do usuário é <strong>{getStatusLabel(selectedUser.status)}</strong>.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant={selectedUser.status === "active" ? "default" : "outline"}
                        onClick={() => console.log("Set status to active")}
                      >
                        Ativar
                      </Button>
                      <Button 
                        variant={selectedUser.status === "inactive" ? "default" : "outline"}
                        onClick={() => console.log("Set status to inactive")}
                      >
                        Inativar
                      </Button>
                      <Button 
                        variant={selectedUser.status === "blocked" ? "destructive" : "outline"}
                        onClick={() => handleOpenBlockDialog(selectedUser)}
                      >
                        {selectedUser.status === "blocked" ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Gerenciamento de Senha</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Você pode resetar a senha do usuário enviando um e-mail de recuperação.
                    </p>
                    <Button onClick={() => handleOpenResetPasswordDialog(selectedUser)}>
                      <RotateCw className="mr-2 h-4 w-4" /> Resetar Senha
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Verificação em Duas Etapas</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      A verificação em duas etapas não está configurada para este usuário.
                    </p>
                    <Button variant="outline">
                      Configurar 2FA
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Você está prestes a resetar a senha do usuário {selectedUser?.name}.
              Um e-mail será enviado com instruções para criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 my-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Atenção</h4>
                <p className="text-sm text-yellow-700">
                  Esta ação invalidará a senha atual do usuário.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetPasswordDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : "Confirmar Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.status === "blocked" ? "Desbloquear Usuário" : "Bloquear Usuário"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.status === "blocked" 
                ? `Você está prestes a desbloquear o usuário ${selectedUser?.name}. Isso permitirá que o usuário acesse o sistema novamente.`
                : `Você está prestes a bloquear o usuário ${selectedUser?.name}. Isso impedirá que o usuário acesse o sistema.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser?.status !== "blocked" && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 my-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Atenção</h4>
                  <p className="text-sm text-red-700">
                    Esta ação desconectará o usuário e impedirá futuros logins.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBlockDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant={selectedUser?.status === "blocked" ? "default" : "destructive"}
              onClick={handleBlockUser}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : selectedUser?.status === "blocked" ? "Confirmar Desbloqueio" : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
