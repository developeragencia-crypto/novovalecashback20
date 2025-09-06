import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Percent
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
    queryKey: ['/api/stores'],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60000,
    queryFn: async () => {
      console.log("🏪 Buscando lojas...");
      try {
        const response = await fetch('/api/stores', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error(`Erro HTTP: ${response.status}`);
          throw new Error(`Erro ao buscar lojas: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ ${data.length} lojas carregadas`);
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar lojas:', error);
        return [];
      }
    }
  });
  
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

  // Obter categorias únicas
  const categories = Array.from(new Set(storesData?.map((store: StoreItem) => store.category || 'Geral') || []));
  
  // Abrir o modal de detalhes da loja
  const handleOpenStoreDetails = (store: StoreItem) => {
    setSelectedStore(store);
    setIsDialogOpen(true);
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

  // Função para formatar taxa de cashback
  const formatCashbackRate = (rate: string | number | undefined) => {
    if (!rate) return '2.0%';
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return `${numRate.toFixed(1)}%`;
  };

  // Ícones de categoria
  const getCategoryIcon = (category: string = "") => {
    const cat = category.toLowerCase();
    if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('food')) return '🍽️';
    if (cat.includes('farmácia') || cat.includes('saúde')) return '💊';
    if (cat.includes('moda') || cat.includes('roupa')) return '👕';
    if (cat.includes('eletrônico') || cat.includes('tech')) return '📱';
    if (cat.includes('supermercado') || cat.includes('mercado')) return '🛒';
    if (cat.includes('combustível') || cat.includes('posto')) return '⛽';
    return '🏪';
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
              <div className="text-center py-4">
                <p className="text-muted-foreground">Em breve novas promoções exclusivas!</p>
              </div>
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
              ) : storesData?.length === 0 ? (
                <div className="text-center py-10">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhuma loja cadastrada</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Ainda não há lojas cadastradas em nossa plataforma. Os lojistas estão sendo convidados a participar e em breve teremos várias opções disponíveis.
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg max-w-md mx-auto">
                    <h4 className="font-medium mb-1">💡 Dica:</h4>
                    <p className="text-xs">
                      Convide lojistas para se cadastrarem compartilhando seu código de indicação. Cada cadastro de lojista gera um bônus para você!
                    </p>
                  </div>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhuma loja encontrada</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Não encontramos nenhuma loja com os filtros selecionados. Tente ajustar sua busca ou selecionar outra categoria.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredStores.map((store: StoreItem) => (
                    <div
                      key={store.id}
                      className="group rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 bg-white hover:scale-[1.02] hover:border-primary/20"
                      onClick={() => handleOpenStoreDetails(store)}
                    >
                      {/* Banner superior com gradiente e categoria */}
                      <div className={`relative h-32 w-full ${getCategoryClass(store.category)}`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent"></div>
                        
                        {/* Badge da categoria no canto direito */}
                        <div className="absolute top-3 right-3">
                          <Badge 
                            className="bg-white/90 text-primary hover:text-primary border-none shadow-md font-medium px-3"
                          >
                            {store.category}
                          </Badge>
                        </div>
                        
                        {/* Status de cashback destacado */}
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white px-3 py-2 rounded-tl-lg shadow-lg">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-white" />
                            <span className="font-bold">{store.commissionRate}% Cashback</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Cabeçalho com Logo e informações */}
                      <div className="p-5 relative pb-3">
                        <div className="flex gap-4">
                          {/* Logo da loja em círculo */}
                          <div className="absolute -top-12 left-5 h-20 w-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white flex items-center justify-center">
                            {store.logo ? (
                              <img 
                                src={store.logo} 
                                alt={store.store_name || store.name || ""} 
                                className="object-contain max-h-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary font-bold text-xl">
                                {getInitials(store.store_name || store.name || "")}
                              </div>
                            )}
                          </div>
                          
                          {/* Nome e rating alinhados à direita */}
                          <div className="mt-8 w-full">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{store.store_name || store.name}</h3>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <Star className="h-4 w-4 text-gray-300" />
                                </div>
                                <span className="font-medium text-sm">{store.rating?.toFixed(1) || "4.0"}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {store.transactions || 0} vendas
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Separador sutil */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4"></div>
                      </div>
                      
                      {/* Informações de contato e endereço */}
                      <div className="px-5 pb-4 space-y-3">
                        {store.address && (
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-700 leading-snug">{store.address}</div>
                              {store.city && store.state && (
                                <div className="text-xs text-gray-500">{store.city}, {store.state}</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {store.phone && (
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                              <Phone className="h-4 w-4 text-green-500" />
                            </div>
                            <div className="text-sm text-gray-700">{store.phone}</div>
                          </div>
                        )}
                        
                        {store.email && (
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                              <Mail className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="text-sm text-gray-700 truncate max-w-[200px]">{store.email}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Rodapé com data e botão */}
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white border-t">
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          Desde {new Date(store.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 text-white font-medium px-4 rounded-full shadow-sm"
                        >
                          Ver detalhes
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
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
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-xl">
          {selectedStore && (
            <>
              {/* Banner superior com imagem de fundo */}
              <div className={`h-52 w-full relative ${getCategoryClass(selectedStore.category)}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent"></div>
                
                {/* Botão de fechar */}
                <div className="absolute top-4 right-4 z-10">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-md"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </div>
                
                {/* Informações destacadas no banner */}
                <div className="absolute bottom-4 left-28 flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">
                    {selectedStore.store_name || selectedStore.name}
                  </h2>
                  <div className="flex items-center text-white/90">
                    <Badge className="bg-primary/80 text-white border-none shadow-sm mr-2">
                      {selectedStore.category || "Geral"}
                    </Badge>
                    <div className="flex items-center mr-3">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="text-sm">{selectedStore.rating?.toFixed(1) || "0.0"}</span>
                    </div>
                    <span className="text-sm flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Desde {new Date(selectedStore.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                
                {/* Logo da loja no banner */}
                <div className="absolute -bottom-14 left-6">
                  <div className="h-24 w-24 rounded-lg overflow-hidden border-4 border-white shadow-xl bg-white flex items-center justify-center p-1">
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
                
                {/* Cashback destacado */}
                <div className="absolute top-4 left-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-white" />
                    <div>
                      <span className="font-bold text-xl">{selectedStore.commissionRate}%</span>
                      <span className="ml-1 text-sm">Cashback</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Área de conteúdo principal */}
              <div className="pt-16 px-8">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="bg-transparent border-b w-full flex justify-start space-x-6">
                    <TabsTrigger value="info" className="border-b-2 border-transparent data-[state=active]:border-primary bg-transparent px-2 py-2 text-base">
                      <Store className="h-4 w-4 mr-2" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="location" className="border-b-2 border-transparent data-[state=active]:border-primary bg-transparent px-2 py-2 text-base">
                      <MapPin className="h-4 w-4 mr-2" />
                      Localização
                    </TabsTrigger>
                    <TabsTrigger value="promotions" className="border-b-2 border-transparent data-[state=active]:border-primary bg-transparent px-2 py-2 text-base">
                      <Tag className="h-4 w-4 mr-2" />
                      Promoções
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        {/* Descrição da loja */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                            <Store className="h-5 w-5 mr-2 text-primary" />
                            Sobre a Loja
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {selectedStore.description || 
                              `${selectedStore.store_name || selectedStore.name} é uma loja parceira do Vale Cashback que oferece ${selectedStore.commissionRate}% de cashback em todas as compras realizadas. Aproveite para fazer compras e acumular seu cashback!`}
                          </p>
                        </div>
                        
                        {/* Informações de contato */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                            <Phone className="h-5 w-5 mr-2 text-primary" />
                            Informações de Contato
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedStore.phone && (
                              <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <Phone className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-700">Telefone</h4>
                                  <p className="text-gray-600 mt-1">{selectedStore.phone}</p>
                                </div>
                              </div>
                            )}
                            
                            {selectedStore.email && (
                              <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <Mail className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-700">E-mail</h4>
                                  <p className="text-gray-600 mt-1">{selectedStore.email}</p>
                                </div>
                              </div>
                            )}
                            
                            {selectedStore.address && (
                              <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg md:col-span-2">
                                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-700">Endereço</h4>
                                  <p className="text-gray-600 mt-1">{selectedStore.address}</p>
                                  {selectedStore.city && selectedStore.state && (
                                    <p className="text-gray-500 text-sm">{selectedStore.city}, {selectedStore.state}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Card de estatísticas */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                            <CreditCard className="h-5 w-5 mr-2 text-primary" />
                            Informações da Loja
                          </h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                              <span className="text-gray-600">Cashback</span>
                              <span className="font-bold text-lg text-green-600">{selectedStore.commissionRate}%</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-3">
                              <span className="text-gray-600">Categoria</span>
                              <span className="font-medium">{selectedStore.category || "Geral"}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-3">
                              <span className="text-gray-600">Avaliação</span>
                              <div className="flex items-center">
                                <div className="mr-1">
                                  <RatingStars rating={selectedStore.rating || 0} />
                                </div>
                                <span className="font-medium">{selectedStore.rating?.toFixed(1) || "0.0"}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total de Vendas</span>
                              <span className="font-medium">{selectedStore.transactions || 0}</span>
                            </div>
                          </div>
                          
                          {/* Botão de compra */}
                          <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-white shadow-md">
                            <ShoppingBag className="h-4 w-4 mr-2" />
                            Fazer Compra
                          </Button>
                        </div>
                        
                        {/* Horário de funcionamento */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                            <Clock className="h-5 w-5 mr-2 text-primary" />
                            Horário de Funcionamento
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Segunda - Sexta</span>
                              <span className="font-medium">08:00 - 18:00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Sábado</span>
                              <span className="font-medium">09:00 - 14:00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Domingo</span>
                              <span className="font-medium text-red-500">Fechado</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="location" className="py-6">
                    {selectedStore.address ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="h-[400px] w-full relative">
                          {/* Mapa estilizado (simulado) */}
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-gray-100">
                            <img 
                              src="https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=1200x400&maptype=roadmap&style=feature:road|color:0x333333&style=feature:landscape|color:0xeeeeee&style=feature:poi|color:0xdddddd&key=YOUR_API_KEY" 
                              alt="Mapa da localização"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Pin animado */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-bounce">
                              <div className="bg-primary rounded-full p-3 shadow-xl">
                                <MapPin className="h-8 w-8 text-white" />
                              </div>
                              <div className="w-1 h-6 bg-gradient-to-b from-primary to-transparent mx-auto -mt-1"></div>
                            </div>
                          </div>
                          
                          {/* Caixa de endereço */}
                          <div className="absolute left-6 bottom-6 bg-white p-4 rounded-lg shadow-lg max-w-md">
                            <h3 className="font-bold text-gray-800 mb-2">Endereço da Loja</h3>
                            <p className="text-gray-600">{selectedStore.address}</p>
                            {selectedStore.city && selectedStore.state && (
                              <p className="text-gray-500 mt-1">{selectedStore.city}, {selectedStore.state}</p>
                            )}
                            
                            <div className="mt-4 flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <MapPin className="h-4 w-4 mr-2" />
                                Como chegar
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Phone className="h-4 w-4 mr-2" />
                                Ligar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <MapPin className="h-16 w-16 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-xl font-medium">Endereço não disponível</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                          Esta loja não possui endereço cadastrado. Entre em contato para mais informações.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="promotions" className="py-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <h3 className="text-lg font-bold mb-6 flex items-center text-gray-800">
                        <Tag className="h-5 w-5 mr-2 text-primary" />
                        Promoções Ativas
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Promoção 1 */}
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-amber-900">Oferta de Cashback</h4>
                            <Badge className="bg-amber-500 text-white">Até 31/05</Badge>
                          </div>
                          <p className="mt-2 text-amber-800">Cashback adicional de 2% em todas as compras acima de $100.</p>
                          <div className="mt-3 flex gap-2">
                            <Badge variant="outline" className="bg-white text-amber-700 border-amber-200">
                              +2% Cashback
                            </Badge>
                            <Badge variant="outline" className="bg-white text-amber-700 border-amber-200">
                              Compras acima de $100
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Promoção 2 */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-blue-900">Desconto para Primeira Compra</h4>
                            <Badge className="bg-blue-500 text-white">Sempre</Badge>
                          </div>
                          <p className="mt-2 text-blue-800">Desconto de 10% na sua primeira compra com Vale Cashback.</p>
                          <div className="mt-3 flex gap-2">
                            <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                              10% OFF
                            </Badge>
                            <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                              Primeira compra
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Separador */}
                      <div className="my-6 h-px w-full bg-gray-200"></div>
                      
                      {/* Seção de cupons */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center text-gray-800">
                          <Tag className="h-5 w-5 mr-2 text-primary" />
                          Cupons Disponíveis
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                          Ver todos
                        </Button>
                      </div>
                      
                      {/* Cupom destacado */}
                      <div className="bg-gradient-to-r from-primary/5 to-primary/20 p-4 rounded-lg border border-primary/30 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-primary">VALE10</h4>
                          <p className="text-sm text-gray-600 mt-1">10% de desconto em compras acima de $50</p>
                        </div>
                        <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                          Copiar Código
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Rodapé com detalhes legais */}
              <div className="p-4 bg-gray-50 border-t mt-4 flex justify-between items-center text-xs text-gray-500">
                <div>ID da Loja: {selectedStore.id} • Atualizado em {new Date().toLocaleDateString('pt-BR')}</div>
                <div>© {new Date().getFullYear()} Vale Cashback</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}