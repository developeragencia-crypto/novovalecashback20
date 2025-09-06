import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Eye, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Loader2, 
  Search, 
  User, 
  Phone, 
  Mail,
  CreditCard,
  BadgePercent,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Tipos de dados para o sistema
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpfCnpj: string | null;
  referredBy: number | null;
  referral_code?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  category?: string;
  sku?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface SaleTransaction {
  id: number;
  customer: string;
  user_id: number; // Alterado de customerId para user_id para corresponder ao retorno da API
  date: string;
  amount: number;
  cashback: number | undefined; // Esperando cashback (mas pode vir como cashback_amount)
  payment_method: string;
  items: string;
  status: string;
}

// Configurações globais do sistema
const SYSTEM_SETTINGS = {
  cashbackRate: 0.02, // 2% - Cashback para o cliente
  referralRate: 0.01, // 1% - Bônus para quem indicou
  merchantCommission: 0.02, // 2% - Comissão do lojista
  platformFee: 0.05, // 5% - Taxa da plataforma
  minWithdrawal: 20, // $ 20.00 - Valor mínimo para saque
  withdrawalFee: 0.05, // 5% - Taxa sobre saques00
};

export default function MerchantSales() {
  // Estados para o formulário de venda
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<'name' | 'email' | 'phone' | 'code'>('name');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  
  // Estados para itens do carrinho
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showProductDialog, setShowProductDialog] = useState(false);
  
  // Estados para pagamento
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState<number | string>("");
  const [notes, setNotes] = useState("");
  const [sendReceipt, setSendReceipt] = useState(true);
  const [manualAmount, setManualAmount] = useState<number>(0);
  
  // Estado para processamento
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Timeout para pesquisa de cliente
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Queries para obter dados
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/merchant/products'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/merchant/products', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.log("Usando dados de produtos de exemplo");
          // Produtos de exemplo se houver erro na requisição
          return [
            { id: 1, name: "Produto A", price: 29.99, description: "Descrição do produto A", category: "Categoria 1", sku: "SKU001", in_stock: 50 },
            { id: 2, name: "Produto B", price: 49.99, description: "Descrição do produto B", category: "Categoria 1", sku: "SKU002", in_stock: 30 },
            { id: 3, name: "Produto C", price: 19.99, description: "Descrição do produto C", category: "Categoria 2", sku: "SKU003", in_stock: 100 },
            { id: 4, name: "Produto D", price: 39.99, description: "Descrição do produto D", category: "Categoria 2", sku: "SKU004", in_stock: 25 },
            { id: 5, name: "Produto E", price: 59.99, description: "Descrição do produto E", category: "Categoria 3", sku: "SKU005", in_stock: 15 }
          ];
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        return [];
      }
    }
  });

  const { data: salesData = { transactions: [] } } = useQuery<{ transactions: SaleTransaction[] }>({
    queryKey: ['/api/merchant/sales'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/merchant/sales', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.log("Usando dados de vendas de exemplo");
          return { transactions: [] };
        }
        
        const data = await response.json();
        return { transactions: data };
      } catch (error) {
        console.error("Erro ao carregar vendas:", error);
        return { transactions: [] };
      }
    }
  });

  // Mutation para registrar uma venda
  const registerSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const res = await apiRequest("POST", "/api/merchant/sales", saleData);
      return await res.json();
    },
    onSuccess: () => {
      // Definir isProcessing como false para evitar problemas de UI
      setIsProcessing(false);
      
      toast({
        title: "Venda registrada com sucesso",
        description: `Venda para ${selectedCustomer?.name} foi processada e os valores de cashback foram distribuídos automaticamente.`,
      });

      // Resetar o formulário
      resetForm();
      
      // Invalidar queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
    },
    onError: (error: any) => {
      // Definir isProcessing como false para permitir nova tentativa
      setIsProcessing(false);
      
      toast({
        title: "Erro ao registrar venda",
        description: error.message || "Ocorreu um erro ao processar a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Cálculos para o resumo da venda
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountValue = discount ? parseFloat(discount.toString()) : 0;
  const total = Math.max(0, subtotal - discountValue);
  const cashbackAmount = total * SYSTEM_SETTINGS.cashbackRate;
  const referralBonus = selectedCustomer?.referredBy 
    ? total * SYSTEM_SETTINGS.referralRate 
    : 0;
  const merchantCommission = total * SYSTEM_SETTINGS.merchantCommission;

  // Pesquisar cliente com debounce
  useEffect(() => {
    if (searchTerm.length < 2) {
      setCustomerResults([]);
      return;
    }

    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    // Debounce de 500ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Buscar clientes via API
        const response = await apiRequest("GET", `/api/merchant/customers?term=${encodeURIComponent(searchTerm)}&searchBy=${searchBy}`);
        const data = await response.json();
        setCustomerResults(data || []);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar os clientes. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchBy, toast]);

  // Selecionar um cliente da lista de resultados
  const handleSelectCustomer = (customer: Customer, e?: React.MouseEvent) => {
    // Prevenir propagação do evento para evitar fechamentos inesperados
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setSelectedCustomer(customer);
    setSearchTerm("");
    setCustomerResults([]);
    
    // Fechar diálogo explicitamente para evitar problemas
    setTimeout(() => {
      setShowCustomerDialog(false);
    }, 200); // Aumentado para 200ms para garantir que a UI tenha tempo de responder
  };

  // Adicionar produto ao carrinho
  const handleAddToCart = (e?: React.MouseEvent) => {
    // Prevenir propagação do evento para evitar fechamentos inesperados
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!selectedProduct) return;
    
    // Verificar se o produto já está no carrinho
    const existingItemIndex = cartItems.findIndex(item => item.id === selectedProduct.id);
    
    if (existingItemIndex >= 0) {
      // Atualizar quantidade se o produto já estiver no carrinho
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setCartItems(updatedItems);
    } else {
      // Adicionar novo item ao carrinho
      setCartItems([...cartItems, { ...selectedProduct, quantity }]);
    }
    
    // Resetar seleção de produto
    setSelectedProduct(null);
    setQuantity(1);
    
    // Fechar diálogo explicitamente para evitar problemas - com temporizador maior
    setTimeout(() => {
      setShowProductDialog(false);
    }, 200);
  };

  // Remover produto do carrinho
  const handleRemoveFromCart = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // Abrir dialog de seleção de produto
  const handleOpenProductDialog = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setShowProductDialog(true);
  };

  // Abrir dialog de busca de cliente
  const handleOpenCustomerDialog = () => {
    setSearchTerm("");
    setCustomerResults([]);
    setShowCustomerDialog(true);
  };

  // Resetar formulário após o registro da venda
  const resetForm = () => {
    setSelectedCustomer(null);
    setCartItems([]);
    setSelectedPaymentMethod("cash");
    setDiscount("");
    setNotes("");
    setSendReceipt(true);
  };

  // Processar o registro da venda
  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast({
        title: "Cliente não selecionado",
        description: "Selecione um cliente para registrar a venda.",
        variant: "destructive",
      });
      return;
    }
    
    // Nota: Removemos a verificação de carrinho vazio para permitir vendas sem produtos
    
    setIsProcessing(true);
    
    // Cálculo dos valores para o caso de venda manual sem produtos selecionados
    const calculatedTotal = cartItems.length > 0 ? total : manualAmount;
    const calculatedSubtotal = cartItems.length > 0 ? subtotal : manualAmount;
    const calculatedCashback = cartItems.length > 0 ? cashbackAmount : (manualAmount * SYSTEM_SETTINGS.cashbackRate);
    const calculatedReferralBonus = selectedCustomer.referredBy ? 
      (cartItems.length > 0 ? referralBonus : (manualAmount * SYSTEM_SETTINGS.referralRate)) : 0;
    const calculatedPlatformFee = cartItems.length > 0 ? (total * SYSTEM_SETTINGS.platformFee) : (manualAmount * SYSTEM_SETTINGS.platformFee);
    
    // Preparar dados da venda
    const saleData = {
      customerId: selectedCustomer.id,
      items: cartItems.length > 0 ? cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      })) : [],
      subtotal: calculatedSubtotal,
      discount: discountValue,
      total: calculatedTotal,
      cashback: calculatedCashback,
      referralBonus: calculatedReferralBonus,
      platformFee: calculatedPlatformFee,
      merchantCommission: cartItems.length > 0 ? merchantCommission : (manualAmount * SYSTEM_SETTINGS.merchantCommission),
      referrerId: selectedCustomer.referredBy,
      paymentMethod: selectedPaymentMethod,
      notes,
      sendReceipt,
      manualAmount: cartItems.length === 0 ? manualAmount : null
    };
    
    // Registrar venda usando mutation
    registerSaleMutation.mutate(saleData);
  };

  // Configuração de colunas para a tabela de vendas recentes
  const columns = [
    {
      header: "ID",
      accessorKey: "id" as keyof SaleTransaction,
    },
    {
      header: "Cliente",
      accessorKey: "customer" as keyof SaleTransaction,
    },
    {
      header: "Data/Hora",
      accessorKey: "date" as keyof SaleTransaction,
    },
    {
      header: "Valor",
      accessorKey: "amount" as keyof SaleTransaction,
      cell: (item: SaleTransaction) => `$ ${parseFloat(String(item.amount)).toFixed(2)}`,
    },
    {
      header: "Cashback",
      accessorKey: "cashback" as keyof SaleTransaction,
      cell: (item: any) => {
        const cashbackValue = item.cashback || item.cashback_amount;
        return `$ ${parseFloat(String(cashbackValue)).toFixed(2)}`;
      },
    }
  ];

  // Ações para a tabela de vendas recentes
  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (sale: SaleTransaction) => {
        toast({
          title: `Venda #${sale.id}`,
          description: `Cliente: ${sale.customer}, Valor: R$ ${parseFloat(String(sale.amount)).toFixed(2)}, Cashback: R$ ${parseFloat(String(sale.cashback)).toFixed(2)}`,
        });
      },
    },
  ];

  return (
    <DashboardLayout title="Registro de Vendas" type="merchant">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulário de Nova Venda */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Venda</CardTitle>
            <CardDescription>
              Registre uma venda para processar cashback e benefícios automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterSale} className="space-y-4">
              {/* Seleção de Cliente */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                {selectedCustomer ? (
                  <div className="p-3 border rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{selectedCustomer.name}</div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Trocar
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedCustomer.email} • {selectedCustomer.phone || "Sem telefone"}
                    </div>
                    {selectedCustomer.referredBy && (
                      <div className="mt-1 text-xs text-blue-600">
                        Cliente indicado • Bônus de {(SYSTEM_SETTINGS.referralRate * 100).toFixed(0)}% será aplicado
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleOpenCustomerDialog}
                  >
                    <User className="mr-2 h-4 w-4" /> Buscar Cliente
                  </Button>
                )}
              </div>
              
              {/* Lista de Produtos no Carrinho */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Produtos no Carrinho</Label>
                  <span className="text-sm text-muted-foreground">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="border rounded-md p-2 mb-2 max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center w-16">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            Nenhum produto adicionado ao carrinho.
                          </TableCell>
                        </TableRow>
                      ) : (
                        cartItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">$ {(item.price * item.quantity).toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFromCart(item.id)}
                                disabled={isProcessing}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenProductDialog}
                  disabled={isProcessing}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
                </Button>
              </div>
              
              {/* Opção para venda manual sem produtos */}
              {cartItems.length === 0 && (
                <div className="space-y-2">
                  <Label htmlFor="manualAmount">Valor Manual ($)</Label>
                  <Input
                    id="manualAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={manualAmount || ""}
                    onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                    disabled={isProcessing || cartItems.length > 0}
                    className="bg-orange-50"
                  />
                  <div className="text-xs text-muted-foreground">
                    Informe o valor da venda manual quando não houver produtos específicos selecionados
                  </div>
                </div>
              )}
              
              {/* Resumo dos Valores */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal ($)</Label>
                  <Input
                    id="subtotal"
                    value={cartItems.length > 0 ? subtotal.toFixed(2) : manualAmount.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Desconto ($)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total">Total ($)</Label>
                  <Input
                    id="total"
                    value={cartItems.length > 0 ? total.toFixed(2) : (manualAmount - discountValue).toFixed(2)}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="cashback">Cashback ({SYSTEM_SETTINGS.cashbackRate * 100}%)</Label>
                  <Input
                    id="cashback"
                    value={cartItems.length > 0 ? cashbackAmount.toFixed(2) : (manualAmount * SYSTEM_SETTINGS.cashbackRate).toFixed(2)}
                    readOnly
                    className="bg-muted text-green-600"
                  />
                </div>
              </div>
              
              {/* Método de Pagamento */}
              <div>
                <Label htmlFor="payment-method">Método de Pagamento</Label>
                <Select
                  defaultValue={selectedPaymentMethod}
                  onValueChange={setSelectedPaymentMethod}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Selecione um método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cashback">Saldo de Cashback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Opções adicionais */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-receipt"
                  checked={sendReceipt}
                  onCheckedChange={(checked) => setSendReceipt(checked as boolean)}
                  disabled={isProcessing}
                />
                <Label htmlFor="send-receipt">Enviar comprovante por e-mail</Label>
              </div>
              
              {/* Botão de Registro */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90"
                disabled={isProcessing || !selectedCustomer || (cartItems.length === 0 && manualAmount <= 0)}
              >
                {isProcessing || registerSaleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Registrar Venda
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Vendas Recentes e Resumo */}
        <div className="space-y-6">
          {/* Resumo da Comissão */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center text-orange-700">
                <BadgePercent className="mr-2 h-4 w-4" /> 
                Resumo da Distribuição de Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor da Venda:</span>
                  <span className="font-medium">$ {cartItems.length > 0 ? total.toFixed(2) : (manualAmount - discountValue).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cashback do Cliente ({SYSTEM_SETTINGS.cashbackRate * 100}%):</span>
                  <span className="text-green-600">$ {cartItems.length > 0 ? cashbackAmount.toFixed(2) : (manualAmount * SYSTEM_SETTINGS.cashbackRate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa da Plataforma ({SYSTEM_SETTINGS.platformFee * 100}%):</span>
                  <span className="text-blue-600">$ {cartItems.length > 0 
                    ? (total * SYSTEM_SETTINGS.platformFee).toFixed(2) 
                    : (manualAmount * SYSTEM_SETTINGS.platformFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Indicação ({SYSTEM_SETTINGS.referralRate * 100}%):</span>
                  <span className="text-blue-600">$ {selectedCustomer?.referredBy 
                    ? (cartItems.length > 0 ? referralBonus.toFixed(2) : (manualAmount * SYSTEM_SETTINGS.referralRate).toFixed(2))
                    : "0.00"}</span>
                </div>
                {selectedCustomer?.referredBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bônus para Referenciador ({SYSTEM_SETTINGS.referralRate * 100}%):</span>
                    <span className="text-blue-600">$ {cartItems.length > 0 
                      ? referralBonus.toFixed(2) 
                      : (manualAmount * SYSTEM_SETTINGS.referralRate).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa do Lojista ({SYSTEM_SETTINGS.merchantCommission * 100}%):</span>
                  <span className="text-orange-600">$ {cartItems.length > 0 
                    ? merchantCommission.toFixed(2) 
                    : (manualAmount * SYSTEM_SETTINGS.merchantCommission).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Valor Líquido:</span>
                    <span>$ {cartItems.length > 0 
                      ? (total - merchantCommission - (total * SYSTEM_SETTINGS.platformFee) - (selectedCustomer?.referredBy ? (total * SYSTEM_SETTINGS.referralRate) : 0)).toFixed(2)
                      : (manualAmount - (manualAmount * SYSTEM_SETTINGS.merchantCommission) - (manualAmount * SYSTEM_SETTINGS.platformFee) - (selectedCustomer?.referredBy ? (manualAmount * SYSTEM_SETTINGS.referralRate) : 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Vendas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={salesData?.transactions || []}
                columns={columns}
                actions={actions}
                pagination={{
                  pageIndex: 0,
                  pageSize: 5,
                  pageCount: Math.ceil((salesData?.transactions?.length || 0) / 5),
                  onPageChange: (page) => console.log("Page changed:", page),
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para Busca de Cliente */}
      <Dialog 
        open={showCustomerDialog} 
        onOpenChange={(open) => {
          // Só permite fechar se for explicitamente fechado clicando em botões
          // Não fechamos automaticamente - o usuário precisa usar os botões explícitos
          if (!open && !isSearching) {
            setShowCustomerDialog(false);
          } else if (!open && isSearching) {
            // Se estiver buscando, não permite fechar o diálogo
            return;
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
            <DialogDescription>
              Encontre o cliente pelo nome, e-mail, telefone ou código
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Select 
                defaultValue={searchBy} 
                onValueChange={(value) => setSearchBy(value as any)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Buscar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Input
                  placeholder={`Buscar por ${
                    searchBy === 'name' ? 'nome' : 
                    searchBy === 'email' ? 'e-mail' : 
                    searchBy === 'phone' ? 'telefone' : 'código'
                  }`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {isSearching ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span className="text-sm text-muted-foreground">Buscando clientes...</span>
                </div>
              ) : customerResults.length > 0 ? (
                <div className="divide-y">
                  {customerResults.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={(e) => handleSelectCustomer(customer, e)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3">
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" /> {customer.email}
                        </span>
                        {customer.phone && (
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                          </span>
                        )}
                      </div>
                      {customer.referredBy && (
                        <div className="mt-1 text-xs text-blue-600">
                          Cliente indicado • Bônus de indicação aplicável
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchTerm.length > 0 ? (
                <div className="p-4 text-center">
                  <span className="text-sm text-muted-foreground">Nenhum cliente encontrado</span>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <span className="text-sm text-muted-foreground">Digite para buscar clientes</span>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setShowCustomerDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar Produto */}
      <Dialog 
        open={showProductDialog} 
        onOpenChange={(open) => {
          // Só permite fechar se for explicitamente fechado clicando em botões
          // Implementando lógica mais robusta de controle de diálogo
          if (!open && !isProcessing) {
            // Só permite fechar se não estiver processando uma operação
            setShowProductDialog(false);
          } else if (!open && isProcessing) {
            // Se estiver processando, não permite fechar
            return;
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>
              Selecione um produto para adicionar ao carrinho
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Select onValueChange={(value) => {
              const product = products.find(p => p.id.toString() === value);
              if (product) setSelectedProduct(product);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} - $ {product.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedProduct && (
              <div className="space-y-2">
                <div className="p-3 border rounded-md bg-muted">
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Preço unitário: $ {selectedProduct.price.toFixed(2)}
                  </div>
                  {selectedProduct.category && (
                    <div className="text-xs text-muted-foreground">
                      Categoria: {selectedProduct.category}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="text-center"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>$ {(selectedProduct.price * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowProductDialog(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={(e) => handleAddToCart(e)}
              disabled={!selectedProduct}
              className="bg-accent hover:bg-accent/90"
            >
              Adicionar ao Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
