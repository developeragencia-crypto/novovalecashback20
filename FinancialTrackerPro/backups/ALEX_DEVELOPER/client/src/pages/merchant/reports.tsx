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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon,
  Download,
  BarChart,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  ShoppingBag,
  CreditCard,
  Percent
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LineChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/charts";

interface ReportFilters {
  period: "today" | "week" | "month" | "quarter" | "year" | "custom";
  dateRange: { from: Date | null; to: Date | null };
}

export default function MerchantReports() {
  const [activeTab, setActiveTab] = useState("sales");
  const [filters, setFilters] = useState<ReportFilters>({
    period: "month",
    dateRange: { from: null, to: null },
  });
  
  const { toast } = useToast();
  
  // Query para buscar os dados de relatórios - substituir por API real
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['/api/merchant/reports', activeTab, filters],
    placeholderData: {
      // Dados do relatório de vendas
      salesData: {
        total: 12850.75,
        count: 87,
        average: 147.71,
        cashback: 257.02,
        previousPeriodChange: 8.5,
        timeline: [
          { date: "01/07", value: 350.50 },
          { date: "02/07", value: 420.25 },
          { date: "03/07", value: 380.00 },
          { date: "04/07", value: 510.75 },
          { date: "05/07", value: 490.50 },
          { date: "06/07", value: 620.25 },
          { date: "07/07", value: 580.00 },
          { date: "08/07", value: 450.50 },
          { date: "09/07", value: 520.30 },
          { date: "10/07", value: 490.00 },
          { date: "11/07", value: 580.75 },
          { date: "12/07", value: 620.50 },
          { date: "13/07", value: 610.25 },
          { date: "14/07", value: 580.00 },
          { date: "15/07", value: 650.50 },
          { date: "16/07", value: 670.30 },
          { date: "17/07", value: 590.00 },
          { date: "18/07", value: 630.75 },
          { date: "19/07", value: 580.50 },
          { date: "20/07", value: 750.25 },
          { date: "21/07", value: 640.00 },
        ],
        byPaymentMethod: [
          { name: "Cartão de Crédito", value: 6425.50 },
          { name: "Cartão de Débito", value: 3210.25 },
          { name: "Dinheiro", value: 1285.00 },
          { name: "Pix", value: 1780.00 },
          { name: "Cashback", value: 150.00 },
        ],
        // Top 5 produtos mais vendidos
        topProducts: [
          { name: "Arroz Integral", value: 45, revenue: 675.00 },
          { name: "Leite Desnatado", value: 38, revenue: 190.00 },
          { name: "Café Gourmet", value: 30, revenue: 450.00 },
          { name: "Pão Integral", value: 25, revenue: 212.50 },
          { name: "Sabonete", value: 20, revenue: 79.80 },
        ],
      },
      
      // Dados do relatório de clientes
      customersData: {
        total: 65,
        new: 12,
        returning: 53,
        timeline: [
          { date: "Jan", value: 12 },
          { date: "Fev", value: 15 },
          { date: "Mar", value: 18 },
          { date: "Abr", value: 22 },
          { date: "Mai", value: 28 },
          { date: "Jun", value: 35 },
          { date: "Jul", value: 65 },
        ],
        byFrequency: [
          { name: "1 compra", value: 20 },
          { name: "2-5 compras", value: 25 },
          { name: "6-10 compras", value: 12 },
          { name: "11+ compras", value: 8 },
        ],
        topCustomers: [
          { name: "Maria Silva", visits: 15, spent: 2250.50 },
          { name: "João Santos", visits: 12, spent: 1850.75 },
          { name: "Ana Oliveira", visits: 10, spent: 1650.30 },
          { name: "Carlos Souza", visits: 8, spent: 1250.45 },
          { name: "Juliana Lima", visits: 7, spent: 980.20 },
        ],
      },
      
      // Dados do relatório de cashback
      cashbackData: {
        total: 257.02,
        count: 87,
        average: 2.95,
        timeline: [
          { date: "01/07", value: 7.01 },
          { date: "02/07", value: 8.41 },
          { date: "03/07", value: 7.60 },
          { date: "04/07", value: 10.22 },
          { date: "05/07", value: 9.81 },
          { date: "06/07", value: 12.41 },
          { date: "07/07", value: 11.60 },
          { date: "08/07", value: 9.01 },
          { date: "09/07", value: 10.41 },
          { date: "10/07", value: 9.80 },
          { date: "11/07", value: 11.62 },
          { date: "12/07", value: 12.41 },
          { date: "13/07", value: 12.21 },
          { date: "14/07", value: 11.60 },
          { date: "15/07", value: 13.01 },
          { date: "16/07", value: 13.41 },
          { date: "17/07", value: 11.80 },
          { date: "18/07", value: 12.62 },
          { date: "19/07", value: 11.61 },
          { date: "20/07", value: 15.01 },
          { date: "21/07", value: 12.80 },
        ],
        distribution: [
          { name: "Cashback Direto", value: 150.50 },
          { name: "Bônus de Indicação", value: 75.25 },
          { name: "Promoções", value: 31.27 },
        ],
      },
    }
  });
  
  const handlePeriodChange = (period: string) => {
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;
    
    const today = new Date();
    
    if (period === "today") {
      dateFrom = today;
      dateTo = today;
    } else if (period === "week") {
      dateFrom = subDays(today, 7);
      dateTo = today;
    } else if (period === "month") {
      dateFrom = subMonths(today, 1);
      dateTo = today;
    } else if (period === "quarter") {
      dateFrom = subMonths(today, 3);
      dateTo = today;
    } else if (period === "year") {
      dateFrom = subMonths(today, 12);
      dateTo = today;
    }
    
    setFilters({
      ...filters,
      period: period as any,
      dateRange: { from: dateFrom, to: dateTo },
    });
  };
  
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
  
  return (
    <DashboardLayout title="Relatórios Financeiros" type="merchant">
      <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="sales">
              <BarChart className="h-4 w-4 mr-2" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="cashback">
              <Percent className="h-4 w-4 mr-2" />
              Cashback
            </TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Select value={filters.period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
                <SelectItem value="quarter">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {filters.period === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "dd/MM/yyyy")} -{" "}
                          {format(filters.dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "dd/MM/yyyy")
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
                      from: filters.dateRange.from ?? undefined,
                      to: filters.dateRange.to ?? undefined,
                    }}
                    onSelect={range => {
                      if (range?.from) {
                        setFilters({
                          ...filters, 
                          dateRange: { 
                            from: range.from, 
                            to: range.to 
                          }
                        });
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Relatório de Vendas */}
        <TabsContent value="sales">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {reportsData?.salesData.total.toFixed(2)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  {reportsData?.salesData.previousPeriodChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500 font-medium">
                        +{reportsData?.salesData.previousPeriodChange}%
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500 font-medium">
                        {reportsData?.salesData.previousPeriodChange}%
                      </span>
                    </>
                  )}
                  <span className="ml-1">vs. período anterior</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Qtd. Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportsData?.salesData.count}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Média: R$ {reportsData?.salesData.average.toFixed(2)}/venda
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Cashback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {reportsData?.salesData.cashback.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {((reportsData?.salesData.cashback / reportsData?.salesData.total) * 100).toFixed(1)}% do total de vendas
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comissão Lojas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R$ {(reportsData?.salesData.total * 0.02).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Taxa de 2% sobre vendas
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Vendas por Período</CardTitle>
                <CardDescription>
                  Receita diária no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  title=""
                  data={reportsData?.salesData.timeline || []}
                  lines={[
                    { dataKey: "value", name: "Vendas (R$)", stroke: "#0080ff" }
                  ]}
                  xAxisDataKey="date"
                  height={300}
                  grid
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
                <CardDescription>
                  Distribuição de vendas por método
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  title=""
                  data={reportsData?.salesData.byPaymentMethod || []}
                  height={300}
                  donut
                  innerRadius={60}
                  outerRadius={90}
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>
                Top 5 produtos com maior número de vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {reportsData?.salesData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center">
                    <div className="text-accent font-bold w-6">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.value} vendas · R$ {product.revenue.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-full max-w-md bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full"
                        style={{ width: `${Math.round((product.value / reportsData?.salesData.topProducts[0].value) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Relatório de Clientes */}
        <TabsContent value="customers">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportsData?.customersData.total}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Base de clientes atendidos
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Novos Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reportsData?.customersData.new}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  No período selecionado
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clientes Recorrentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reportsData?.customersData.returning}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {((reportsData?.customersData.returning / reportsData?.customersData.total) * 100).toFixed(0)}% do total de clientes
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Crescimento de Clientes</CardTitle>
                <CardDescription>
                  Evolução mensal da base de clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  title=""
                  data={reportsData?.customersData.timeline || []}
                  bars={[
                    { dataKey: "value", name: "Clientes", fill: "#0080ff" }
                  ]}
                  xAxisDataKey="date"
                  height={300}
                  grid
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Frequência de Compras</CardTitle>
                <CardDescription>
                  Distribuição por quantidade de compras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  title=""
                  data={reportsData?.customersData.byFrequency || []}
                  height={300}
                  donut
                  innerRadius={60}
                  outerRadius={90}
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Principais Clientes</CardTitle>
              <CardDescription>
                Top 5 clientes com maior valor em compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {reportsData?.customersData.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center">
                    <div className="text-accent font-bold w-6">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.visits} visitas · R$ {customer.spent.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-full max-w-md bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full"
                        style={{ width: `${Math.round((customer.spent / reportsData?.customersData.topCustomers[0].spent) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Relatório de Cashback */}
        <TabsContent value="cashback">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total de Cashback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {reportsData?.cashbackData.total.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Distribuído no período
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportsData?.cashbackData.count}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Com cashback gerado
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Média por Transação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {reportsData?.cashbackData.average.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  De cashback por venda
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Cashback Diário</CardTitle>
                <CardDescription>
                  Distribuição de cashback por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  title=""
                  data={reportsData?.cashbackData.timeline || []}
                  lines={[
                    { dataKey: "value", name: "Cashback (R$)", stroke: "#10b981" }
                  ]}
                  xAxisDataKey="date"
                  height={300}
                  grid
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Categorias de cashback gerado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent
                  title=""
                  data={reportsData?.cashbackData.distribution || []}
                  height={300}
                  donut
                  innerRadius={60}
                  outerRadius={90}
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Análise de Eficiência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Benefícios do Programa de Cashback</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">✓</div>
                      <span>Aumento da fidelização de clientes</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">✓</div>
                      <span>Incremento do ticket médio em 15%</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">✓</div>
                      <span>Aumento da frequência de visitas</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">✓</div>
                      <span>Mais indicações de novos clientes</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Recomendações</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">→</div>
                      <span>Promoções especiais em dias de baixo movimento</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">→</div>
                      <span>Incentivo para produtos com maior margem</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">→</div>
                      <span>Destaque para o programa de cashback no PDV</span>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5">→</div>
                      <span>Campanhas de indicação focadas em novos clientes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}