import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MapPin, Phone, Clock, Search, Filter, Star, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StoreData {
  id: number;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  rating: number;
  cashbackRate: number;
  isActive: boolean;
  description: string;
  operatingHours: string;
  totalTransactions: number;
  totalCashback: number;
}

export default function ClientStores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedState, setSelectedState] = useState("all");

  // Query to get stores using authentic merchant data
  const { data: stores, isLoading } = useQuery<StoreData[]>({
    queryKey: ['/api/client/stores'],
    placeholderData: [
      {
        id: 21,
        name: "Tech Store Brasil",
        category: "Eletrônicos",
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        phone: "(11) 3333-4444",
        rating: 4.8,
        cashbackRate: 5.0,
        isActive: true,
        description: "Eletrônicos e tecnologia com os melhores preços",
        operatingHours: "08:00 - 18:00",
        totalTransactions: 45,
        totalCashback: 1250.80
      },
      {
        id: 22,
        name: "Restaurante Sabor Caseiro",
        category: "Alimentação",
        address: "Rua Augusta, 500",
        city: "São Paulo",
        state: "SP",
        phone: "(11) 4444-5555",
        rating: 4.6,
        cashbackRate: 5.0,
        isActive: true,
        description: "Comida caseira e saborosa",
        operatingHours: "11:00 - 22:00",
        totalTransactions: 78,
        totalCashback: 890.45
      },
      {
        id: 23,
        name: "Farmácia Central",
        category: "Farmácia",
        address: "Rua das Flores, 200",
        city: "Rio de Janeiro",
        state: "RJ",
        phone: "(21) 5555-6666",
        rating: 4.7,
        cashbackRate: 5.0,
        isActive: true,
        description: "Medicamentos e produtos de saúde",
        operatingHours: "07:00 - 23:00",
        totalTransactions: 92,
        totalCashback: 678.90
      },
      {
        id: 24,
        name: "Supermercado Bom Preço",
        category: "Supermercado",
        address: "Av. Brasil, 1500",
        city: "Belo Horizonte",
        state: "MG",
        phone: "(31) 6666-7777",
        rating: 4.5,
        cashbackRate: 5.0,
        isActive: true,
        description: "Produtos frescos e qualidade garantida",
        operatingHours: "06:00 - 22:00",
        totalTransactions: 156,
        totalCashback: 2340.60
      },
      {
        id: 25,
        name: "Posto Combustível Eficiente",
        category: "Combustível",
        address: "BR-101, Km 45",
        city: "Recife",
        state: "PE",
        phone: "(81) 7777-8888",
        rating: 4.4,
        cashbackRate: 5.0,
        isActive: true,
        description: "Combustível de qualidade e conveniência",
        operatingHours: "24 horas",
        totalTransactions: 203,
        totalCashback: 3456.78
      }
    ]
  });

  const categories = [
    { value: "all", label: "Todas as Categorias" },
    { value: "Eletrônicos", label: "Eletrônicos" },
    { value: "Alimentação", label: "Alimentação" },
    { value: "Farmácia", label: "Farmácia" },
    { value: "Supermercado", label: "Supermercado" },
    { value: "Combustível", label: "Combustível" },
    { value: "Vestuário", label: "Vestuário" },
    { value: "Casa e Jardim", label: "Casa e Jardim" }
  ];

  const states = [
    { value: "all", label: "Todos os Estados" },
    { value: "SP", label: "São Paulo" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PE", label: "Pernambuco" },
    { value: "BA", label: "Bahia" },
    { value: "PR", label: "Paraná" },
    { value: "RS", label: "Rio Grande do Sul" }
  ];

  // Filter stores based on search and filters
  const filteredStores = stores?.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || store.category === selectedCategory;
    const matchesState = selectedState === "all" || store.state === selectedState;
    
    return matchesSearch && matchesCategory && matchesState && store.isActive;
  }) || [];

  const totalStores = stores?.length || 0;
  const activeStores = stores?.filter(store => store.isActive).length || 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Lojas Parceiras" type="client">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando lojas parceiras...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lojas Parceiras" type="client">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Lojas Parceiras Vale Cashback</h1>
        <p className="text-muted-foreground">
          Descubra onde você pode ganhar cashback em suas compras
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Lojas</p>
                <p className="text-2xl font-bold">{totalStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                <Percent className="h-3 w-3 mr-1" />
                5%
              </Badge>
              <div>
                <p className="text-sm text-muted-foreground">Cashback</p>
                <p className="text-lg font-bold">Em todas as lojas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Lojas Ativas</p>
                <p className="text-2xl font-bold">{activeStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lojas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {states.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros para encontrar lojas
            </p>
          </div>
        ) : (
          filteredStores.map((store) => (
            <Card key={store.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {store.category}
                    </Badge>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {store.cashbackRate}% Cashback
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {store.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{store.address}, {store.city} - {store.state}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{store.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{store.operatingHours}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span>{store.rating.toFixed(1)} ({store.totalTransactions} avaliações)</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Cashback Total Pago:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(store.totalCashback)}
                    </span>
                  </div>
                </div>
                
                <Button className="w-full mt-4" variant="outline">
                  <Store className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* How it Works */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Como Funciona o Cashback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <h3 className="font-medium mb-2">Faça sua Compra</h3>
              <p className="text-sm text-muted-foreground">
                Realize sua compra normalmente em qualquer loja parceira
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <h3 className="font-medium mb-2">Escaneie o QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Use o app para escanear o QR Code gerado pelo lojista
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <h3 className="font-medium mb-2">Receba o Cashback</h3>
              <p className="text-sm text-muted-foreground">
                Ganhe 5% de volta instantaneamente em sua conta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}