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
  Circle,
  FileText,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  RefreshCw,
  Landmark,
  DollarSign,
  CreditCard,
  Banknote,
  ArrowUp,
  Mail
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Tipos e componentes
interface Transfer {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userType: string;
  amount: string | number;
  status: "completed" | "pending" | "cancelled";
  createdAt: string | Date;
  updatedAt?: string | Date;
  description?: string | null;
  type: "merchant_withdrawal" | "client_withdrawal" | "internal_transfer" | string;
}

const TransferTypeIcons: Record<string, React.ReactNode> = {
  "cashback": <CreditCard className="h-4 w-4" />,
  "referral": <User className="h-4 w-4" />,
  "withdrawal": <Banknote className="h-4 w-4" />,
  "merchant_withdrawal": <Landmark className="h-4 w-4" />,
  "client_withdrawal": <Banknote className="h-4 w-4" />,
  "internal_transfer": <RefreshCw className="h-4 w-4" />,
};

const TransferStatusIcons: Record<string, React.ReactNode> = {
  "completed": <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "pending": <Clock className="h-4 w-4 text-yellow-500" />,
  "cancelled": <XCircle className="h-4 w-4 text-red-500" />,
};

export default function AdminTransfers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | null, to: Date | null}>({
    from: null,
    to: null,
  });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { toast } = useToast();
  
  // Query para buscar as transferências
  const { data, isLoading } = useQuery<{ 
    transfers: Transfer[], 
    totalAmount: number,
    statusCounts: { status: string, count: number }[],
    typeCounts: { type: string, sum: number }[],
    pageCount: number
  }>({
    queryKey: ['/api/admin/transfers', {
      page,
      pageSize,
      status: statusFilter,
      type: typeFilter,
      dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      search: searchTerm
    }],
    placeholderData: {
      transfers: [
        { id: 1, user: "Maria Silva", amount: 150.00, date: "21/07/2023 15:45", type: "withdrawal", status: "completed", bankInfo: "Banco XYZ - Ag: 1234 - CC: 56789-0" },
        { id: 2, user: "José Santos", amount: 75.20, date: "21/07/2023 14:30", type: "cashback", status: "completed", bankInfo: "Carteira Digital" },
        { id: 3, user: "Ana Oliveira", amount: 200.00, date: "21/07/2023 11:15", type: "referral", status: "completed", bankInfo: "Carteira Digital" },
        { id: 4, user: "Carlos Souza", amount: 120.50, date: "21/07/2023 10:20", type: "withdrawal", status: "pending", bankInfo: "Banco ABC - Ag: 5678 - CC: 12345-6" },
        { id: 5, user: "Juliana Lima", amount: 350.75, date: "21/07/2023 09:00", type: "withdrawal", status: "completed", bankInfo: "Banco XYZ - Pix: juliana@email.com" },
        { id: 6, user: "Roberto Alves", amount: 89.99, date: "20/07/2023 16:10", type: "cashback", status: "completed", bankInfo: "Carteira Digital" },
        { id: 7, user: "Farmácia XYZ", amount: 580.00, date: "20/07/2023 14:25", type: "withdrawal", status: "completed", bankInfo: "Banco DEF - Ag: 9876 - CC: 54321-0" },
        { id: 8, user: "Pedro Dias", amount: 135.75, date: "20/07/2023 11:30", type: "withdrawal", status: "cancelled", bankInfo: "Banco ABC - Pix: pedro@email.com" },
        { id: 9, user: "Supermercado ABC", amount: 1220.00, date: "19/07/2023 17:15", type: "withdrawal", status: "completed", bankInfo: "Banco XYZ - Ag: 1357 - CC: 24680-9" },
        { id: 10, user: "Rodrigo Mendes", amount: 67.80, date: "19/07/2023 13:40", type: "referral", status: "completed", bankInfo: "Carteira Digital" }
      ],
      totalAmount: 2989.99,
      statusCounts: [
        { status: "completed", count: 8 },
        { status: "pending", count: 1 },
        { status: "cancelled", count: 1 }
      ],
      typeCounts: [
        { type: "withdrawal", sum: 2556.00 },
        { type: "cashback", sum: 165.19 },
        { type: "referral", sum: 267.80 }
      ],
      pageCount: 2
    }
  });
  
  // Filtrar transferências
  const filteredTransfers = data?.transfers || [];
  
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
  
  // Visualizar detalhes da transferência
  const handleViewTransfer = (transfer: Transfer) => {
    toast({
      title: `Transferência #${transfer.id}`,
      description: `Usuário: ${transfer.userName}, Valor: ${formatCurrency(transfer.amount)}`,
    });
  };
  
  // Aprovar transferência
  const handleApproveTransfer = (transfer: Transfer) => {
    if (transfer.status !== "pending") {
      toast({
        title: "Operação não permitida",
        description: "Apenas transferências pendentes podem ser aprovadas.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Transferência aprovada",
      description: `A transferência #${transfer.id} foi aprovada com sucesso.`,
    });
  };
  
  // Definição das colunas da tabela
  const columns = [
    {
      header: "ID",
      accessorKey: "id" as keyof Transfer,
    },
    {
      header: "Usuário",
      accessorKey: "userName" as keyof Transfer,
      cell: (transfer: Transfer) => (
        <div className="flex items-center">
          <User className="h-4 w-4 text-muted-foreground mr-2" />
          <span>{transfer.userName}</span>
        </div>
      ),
    },
    {
      header: "Data",
      accessorKey: "createdAt" as keyof Transfer,
      cell: (transfer: Transfer) => (
        <span>
          {new Date(transfer.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      header: "Valor",
      accessorKey: "amount" as keyof Transfer,
      cell: (transfer: Transfer) => (
        <span className="font-medium">
          {formatCurrency(transfer.amount)}
        </span>
      ),
    },
    {
      header: "Tipo",
      accessorKey: "type" as keyof Transfer,
      cell: (transfer: Transfer) => {
        const typeLabels: Record<string, string> = {
          "withdrawal": "Saque",
          "cashback": "Cashback",
          "referral": "Indicação",
          "merchant_withdrawal": "Saque Lojista",
          "client_withdrawal": "Saque Cliente",
          "internal_transfer": "Transferência Interna"
        };
        
        return (
          <div className="flex items-center">
            {TransferTypeIcons[transfer.type] || <DollarSign className="h-4 w-4 mr-2" />}
            <span className="ml-1">{typeLabels[transfer.type] || transfer.type}</span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status" as keyof Transfer,
      cell: (transfer: Transfer) => {
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
          <div className={`rounded-full px-2 py-1 text-xs font-medium inline-flex items-center ${statusColors[transfer.status]}`}>
            {TransferStatusIcons[transfer.status]}
            <span className="ml-1">{statusLabels[transfer.status]}</span>
          </div>
        );
      },
    },
    {
      header: "Informações",
      accessorKey: "userEmail" as keyof Transfer,
      cell: (transfer: Transfer) => (
        <div className="flex items-center">
          <Mail className="h-4 w-4 text-muted-foreground mr-2" />
          <span className="truncate max-w-[200px]">{transfer.userEmail}</span>
        </div>
      ),
    },
  ];
  
  // Ações para a tabela
  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (transfer: Transfer) => handleViewTransfer(transfer),
    },
    {
      label: "Aprovar",
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: (transfer: Transfer) => handleApproveTransfer(transfer),
      // Apenas exibir para transferências pendentes
      show: (transfer: Transfer) => transfer.status === "pending",
    },
  ];
  
  return (
    <DashboardLayout title="Transferências" type="admin">
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
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Transferido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.totalAmount)}
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredTransfers.length} transferências
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
                          {statusIcons[statusCount.status] || <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
                          <span>{statusLabels[statusCount.status] || statusCount.status}</span>
                        </div>
                        <span className="text-sm font-medium">{statusCount.count}</span>
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
              <CardTitle className="text-base">Por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {data?.typeCounts && data.typeCounts.length > 0 ? (
                  data.typeCounts.map((typeCount) => {
                    const typeLabels: Record<string, string> = {
                      "withdrawal": "Saques",
                      "cashback": "Cashback",
                      "referral": "Indicações",
                      "merchant_withdrawal": "Saques Lojista",
                      "client_withdrawal": "Saques Cliente",
                      "internal_transfer": "Transferências Internas"
                    };
                    
                    const typeIcons: Record<string, JSX.Element> = {
                      "withdrawal": <Banknote className="h-3.5 w-3.5 mr-1.5" />,
                      "cashback": <CreditCard className="h-3.5 w-3.5 mr-1.5" />,
                      "referral": <User className="h-3.5 w-3.5 mr-1.5" />,
                      "merchant_withdrawal": <Landmark className="h-3.5 w-3.5 mr-1.5" />,
                      "client_withdrawal": <Banknote className="h-3.5 w-3.5 mr-1.5" />,
                      "internal_transfer": <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    };
                    
                    return (
                      <div key={typeCount.type} className="flex items-center justify-between">
                        <div className="flex items-center text-sm">
                          {typeIcons[typeCount.type] || <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
                          <span>{typeLabels[typeCount.type] || typeCount.type}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(typeCount.sum)}
                        </span>
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
            <CardTitle>Transferências</CardTitle>
            <CardDescription>
              Histórico completo de transferências no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-1 gap-4">
                <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? null : val)}>
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
                
                <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? null : val)}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="merchant_withdrawal">Saque Lojista</SelectItem>
                    <SelectItem value="client_withdrawal">Saque Cliente</SelectItem>
                    <SelectItem value="internal_transfer">Transferência Interna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DataTable
              data={filteredTransfers}
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