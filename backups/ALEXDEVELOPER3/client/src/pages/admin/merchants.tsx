import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, BarChart2, Calendar, CheckCircle, Edit, Eye, Landmark, Mail, MapPin, Phone, Store, User, UserCheck, UserPlus, UserX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function AdminMerchants() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);

  // Query para buscar todos os lojistas
  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/admin/users', 'merchant'],
    retry: 1,
  });

  // Função para formatar dados para a tabela
  const formatTableData = (users: any[]) => {
    if (!users || !Array.isArray(users)) return [];

    return users
      .filter(user => user.type === 'merchant')
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
        store_name: user.store_name || "Sem loja configurada",
        // Adicionar campos calculados para a visualização
        sales_count: 0, // Temporariamente definido como 0
        total_sales: 0, // Temporariamente definido como 0
        ...user // preserve all other fields
      }));
  };

  const handleViewMerchant = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsDialogOpen(true);
  };

  const handleBlockMerchant = (merchant: any) => {
    // Lógica para bloquear lojista
    console.log("Bloquear lojista:", merchant.id);
  };

  // Lista de lojistas formatada para a tabela
  const merchantsData = formatTableData(data);

  // Definição das colunas da tabela
  const columns = [
    {
      header: "Lojista",
      accessorKey: "name",
      cell: ({ row }: any) => {
        const merchant = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={merchant.photo} alt={merchant.name} />
              <AvatarFallback className="bg-accent text-white">
                {merchant.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{merchant.name}</div>
              <div className="text-sm text-muted-foreground">{merchant.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Loja",
      accessorKey: "store_name",
      cell: ({ row }: any) => {
        const store_name = row.original.store_name;
        return (
          <div className="flex items-center">
            <Store className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{store_name || "Não configurada"}</span>
          </div>
        );
      }
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
      onClick: handleViewMerchant,
    },
    {
      label: "Bloquear/Desbloquear",
      icon: <UserX className="h-4 w-4" />,
      onClick: handleBlockMerchant,
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
    <DashboardLayout title="Gerenciamento de Lojistas" type="admin">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lojistas Cadastrados</CardTitle>
            <CardDescription>
              Gerencie todos os lojistas da plataforma
            </CardDescription>
          </div>
          <Button onClick={() => console.log("Adicionar Lojista")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Lojista
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={merchantsData}
            columns={columns}
            actions={actions}
            filters={filters}
            searchable={true}
            onSearch={(value) => setSearchTerm(value)}
            pagination={{
              pageIndex: 0,
              pageSize: 10,
              pageCount: Math.ceil(merchantsData.length / 10),
              onPageChange: (page) => console.log("Page:", page),
            }}
            exportable={true}
            onExport={() => console.log("Exporting merchants")}
          />
        </CardContent>
      </Card>

      {/* Merchant Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lojista</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o lojista e sua loja
            </DialogDescription>
          </DialogHeader>
          
          {selectedMerchant && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">
                  <User className="mr-2 h-4 w-4" />
                  <span>Informações</span>
                </TabsTrigger>
                <TabsTrigger value="store">
                  <Store className="mr-2 h-4 w-4" />
                  <span>Loja</span>
                </TabsTrigger>
                <TabsTrigger value="sales">
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Vendas</span>
                </TabsTrigger>
                <TabsTrigger value="withdrawals">
                  <Landmark className="mr-2 h-4 w-4" />
                  <span>Saques</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage 
                        src={selectedMerchant.photo} 
                        alt={selectedMerchant.name} 
                      />
                      <AvatarFallback className="text-lg bg-accent text-white">
                        {getInitials(selectedMerchant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold">{selectedMerchant.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedMerchant.email}</p>
                      
                      <Badge 
                        variant="outline"
                        className={
                          selectedMerchant.status === "active" 
                            ? "bg-green-100 text-green-800 border-green-200 mt-2" 
                            : selectedMerchant.status === "inactive"
                            ? "bg-gray-100 text-gray-800 border-gray-200 mt-2"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200 mt-2"
                        }
                      >
                        {selectedMerchant.status === "active"
                          ? "Ativo"
                          : selectedMerchant.status === "inactive"
                          ? "Inativo"
                          : "Pendente"}
                      </Badge>
                    </div>
                    
                    <div className="w-full space-y-2">
                      {selectedMerchant.country && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedMerchant.country}</span>
                        </div>
                      )}
                      
                      {selectedMerchant.phone && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedMerchant.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center p-2 bg-muted rounded">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{selectedMerchant.email}</span>
                      </div>
                      
                      {selectedMerchant.created_at && (
                        <div className="flex items-center p-2 bg-muted rounded">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            Membro desde: {format(new Date(selectedMerchant.created_at), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/20 rounded-lg">
                          <h4 className="text-sm text-muted-foreground mb-1">Total de Vendas</h4>
                          <div className="text-2xl font-bold text-accent">
                            {selectedMerchant.sales_count || 0}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-muted/20 rounded-lg">
                          <h4 className="text-sm text-muted-foreground mb-1">Valor Total de Vendas</h4>
                          <div className="text-2xl font-bold text-accent">
                            ${selectedMerchant.total_sales?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Detalhes da Conta</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">ID de Usuário:</span>
                            <span>{selectedMerchant.id}</span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Status:</span>
                            <span>
                              {selectedMerchant.status === "active"
                                ? "Ativo"
                                : selectedMerchant.status === "inactive"
                                ? "Inativo"
                                : "Pendente"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Nome da Loja:</span>
                            <span>{selectedMerchant.store_name || "Não configurado"}</span>
                          </div>
                          
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Último Acesso:</span>
                            <span>
                              {selectedMerchant.last_login 
                                ? format(new Date(selectedMerchant.last_login), 'dd/MM/yyyy HH:mm') 
                                : "Nunca"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-end mt-4 gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          console.log("Editar lojista:", selectedMerchant.id);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </Button>
                      
                      <Button 
                        variant={selectedMerchant.status === "active" ? "destructive" : "default"}
                        onClick={() => {
                          console.log("Toggle user status:", selectedMerchant.id);
                          setIsDialogOpen(false);
                        }}
                      >
                        {selectedMerchant.status === "active" ? (
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
              
              <TabsContent value="store" className="mt-4">
                <div className="rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Informações da Loja</h3>
                    <Badge 
                      className={selectedMerchant.store_status === "active" 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : ""}
                    >
                      {selectedMerchant.store_status === "active" ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ativa
                        </>
                      ) : (
                        "Inativa"
                      )}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3 flex justify-center">
                        <div className="w-40 h-40 rounded-lg bg-muted flex items-center justify-center">
                          {selectedMerchant.store_logo ? (
                            <img 
                              src={selectedMerchant.store_logo} 
                              alt="Logo da loja" 
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Store className="h-16 w-16 text-muted-foreground/50" />
                          )}
                        </div>
                      </div>
                      
                      <div className="md:w-2/3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Nome da Loja</h4>
                            <p className="text-base">{selectedMerchant.store_name || "Não configurado"}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Categoria</h4>
                            <p className="text-base">{selectedMerchant.store_category || "Não configurado"}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Telefone</h4>
                            <p className="text-base">{selectedMerchant.store_phone || "Não configurado"}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                            <p className="text-base">{selectedMerchant.store_email || selectedMerchant.email}</p>
                          </div>
                          
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
                            <p className="text-base">{selectedMerchant.store_address || "Não configurado"}</p>
                          </div>
                          
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Descrição</h4>
                            <p className="text-base">{selectedMerchant.store_description || "Sem descrição"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Taxas e Comissões</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-sm text-muted-foreground">Taxa de Plataforma</div>
                          <div className="text-xl font-semibold text-accent">2%</div>
                        </div>
                        
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-sm text-muted-foreground">Comissão de Lojista</div>
                          <div className="text-xl font-semibold text-accent">1%</div>
                        </div>
                        
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <div className="text-sm text-muted-foreground">Cashback para Clientes</div>
                          <div className="text-xl font-semibold text-accent">2%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      variant="outline" 
                      className="mr-2"
                      onClick={() => console.log("Ver produtos:", selectedMerchant.id)}
                    >
                      Ver Produtos
                    </Button>
                    <Button onClick={() => console.log("Editar loja:", selectedMerchant.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Informações
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sales" className="mt-4">
                <div className="p-4 text-center text-muted-foreground">
                  Histórico de vendas do lojista será exibido aqui.
                </div>
              </TabsContent>
              
              <TabsContent value="withdrawals" className="mt-4">
                <div className="p-4 text-center text-muted-foreground">
                  Histórico de saques do lojista será exibido aqui.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}