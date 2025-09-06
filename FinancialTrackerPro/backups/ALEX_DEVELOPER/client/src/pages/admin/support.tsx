import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User, 
  Search, 
  Filter, 
  RefreshCw,
  Send,
  Share,
  FileText,
  Headphones,
  ShieldCheck,
  PieChart,
  List,
  Settings,
  ChevronRight,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Tipos
interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    type: string;
  };
  assignedTo: {
    id: number;
    name: string;
  } | null;
  messages: {
    id: number;
    content: string;
    createdAt: string;
    isAdmin: boolean;
    user: {
      id: number;
      name: string;
    };
  }[];
}

export default function AdminSupport() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { toast } = useToast();
  
  // Query para buscar tickets de suporte
  const { data, isLoading, refetch } = useQuery<{
    tickets: SupportTicket[];
    totalOpen: number;
    totalInProgress: number;
    totalResolved: number;
    totalClosed: number;
    totalPages: number;
  }>({
    queryKey: ['/api/admin/support/tickets', {
      page,
      pageSize,
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      search: searchTerm
    }],
    enabled: activeTab === "tickets",
    placeholderData: {
      tickets: [
        {
          id: "T-1234",
          subject: "Problema ao gerar QR Code",
          description: "Estou tentando gerar um QR Code para pagamento, mas recebo um erro de 'timeout'",
          status: "open",
          priority: "high",
          category: "technical",
          createdAt: "2023-07-21T10:22:00Z",
          updatedAt: "2023-07-21T10:22:00Z",
          user: {
            id: 123,
            name: "Maria Silva",
            email: "maria@example.com",
            type: "client"
          },
          assignedTo: null,
          messages: [
            {
              id: 1,
              content: "Estou tentando gerar um QR Code para pagamento, mas recebo um erro de 'timeout'. Já tentei várias vezes e sempre ocorre o mesmo problema.",
              createdAt: "2023-07-21T10:22:00Z",
              isAdmin: false,
              user: {
                id: 123,
                name: "Maria Silva"
              }
            }
          ]
        },
        {
          id: "T-1233",
          subject: "Dúvida sobre o programa de indicações",
          description: "Gostaria de entender melhor como funciona o programa de indicações para lojistas.",
          status: "in_progress",
          priority: "medium",
          category: "account",
          createdAt: "2023-07-20T15:30:00Z",
          updatedAt: "2023-07-21T09:45:00Z",
          user: {
            id: 456,
            name: "João Santos",
            email: "joao@example.com",
            type: "merchant"
          },
          assignedTo: {
            id: 789,
            name: "Carlos Suporte"
          },
          messages: [
            {
              id: 2,
              content: "Gostaria de entender melhor como funciona o programa de indicações para lojistas. Qual é a comissão que recebemos por indicação?",
              createdAt: "2023-07-20T15:30:00Z",
              isAdmin: false,
              user: {
                id: 456,
                name: "João Santos"
              }
            },
            {
              id: 3,
              content: "Olá João, estou analisando sua dúvida e em breve retornarei com todas as informações sobre o programa de indicações. Obrigado pela paciência.",
              createdAt: "2023-07-21T09:45:00Z",
              isAdmin: true,
              user: {
                id: 789,
                name: "Carlos Suporte"
              }
            }
          ]
        },
        {
          id: "T-1230",
          subject: "Cashback não creditado",
          description: "Realizei uma compra há 3 dias e o cashback ainda não foi creditado na minha conta.",
          status: "resolved",
          priority: "high",
          category: "payment",
          createdAt: "2023-07-18T11:15:00Z",
          updatedAt: "2023-07-19T16:20:00Z",
          user: {
            id: 789,
            name: "Ana Oliveira",
            email: "ana@example.com",
            type: "client"
          },
          assignedTo: {
            id: 101,
            name: "Pedro Suporte"
          },
          messages: [
            {
              id: 4,
              content: "Realizei uma compra na loja ABC no valor de R$ 150,00 há 3 dias e o cashback de 2% (R$ 3,00) ainda não foi creditado na minha conta. O número da transação é TX-45678.",
              createdAt: "2023-07-18T11:15:00Z",
              isAdmin: false,
              user: {
                id: 789,
                name: "Ana Oliveira"
              }
            },
            {
              id: 5,
              content: "Olá Ana, verificamos o seu caso e identificamos um atraso no processamento do cashback. Já realizamos o crédito de $ 3.00 em sua conta e também adicionamos um bônus de $ 1.00 como compensação pelo transtorno. Pedimos desculpas pelo ocorrido.",
              createdAt: "2023-07-19T14:30:00Z",
              isAdmin: true,
              user: {
                id: 101,
                name: "Pedro Suporte"
              }
            },
            {
              id: 6,
              content: "Muito obrigada! Já verifiquei e o valor está na minha conta. Agradeço a atenção e o bônus.",
              createdAt: "2023-07-19T15:45:00Z",
              isAdmin: false,
              user: {
                id: 789,
                name: "Ana Oliveira"
              }
            },
            {
              id: 7,
              content: "Fico feliz que tenha sido resolvido. Se precisar de mais alguma coisa, estamos à disposição!",
              createdAt: "2023-07-19T16:20:00Z",
              isAdmin: true,
              user: {
                id: 101,
                name: "Pedro Suporte"
              }
            }
          ]
        }
      ],
      totalOpen: 15,
      totalInProgress: 8,
      totalResolved: 22,
      totalClosed: 45,
      totalPages: 9
    }
  });
  
  // Query para estatísticas de suporte
  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/support/stats'],
    enabled: activeTab === "dashboard",
    placeholderData: {
      ticketsByCategory: [
        { category: "technical", count: 45 },
        { category: "payment", count: 32 },
        { category: "account", count: 28 },
        { category: "merchant", count: 15 },
        { category: "cashback", count: 10 },
        { category: "other", count: 5 }
      ],
      ticketsByPriority: [
        { priority: "low", count: 25 },
        { priority: "medium", count: 65 },
        { priority: "high", count: 38 },
        { priority: "critical", count: 7 }
      ],
      ticketsByUserType: [
        { type: "client", count: 85 },
        { type: "merchant", count: 45 },
        { type: "admin", count: 5 }
      ],
      responseTime: {
        average: 4.5, // horas
        byPriority: [
          { priority: "low", time: 12 }, // horas
          { priority: "medium", time: 6 },
          { priority: "high", time: 2 },
          { priority: "critical", time: 0.5 }
        ]
      },
      ticketsClosedLastWeek: 35,
      ticketsOpenedLastWeek: 42,
      satisfactionRate: 4.7, // em escala de 1 a 5
    }
  });
  
  // Mutation para responder um ticket
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/tickets/${ticketId}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada com sucesso.",
      });
      
      // Limpar a mensagem de resposta
      setReplyMessage("");
      
      // Recarregar os tickets
      refetch();
      
      // Simular atualização do ticket selecionado
      if (selectedTicket) {
        const now = new Date().toISOString();
        setSelectedTicket({
          ...selectedTicket,
          status: "in_progress",
          updatedAt: now,
          messages: [
            ...selectedTicket.messages,
            {
              id: Math.floor(Math.random() * 1000),
              content: replyMessage,
              createdAt: now,
              isAdmin: true,
              user: {
                id: 999,
                name: "Administrador"
              }
            }
          ]
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao enviar resposta",
        description: "Ocorreu um erro ao enviar sua resposta. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atualizar status do ticket
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/support/tickets/${ticketId}`, { status });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Status atualizado",
        description: `O ticket foi marcado como ${
          variables.status === "resolved" ? "resolvido" : 
          variables.status === "closed" ? "fechado" : 
          variables.status === "in_progress" ? "em andamento" : 
          "aberto"
        }.`,
      });
      
      // Recarregar os tickets
      refetch();
      
      // Atualizar o ticket selecionado
      if (selectedTicket && selectedTicket.id === variables.ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: variables.status as any,
          updatedAt: new Date().toISOString()
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status do ticket. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atribuir ticket a um agente
  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, agentId }: { ticketId: string; agentId: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/support/tickets/${ticketId}/assign`, { agentId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ticket atribuído",
        description: `O ticket foi atribuído a ${data.assignedTo.name}.`,
      });
      
      // Recarregar os tickets
      refetch();
      
      // Atualizar o ticket selecionado
      if (selectedTicket && selectedTicket.id === data.id) {
        setSelectedTicket({
          ...selectedTicket,
          assignedTo: data.assignedTo,
          updatedAt: new Date().toISOString()
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao atribuir ticket",
        description: "Ocorreu um erro ao atribuir o ticket. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Visualizar detalhes do ticket
  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
  };
  
  // Fechar a visualização de detalhes
  const handleCloseTicketView = () => {
    setSelectedTicket(null);
  };
  
  // Enviar resposta para o ticket
  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    replyMutation.mutate({
      ticketId: selectedTicket.id,
      message: replyMessage
    });
  };
  
  // Atualizar status do ticket
  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedTicket) return;
    
    updateStatusMutation.mutate({
      ticketId: selectedTicket.id,
      status: newStatus
    });
  };
  
  // Atribuir ticket a um agente
  const handleAssignTicket = (agentId: number) => {
    if (!selectedTicket) return;
    
    assignTicketMutation.mutate({
      ticketId: selectedTicket.id,
      agentId
    });
  };
  
  // Atribui cores com base no status do ticket
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "open": "bg-blue-100 text-blue-800",
      "in_progress": "bg-yellow-100 text-yellow-800",
      "resolved": "bg-green-100 text-green-800",
      "closed": "bg-gray-100 text-gray-800"
    };
    
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };
  
  // Atribui ícones com base no status do ticket
  const getStatusIcon = (status: string) => {
    const statusIcons: Record<string, JSX.Element> = {
      "open": <Clock className="h-4 w-4" />,
      "in_progress": <RefreshCw className="h-4 w-4" />,
      "resolved": <CheckCircle2 className="h-4 w-4" />,
      "closed": <XCircle className="h-4 w-4" />
    };
    
    return statusIcons[status] || <Clock className="h-4 w-4" />;
  };
  
  // Atribui cores com base na prioridade do ticket
  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      "low": "bg-gray-100 text-gray-800",
      "medium": "bg-blue-100 text-blue-800",
      "high": "bg-orange-100 text-orange-800",
      "critical": "bg-red-100 text-red-800"
    };
    
    return priorityColors[priority] || "bg-gray-100 text-gray-800";
  };
  
  // Definição das colunas da tabela de tickets
  const ticketColumns = [
    {
      header: "ID",
      accessorKey: "id" as keyof SupportTicket,
    },
    {
      header: "Assunto",
      accessorKey: "subject" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => (
        <div className="max-w-md truncate font-medium">
          {ticket.subject}
        </div>
      ),
    },
    {
      header: "Usuário",
      accessorKey: "user" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => (
        <div className="flex items-center">
          <Avatar className="h-6 w-6 mr-2">
            <AvatarFallback>{ticket.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{ticket.user.name}</div>
            <div className="text-xs text-muted-foreground">{ticket.user.type}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => {
        const statusLabels: Record<string, string> = {
          "open": "Aberto",
          "in_progress": "Em Andamento",
          "resolved": "Resolvido",
          "closed": "Fechado"
        };
        
        return (
          <div className={`rounded-full px-2 py-1 text-xs font-medium inline-flex items-center ${getStatusColor(ticket.status)}`}>
            {getStatusIcon(ticket.status)}
            <span className="ml-1">{statusLabels[ticket.status]}</span>
          </div>
        );
      },
    },
    {
      header: "Prioridade",
      accessorKey: "priority" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => {
        const priorityLabels: Record<string, string> = {
          "low": "Baixa",
          "medium": "Média",
          "high": "Alta",
          "critical": "Crítica"
        };
        
        return (
          <div className={`rounded-full px-2 py-1 text-xs font-medium inline-flex items-center ${getPriorityColor(ticket.priority)}`}>
            <span>{priorityLabels[ticket.priority]}</span>
          </div>
        );
      },
    },
    {
      header: "Categoria",
      accessorKey: "category" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => {
        const categoryLabels: Record<string, string> = {
          "technical": "Técnico",
          "payment": "Pagamento",
          "account": "Conta",
          "merchant": "Lojista",
          "cashback": "Cashback",
          "other": "Outro"
        };
        
        return (
          <span className="capitalize">{categoryLabels[ticket.category] || ticket.category}</span>
        );
      },
    },
    {
      header: "Criado em",
      accessorKey: "createdAt" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => (
        <span>{formatDate(ticket.createdAt)}</span>
      ),
    },
    {
      header: "Atualizado em",
      accessorKey: "updatedAt" as keyof SupportTicket,
      cell: (ticket: SupportTicket) => (
        <span>{formatDate(ticket.updatedAt)}</span>
      ),
    },
  ];
  
  // Ações para a tabela de tickets
  const ticketActions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (ticket: SupportTicket) => handleViewTicket(ticket),
    }
  ];
  
  // Renderizar o dashboard de estatísticas de suporte
  const renderSupportDashboard = () => {
    if (!statsData) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tickets Abertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {data?.totalOpen || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                + {statsData.ticketsOpenedLastWeek} nos últimos 7 dias
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {data?.totalInProgress || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Aguardando resolução
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resolvidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data?.totalResolved || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {statsData.ticketsClosedLastWeek} nos últimos 7 dias
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tempo de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.responseTime.average}h
              </div>
              <p className="text-sm text-muted-foreground">
                Média de resposta
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsData.ticketsByCategory.map((category) => {
                  const categoryLabels: Record<string, string> = {
                    "technical": "Técnico",
                    "payment": "Pagamento",
                    "account": "Conta",
                    "merchant": "Lojista",
                    "cashback": "Cashback",
                    "other": "Outro"
                  };
                  
                  const totalTickets = statsData.ticketsByCategory.reduce((sum, cat) => sum + cat.count, 0);
                  const percentage = Math.round((category.count / totalTickets) * 100);
                  
                  return (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{categoryLabels[category.category] || category.category}</span>
                        <span className="font-medium">{category.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsData.ticketsByPriority.map((priority) => {
                  const priorityLabels: Record<string, string> = {
                    "low": "Baixa",
                    "medium": "Média",
                    "high": "Alta",
                    "critical": "Crítica"
                  };
                  
                  const totalTickets = statsData.ticketsByPriority.reduce((sum, pri) => sum + pri.count, 0);
                  const percentage = Math.round((priority.count / totalTickets) * 100);
                  
                  const priorityColors: Record<string, string> = {
                    "low": "bg-gray-500",
                    "medium": "bg-blue-500",
                    "high": "bg-orange-500",
                    "critical": "bg-red-500"
                  };
                  
                  return (
                    <div key={priority.priority} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{priorityLabels[priority.priority]}</span>
                        <span className="font-medium">{priority.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${priorityColors[priority.priority]} h-2 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Resposta por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsData.responseTime.byPriority.map((priority) => {
                  const priorityLabels: Record<string, string> = {
                    "low": "Baixa",
                    "medium": "Média",
                    "high": "Alta",
                    "critical": "Crítica"
                  };
                  
                  const priorityColors: Record<string, string> = {
                    "low": "text-gray-600",
                    "medium": "text-blue-600",
                    "high": "text-orange-600",
                    "critical": "text-red-600"
                  };
                  
                  return (
                    <div key={priority.priority} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${priorityColors[priority.priority].replace("text", "bg")} mr-2`}></div>
                        <span>{priorityLabels[priority.priority]}</span>
                      </div>
                      <span className={`font-medium ${priorityColors[priority.priority]}`}>
                        {priority.time} horas
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Por Tipo de Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsData.ticketsByUserType.map((userType) => {
                  const userTypeLabels: Record<string, string> = {
                    "client": "Cliente",
                    "merchant": "Lojista",
                    "admin": "Administrador"
                  };
                  
                  const totalTickets = statsData.ticketsByUserType.reduce((sum, type) => sum + type.count, 0);
                  const percentage = Math.round((userType.count / totalTickets) * 100);
                  
                  const userTypeColors: Record<string, string> = {
                    "client": "bg-green-500",
                    "merchant": "bg-blue-500",
                    "admin": "bg-purple-500"
                  };
                  
                  return (
                    <div key={userType.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{userTypeLabels[userType.type]}</span>
                        <span className="font-medium">{userType.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${userTypeColors[userType.type]} h-2 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Satisfação do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center my-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {statsData.satisfactionRate.toFixed(1)}
                </div>
                <div className="flex items-center justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg 
                      key={i}
                      className={`w-6 h-6 ${i < Math.round(statsData.satisfactionRate) ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Baseado em {statsData.ticketsClosedLastWeek + statsData.ticketsOpenedLastWeek} avaliações
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Renderizar lista de tickets ou detalhes
  const renderTicketsContent = () => {
    // Se um ticket está selecionado, mostrar detalhes
    if (selectedTicket) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCloseTicketView}
            >
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
              Voltar para lista
            </Button>
            
            <div className="flex items-center gap-2">
              <Select 
                value={selectedTicket.status} 
                onValueChange={(value) => handleUpdateStatus(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                defaultValue={selectedTicket.assignedTo?.id.toString() || ""}
                onValueChange={(value) => handleAssignTicket(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Atribuir para" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  <SelectItem value="123">Amanda Suporte</SelectItem>
                  <SelectItem value="456">Bruno Suporte</SelectItem>
                  <SelectItem value="789">Carlos Suporte</SelectItem>
                  <SelectItem value="101">Pedro Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    {selectedTicket.subject}
                    <Badge 
                      variant="outline" 
                      className="ml-3"
                    >
                      {selectedTicket.id}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Aberto por {selectedTicket.user.name} ({selectedTicket.user.type}) em {formatDate(selectedTicket.createdAt)}
                  </CardDescription>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <div className={`rounded-full px-3 py-1 text-xs font-medium inline-flex items-center ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1">
                      {selectedTicket.status === "open" ? "Aberto" : 
                        selectedTicket.status === "in_progress" ? "Em Andamento" : 
                        selectedTicket.status === "resolved" ? "Resolvido" : 
                        "Fechado"}
                    </span>
                  </div>
                  
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority === "low" ? "Baixa" : 
                      selectedTicket.priority === "medium" ? "Média" : 
                      selectedTicket.priority === "high" ? "Alta" : 
                      "Crítica"}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Descrição do Problema</h3>
                  <p className="text-gray-700">{selectedTicket.description}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Histórico de Mensagens</h3>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
                    {selectedTicket.messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.isAdmin ? "justify-start" : "justify-end"}`}
                      >
                        <div className={`max-w-3/4 rounded-lg p-3 ${
                          message.isAdmin ? "bg-primary text-white" : "bg-muted"
                        }`}>
                          <div className="flex items-center mb-1">
                            {message.isAdmin ? (
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback className="bg-secondary text-white text-xs">
                                  {message.user.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                            <span className={`text-xs ${message.isAdmin ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {message.isAdmin ? message.user.name : "Cliente"} • {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedTicket.status !== "closed" && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Responder</h3>
                    <Textarea
                      placeholder="Escreva sua resposta..."
                      className="min-h-[120px]"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyMessage.trim() || replyMutation.isPending}
                      >
                        {replyMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Resposta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            
            {selectedTicket.status === "closed" && (
              <CardFooter className="bg-gray-50 border-t">
                <div className="w-full text-center text-sm text-muted-foreground py-1">
                  Este ticket está fechado. Para reabrir, mude o status para "Aberto".
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      );
    }
    
    // Mostrar lista de tickets
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tickets de Suporte</CardTitle>
          <CardDescription>
            Gerencie e responda a todos os tickets de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
              >
                Todos ({(data?.totalOpen || 0) + (data?.totalInProgress || 0) + (data?.totalResolved || 0) + (data?.totalClosed || 0)})
              </Button>
              <Button
                variant={statusFilter === "open" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("open")}
              >
                Abertos ({data?.totalOpen || 0})
              </Button>
              <Button
                variant={statusFilter === "in_progress" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("in_progress")}
              >
                Em Andamento ({data?.totalInProgress || 0})
              </Button>
              <Button
                variant={statusFilter === "resolved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("resolved")}
              >
                Resolvidos ({data?.totalResolved || 0})
              </Button>
              <Button
                variant={statusFilter === "closed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("closed")}
              >
                Fechados ({data?.totalClosed || 0})
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tickets..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={priorityFilter || ""} onValueChange={(val) => setPriorityFilter(val || null)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter || ""} onValueChange={(val) => setCategoryFilter(val || null)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                  <SelectItem value="account">Conta</SelectItem>
                  <SelectItem value="merchant">Lojista</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DataTable
            data={data?.tickets || []}
            columns={ticketColumns}
            actions={ticketActions}
            searchable={false}
            pagination={{
              pageIndex: page - 1,
              pageSize: pageSize,
              pageCount: data?.totalPages || 1,
              onPageChange: (newPage) => setPage(newPage + 1),
            }}
          />
        </CardContent>
      </Card>
    );
  };
  
  return (
    <DashboardLayout title="Central de Suporte" type="admin">
      <Tabs defaultValue="tickets" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="dashboard">
              <PieChart className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <List className="h-4 w-4 mr-2" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboard">
          {renderSupportDashboard()}
        </TabsContent>
        
        <TabsContent value="tickets">
          {renderTicketsContent()}
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Suporte</CardTitle>
              <CardDescription>
                Configure os parâmetros do sistema de suporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Respostas Automáticas</h3>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-response">
                      Ativar respostas automáticas
                    </Label>
                    <Switch id="auto-response" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-categorize">
                      Categorização automática de tickets
                    </Label>
                    <Switch id="auto-categorize" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-assign">
                      Atribuição automática de tickets
                    </Label>
                    <Switch id="auto-assign" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="satisfaction-survey">
                      Enviar pesquisa de satisfação
                    </Label>
                    <Switch id="satisfaction-survey" defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Prazos e Notificações</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="response-sla">Prazo para primeira resposta (horas)</Label>
                      <Input id="response-sla" type="number" defaultValue="4" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="resolution-sla">Prazo para resolução (horas)</Label>
                      <Input id="resolution-sla" type="number" defaultValue="24" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="escalation-time">Tempo para escalonamento (horas)</Label>
                      <Input id="escalation-time" type="number" defaultValue="8" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reminder-time">Intervalo de lembretes (horas)</Label>
                      <Input id="reminder-time" type="number" defaultValue="4" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Mensagens Prontas</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-greeting">Saudação</Label>
                      <Textarea
                        id="template-greeting"
                        className="mt-1"
                        rows={3}
                        defaultValue="Olá, {nome}! Obrigado por entrar em contato com o suporte do Vale Cashback. Como posso ajudar hoje?"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="template-closing">Encerramento</Label>
                      <Textarea
                        id="template-closing"
                        className="mt-1"
                        rows={3}
                        defaultValue="Espero ter resolvido sua dúvida. Se precisar de mais alguma coisa, não hesite em nos contatar novamente. Tenha um ótimo dia!"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}