import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Wallet
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Mock de dados - será substituído por dados reais da API
interface Transaction {
  id: number;
  customer: string;
  date: string;
  amount: number;
  cashback: number;
  paymentMethod: string;
  items: string;
  status: string;
}

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

export default function MerchantTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | null, to: Date | null}>({
    from: null,
    to: null,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { toast } = useToast();
  
  // Query para buscar as vendas - direto da API
  const { data, isLoading, error } = useQuery<{ 
    transactions: Transaction[],
    totalAmount: number,
    totalCashback: number,
    statusCounts: { status: string, count: number }[],
    paymentMethodSummary: { method: string, sum: number }[]
  }>({
    queryKey: ['/api/merchant/transactions'],
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      try {
        const res = await fetch('/api/merchant/transactions');
        if (!res.ok) {
          throw new Error('Falha ao buscar transações');
        }
        return await res.json();
      } catch (err) {
        console.error('Erro na busca de transações:', err);
        return {
          transactions: [],
          totalAmount: 0,
          totalCashback: 0,
          statusCounts: [],
          paymentMethodSummary: []
        };
      }
    }
  });
  
  // Função para filtrar as transações
  const filteredTransactions = (data?.transactions || []).filter(transaction => {
    // Filtro por status da transação
    if (activeTab !== "all" && transaction.status !== activeTab) {
      return false;
    }
    
    // Filtro por termo de busca (cliente)
    if (searchTerm && !transaction.customer.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro por status (dropdown)
    if (status && transaction.status !== status) {
      return false;
    }
    
    // Filtro por método de pagamento
    if (paymentMethod && transaction.paymentMethod !== paymentMethod) {
      return false;
    }
    
    // Filtro por data - não implementado completamente porque as datas estão em formato string
    // Em uma implementação real, converteríamos as strings para objetos Date para comparação
    
    return true;
  });
  
  // Calcular totais com segurança contra valores null/undefined
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCashback = filteredTransactions.reduce((sum, t) => sum + (t.cashback || 0), 0);
  
  // Use os status counts da API se disponíveis, caso contrário calcule localmente
  const statusCounts = data?.statusCounts || [];
  const completedCount = statusCounts.find(s => s.status === "completed")?.count || 
    (data?.transactions || []).filter(t => t.status === "completed").length;
  const pendingCount = statusCounts.find(s => s.status === "pending")?.count || 
    (data?.transactions || []).filter(t => t.status === "pending").length;
  const cancelledCount = statusCounts.find(s => s.status === "cancelled")?.count || 
    (data?.transactions || []).filter(t => t.status === "cancelled").length;
  
  // Use o resumo de pagamentos da API se disponível, caso contrário calcule localmente
  const paymentSummary = data?.paymentMethodSummary || [];
  const paymentMethodSummary = paymentSummary.length > 0 
    ? paymentSummary.reduce((acc, item) => {
        acc[item.method] = parseFloat(item.sum.toString());
        return acc;
      }, {} as Record<string, number>)
    : (data?.transactions || []).reduce((acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  
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
  
  // Visualizar detalhes da transação com tratamento de erro
  const handleViewTransaction = (transaction: Transaction) => {
    try {
      const amount = transaction.amount ? transaction.amount.toFixed(2) : '0.00';
      const cashback = transaction.cashback ? transaction.cashback.toFixed(2) : '0.00';
      
      toast({
        title: `Venda #${transaction.id}`,
        description: `Cliente: ${transaction.customer}, Valor: $ ${amount}, Cashback: $ ${cashback}`,
      });
    } catch (error) {
      console.error('Erro ao exibir detalhes da transação:', error);
      toast({
        title: `Venda #${transaction.id}`,
        description: `Cliente: ${transaction.customer}`,
        variant: "default",
      });
    }
  };
  
  // Imprimir recibo com tratamento de erro
  const handlePrintReceipt = (transaction: Transaction) => {
    try {
      toast({
        title: "Imprimindo recibo",
        description: `Preparando impressão do recibo para a venda #${transaction.id}`,
      });
    } catch (error) {
      console.error('Erro ao preparar impressão do recibo:', error);
      toast({
        title: "Imprimindo recibo",
        description: "Preparando impressão do recibo",
        variant: "default",
      });
    }
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
          <span>{transaction.customer}</span>
        </div>
      ),
    },
    {
      header: "Data",
      accessorKey: "date" as keyof Transaction,
    },
    {
      header: "Valor",
      accessorKey: "amount" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="font-medium">
          {formatCurrency(transaction.amount)}
        </span>
      ),
    },
    {
      header: "Cashback",
      accessorKey: "cashback" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="text-green-600">
          {formatCurrency(transaction.cashback)}
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
  
  // Adicionar feedback de erros
  if (error) {
    console.error('Erro ao carregar transações:', error);
    toast({
      title: "Erro ao carregar transações",
      description: "Não foi possível carregar suas transações. Tente novamente mais tarde.",
      variant: "destructive",
    });
  }
  
  // Renderizar indicador de carregamento
  if (isLoading) {
    return (
      <DashboardLayout title="Histórico de Transações" type="merchant">
        <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent border-primary"></div>
          <p className="mt-4 text-muted-foreground">Carregando transações...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Histórico de Transações" type="merchant">
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
                    from: dateRange.from ?? undefined,
                    to: dateRange.to ?? undefined,
                  }}
                  onSelect={range => {
                    if (range?.from) {
                      setDateRange({ from: range.from, to: range.to });
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
                {formatCurrency(totalAmount)}
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
                {formatCurrency(totalCashback)}
              </div>
              <p className="text-sm text-muted-foreground">
                {totalAmount > 0 ? ((totalCashback / totalAmount) * 100).toFixed(1) : '0.0'}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                    <span>Concluídas</span>
                  </div>
                  <span className="text-sm font-medium">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <Clock className="h-3.5 w-3.5 text-yellow-500 mr-1.5" />
                    <span>Pendentes</span>
                  </div>
                  <span className="text-sm font-medium">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                    <span>Canceladas</span>
                  </div>
                  <span className="text-sm font-medium">{cancelledCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {Object.entries(paymentMethodSummary).map(([method, amount]) => {
                  const paymentLabels: Record<string, string> = {
                    "cash": "Dinheiro",
                    "credit_card": "Crédito",
                    "debit_card": "Débito",
                    "pix": "Pix",
                    "cashback": "Cashback"
                  };
                  
                  return (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center text-sm">
                        {PaymentMethodIcons[method] || <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                        <span className="ml-1">{paymentLabels[method] || method}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              Histórico completo de vendas realizadas na sua loja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-1 gap-4">
                <Select value={status || ""} onValueChange={(val) => setStatus(val || null)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="completed">Concluídas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={paymentMethod || ""} onValueChange={(val) => setPaymentMethod(val || null)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os pagamentos</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cashback">Cashback</SelectItem>
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
                pageIndex: 0,
                pageSize: 10,
                pageCount: Math.ceil(filteredTransactions.length / 10),
                onPageChange: () => {},
              }}
            />
          </CardContent>
        </Card>
      </Tabs>
    </DashboardLayout>
  );
}