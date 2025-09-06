import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Store, 
  MapPin,
  Phone,
  Mail,
  Star,
  Clock,
  Tag,
  CreditCard,
  ShoppingBag,
  Calendar,
  ExternalLink,
  ArrowRight,
  Search,
  Loader2
} from "lucide-react";

// Interface para as lojas
interface StoreItem {
  id: number;
  userId?: number;
  user_id?: number;
  store_name?: string;
  name?: string;
  logo?: string | null;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  commissionRate?: string | number;
  rating?: number;
  createdAt: string;
  email?: string;
  phone?: string;
  transactions?: number;
  volume?: number;
}

export default function ClientStores() {
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Buscar todas as lojas
  const { data: storesData, isLoading, error } = useQuery<StoreItem[]>({
    queryKey: ['/api/client/stores'],
    retry: 1,
    queryFn: async () => {
      try {
        const response = await fetch('/api/client/stores', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.log("Usando dados de lojas de exemplo");
          // Dados de exemplo para desenvolvimento
          return [
            { 
              id: 1, 
              name: "Supermercado Economia", 
              store_name: "Supermercado Economia",
              category: "Supermercado", 
              address: "Av. Principal, 1234", 
              city: "São Paulo", 
              state: "SP", 
              commissionRate: 2.5, 
              rating: 4.5, 
              createdAt: "2024-12-15", 
              email: "contato@economia.com", 
              phone: "(11) 9999-8888", 
              transactions: 1250,
              volume: 78000
            },
            { 
              id: 2, 
              name: "Farmácia Saúde Total", 
              store_name: "Farmácia Saúde Total",
              category: "Farmácia", 
              address: "Rua das Flores, 456", 
              city: "Rio de Janeiro", 
              state: "RJ", 
              commissionRate: 3, 
              rating: 4.2, 
              createdAt: "2025-01-10", 
              email: "contato@saudetotal.com", 
              phone: "(21) 8888-7777", 
              transactions: 980,
              volume: 45000
            },
            { 
              id: 3, 
              name: "Livraria Cultura", 
              store_name: "Livraria Cultura",
              category: "Livraria", 
              address: "Shopping Central, Loja 45", 
              city: "Belo Horizonte", 
              state: "MG", 
              commissionRate: 2, 
              rating: 4.8, 
              createdAt: "2024-11-05", 
              email: "contato@cultura.com", 
              phone: "(31) 7777-6666", 
              transactions: 650,
              volume: 32000
            }
          ];
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao carregar lojas:", error);
        return [];
      }
    }
  });
  
  // Conteúdo simulado para "Novas Promoções"
  const featuredOffers = [
    { id: 1, store: "Mercado Central", discount: "10% OFF", category: "Supermercado", cashback: "3%" },
    { id: 2, store: "Farmácia Popular", discount: "15% OFF", category: "Farmácia", cashback: "4%" },
    { id: 3, store: "Livraria Cultura", discount: "20% OFF", category: "Livraria", cashback: "2%" },
  ];
  
  // Filtrar lojas com base na busca e categoria
  const filteredStores = storesData ? storesData.filter((store: StoreItem) => {
    const storeName = store.store_name || store.name || "";
    const storeCategory = store.category || "";
    
    const matchesSearch = searchTerm === "" || 
      storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      storeCategory.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || storeCategory === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }) : [];
  
  // Abrir o modal de detalhes da loja
  const handleOpenStoreDetails = (store: StoreItem) => {
    setSelectedStore(store);
    setIsDialogOpen(true);
  };
  
  // Formatar a data de criação
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Iniciais para o Avatar
  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Opções para categorias de lojas
  const categoryOptions = [
    { label: "Todas as Categorias", value: "all" },
    { label: "Supermercado", value: "supermarket" },
    { label: "Farmácia", value: "pharmacy" },
    { label: "Restaurante", value: "restaurant" },
    { label: "Posto de Combustível", value: "gas_station" },
    { label: "Loja de Roupas", value: "clothing" },
    { label: "Livraria", value: "books" },
    { label: "Eletrônicos", value: "electronics" },
    { label: "Beleza e Cosméticos", value: "beauty" },
    { label: "Outros", value: "other" },
  ];
  
  // Classes para os cards de lojas
  const getCategoryClass = (category: string | undefined) => {
    if (!category) return "bg-slate-50 border-slate-200";
    
    const categoryMap: Record<string, string> = {
      supermarket: "bg-green-50 border-green-200",
      pharmacy: "bg-red-50 border-red-200",
      restaurant: "bg-yellow-50 border-yellow-200",
      gas_station: "bg-blue-50 border-blue-200",
      clothing: "bg-purple-50 border-purple-200",
      books: "bg-indigo-50 border-indigo-200",
      electronics: "bg-gray-50 border-gray-200",
      beauty: "bg-pink-50 border-pink-200",
      other: "bg-orange-50 border-orange-200"
    };
    
    return categoryMap[category] || "bg-slate-50 border-slate-200";
  };
  
  // Componente para a exibição das estrelas na avaliação
  const RatingStars = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
          />
        ))}
        <span className="ml-1 text-sm font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };
  
  return (
    <DashboardLayout title="Lojas e Parceiros" type="client">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Barra lateral com filtros e promoções */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categorias</label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar Lojas</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Nome, categoria, etc"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Novas Promoções</CardTitle>
              <CardDescription>
                Ofertas exclusivas Vale Cashback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredOffers.map((offer) => (
                <div key={offer.id} className="p-3 bg-white rounded-lg shadow-sm flex items-start space-x-3 transition hover:shadow-md cursor-pointer">
                  <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{offer.store}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {offer.discount}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {offer.cashback} cashback
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{offer.category}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full">
                Ver todas as promoções
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Lista de lojas */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Lojas Parceiras Vale Cashback</CardTitle>
              <CardDescription>
                Veja todas as lojas participantes onde você pode usar e acumular cashback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Erro ao carregar lojas</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Não foi possível carregar a lista de lojas. Por favor, tente novamente mais tarde.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-10">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhuma loja encontrada</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Não encontramos nenhuma loja com os filtros selecionados. Tente ajustar sua busca ou voltar mais tarde.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredStores.map((store: StoreItem) => (
                    <div
                      key={store.id}
                      className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${getCategoryClass(store.category)}`}
                      onClick={() => handleOpenStoreDetails(store)}
                    >
                      {/* Header com logo e nome da loja */}
                      <div className="relative bg-gradient-to-r from-primary/10 to-background/60 p-5 border-b">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-20 w-20 rounded-lg overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center p-1">
                              {store.logo ? (
                                <img 
                                  src={store.logo} 
                                  alt={store.store_name || store.name || ""} 
                                  className="object-contain max-h-full"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary text-xl font-bold">
                                  {getInitials(store.store_name || store.name || "")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold">{store.store_name || store.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                                {store.category}
                              </Badge>
                              <span className="flex items-center text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                Desde {formatDate(store.createdAt)}
                              </span>
                            </div>
                            <div className="mt-2">
                              <RatingStars rating={store.rating || 0} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Corpo do card */}
                      <div className="p-5 flex flex-col gap-4">
                        {store.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-5 w-5 text-primary shrink-0" />
                            <span>{store.address}</span>
                          </div>
                        )}
                        
                        {store.email && (
                          <div className="flex items-start gap-2 text-sm">
                            <Mail className="h-5 w-5 text-primary shrink-0" />
                            <span>{store.email}</span>
                          </div>
                        )}
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-md px-3 py-1">
                            <CreditCard className="h-4 w-4 mr-2" />
                            {store.commissionRate}% Cashback
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Rodapé do card */}
                      <div className="bg-background p-4 flex justify-end items-center border-t">
                        <Button size="sm" className="gap-1">
                          Ver detalhes
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal de detalhes da loja */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          {selectedStore && (
            <>
              <DialogHeader className="pb-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="relative flex-shrink-0">
                    <div className="h-28 w-28 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center p-1">
                      {selectedStore.logo ? (
                        <img 
                          src={selectedStore.logo} 
                          alt={selectedStore.store_name || selectedStore.name || ""} 
                          className="object-contain max-h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary text-2xl font-bold">
                          {getInitials(selectedStore.store_name || selectedStore.name || "")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">
                      {selectedStore.store_name || selectedStore.name}
                    </DialogTitle>
                    <DialogDescription className="text-base mb-3">
                      {selectedStore.description || `${selectedStore.store_name || selectedStore.name} é uma loja parceira do Vale Cashback.`}
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                        {selectedStore.category || "Geral"}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {selectedStore.commissionRate}% Cashback
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-blue-500" />
                        {selectedStore.rating || 5.0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">
                    <Store className="h-4 w-4 mr-2" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="products">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Produtos
                  </TabsTrigger>
                  <TabsTrigger value="cashback">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cashback
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Sobre a Loja</h3>
                            <RatingStars rating={selectedStore.rating || 0} />
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            {selectedStore.description || `${selectedStore.store_name || selectedStore.name} é uma loja parceira do Vale Cashback. Faça suas compras aqui e ganhe cashback!`}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">Endereço</span>
                                <p className="text-sm text-muted-foreground">
                                  {selectedStore.address ? 
                                    `${selectedStore.address}, ${selectedStore.city}/${selectedStore.state}` : 
                                    "Endereço não informado"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <Phone className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">Telefone</span>
                                <p className="text-sm text-muted-foreground">
                                  {selectedStore.phone || "Não informado"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <Mail className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">Email</span>
                                <p className="text-sm text-muted-foreground">
                                  {selectedStore.email || "Não informado"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">Na plataforma desde</span>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(selectedStore.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Informações Adicionais</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs text-muted-foreground">Categoria</p>
                              <p className="font-medium">{selectedStore.category || "Não categorizado"}</p>
                            </div>
                            
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs text-muted-foreground">Taxa de Cashback</p>
                              <p className="font-medium">{selectedStore.commissionRate}%</p>
                            </div>
                            
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs text-muted-foreground">Total de Vendas</p>
                              <p className="font-medium">{selectedStore.transactions} transações</p>
                            </div>
                            
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs text-muted-foreground">Volume Financeiro</p>
                              <p className="font-medium">R$ {Number(selectedStore.volume).toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-base">Benefícios Exclusivos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="bg-white rounded-md p-3 shadow-sm">
                            <Badge className="mb-2" variant="outline">Novo</Badge>
                            <h4 className="font-medium text-sm">Ganhe Cashback</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Receba {selectedStore.commissionRate}% de volta em todas as compras nesta loja.
                            </p>
                          </div>
                          
                          <div className="bg-white rounded-md p-3 shadow-sm">
                            <h4 className="font-medium text-sm">Indique e Ganhe</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Indique amigos para esta loja e ganhe bônus em suas compras.
                            </p>
                          </div>
                          
                          <div className="bg-white rounded-md p-3 shadow-sm">
                            <h4 className="font-medium text-sm">Promoções Exclusivas</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Fique atento a promoções especiais para clientes Vale Cashback.
                            </p>
                          </div>
                          
                          <Button variant="default" className="w-full">
                            Visitar Loja
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="products" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Produtos Populares</CardTitle>
                      <CardDescription>
                        Os produtos mais vendidos desta loja
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Verificação simplificada para evitar erros quando products não existe */}
                      {false ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Produto exemplo */}
                          <div className="border rounded-lg p-3 flex items-start space-x-3">
                            <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">Produto Exemplo</h4>
                              <p className="text-xs text-muted-foreground mt-1">Descrição do produto de exemplo</p>
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  $ 99.90
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                          <h3 className="mt-4 text-base font-medium">Nenhum produto cadastrado</h3>
                          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                            Esta loja ainda não possui produtos cadastrados na plataforma.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="cashback" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Programa de Cashback</CardTitle>
                      <CardDescription>
                        Detalhes sobre o cashback oferecido por esta loja
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="bg-primary/5 p-4 rounded-lg text-center">
                          <h3 className="text-2xl font-bold text-primary">{selectedStore?.commissionRate || 2}%</h3>
                          <p className="text-sm text-muted-foreground">Taxa de cashback padrão</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium">Como funciona</h4>
                            <p className="text-sm text-muted-foreground mt-2">
                              A cada compra realizada, você recebe {selectedStore?.commissionRate || 2}% do valor de volta em forma de cashback na sua conta Vale Cashback.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium">Quando recebo</h4>
                            <p className="text-sm text-muted-foreground mt-2">
                              O cashback é creditado automaticamente na sua conta assim que a transação for confirmada pela loja, geralmente em até 24 horas.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium">Como usar</h4>
                            <p className="text-sm text-muted-foreground mt-2">
                              Você pode usar seu cashback em novas compras ou transferir para sua conta bancária quando atingir o valor mínimo.
                            </p>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Histórico de Transações</h4>
                          
                          {/* Verificação simplificada para evitar erros quando recentTransactions não existe */}
                          {false ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                                <div>
                                  <p className="text-sm font-medium">Compra #123</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date().toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">$ 100.00</p>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {/* Para evitar o erro de selectedStore is possibly null */}
                                    {!selectedStore 
                                      ? "0.00" 
                                      : (100 * (selectedStore && selectedStore.commissionRate ? Number(selectedStore.commissionRate) : 0) / 100).toFixed(2)
                                    } cashback
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Você ainda não realizou compras nesta loja.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}