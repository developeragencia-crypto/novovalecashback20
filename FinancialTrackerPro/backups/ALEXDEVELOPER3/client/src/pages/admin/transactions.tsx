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
  Loader2
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Componentes e tipos
const PaymentMethodIcons: Record<string, React.ReactNode> = {
  "cash": <Wallet className="h-4 w-4" />,
  "credit_card": <CreditCard className="h-4 w-4" />,
  "debit_card": <CreditCard className="h-4 w-4" />,
  "pix": <QrCode className="h-4 w-4" />,
  "cashback": <Wallet className="h-4 w-4" />,
};

const TransactionStatusIcons: Record<string, React.ReactNode> = {
  "completed": <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "pending": <Clock className="h-4 w-4 text-yellow-500" />,
  "cancelled": <XCircle className="h-4 w-4 text-red-500" />,
};

interface Transaction {
  id: number;
  customer: {
    id: number;
    name: string;
  };
  merchant: {
    id: number;
    name: string;
    logo: string;
  };
  totalAmount: number;
  cashbackAmount: number;
  paymentMethod: string;
  items: number;
  status: string;
  createdAt: string;
}

export default function AdminTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | null, to: Date | null}>({
    from: null,
    to: null,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [merchantFilter, setMerchantFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { toast } = useToast();
  
  // Query para buscar as transações
  const { data, isLoading, error } = useQuery<{ 
    transactions: Transaction[], 
    totalAmount: number,
    totalCashback: number,
    statusCounts: { status: string, count: number }[],
    paymentMethodSummary: { method: string, sum: number }[],
    pageCount: number
  }>({
    queryKey: ['/api/admin/transactions', {
      page,
      pageSize,
      status,
      paymentMethod,
      merchantFilter,
      dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      search: searchTerm
    }],
    placeholderData: {
      transactions: [],
      totalAmount: 0,
      totalCashback: 0,
      statusCounts: [],
      paymentMethodSummary: [],
      pageCount: 1
    }
  });
  
  // Filtrar transações
  const filteredTransactions = data?.transactions || [];
  
  // Exportar dados
  const handleExport = () => {
    toast({
      title: "Exportação iniciada",
      description: "Seus dados estão sendo exportados para CSV.",
    });
    
    // Em uma implementação real, aqui iríamos gerar um arquivo CSV e fazer o download
    setTimeout(() => {
      toast({
        title: "Exportação concluída",
        description: "Arquivo CSV exportado com sucesso.",
      });
    }, 1500);
  };
  
  // Visualizar detalhes da transação
  const handleViewTransaction = (transaction: Transaction) => {
    const amount = typeof transaction.totalAmount === 'number' 
      ? transaction.totalAmount.toFixed(2) 
      : typeof transaction.totalAmount === 'string'
        ? parseFloat(transaction.totalAmount).toFixed(2)
        : "0.00";
    
    toast({
      title: `Transação #${transaction.id}`,
      description: `Cliente: ${transaction.customer.name}, Loja: ${transaction.merchant.name}, Valor: $ ${amount}`,
    });
  };
  
  // Imprimir recibo
  const handlePrintReceipt = (transaction: Transaction) => {
    toast({
      title: "Imprimindo recibo",
      description: `Preparando impressão do recibo para a transação #${transaction.id}`,
    });
  };
  
  // Definição das colunas da tabela
  const columns = [
    {
      header: "ID",
      accessorKey: "id" as keyof Transaction,
    },
    {
      header: "Cliente",
      accessorKey: "customer" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          <User className="h-4 w-4 text-muted-foreground mr-2" />
          <span>{transaction.customer.name}</span>
        </div>
      ),
    },
    {
      header: "Loja",
      accessorKey: "merchant" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          <Store className="h-4 w-4 text-muted-foreground mr-2" />
          <span>{transaction.merchant.name}</span>
        </div>
      ),
    },
    {
      header: "Data",
      accessorKey: "createdAt" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span>{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}</span>
      ),
    },
    {
      header: "Valor",
      accessorKey: "totalAmount" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="font-medium">
          $ {typeof transaction.totalAmount === 'number' 
              ? transaction.totalAmount.toFixed(2) 
              : typeof transaction.totalAmount === 'string'
                ? parseFloat(transaction.totalAmount).toFixed(2)
                : "0.00"}
        </span>
      ),
    },
    {
      header: "Cashback",
      accessorKey: "cashbackAmount" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="text-green-600">
          $ {typeof transaction.cashbackAmount === 'number' 
              ? transaction.cashbackAmount.toFixed(2) 
              : typeof transaction.cashbackAmount === 'string'
                ? parseFloat(transaction.cashbackAmount).toFixed(2)
                : "0.00"}
        </span>
      ),
    },
    {
      header: "Pagamento",
      accessorKey: "paymentMethod" as keyof Transaction,
      cell: (transaction: Transaction) => {
        const paymentLabels: Record<string, string> = {
          "cash": "Dinheiro",
          "credit_card": "Crédito",
          "debit_card": "Débito",
          "pix": "Pix",
          "cashback": "Cashback"
        };
        
        return (
          <div className="flex items-center">
            {PaymentMethodIcons[transaction.paymentMethod] || <CreditCard className="h-4 w-4 mr-2" />}
            <span className="ml-1">{paymentLabels[transaction.paymentMethod] || transaction.paymentMethod}</span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status" as keyof Transaction,
      cell: (transaction: Transaction) => {
        const statusLabels: Record<string, string> = {
          "completed": "Concluída",
          "pending": "Pendente",
          "cancelled": "Cancelada"
        };
        
        const statusColors: Record<string, string> = {
          "completed": "bg-green-100 text-green-800",
          "pending": "bg-yellow-100 text-yellow-800",
          "cancelled": "bg-red-100 text-red-800"
        };
        
        return (
          <div className={`rounded-full px-2 py-1 text-xs font-medium inline-flex items-center ${statusColors[transaction.status]}`}>
            {TransactionStatusIcons[transaction.status]}
            <span className="ml-1">{statusLabels[transaction.status]}</span>
          </div>
        );
      },
    },
  ];
  
  // Ações para a tabela
  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (transaction: Transaction) => handleViewTransaction(transaction),
    },
    {
      label: "Imprimir recibo",
      icon: <Printer className="h-4 w-4" />,
      onClick: (transaction: Transaction) => handlePrintReceipt(transaction),
    },
  ];
  
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
            <h2 className="text-xl font-semibold">Erro ao carregar transações</h2>
            <p className="text-muted-foreground">
              Ocorreu um erro ao carregar os dados das transações. Por favor, tente novamente mais tarde.
            </p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Histórico de Transações" type="admin">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione um período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={new Date()}
                  selected={{
                    from: dateRange.from || undefined,
                    to: dateRange.to || undefined,
                  }}
                  onSelect={range => {
                    if (range?.from) {
                      setDateRange({ 
                        from: range.from, 
                        to: range.to || null 
                      });
                    } else {
                      setDateRange({ from: null, to: null });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $ {data?.totalAmount ? (typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount).toFixed(2) : data.totalAmount.toFixed(2)) : "0.00"}
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length} transações
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Cashback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                $ {data?.totalCashback ? (typeof data.totalCashback === 'string' ? parseFloat(data.totalCashback).toFixed(2) : data.totalCashback.toFixed(2)) : "0.00"}
              </div>
              <p className="text-sm text-muted-foreground">
                {data?.totalAmount && data?.totalCashback ? 
                  (((typeof data.totalCashback === 'string' ? parseFloat(data.totalCashback) : data.totalCashback) / 
                    (typeof data.totalAmount === 'string' ? parseFloat(data.totalAmount) : data.totalAmount)) * 100).toFixed(1) 
                  : "0"}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {data?.statusCounts && data.statusCounts.length > 0 ? (
                  data.statusCounts.map((statusCount) => {
                    const statusIcons: Record<string, JSX.Element> = {
                      "completed": <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" />,
                      "pending": <Clock className="h-3.5 w-3.5 text-yellow-500 mr-1.5" />,
                      "cancelled": <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                    };
                    
                    const statusLabels: Record<string, string> = {
                      "completed": "Concluídas",
                      "pending": "Pendentes",
                      "cancelled": "Canceladas"
                    };
                    
                    return (
                      <div key={statusCount.status} className="flex items-center justify-between">
                        <div className="flex items-center text-sm">
                          {statusIcons[statusCount.status] || <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                          <span>{statusLabels[statusCount.status] || statusCount.status}</span>
                        </div>
                        <span className="text-sm font-medium">{statusCount.count || 0}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-center text-muted-foreground py-2">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {data?.paymentMethodSummary && data.paymentMethodSummary.length > 0 ? (
                  data.paymentMethodSummary.map((methodSummary) => {
                    const paymentLabels: Record<string, string> = {
                      "cash": "Dinheiro",
                      "credit_card": "Crédito",
                      "debit_card": "Débito",
                      "pix": "Pix",
                      "cashback": "Cashback"
                    };
                    
                    const sum = typeof methodSummary.sum === 'string' ? 
                      parseFloat(methodSummary.sum) : 
                      methodSummary.sum || 0;
                    
                    return (
                      <div key={methodSummary.method} className="flex items-center justify-between">
                        <div className="flex items-center text-sm">
                          {PaymentMethodIcons[methodSummary.method] || <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                          <span className="ml-1">{paymentLabels[methodSummary.method] || methodSummary.method}</span>
                        </div>
                        <span className="text-sm font-medium">$ {sum.toFixed(2)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-center text-muted-foreground py-2">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              Histórico completo de transações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou loja..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-1 gap-4">
                <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? null : val)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="completed">Concluídas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={paymentMethod || "all"} onValueChange={(val) => setPaymentMethod(val === "all" ? null : val)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pagamentos</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cashback">Cashback</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={merchantFilter || "all"} onValueChange={(val) => setMerchantFilter(val === "all" ? null : val)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    <SelectItem value="1">Supermercado ABC</SelectItem>
                    <SelectItem value="2">Farmácia XYZ</SelectItem>
                    <SelectItem value="3">Loja de Roupas 123</SelectItem>
                    <SelectItem value="4">Restaurante Bom Sabor</SelectItem>
                    <SelectItem value="5">Loja de Eletrônicos Top</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DataTable
              data={filteredTransactions}
              columns={columns}
              actions={actions}
              searchable={false}
              pagination={{
                pageIndex: page - 1,
                pageSize: pageSize,
                pageCount: data?.pageCount || 1,
                onPageChange: (newPage) => setPage(newPage + 1),
              }}
            />
          </CardContent>
        </Card>
      </Tabs>
    </DashboardLayout>
  );
}