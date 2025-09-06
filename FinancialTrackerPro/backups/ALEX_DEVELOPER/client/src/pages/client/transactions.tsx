import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Mock transaction data - would be replaced with real data from API
const transactions = [
  { id: 1, store: "Mercado Central", date: "15/07/2023", amount: 150.00, cashback: 3.00, status: "completed", paymentMethod: "credit_card" },
  { id: 2, store: "Farmácia Popular", date: "12/07/2023", amount: 75.20, cashback: 1.50, status: "completed", paymentMethod: "debit_card" },
  { id: 3, store: "Posto Shell", date: "10/07/2023", amount: 200.00, cashback: 4.00, status: "completed", paymentMethod: "cash" },
  { id: 4, store: "Livraria Cultura", date: "05/07/2023", amount: 120.50, cashback: 2.41, status: "completed", paymentMethod: "pix" },
  { id: 5, store: "Shopping Center Norte", date: "01/07/2023", amount: 350.75, cashback: 7.01, status: "completed", paymentMethod: "credit_card" },
  { id: 6, store: "Restaurante Sabor", date: "28/06/2023", amount: 89.90, cashback: 1.80, status: "completed", paymentMethod: "cashback" },
  { id: 7, store: "Cinema Multiplex", date: "25/06/2023", amount: 60.00, cashback: 1.20, status: "completed", paymentMethod: "credit_card" },
  { id: 8, store: "Loja de Roupas Fashion", date: "20/06/2023", amount: 199.90, cashback: 4.00, status: "completed", paymentMethod: "credit_card" },
  { id: 9, store: "Petshop Amigo", date: "15/06/2023", amount: 112.50, cashback: 2.25, status: "completed", paymentMethod: "debit_card" },
  { id: 10, store: "Ótica Visão", date: "10/06/2023", amount: 500.00, cashback: 10.00, status: "completed", paymentMethod: "credit_card" },
];

const paymentMethodLabels: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
  pix: "PIX",
  cashback: "Cashback"
};

export default function ClientTransactions() {
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [period, setPeriod] = useState("30days");
  const [store, setStore] = useState("all");
  const [status, setStatus] = useState("all");

  // Query to get transactions
  const { data, isLoading } = useQuery({
    queryKey: ['/api/client/transactions', { period, store, status }],
  });

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    alert("Exportando relatório...");
    // Implementação real seria feita com um endpoint de API
  };

  // Filter options
  const periodOptions = [
    { label: "Últimos 30 dias", value: "30days" },
    { label: "Este mês", value: "thisMonth" },
    { label: "Mês anterior", value: "lastMonth" },
    { label: "Personalizado", value: "custom" },
  ];

  const storeOptions = [
    { label: "Todas as lojas", value: "all" },
    { label: "Mercado Central", value: "Mercado Central" },
    { label: "Farmácia Popular", value: "Farmácia Popular" },
    { label: "Posto Shell", value: "Posto Shell" },
    { label: "Livraria Cultura", value: "Livraria Cultura" },
  ];

  const statusOptions = [
    { label: "Todos os status", value: "all" },
    { label: "Concluída", value: "completed" },
    { label: "Pendente", value: "pending" },
    { label: "Cancelada", value: "cancelled" },
  ];

  const columns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    {
      header: "Loja",
      accessorKey: "store",
    },
    {
      header: "Data",
      accessorKey: "date",
    },
    {
      header: "Valor",
      accessorKey: "amount",
      cell: (row: any) => `$ ${row.amount.toFixed(2)}`,
    },
    {
      header: "Cashback",
      accessorKey: "cashback",
      cell: (row: any) => `$ ${row.cashback.toFixed(2)}`,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <Badge variant={row.status === "completed" ? "success" : row.status === "pending" ? "warning" : "destructive"}>
          {row.status === "completed" ? "Concluída" : row.status === "pending" ? "Pendente" : "Cancelada"}
        </Badge>
      ),
    },
    {
      header: "Método",
      accessorKey: "paymentMethod",
      cell: (row: any) => paymentMethodLabels[row.paymentMethod] || row.paymentMethod,
    },
  ];

  const filters = [
    {
      name: "Período",
      options: periodOptions,
      onChange: (value: string) => setPeriod(value),
    },
    {
      name: "Loja",
      options: storeOptions,
      onChange: (value: string) => setStore(value),
    },
    {
      name: "Status",
      options: statusOptions,
      onChange: (value: string) => setStatus(value),
    },
  ];

  const actions = [
    {
      label: "Ver detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: handleViewDetails,
    },
  ];

  return (
    <DashboardLayout title="Transações" type="client">
      <Card>
        <CardContent className="p-6">
          <DataTable
            data={data?.transactions || transactions}
            columns={columns}
            actions={actions}
            filters={filters}
            searchable={true}
            onSearch={(value) => console.log("Searching:", value)}
            pagination={{
              pageIndex: 0,
              pageSize: 10,
              pageCount: Math.ceil((data?.transactions || transactions).length / 10),
              onPageChange: (page) => console.log("Page changed:", page),
            }}
            exportable={true}
            onExport={handleExport}
          />
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              Transação #{selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Loja:</span>
                <span className="font-medium">{selectedTransaction.store}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{selectedTransaction.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">$ {selectedTransaction.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Cashback:</span>
                <span className="font-medium">$ {selectedTransaction.cashback.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={selectedTransaction.status === "completed" ? "success" : selectedTransaction.status === "pending" ? "warning" : "destructive"}>
                  {selectedTransaction.status === "completed" ? "Concluída" : selectedTransaction.status === "pending" ? "Pendente" : "Cancelada"}
                </Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Método de Pagamento:</span>
                <span className="font-medium">{paymentMethodLabels[selectedTransaction.paymentMethod] || selectedTransaction.paymentMethod}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
