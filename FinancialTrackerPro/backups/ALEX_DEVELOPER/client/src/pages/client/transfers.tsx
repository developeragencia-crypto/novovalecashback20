import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowUp, ArrowDown, Clock, Mail, Phone, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock transfer data - would be replaced with real data from API
const transferHistory = [
  { id: 1, type: "sent", user: "maria@email.com", amount: 5.00, date: "10/07/2023", time: "14:30", description: "Ajuda com o almoço", status: "completed" },
  { id: 2, type: "received", user: "carlos@email.com", amount: 10.00, date: "05/07/2023", time: "09:15", description: "Divisão de conta", status: "completed" },
  { id: 3, type: "sent", user: "pedro@email.com", amount: 15.00, date: "01/07/2023", time: "18:22", description: "Pagamento", status: "completed" },
  { id: 4, type: "received", user: "ana@email.com", amount: 7.50, date: "28/06/2023", time: "11:05", description: "Presente", status: "completed" },
];

interface Transfer {
  id: number;
  type: 'outgoing' | 'incoming';
  from: string;
  to: string;
  amount: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

interface RecipientInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

export default function ClientTransfers() {
  const [recipient, setRecipient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMethod, setSearchMethod] = useState<"email" | "phone">("email");
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [searchResults, setSearchResults] = useState<RecipientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Query to get transfer history
  const { data, isLoading } = useQuery<Transfer[]>({
    queryKey: ['/api/client/transfers'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client/transfers");
      return await response.json();
    }
  });
  
  // Buscar usuário quando o termo de busca muda
  useEffect(() => {
    if (searchTerm.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const response = await apiRequest("GET", `/api/client/search-users?search=${encodeURIComponent(searchTerm)}&method=${searchMethod}`);
        const data = await response.json();
        setSearchResults(data ? [data] : []);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar os usuários. Tente novamente.",
          variant: "destructive",
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce para evitar muitas requisições
    const timeout = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, searchMethod, toast]);

  // Selecionar um usuário da lista de resultados
  const handleSelectUser = (user: RecipientInfo) => {
    setRecipientInfo(user);
    setRecipient(searchMethod === "email" ? user.email : user.phone);
    setSearchTerm("");
    setSearchResults([]);
  };

  // Limpar usuário selecionado
  const handleClearRecipient = () => {
    setRecipientInfo(null);
    setRecipient("");
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await apiRequest("POST", "/api/client/transfers", {
        recipient,
        recipientId: recipientInfo?.id,
        searchMethod,
        amount: parseFloat(amount),
        description,
      });

      // Reset form
      setRecipient("");
      setAmount("");
      setDescription("");
      setRecipientInfo(null);

      // Invalidate transfers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/client/transfers'] });

      toast({
        title: "Transferência realizada",
        description: `Você transferiu $ ${parseFloat(amount).toFixed(2)} para ${recipientInfo?.name || recipient}`,
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Erro na transferência",
        description: err.message || "Ocorreu um erro ao processar a transferência. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Transferências" type="client">
      <div className="grid md:grid-cols-2 gap-6">
        {/* New Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Transferência</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransfer} className="space-y-4">
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger 
                    value="email" 
                    onClick={() => {
                      setSearchMethod("email");
                      setRecipientInfo(null);
                      setRecipient("");
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    E-mail
                  </TabsTrigger>
                  <TabsTrigger 
                    value="phone" 
                    onClick={() => {
                      setSearchMethod("phone");
                      setRecipientInfo(null);
                      setRecipient("");
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Telefone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-email">Buscar por E-mail</Label>
                      <div className="relative">
                        <Input
                          id="search-email"
                          type="email"
                          placeholder="Digite o e-mail para buscar"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          disabled={loading || !!recipientInfo}
                          className="pr-10"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        {searchTerm && !isSearching && !recipientInfo && (
                          <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Resultados da busca */}
                    {searchResults.length > 0 && !recipientInfo && (
                      <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div 
                            key={user.id} 
                            className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                              {user.photo ? (
                                <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-5 w-5 text-secondary-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Usuário selecionado */}
                    {recipientInfo && (
                      <div className="border rounded-md p-3 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Destinatário:</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClearRecipient}
                            className="h-6 px-2 text-muted-foreground"
                          >
                            Alterar
                          </Button>
                        </div>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                            {recipientInfo.photo ? (
                              <img src={recipientInfo.photo} alt={recipientInfo.name} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-secondary-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{recipientInfo.name}</p>
                            <p className="text-sm text-muted-foreground">{recipientInfo.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="phone" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-phone">Buscar por Telefone</Label>
                      <div className="relative">
                        <Input
                          id="search-phone"
                          type="tel"
                          placeholder="Digite o telefone para buscar"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          disabled={loading || !!recipientInfo}
                          className="pr-10"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        {searchTerm && !isSearching && !recipientInfo && (
                          <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Resultados da busca */}
                    {searchResults.length > 0 && !recipientInfo && (
                      <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div 
                            key={user.id} 
                            className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                              {user.photo ? (
                                <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-5 w-5 text-secondary-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Usuário selecionado */}
                    {recipientInfo && (
                      <div className="border rounded-md p-3 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Destinatário:</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClearRecipient}
                            className="h-6 px-2 text-muted-foreground"
                          >
                            Alterar
                          </Button>
                        </div>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                            {recipientInfo.photo ? (
                              <img src={recipientInfo.photo} alt={recipientInfo.name} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-secondary-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{recipientInfo.name}</p>
                            <p className="text-sm text-muted-foreground">{recipientInfo.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Motivo da transferência"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-secondary" 
                disabled={loading || !recipientInfo}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Transferir
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transfer History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transferências</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {(data || []).map((transfer: Transfer) => (
                  <div key={transfer.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">
                        {transfer.type === "outgoing" ? "Enviado para: " : "Recebido de: "}
                        {transfer.type === "outgoing" ? transfer.to : transfer.from}
                      </span>
                      <span className={transfer.type === "outgoing" ? "text-red-600" : "text-green-600"}>
                        {transfer.type === "outgoing" ? "-" : "+"}$ {transfer.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>{transfer.date}</span>
                      </div>
                      <span className="truncate max-w-[150px]">{transfer.description}</span>
                    </div>
                    {transfer.status && (
                      <div className="mt-2 flex justify-end">
                        <Badge variant="outline" className={
                          transfer.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                          transfer.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : 
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }>
                          {transfer.status === "completed" ? "Concluída" : 
                           transfer.status === "pending" ? "Pendente" : 
                           transfer.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}

                {(!data || data.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma transferência encontrada.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
