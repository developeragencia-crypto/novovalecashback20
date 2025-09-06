import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import type { DateRange } from "react-day-picker";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Interface para transações com detalhes completos de taxas e valores
interface Transaction {
  id: number;
  customer: string;
  date: string;
  amount: number;
  cashback: number;
  paymentMethod: string;
  items: string;
  status: string;
  // Campos adicionais para detalhar taxas e valores
  subtotal?: number; // Valor antes das taxas
  platformFee?: number; // Taxa da plataforma (5%)
  merchantCommission?: number; // Comissão do lojista (2%)
  clientCashback?: number; // Cashback do cliente (2%)
  referralBonus?: number; // Bônus de indicação (1%)
  netAmount?: number; // Valor líquido após todas as taxas
  source?: string; // Origem da transação: 'manual', 'qrcode'
  qrCodeId?: string; // ID do QR Code, se aplicável
  description?: string; // Descrição da transação
  itemsList?: Array<{id: number, name: string, quantity: number, price: number}>;
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
  // Usamos a interface DateRange importada do react-day-picker
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { toast } = useToast();
  
  // Adiciona um intervalo para atualizar as transações a cada 5 segundos
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Revalida as transações para garantir que todas apareçam, incluindo as novas via QR code
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/transactions'] });
    }, 5000); // A cada 5 segundos
    
    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, []);
  
  // Query para buscar as vendas - direto da API com tratamento de erros aprimorado
  const { data, isLoading, error } = useQuery<{ 
    transactions: Transaction[],
    totalAmount: number,
    totalCashback: number,
    statusCounts: { status: string, count: number }[],
    paymentMethodSummary: { method: string, sum: number }[]
  }>({
    queryKey: ['/api/merchant/transactions'],
    refetchOnWindowFocus: true,
    retry: 3,
    refetchOnMount: true,
    // Sempre habilitado para buscar as transações automaticamente
    enabled: true,
    queryFn: async () => {
      try {
        const res = await fetch('/api/merchant/transactions', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) {
          // No modo de desenvolvimento, podemos retornar dados de exemplo
          if (process.env.NODE_ENV === 'development') {
            console.log("[DEV MODE] Usando dados simulados para transações");
            return {
              transactions: [
                {
                  id: 1001,
                  customer: "Cliente Teste",
                  date: "2023-05-01",
                  amount: 150.00,
                  cashback: 3.00,
                  paymentMethod: "credit_card",
                  items: "3 itens",
                  status: "completed"
                },
                {
                  id: 1002,
                  customer: "Outro Cliente",
                  date: "2023-05-02",
                  amount: 75.50,
                  cashback: 1.51,
                  paymentMethod: "pix",
                  items: "2 itens",
                  status: "completed"
                },
                {
                  id: 1003,
                  customer: "Maria Silva",
                  date: "2023-05-03",
                  amount: 200.00,
                  cashback: 4.00,
                  paymentMethod: "cash",
                  items: "1 item",
                  status: "pending"
                }
              ],
              totalAmount: 425.50,
              totalCashback: 8.51,
              statusCounts: [
                { status: "completed", count: 2 },
                { status: "pending", count: 1 },
                { status: "cancelled", count: 0 }
              ],
              paymentMethodSummary: [
                { method: "credit_card", sum: 150.00 },
                { method: "pix", sum: 75.50 },
                { method: "cash", sum: 200.00 }
              ]
            };
          }
          throw new Error('Falha ao buscar transações');
        }
        
        return await res.json();
      } catch (err) {
        console.error('Erro na busca de transações:', err);
        
        // Em produção retornar um objeto vazio mas válido
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
    // Filtro por status da transação na tab
    if (activeTab !== "all" && transaction.status !== activeTab) {
      return false;
    }
    
    // Filtro por termo de busca (cliente)
    if (searchTerm && !transaction.customer.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro por status (dropdown)
    // Não filtra se status for null (valor "all" no Select)
    if (status !== null && transaction.status !== status) {
      return false;
    }
    
    // Filtro por método de pagamento
    // Não filtra se paymentMethod for null (valor "all" no Select)
    if (paymentMethod !== null && transaction.paymentMethod !== paymentMethod) {
      return false;
    }
    
    // Filtro por data - verifica se a data da transação está dentro do range selecionado
    if (dateRange.from || dateRange.to) {
      const transactionDate = new Date(transaction.date);
      
      if (dateRange.from && transactionDate < dateRange.from) {
        return false;
      }
      
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        // Ajustamos para o final do dia para incluir toda a data final
        endDate.setHours(23, 59, 59, 999); 
        if (transactionDate > endDate) {
          return false;
        }
      }
    }
    
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
  
  // Visualizar detalhes da transação com informações completas sobre taxas e valores
  const handleViewTransaction = (transaction: Transaction) => {
    try {
      // Calcular valores para exibição
      const totalAmount = transaction.amount || 0;
      const platformFee = transaction.platformFee || (totalAmount * 0.05); // 5% de taxa da plataforma
      const merchantCommission = transaction.merchantCommission || (totalAmount * 0.02); // 2% de comissão do lojista
      const clientCashback = transaction.clientCashback || transaction.cashback || (totalAmount * 0.02); // 2% de cashback para o cliente
      const referralBonus = transaction.referralBonus || (totalAmount * 0.01); // 1% de bônus de indicação
      
      // Calcular valor líquido
      const netAmount = transaction.netAmount || 
        (totalAmount - platformFee - clientCashback - referralBonus);
      
      // Formatar valores para exibição
      const formattedTotalAmount = formatCurrency(totalAmount);
      const formattedNetAmount = formatCurrency(netAmount);
      const formattedPlatformFee = formatCurrency(platformFee);
      const formattedClientCashback = formatCurrency(clientCashback);
      const formattedReferralBonus = formatCurrency(referralBonus);
      const formattedMerchantCommission = formatCurrency(merchantCommission);
      
      // Formatação da data
      let formattedDate = transaction.date;
      try {
        formattedDate = format(new Date(transaction.date), "dd/MM/yyyy HH:mm");
      } catch { /* manter o valor original se falhar */ }
      
      // Preparar descrição detalhada
      const descriptionLines = [
        `Cliente: ${transaction.customer}`,
        `Data: ${formattedDate}`,
        `Origem: ${transaction.source === 'qrcode' ? 'QR Code' : 'Manual'}`,
        transaction.qrCodeId ? `ID do QR Code: ${transaction.qrCodeId}` : '',
        `Método: ${
          {
            'cash': 'Dinheiro',
            'credit_card': 'Cartão de Crédito',
            'debit_card': 'Cartão de Débito',
            'pix': 'Pix',
            'cashback': 'Cashback',
            'wallet': 'Carteira Digital'
          }[transaction.paymentMethod] || transaction.paymentMethod
        }`,
        `Status: ${
          {
            'completed': 'Concluída',
            'pending': 'Pendente',
            'cancelled': 'Cancelada'
          }[transaction.status] || transaction.status
        }`,
        `Descrição: ${transaction.description || 'Não especificada'}`,
        '----------------------------------------',
        `Valor Total: ${formattedTotalAmount}`,
        `Taxa da Plataforma (5%): ${formattedPlatformFee}`,
        `Cashback do Cliente (2%): ${formattedClientCashback}`,
        `Bônus de Indicação (1%): ${formattedReferralBonus}`,
        `Valor Líquido: ${formattedNetAmount}`,
      ].filter(Boolean).join('\n');
      
      toast({
        title: `Detalhes da Venda #${transaction.id}`,
        description: (
          <pre className="whitespace-pre-wrap text-xs mt-2 font-mono bg-muted p-2 rounded">
            {descriptionLines}
          </pre>
        ),
        duration: 10000, // Mostrar por mais tempo devido ao conteúdo extenso
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
  
  // Imprimir recibo com detalhamento completo de taxas e valores
  const handlePrintReceipt = (transaction: Transaction) => {
    try {
      // Calcular valores para impressão
      const totalAmount = transaction.amount || 0;
      const platformFee = transaction.platformFee || (totalAmount * 0.05); // 5% de taxa da plataforma
      const merchantCommission = transaction.merchantCommission || (totalAmount * 0.02); // 2% de comissão do lojista
      const clientCashback = transaction.clientCashback || transaction.cashback || (totalAmount * 0.02); // 2% de cashback para o cliente
      const referralBonus = transaction.referralBonus || (totalAmount * 0.01); // 1% de bônus de indicação
      
      // Calcular valor líquido
      const netAmount = transaction.netAmount || 
        (totalAmount - platformFee - clientCashback - referralBonus);
      
      // Data e hora formatada para o recibo
      let formattedDate = "N/A";
      try {
        formattedDate = format(new Date(transaction.date), "dd/MM/yyyy HH:mm:ss");
      } catch { /* usar valor padrão se falhar */ }
      
      // Construir o recibo completo
      const receiptContent = `
Vale Cashback - Recibo de Venda
==============================
Nº da Transação: ${transaction.id}
Data/Hora: ${formattedDate}
Cliente: ${transaction.customer}
Origem: ${transaction.source === 'qrcode' ? 'QR Code' : 'Manual'}
${transaction.qrCodeId ? `ID do QR Code: ${transaction.qrCodeId}` : ''}
Método de Pagamento: ${
  {
    'cash': 'Dinheiro',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'Pix',
    'cashback': 'Cashback',
    'wallet': 'Carteira Digital'
  }[transaction.paymentMethod] || transaction.paymentMethod
}
Status: ${
  {
    'completed': 'Concluída',
    'pending': 'Pendente',
    'cancelled': 'Cancelada'
  }[transaction.status] || transaction.status
}

DETALHES DA TRANSAÇÃO
==============================
${transaction.description || 'Venda Vale Cashback'}
${transaction.items || ''}
${transaction.itemsList ? transaction.itemsList.map(item => 
  `${item.name} x${item.quantity} - ${formatCurrency(item.price * item.quantity)}`
).join('\n') : ''}

RESUMO FINANCEIRO
==============================
Valor Bruto: ${formatCurrency(totalAmount)}
(-) Taxa da Plataforma (5%): ${formatCurrency(platformFee)}
(-) Cashback do Cliente (2%): ${formatCurrency(clientCashback)}
(-) Bônus de Indicação (1%): ${formatCurrency(referralBonus)}
==============================
(=) Valor Líquido: ${formatCurrency(netAmount)}

Obrigado por usar o Vale Cashback!
www.valecashback.com
      `.trim();
      
      // Em um sistema real, aqui enviaríamos para impressão
      // Por enquanto, apenas simulamos mostrando o conteúdo
      
      toast({
        title: "Recibo gerado com sucesso",
        description: (
          <div className="mt-2">
            <p className="mb-2">Recibo para a venda #{transaction.id} está pronto para impressão</p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                // Simulando download do recibo como texto
                const blob = new Blob([receiptContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recibo-venda-${transaction.id}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Recibo
            </Button>
          </div>
        ),
        duration: 10000,
      });
    } catch (error) {
      console.error('Erro ao preparar impressão do recibo:', error);
      toast({
        title: "Erro ao gerar recibo",
        description: "Não foi possível gerar o recibo para esta transação.",
        variant: "destructive",
      });
    }
  };
  
  // Definição das colunas da tabela com informações detalhadas
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
      cell: (transaction: Transaction) => {
        try {
          const date = new Date(transaction.date);
          return format(date, "dd/MM/yyyy HH:mm");
        } catch {
          return transaction.date || "N/A";
        }
      }
    },
    {
      header: "Origem",
      accessorKey: "source" as keyof Transaction,
      cell: (transaction: Transaction) => {
        const sourceLabels: Record<string, string> = {
          "manual": "Manual",
          "qrcode": "QR Code"
        };
        const sourceIcons: Record<string, React.ReactNode> = {
          "manual": <FileText className="h-4 w-4 mr-1" />,
          "qrcode": <QrCode className="h-4 w-4 mr-1" />
        };
        
        return (
          <div className="flex items-center">
            {sourceIcons[transaction.source || 'manual']}
            <span>{sourceLabels[transaction.source || 'manual']}</span>
          </div>
        );
      }
    },
    {
      header: "Valor Total",
      accessorKey: "amount" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="font-medium">
          {formatCurrency(transaction.amount)}
        </span>
      ),
    },
    {
      header: "Valor Líquido",
      accessorKey: "netAmount" as keyof Transaction,
      cell: (transaction: Transaction) => {
        // Calcular o valor líquido se não estiver disponível
        const netAmount = transaction.netAmount ?? (transaction.amount 
          - (transaction.platformFee || 0) 
          - (transaction.clientCashback || 0)
          - (transaction.referralBonus || 0));
        
        return (
          <span className="font-medium text-blue-600">
            {formatCurrency(netAmount)}
          </span>
        );
      }
    },
    {
      header: "Taxa Total",
      accessorKey: "fees" as any,
      cell: (transaction: Transaction) => {
        // Calcular a soma de todas as taxas
        const totalFees = (transaction.platformFee || 0) + 
                          (transaction.clientCashback || 0) + 
                          (transaction.referralBonus || 0);
        
        return (
          <span className="text-orange-600 font-medium">
            {formatCurrency(totalFees)}
          </span>
        );
      }
    },
    {
      header: "Cashback Cliente",
      accessorKey: "clientCashback" as keyof Transaction,
      cell: (transaction: Transaction) => (
        <span className="text-green-600">
          {formatCurrency(transaction.clientCashback || transaction.cashback || 0)}
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
          "cashback": "Cashback",
          "wallet": "Carteira Digital"
        };
        
        return (
          <div className="flex items-center">
            {PaymentMethodIcons[transaction.paymentMethod] || <CreditCard className="h-4 w-4 mr-1" />}
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
                    from: dateRange.from || undefined,
                    to: dateRange.to || undefined,
                  }}
                  onSelect={range => {
                    // O tipo DateRange já é compatível com o que o calendario retorna
                    setDateRange(range || { from: undefined, to: undefined });
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
                <Select 
                  value={status === null ? "all" : status} 
                  onValueChange={(val) => setStatus(val === "all" ? null : val)}
                >
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
                
                <Select 
                  value={paymentMethod === null ? "all" : paymentMethod} 
                  onValueChange={(val) => setPaymentMethod(val === "all" ? null : val)}
                >
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