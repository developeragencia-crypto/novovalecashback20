import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Download, RefreshCw, Copy, CheckCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function MerchantPaymentQR() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [qrData, setQrData] = useState("");
  const { toast } = useToast();

  // Query to get merchant info
  const { data: merchantData } = useQuery<{id: number; name: string}>({
    queryKey: ['/api/merchant/profile'],
    retry: 1,
    placeholderData: { id: 1, name: "Loja Vale Cashback" }
  });

  // Mutation to generate QR code
  const generateQRMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      const response = await fetch('/api/merchant/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar QR Code');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setQrData(data.qrCode);
      toast({
        title: "QR Code gerado",
        description: "QR Code criado com sucesso!",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR Code",
        variant: "destructive"
      });
    }
  });

  const handleGenerateQR = () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido maior que zero",
        variant: "destructive"
      });
      return;
    }

    generateQRMutation.mutate({
      amount: numAmount,
      description: description || `Pagamento - ${merchantData?.name || 'Loja'}`
    });
  };

  const copyQRData = () => {
    navigator.clipboard.writeText(qrData);
    toast({
      title: "Copiado!",
      description: "Dados do QR Code copiados para a área de transferência",
      variant: "default"
    });
  };

  const downloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const link = document.createElement('a');
      link.download = `qr-pagamento-${amount}.png`;
      link.href = url;
      link.click();
    }
  };

  // Generate sample QR for demo
  useEffect(() => {
    if (!qrData && merchantData) {
      const sampleQR = JSON.stringify({
        merchant_id: merchantData.id || 1,
        merchant_name: merchantData.name || "Loja Exemplo",
        type: "payment",
        timestamp: Date.now()
      });
      setQrData(sampleQR);
    }
  }, [merchantData, qrData]);

  return (
    <DashboardLayout title="QR Code de Pagamento" type="merchant">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Form to Generate QR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Gerar QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor da Compra</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Café e pão de açúcar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleGenerateQR}
              disabled={generateQRMutation.isPending}
              className="w-full"
            >
              {generateQRMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code
                </>
              )}
            </Button>

            {amount && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Valor:</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(parseFloat(amount) || 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            {qrData ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={qrData}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={copyQRData}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" onClick={downloadQR}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                </div>

                {amount && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium">QR Code Ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Valor: {formatCurrency(parseFloat(amount) || 0)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Preencha os dados e clique em "Gerar QR Code"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <h3 className="font-medium mb-2">Digite o Valor</h3>
              <p className="text-sm text-muted-foreground">
                Informe o valor da compra do cliente
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <h3 className="font-medium mb-2">Gere o QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Clique em "Gerar QR Code" para criar o pagamento
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <h3 className="font-medium mb-2">Cliente Escaneia</h3>
              <p className="text-sm text-muted-foreground">
                O cliente escaneia o QR Code e confirma o pagamento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}