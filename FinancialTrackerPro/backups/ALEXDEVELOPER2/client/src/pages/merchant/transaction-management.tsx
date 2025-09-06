import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Check, X, Edit, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  completed: "bg-green-500",
  pending: "bg-orange-500",
  cancelled: "bg-red-500",
  refunded: "bg-blue-500"
};

const PaymentMethod: Record<string, string> = {
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  PIX: "PIX",
  CASHBACK: "Cashback",
  OTHER: "Outro"
};

export default function TransactionManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para controle de diálogos
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Buscar transações
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/merchant/sales'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/sales');
      if (!res.ok) throw new Error('Erro ao buscar vendas');
      return res.json();
    }
  });
  
  // Filtrar transações com base no termo de busca
  const filteredTransactions = transactions?.filter((transaction: any) => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Busca em múltiplos campos
    return (
      transaction.id.toString().includes(searchTermLower) ||
      transaction.userName?.toLowerCase().includes(searchTermLower) ||
      transaction.amount?.toString().includes(searchTermLower) ||
      transaction.payment_method?.toLowerCase().includes(searchTermLower) ||
      transaction.status?.toLowerCase().includes(searchTermLower)
    );
  });
  
  // Mutação para cancelar transação
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      const res = await apiRequest('PUT', `/api/merchant/sales/${id}/status`, { 
        status: 'cancelled',
        reason
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transação cancelada",
        description: "A transação foi cancelada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsCancelDialogOpen(false);
      setCancelReason("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar transação",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para reembolsar transação
  const refundMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      const res = await apiRequest('PUT', `/api/merchant/sales/${id}/status`, { 
        status: 'refunded',
        reason
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transação reembolsada",
        description: "A transação foi reembolsada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsRefundDialogOpen(false);
      setRefundReason("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao reembolsar transação",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para completar uma transação pendente
  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PUT', `/api/merchant/sales/${id}/status`, { 
        status: 'completed'
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transação completada",
        description: "A transação foi completada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao completar transação",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para editar transação
  const editMutation = useMutation({
    mutationFn: async ({ id, notes, payment_method }: { id: number, notes?: string, payment_method?: string }) => {
      const updateData: any = {};
      if (notes !== undefined) updateData.notes = notes;
      if (payment_method !== undefined) updateData.payment_method = payment_method;
      
      const res = await apiRequest('PUT', `/api/merchant/sales/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transação atualizada",
        description: "A transação foi atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para excluir transação
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/merchant/sales/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCancelTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsCancelDialogOpen(true);
  };
  
  const handleRefundTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsRefundDialogOpen(true);
  };
  
  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    // Preencher campos com valores atuais
    setEditNotes(transaction.description || "");
    setEditPaymentMethod(transaction.payment_method || "");
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCompleteTransaction = (transactionId: number) => {
    completeMutation.mutate(transactionId);
  };
  
  return (
    <DashboardLayout title="Gerenciamento de Transações" type="merchant">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Gerenciamento de Transações</h1>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              Gerencie suas transações: visualize, edite, cancele ou reembolse
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
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions?.length > 0 ? (
                      filteredTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.id}</TableCell>
                          <TableCell>{transaction.userName || 'N/A'}</TableCell>
                          <TableCell>{transaction.created_at ? format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>{formatCurrency(transaction.cashback_amount)}</TableCell>
                          <TableCell>{PaymentMethod[transaction.payment_method] || transaction.payment_method}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[transaction.status] || 'bg-gray-500'} text-white`}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {/* Botão de editar - disponível para transações completed ou pending */}
                              {['completed', 'pending'].includes(transaction.status) && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleEditTransaction(transaction)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Botão de completar - disponível apenas para transações pending */}
                              {transaction.status === 'pending' && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleCompleteTransaction(transaction.id)}
                                  title="Completar"
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              
                              {/* Botão de cancelar - disponível para transações completed ou pending */}
                              {['completed', 'pending'].includes(transaction.status) && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleCancelTransaction(transaction)}
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                              
                              {/* Botão de reembolsar - disponível apenas para transações completed */}
                              {transaction.status === 'completed' && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleRefundTransaction(transaction)}
                                  title="Reembolsar"
                                >
                                  <RefreshCw className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              
                              {/* Botão de excluir - disponível apenas para transações cancelled ou refunded */}
                              {['cancelled', 'refunded'].includes(transaction.status) && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteTransaction(transaction)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          Nenhuma transação encontrada
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
      
      {/* Diálogo de Cancelamento */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Transação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta transação? Esta ação irá reverter qualquer cashback gerado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">ID da Transação</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cashback</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.cashback_amount)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Motivo do Cancelamento</p>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => cancelMutation.mutate({ 
                id: selectedTransaction.id, 
                reason: cancelReason 
              })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Reembolso */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar Transação</DialogTitle>
            <DialogDescription>
              Confirme o reembolso desta transação. O cliente continuará com o cashback.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">ID da Transação</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cashback</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.cashback_amount)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Motivo do Reembolso</p>
                <Textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Informe o motivo do reembolso..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="default" 
              onClick={() => refundMutation.mutate({ 
                id: selectedTransaction.id, 
                reason: refundReason 
              })}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Transação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">ID da Transação</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm">{selectedTransaction.status}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate(selectedTransaction.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Atualize os detalhes desta transação
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">ID da Transação</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm">{selectedTransaction.status}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Método de Pagamento</p>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PaymentMethod).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Observações</p>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações sobre a transação..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="default" 
              onClick={() => editMutation.mutate({ 
                id: selectedTransaction.id, 
                notes: editNotes,
                payment_method: editPaymentMethod
              })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}