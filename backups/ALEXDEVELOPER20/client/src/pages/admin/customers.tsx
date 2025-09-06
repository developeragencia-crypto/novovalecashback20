import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, BarChart2, Calendar, Edit, Eye, Mail, MapPin, Phone, User, UserCheck, UserX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminCustomers() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Query para buscar todos os clientes
  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/admin/users', 'client'],
    retry: 1,
  });

  // Função para formatar dados para a tabela
  const formatTableData = (users: any[]) => {
    if (!users || !Array.isArray(users)) return [];

    return users
      .filter(user => user.type === 'client')
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        lastLogin: user.last_login ? format(new Date(user.last_login), 'dd/MM/yyyy HH:mm') : 'Nunca',
        created: user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : '-',
        photo: user.photo,
        phone: user.phone,
        country: user.country,
        referralCode: user.invitation_code,
        // Adicionar campos calculados para a visualização
        transaction_count: 0, // Temporariamente definido como 0
        total_cashback: 0, // Temporariamente definido como 0
        ...user // preserve all other fields
      }));
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleBlockUser = (user: any) => {
    // Lógica para bloquear usuário
    console.log("Bloquear usuário:", user.id);
  };

  // Lista de clientes formatada para a tabela
  const customersData = formatTableData(data);

  // Definição das colunas da tabela
  const columns = [
    {
      header: "Cliente",
      accessorKey: "name",
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.photo} alt={user.name} />
              <AvatarFallback className="bg-primary text-white">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <Badge
            variant="outline"
            className={
              status === "active"
                ? "bg-green-100 text-green-800 border-green-200"
                : status === "inactive"
                ? "bg-gray-100 text-gray-800 border-gray-200"
                : "bg-yellow-100 text-yellow-800 border-yellow-200"
            }
          >
            {status === "active"
              ? "Ativo"
              : status === "inactive"
              ? "Inativo"
              : "Pendente"}
          </Badge>
        );
      },
    },
    {
      header: "Cadastro",
      accessorKey: "created",
    },
    {
      header: "Último Login",
      accessorKey: "lastLogin",
    },
    {
      header: "Código de Indicação",
      accessorKey: "referralCode",
    }
  ];

  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Actions configuration
  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: handleViewUser,
    },
    {
      label: "Bloquear/Desbloquear",
      icon: <UserX className="h-4 w-4" />,
      onClick: handleBlockUser,
    }
  ];

  // Filter options
  const statusOptions = [
    { label: "Todos", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Inativos", value: "inactive" },
    { label: "Pendentes", value: "pending" },
  ];

  const filters = [
    {
      name: "Status",
      options: statusOptions,
      onChange: (value: string) => console.log("Status filter:", value),
    },
  ];

  return (
    <DashboardLayout title="Gerenciamento de Clientes" type="admin">
      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
          <CardDescription>
            Gerencie todos os clientes da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={customersData}
            columns={columns}
            actions={actions}
            filters={filters}
            searchable={true}
            onSearch={(value) => setSearchTerm(value)}
            pagination={{
              pageIndex: 0,
              pageSize: 10,
              pageCount: Math.ceil(customersData.length / 10),
              onPageChange: (page) => console.log("Page:", page),
            }}
            exportable={true}
            onExport={() => console.log("Exporting customers")}
          />
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <User className="mr-2 h-4 w-4" />
                  <span>Informações</span>
                </TabsTrigger>
                <TabsTrigger value="transactions">
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Transações</span>
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  <span>Análise</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage 
                        src={selectedUser.photo} 
                        alt={selectedUser.name} 
                      />
                      <AvatarFallback className="text-lg bg-primary text-white">
                        {getInitials(selectedUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                      
                      <Badge 
                        variant="outline"
                        className={
                          selectedUser.status === "active" 
                            ? "bg-green-100 text-green-800 border-green-200 mt-2" 
                            : selectedUser.status === "inactive"
                            ? "bg-gray-100 text-gray-800 border-gray-200 mt-2"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200 mt-2"
                        }
                      >
                        {selectedUser.status === "active"
                          ? "Ativo"
                          : selectedUser.status === "inactive"
                          ? "Inativo"
                          : "Pendente"}
                      </Badge>
                    </div>
                    
                    <div className="w-full space-y-2">
                      {selectedUser.country && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedUser.country}</span>
                        </div>
                      )}
                      
                      {selectedUser.phone && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedUser.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center p-2 bg-muted rounded">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      
                      {selectedUser.created_at && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            Membro desde: {format(new Date(selectedUser.created_at), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/20 rounded-lg">
                          <h4 className="text-sm text-muted-foreground mb-1">Total de Transações</h4>
                          <div className="text-2xl font-bold text-primary">
                            {selectedUser.transaction_count || 0}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-muted/20 rounded-lg">
                          <h4 className="text-sm text-muted-foreground mb-1">Cashback Acumulado</h4>
                          <div className="text-2xl font-bold text-primary">
                            ${selectedUser.total_cashback?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Detalhes da Conta</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">ID de Usuário:</span>
                            <span>{selectedUser.id}</span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Status:</span>
                            <span>
                              {selectedUser.status === "active"
                                ? "Ativo"
                                : selectedUser.status === "inactive"
                                ? "Inativo"
                                : "Pendente"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Código de Indicação:</span>
                            <span>{selectedUser.invitation_code || "Não definido"}</span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Último Acesso:</span>
                            <span>
                              {selectedUser.last_login 
                                ? format(new Date(selectedUser.last_login), 'dd/MM/yyyy HH:mm') 
                                : "Nunca"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-end mt-4 gap-2">
                      <Button 
                        variant={selectedUser.status === "active" ? "destructive" : "default"}
                        onClick={() => {
                          console.log("Toggle user status:", selectedUser.id);
                          setIsDialogOpen(false);
                        }}
                      >
                        {selectedUser.status === "active" ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" /> Desativar Conta
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" /> Ativar Conta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="transactions" className="mt-4">
                <div className="p-4 text-center text-muted-foreground">
                  Histórico de transações do cliente será exibido aqui.
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-4">
                <div className="p-4 text-center text-muted-foreground">
                  Análise e estatísticas de uso do cliente serão exibidas aqui.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}