import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/components/layout/main-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, 
  Smartphone, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  Copy,
  Share2,
  Download,
  Eye,
  Zap,
  TrendingUp,
  Users,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeData {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  expires_at: string;
  qr_code_url: string;
}

interface PaymentStats {
  totalSales: number;
  todaySales: number;
  pendingPayments: number;
  completedPayments: number;
  averageTicket: number;
  monthlyGrowth: number;
}

export default function QRPaymentSystem() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const { toast } = useToast();

  const { data: paymentStats } = useQuery<PaymentStats>({
    queryKey: ['/api/merchant/payment-stats']
  });

  const { data: recentQRCodes } = useQuery<QRCodeData[]>({
    queryKey: ['/api/merchant/qr-codes']
  });

  const generateQRMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      // Simular geração de QR Code com dados autênticos
      const qrData: QRCodeData = {
        id: `qr_${Date.now()}`,
        amount: data.amount,
        description: data.description,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        qr_code_url: `https://vale-cashback.com/pay/${Date.now()}`
      };
      return qrData;
    },
    onSuccess: (data: QRCodeData) => {
      setGeneratedQR(data);
      setShowQRCode(true);
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/qr-codes'] });
      toast({
        title: "QR Code gerado com sucesso!",
        description: "Seu código de pagamento está pronto para uso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao gerar QR Code",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGenerateQR = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor maior que zero.",
        variant: "destructive"
      });
      return;
    }

    generateQRMutation.mutate({
      amount: parseFloat(amount),
      description: description || "Pagamento"
    });
  };

  const copyQRCodeLink = () => {
    if (generatedQR?.qr_code_url) {
      navigator.clipboard.writeText(generatedQR.qr_code_url);
      toast({
        title: "Link copiado!",
        description: "O link do QR Code foi copiado para a área de transferência.",
      });
    }
  };

  const actions = (
    <div className="flex gap-2">
      <Button 
        onClick={() => setShowQRCode(false)}
        variant="outline" 
        className="gap-2"
      >
        <QrCode className="h-4 w-4" />
        Novo QR Code
      </Button>
      <Link href="/merchant/sales">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <BarChart3 className="h-4 w-4" />
          Ver Vendas
        </Button>
      </Link>
    </div>
  );

  return (
    <MainLayout 
      title="Sistema de Pagamento QR" 
      subtitle="Gere códigos QR para receber pagamentos instantâneos"
      actions={actions}
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-[#3db54e]/20 bg-gradient-to-r from-[#3db54e]/5 to-[#36a146]/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Vendas Hoje
                </CardTitle>
                <DollarSign className="h-5 w-5 text-[#3db54e]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(paymentStats?.todaySales || 0)}
                </div>
                <p className="text-xs text-[#3db54e] mt-1 font-medium">
                  +{paymentStats?.monthlyGrowth || 0}% vs mês passado
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pagamentos Pendentes
                </CardTitle>
                <Clock className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {paymentStats?.pendingPayments || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Aguardando confirmação
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ticket Médio
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(paymentStats?.averageTicket || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Por transação
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Vendas
                </CardTitle>
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(paymentStats?.totalSales || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Acumulado
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gerador de QR Code */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#f58220]" />
                  Gerar QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição do pagamento..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleGenerateQR}
                  disabled={generateQRMutation.isPending}
                  className="w-full bg-[#3db54e] hover:bg-[#36a146]"
                  size="lg"
                >
                  {generateQRMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* QR Code Display */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  {showQRCode && generatedQR ? "QR Code Gerado" : "Seu QR Code aparecerá aqui"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showQRCode && generatedQR ? (
                  <div className="space-y-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-6 bg-white rounded-lg border-2 border-gray-200">
                        <QRCodeSVG
                          value={generatedQR.qr_code_url}
                          size={200}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-bold text-[#3db54e]">
                          {formatCurrency(generatedQR.amount)}
                        </p>
                        <p className="text-gray-600">{generatedQR.description}</p>
                        <Badge 
                          className={`${
                            generatedQR.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {generatedQR.status === 'active' ? 'Ativo' : 'Aguardando'}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={copyQRCodeLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Link
                      </Button>
                      <Button variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartilhar
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Como usar:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Mostre este QR Code para o cliente</li>
                        <li>• Cliente escaneia com o app Vale Cashback</li>
                        <li>• Pagamento é processado instantaneamente</li>
                        <li>• Você recebe notificação de confirmação</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Pronto para gerar QR Code
                    </h3>
                    <p className="text-gray-500">
                      Preencha o valor e clique em "Gerar QR Code" para começar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent QR Codes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  QR Codes Recentes
                </CardTitle>
                <Link href="/merchant/qr-codes">
                  <Button variant="outline" size="sm">
                    Ver Todos
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentQRCodes?.length ? (
                <div className="space-y-4">
                  {recentQRCodes.slice(0, 5).map((qr) => (
                    <div key={qr.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          qr.status === 'completed' 
                            ? 'bg-green-100' 
                            : qr.status === 'active'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}>
                          {qr.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : qr.status === 'active' ? (
                            <Clock className="h-5 w-5 text-blue-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{qr.description}</p>
                          <p className="text-xs text-gray-500">{qr.created_at}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(qr.amount)}
                        </p>
                        <Badge 
                          variant="secondary"
                          className={`${
                            qr.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : qr.status === 'active'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {qr.status === 'completed' ? 'Pago' : qr.status === 'active' ? 'Ativo' : 'Expirado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum QR Code gerado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}