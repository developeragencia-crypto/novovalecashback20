import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon,
  Search,
  Download,
  ChevronDown,
  FileText,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  CreditCard,
  QrCode,
  Wallet,
  Store,
  RefreshCw,
  Loader2,
  DollarSign,
  Percent
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Interface para transação
interface Transaction {
  id: number;
  customer_id?: number;
  customer_name?: string;
  merchant_id?: number;
  merchant_name?: string;
  total_amount?: number;
  cashback_amount?: number;
  payment_method?: string;
  item_count?: number;
  status?: string;
  created_at?: string;
}

// Interface para detalhes da transação
interface TransactionDetail {
  id: number;
  reference: string;
  merchant: {
    id: number;
    name: string;
    logo: string | null;
  };
  customer: {
    id: number;
    name: string;
    email: string;
  };
  amount: {
    total: number;
    subtotal: number;
    tax: number;
    discount: number;
    cashback: number;
  };
  fees: {
    platform: string;
    merchant: string;
    cashback: string;
    referral: string;
  };
  payment: {
    method: string;
    status: string;
  };
  items: {
    id: number;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  timestamps: {
    created: string;
    updated: string;
  };
}

export default function AdminTransactions() {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | null, to: Date | null}>({
    from: null,
    to: null,
  });
  const [status, setStatus] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  
  // Query para buscar as transações
  const { data, isLoading, error } = useQuery<any>({
    queryKey: [
      '/api/admin/transactions',
      activeTab,
      page,
      pageSize,
      searchTerm,
      dateRange,
      status,
      paymentMethod,
      merchantFilter
    ],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/transactions');
        if (!response.ok) {
          throw new Error('Falha ao buscar transações');
        }
        return await response.json();
      } catch (err) {
        console.error('Erro ao buscar transações:', err);
        throw err;
      }
    }
  });

  // Query para buscar detalhes de uma transação
  const { data: transactionDetail, isLoading: isLoadingDetail } = useQuery<TransactionDetail>({
    queryKey: ['/api/admin/transactions', selectedTransactionId, 'detail'],
    enabled: !!selectedTransactionId,
    placeholderData: selectedTransactionId ? {
      id: selectedTransactionId,
      reference: `TX-${selectedTransactionId}`,
      merchant: {
        id: 1,
        name: "Loja Exemplo",
        logo: null
      },
      customer: {
        id: 2,
        name: "Cliente Exemplo",
        email: "cliente@example.com"
      },
      amount: {
        total: 150.0,
        subtotal: 150.0,
        tax: 0,
        discount: 0,
        cashback: 3.0
      },
      fees: {
        platform: "5.0",
        merchant: "2.0",
        cashback: "2.0",
        referral: "1.0"
      },
      payment: {
        method: "credit_card",
        status: "completed"
      },
      items: [
        {
          id: 1,
          name: "Produto Exemplo",
          quantity: 1,
          price: 150.0,
          total: 150.0
        }
      ],
      timestamps: {
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    } : undefined
  });
  
  // Renderiza um estado de carregamento
  if (isLoading) {
    return (
      <DashboardLayout title="Histórico de Transações" type="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando transações...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Renderiza um estado de erro
  if (error) {
    return (
      <DashboardLayout title="Histórico de Transações" type="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-medium mb-1">Erro ao carregar transações</h2>
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar as transações. Por favor, tente novamente mais tarde.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Funções para ações
  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransactionId(transaction.id);
    setIsDialogOpen(true);
  };
  
  const handlePrintReceipt = (transaction: Transaction) => {
    toast({
      title: "Imprimindo Recibo",
      description: `Preparando para imprimir recibo da transação #${transaction.id}`,
    });
  };

  // Renderizar status da transação
  const renderStatus = (status: string) => {
    // Se o status for undefined ou null, tratamos como 'unknown'
    const statusValue = status || 'unknown';
    
    switch (statusValue) {
      case "completed":
        return (
          <div className="flex items-center">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-green-600 font-medium">Concluída</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-yellow-600 font-medium">Pendente</span>
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center">
            <XCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-600 font-medium">Cancelada</span>
          </div>
        );
      case "unknown":
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-gray-600 font-medium">Desconhecido</span>
          </div>
        );
      default:
        return <span>{statusValue}</span>;
    }
  };

  // Colunas para a tabela de transações
  const columns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Cliente",
      accessorKey: "customer_name",
      cell: ({ row }: any) => {
        const transaction = row.original;
        return (
          <div className="flex items-center">
            <User className="h-4 w-4 text-muted-foreground mr-2" />
            <span>{transaction.customer_name || 'Cliente'}</span>
          </div>
        );
      },
    },
    {
      header: "Loja",
      accessorKey: "merchant_name",
      cell: ({ row }: any) => {
        const transaction = row.original;
        return (
          <div className="flex items-center">
            <Store className="h-4 w-4 text-muted-foreground mr-2" />
            <span>{transaction.merchant_name || 'Loja'}</span>
          </div>
        );
      },
    },
    {
      header: "Data",
      accessorKey: "created_at",
      cell: ({ row }: any) => {
        const transaction = row.original;
        return (
          <span>
            {transaction.created_at 
              ? format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm")
              : ''}
          </span>
        );
      },
    },
    {
      header: "Valor",
      accessorKey: "totalAmount",
      cell: ({ row }: any) => {
        const transaction = row.original;
        // Usar a função formatCurrency para garantir exibição correta
        return (
          <span className="font-medium">
            {formatCurrency(transaction.totalAmount || transaction.total_amount)}
          </span>
        );
      },
    },
    {
      header: "Cashback",
      accessorKey: "cashbackAmount",
      cell: ({ row }: any) => {
        const transaction = row.original;
        // Usar a função formatCurrency para garantir exibição correta
        return (
          <span className="text-green-600 font-medium">
            {formatCurrency(transaction.cashbackAmount || transaction.cashback_amount)}
          </span>
        );
      },
    },
    {
      header: "Método",
      accessorKey: "paymentMethod",
      cell: ({ row }: any) => {
        const transaction = row.original;
        const paymentMethod = transaction.paymentMethod || '';
        
        return (
          <div className="flex items-center">
            {paymentMethod === "credit_card" ? (
              <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
            ) : paymentMethod === "debit_card" ? (
              <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
            ) : paymentMethod === "pix" ? (
              <QrCode className="h-4 w-4 text-muted-foreground mr-2" />
            ) : paymentMethod === "cash" ? (
              <Wallet className="h-4 w-4 text-muted-foreground mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
            )}
            <span>
              {paymentMethod === "credit_card" ? "Crédito" :
               paymentMethod === "debit_card" ? "Débito" :
               paymentMethod === "pix" ? "PIX" :
               paymentMethod === "cash" ? "Dinheiro" :
               paymentMethod}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: any) => {
        const transaction = row.original;
        return renderStatus(transaction.status || 'unknown');
      },
    },
    {
      header: "Ações",
      id: "actions",
      cell: ({ row }: any) => {
        const transaction = row.original as Transaction;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(transaction)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(transaction)}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Histórico de Transações" type="admin">
      {/* Modal de Detalhes da Transação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              ID da Transação: {transactionDetail?.id} | Ref: {transactionDetail?.reference}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetail ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactionDetail ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <Store className="h-5 w-5 mr-2 text-primary" />
                    Dados da Loja
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">ID:</div>
                    <div className="text-sm font-medium">{transactionDetail.merchant.id}</div>
                    <div className="text-sm text-muted-foreground">Nome:</div>
                    <div className="text-sm font-medium">{transactionDetail.merchant.name}</div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">ID:</div>
                    <div className="text-sm font-medium">{transactionDetail.customer.id}</div>
                    <div className="text-sm text-muted-foreground">Nome:</div>
                    <div className="text-sm font-medium">{transactionDetail.customer.name}</div>
                    <div className="text-sm text-muted-foreground">Email:</div>
                    <div className="text-sm font-medium">{transactionDetail.customer.email}</div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-primary" />
                    Pagamento
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Método:</div>
                    <div className="text-sm font-medium">
                      {transactionDetail.payment.method === "credit_card" ? "Cartão de Crédito" :
                       transactionDetail.payment.method === "debit_card" ? "Cartão de Débito" :
                       transactionDetail.payment.method === "pix" ? "PIX" :
                       transactionDetail.payment.method === "cash" ? "Dinheiro" :
                       transactionDetail.payment.method === "cashback" ? "Cashback" :
                       transactionDetail.payment.method}
                    </div>
                    <div className="text-sm text-muted-foreground">Status:</div>
                    <div className="text-sm font-medium">
                      {renderStatus(transactionDetail.payment.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">Data:</div>
                    <div className="text-sm font-medium">
                      {format(new Date(transactionDetail.timestamps.created), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-primary" />
                    Valores
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Subtotal:</div>
                    <div className="text-sm font-medium">{formatCurrency(transactionDetail.amount.subtotal)}</div>
                    
                    {transactionDetail.amount.discount > 0 && (
                      <>
                        <div className="text-sm text-muted-foreground">Desconto:</div>
                        <div className="text-sm font-medium text-red-600">-{formatCurrency(transactionDetail.amount.discount, false)} </div>
                      </>
                    )}
                    
                    {transactionDetail.amount.tax > 0 && (
                      <>
                        <div className="text-sm text-muted-foreground">Taxas:</div>
                        <div className="text-sm font-medium">{formatCurrency(transactionDetail.amount.tax)}</div>
                      </>
                    )}
                    
                    <div className="text-sm text-muted-foreground">Cashback:</div>
                    <div className="text-sm font-medium text-green-600">{formatCurrency(transactionDetail.amount.cashback)}</div>
                    
                    <div className="text-sm text-muted-foreground font-bold pt-2">Total:</div>
                    <div className="text-sm font-bold pt-2">{formatCurrency(transactionDetail.amount.total)}</div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <Percent className="h-5 w-5 mr-2 text-primary" />
                    Distribuição de Taxas
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Taxa da Plataforma:</div>
                    <div className="text-sm font-medium">{transactionDetail.fees.platform}%</div>
                    <div className="text-sm text-muted-foreground">Comissão do Lojista:</div>
                    <div className="text-sm font-medium text-green-600">{transactionDetail.fees.merchant}%</div>
                    <div className="text-sm text-muted-foreground">Cashback do Cliente:</div>
                    <div className="text-sm font-medium">{transactionDetail.fees.cashback}%</div>
                    <div className="text-sm text-muted-foreground">Bônus de Indicação:</div>
                    <div className="text-sm font-medium">{transactionDetail.fees.referral}%</div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2">Itens da Transação</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-sm">Item</th>
                        <th className="text-right py-2 font-medium text-sm">Qtd</th>
                        <th className="text-right py-2 font-medium text-sm">Preço</th>
                        <th className="text-right py-2 font-medium text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionDetail.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 text-sm">{item.name}</td>
                          <td className="py-2 text-sm text-right">{item.quantity}</td>
                          <td className="py-2 text-sm text-right">$ {item.price.toFixed(2)}</td>
                          <td className="py-2 text-sm text-right font-medium">$ {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right py-2 font-medium">Total:</td>
                        <td className="text-right py-2 font-bold">{formatCurrency(transactionDetail.amount.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6">
              <XCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-muted-foreground">Não foi possível carregar os detalhes da transação.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="px-2 flex gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Data</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={{ 
                    from: dateRange.from || undefined, 
                    to: dateRange.to || undefined
                  }}
                  onSelect={(range) => 
                    setDateRange({ 
                      from: range?.from || null, 
                      to: range?.to || null 
                    })
                  }
                />
              </PopoverContent>
            </Popover>
            
            <Select value={paymentMethod || "all"} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit_card">Crédito</SelectItem>
                <SelectItem value="debit_card">Débito</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Exportar</span>
            </Button>
          </div>
        </div>
        
        <div className="rounded-md border mb-4">
          <div className="px-4 py-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              className="border-0 p-0 shadow-none focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Todas as Transações</CardTitle>
              <CardDescription>
                Histórico de todas as transações realizadas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.transactions && data.transactions.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={data.transactions}
                  pagination={{
                    pageIndex: page - 1,
                    pageSize,
                    pageCount: Math.ceil((data.total || 0) / pageSize),
                    onPageChange: (newPageIndex) => setPage(newPageIndex + 1),
                    onPageSizeChange: setPageSize,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma transação encontrada</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Não encontramos transações que correspondam aos filtros aplicados. 
                    Tente ajustar seus critérios de busca.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Transações Concluídas</CardTitle>
              <CardDescription>
                Histórico de transações com pagamento confirmado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.transactions && data.transactions.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={data.transactions.filter(t => t.status === "completed")}
                  pagination={{
                    pageIndex: page - 1,
                    pageSize,
                    pageCount: Math.ceil((data.total || 0) / pageSize),
                    onPageChange: (newPageIndex) => setPage(newPageIndex + 1),
                    onPageSizeChange: setPageSize,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma transação concluída</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Não encontramos transações concluídas que correspondam aos filtros aplicados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Transações Pendentes</CardTitle>
              <CardDescription>
                Transações com pagamento em processamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.transactions && data.transactions.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={data.transactions.filter(t => t.status === "pending")}
                  pagination={{
                    pageIndex: page - 1,
                    pageSize,
                    pageCount: Math.ceil((data.total || 0) / pageSize),
                    onPageChange: (newPageIndex) => setPage(newPageIndex + 1),
                    onPageSizeChange: setPageSize,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma transação pendente</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Não encontramos transações pendentes que correspondam aos filtros aplicados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cancelled" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Transações Canceladas</CardTitle>
              <CardDescription>
                Histórico de transações canceladas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.transactions && data.transactions.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={data.transactions.filter(t => t.status === "cancelled")}
                  pagination={{
                    pageIndex: page - 1,
                    pageSize,
                    pageCount: Math.ceil((data.total || 0) / pageSize),
                    onPageChange: (newPageIndex) => setPage(newPageIndex + 1),
                    onPageSizeChange: setPageSize,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma transação cancelada</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Não encontramos transações canceladas que correspondam aos filtros aplicados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}