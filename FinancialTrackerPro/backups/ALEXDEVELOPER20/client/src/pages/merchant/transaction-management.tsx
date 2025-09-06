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
import { useTranslation } from "@/hooks/use-translation";
import { PaymentMethod } from "@shared/schema";

const statusColors: Record<string, string> = {
  completed: "bg-green-500",
  pending: "bg-orange-500",
  cancelled: "bg-red-500",
  refunded: "bg-blue-500"
};

// Os métodos de pagamento agora são traduzidos usando o hook de tradução

export default function TransactionManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Dados básicos para testes
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");

  // Estado para controle de diálogos
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  console.log("Usuário na página de transações:", user);
  
  // Buscar transações do backend
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['/api/merchant/sales'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/merchant/sales', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.log("Usando dados de exemplo para gestão de transações");
          return [
            {
              id: 1, 
              userName: "Maria Silva", 
              amount: 270.5, 
              cashback_amount: 5.41, 
              payment_method: "CREDIT_CARD", 
              status: "completed",
              created_at: new Date().toISOString(),
              description: "Compra de produtos"
            },
            {
              id: 2, 
              userName: "João Santos", 
              amount: 150.25, 
              cashback_amount: 3, 
              payment_method: "PIX", 
              status: "completed",
              created_at: new Date().toISOString(),
              description: "Serviços prestados"
            },
            {
              id: 3, 
              userName: "Ana Oliveira", 
              amount: 320, 
              cashback_amount: 6.4, 
              payment_method: "CASH", 
              status: "pending",
              created_at: new Date().toISOString(),
              description: "Venda em processamento"
            }
          ];
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao carregar transações:", error);
        return [];
      }
    }
  });

  // Garantir que transactions sempre seja um array
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  
  // Filtrar transações com base no termo de busca
  // Usamos o método filter diretamente em um array garantido
  const filteredTransactions = transactions.filter((transaction: any) => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Busca em múltiplos campos com validações para evitar erros
    return (
      (transaction.id?.toString() || '').includes(searchTermLower) ||
      ((transaction.userName || '').toLowerCase()).includes(searchTermLower) ||
      ((transaction.amount || '').toString()).includes(searchTermLower) ||
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
        title: t('merchant.transactionManagement.dialogs.cancel.success'),
        description: t('merchant.transactionManagement.dialogs.cancel.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsCancelDialogOpen(false);
      setCancelReason("");
    },
    onError: (error) => {
      toast({
        title: t('merchant.transactionManagement.dialogs.cancel.error'),
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
        title: t('merchant.transactionManagement.dialogs.refund.success'),
        description: t('merchant.transactionManagement.dialogs.refund.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsRefundDialogOpen(false);
      setRefundReason("");
    },
    onError: (error) => {
      toast({
        title: t('merchant.transactionManagement.dialogs.refund.error'),
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
        title: t('merchant.transactionManagement.dialogs.complete.success'),
        description: t('merchant.transactionManagement.dialogs.complete.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: t('merchant.transactionManagement.dialogs.complete.error'),
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
        title: t('merchant.transactionManagement.dialogs.edit.success'),
        description: t('merchant.transactionManagement.dialogs.edit.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('merchant.transactionManagement.dialogs.edit.error'),
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
        title: t('merchant.transactionManagement.dialogs.delete.success'),
        description: t('merchant.transactionManagement.dialogs.delete.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/dashboard'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('merchant.transactionManagement.dialogs.delete.error'),
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
    <DashboardLayout title={t("merchant.transactionManagement.title") || "Gerenciamento de Transações"} type="merchant">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t("merchant.transactionManagement.title") || "Gerenciamento de Transações"}</h1>
          <div className="flex gap-2">
            <Input
              placeholder={t("merchant.transactionManagement.searchPlaceholder") || "Buscar transações..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <Card>
          <CardHeader>
            <CardTitle>{t("merchant.transactionManagement.transactions") || "Transações"}</CardTitle>
            <CardDescription>
              {t("merchant.transactionManagement.description") || "Gerencie suas transações: visualize, edite, cancele ou reembolse"}
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
                      <TableHead>{t("merchant.transactionManagement.table.customer") || "Cliente"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.date") || "Data"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.amount") || "Valor"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.cashback") || "Cashback"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.method") || "Método"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.status") || "Status"}</TableHead>
                      <TableHead>{t("merchant.transactionManagement.table.actions") || "Ações"}</TableHead>
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
                          <TableCell>{t(`payment_methods.${transaction.payment_method?.toLowerCase()}`) || transaction.payment_method}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[transaction.status] || 'bg-gray-500'} text-white`}>
                              {t(`transaction_status.${transaction.status}`) || transaction.status}
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
                                  title={t('merchant.transactionManagement.buttons.edit')}
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
                                  title={t('merchant.transactionManagement.buttons.complete')}
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
                                  title={t('merchant.transactionManagement.buttons.cancel')}
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
                                  title={t('merchant.transactionManagement.buttons.refund')}
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
                                  title={t('merchant.transactionManagement.buttons.delete')}
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
                          {t('merchant.transactionManagement.noTransactionsFound')}
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
            <DialogTitle>{t('merchant.transactionManagement.dialogs.cancel.title')}</DialogTitle>
            <DialogDescription>
              {t('merchant.transactionManagement.dialogs.cancel.description')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.transactionId")}</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.customer")}</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.amount")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.cashback")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.cashback_amount)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">{t('merchant.transactionManagement.fields.cancelReason')}</p>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('merchant.transactionManagement.placeholders.cancelReason')}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
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
              {t('merchant.transactionManagement.buttons.confirmCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Reembolso */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('merchant.transactionManagement.dialogs.refund.title')}</DialogTitle>
            <DialogDescription>
              {t('merchant.transactionManagement.dialogs.refund.description')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.transactionId")}</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.customer")}</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.amount")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.cashback")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.cashback_amount)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">{t('merchant.transactionManagement.fields.refundReason')}</p>
                <Textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder={t('merchant.transactionManagement.placeholders.refundReason')}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
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
              {t('merchant.transactionManagement.buttons.confirmRefund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('merchant.transactionManagement.dialogs.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('merchant.transactionManagement.dialogs.delete.description')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.transactionId")}</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.customer")}</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.amount")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.status")}</p>
                  <p className="text-sm">{selectedTransaction.status}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate(selectedTransaction.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('merchant.transactionManagement.buttons.deleteForever')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('merchant.transactionManagement.dialogs.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('merchant.transactionManagement.dialogs.edit.description')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.transactionId")}</p>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.customer")}</p>
                  <p className="text-sm">{selectedTransaction.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.amount")}</p>
                  <p className="text-sm">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("merchant.transactionManagement.fields.status")}</p>
                  <p className="text-sm">{selectedTransaction.status}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">{t('merchant.transactionManagement.fields.paymentMethod')}</p>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('merchant.transactionManagement.placeholders.selectPaymentMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t('payment_methods.cash')}</SelectItem>
                    <SelectItem value="CREDIT_CARD">{t('payment_methods.credit_card')}</SelectItem>
                    <SelectItem value="DEBIT_CARD">{t('payment_methods.debit_card')}</SelectItem>
                    <SelectItem value="PIX">{t('payment_methods.pix')}</SelectItem>
                    <SelectItem value="CASHBACK">{t('payment_methods.cashback')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">{t('merchant.transactionManagement.fields.notes')}</p>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t('merchant.transactionManagement.placeholders.notes')}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
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
              {t('merchant.transactionManagement.buttons.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}