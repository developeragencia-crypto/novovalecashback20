import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Loader2, 
  PlusCircle, 
  Search, 
  Calendar, 
  ArrowDownUp, 
  Download, 
  Filter, 
  RefreshCw 
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Mapeamento de métodos de pagamento
const PaymentMethod: Record<string, string> = {
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  PIX: "PIX",
  CASHBACK: "Cashback",
  OTHER: "Outro"
};

// Cores para os diferentes status de transação
const statusColors: Record<string, string> = {
  completed: "bg-green-500",
  pending: "bg-orange-500",
  cancelled: "bg-red-500",
  refunded: "bg-blue-500"
};

interface SaleData {
  id: number;
  customerName: string;
  amount: number;
  cashbackAmount: number;
  paymentMethod: string;
  status: string;
  created_at: string;
  description: string;
}

export default function DemoMerchantSalesPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<SaleData[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Carregar dados baseados em transações reais
  useEffect(() => {
    console.log("Carregando vendas do lojista (com dados reais do sistema)");
    
    // Simular tempo de carregamento
    const timer = setTimeout(() => {
      // Dados baseados em transações reais do sistema
      const realSales = [
        {
          id: 32,
          customerName: "Eliezer",
          amount: 94.00,
          cashbackAmount: 1.88,
          paymentMethod: "CASH",
          status: "completed",
          created_at: new Date().toISOString(),
          description: "Compra em loja física"
        },
        {
          id: 31,
          customerName: "Sergio Saraiva Costa",
          amount: 58.60,
          cashbackAmount: 1.17,
          paymentMethod: "CASH",
          status: "completed",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          description: "Pagamento de serviços"
        },
        {
          id: 30,
          customerName: "Vitor de souza",
          amount: 119.43,
          cashbackAmount: 2.39,
          paymentMethod: "CASH",
          status: "completed",
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          description: "Produtos diversos"
        },
        {
          id: 29,
          customerName: "Tiago donadia",
          amount: 35.49,
          cashbackAmount: 0.71,
          paymentMethod: "CASH",
          status: "completed",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          description: "Compra rápida"
        },
        {
          id: 28,
          customerName: "Graziela filho",
          amount: 30.00,
          cashbackAmount: 0.60,
          paymentMethod: "CASH",
          status: "completed",
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
          description: "Pequena compra"
        }
      ];
      
      setSales(realSales);
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Função para aplicar filtros
  const filteredSales = sales.filter((sale) => {
    // Filtro por termo de busca
    const matchesSearch = !searchTerm || 
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toString().includes(searchTerm);
    
    // Filtro por status
    const matchesStatus = !statusFilter || sale.status === statusFilter;
    
    // Filtro por método de pagamento
    const matchesPaymentMethod = !paymentMethodFilter || sale.paymentMethod === paymentMethodFilter;
    
    // Filtro por data
    const saleDate = new Date(sale.created_at);
    const matchesStartDate = !startDate || saleDate >= startDate;
    const matchesEndDate = !endDate || saleDate <= endDate;
    
    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesStartDate && matchesEndDate;
  });
  
  // Total de vendas filtradas
  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCashbackAmount = filteredSales.reduce((sum, sale) => sum + sale.cashbackAmount, 0);
  
  // Função para reset dos filtros
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPaymentMethodFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    
    toast({
      title: "Filtros resetados",
      description: "Todos os filtros foram removidos",
    });
  };
  
  // Funções de demo (não fazem nada)
  const handleNewSale = () => {
    alert("Esta funcionalidade estaria disponível na versão completa do aplicativo");
  };
  
  const handleExportSales = () => {
    alert("Esta funcionalidade estaria disponível na versão completa do aplicativo");
  };
  
  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vendas (Demonstração)</h1>
        <div className="flex gap-2">
          <Button onClick={handleNewSale} className="bg-green-600 hover:bg-green-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Filtre as vendas por diferentes critérios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Campo de busca */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Nome, ID, etc."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            {/* Filtro de status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro de método de pagamento */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Forma de Pagamento</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Todos os métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os métodos</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASHBACK">Cashback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro de data */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {/* Botões de ação para filtros */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={resetFilters} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar Filtros
            </Button>
            <Button variant="outline" onClick={handleExportSales} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Resumo das vendas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {statusFilter ? `Status: ${statusFilter}` : "Todos os status"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalesAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {filteredSales.length} transações
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Cashback Gerado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCashbackAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {(totalCashbackAmount / totalSalesAmount * 100).toFixed(2)}% do valor total
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabela de vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>
            Lista de todas as vendas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Cashback</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.id}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{formatCurrency(sale.amount)}</TableCell>
                        <TableCell>{formatCurrency(sale.cashbackAmount)}</TableCell>
                        <TableCell>{PaymentMethod[sale.paymentMethod] || sale.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[sale.status] || 'bg-gray-500'} text-white`}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sale.description}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}