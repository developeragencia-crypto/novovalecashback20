import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface PaymentData {
  merchant_id: number;
  merchant_name: string;
  amount?: number;
  description?: string;
  type: string;
}

export default function ClientQRCode() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  // Mutation to process payment
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      const response = await fetch('/api/client/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pagamento processado!",
        description: `Cashback de ${formatCurrency(data.cashback)} adicionado à sua conta`,
        variant: "default"
      });
      setScannedData(null);
      setIsScanning(false);
    },
    onError: () => {
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento",
        variant: "destructive"
      });
    }
  });

  const startScanner = () => {
    setIsScanning(true);
    setError("");
    setScannedData(null);

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        try {
          const paymentData: PaymentData = JSON.parse(decodedText);
          
          if (paymentData.type === 'payment' && paymentData.merchant_id) {
            setScannedData(paymentData);
            scanner.clear();
            setIsScanning(false);
          } else {
            setError("QR Code inválido. Use apenas QR Codes de pagamento do Vale Cashback.");
          }
        } catch (err) {
          setError("QR Code não reconhecido. Verifique se é um QR Code válido.");
        }
      },
      () => {
        // Error callback - continue scanning
      }
    );

    scannerRef.current = scanner;
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setIsScanning(false);
    setError("");
  };

  const confirmPayment = () => {
    if (scannedData) {
      processPaymentMutation.mutate(scannedData);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  return (
    <DashboardLayout title="Escanear QR Code" type="client">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scanner de QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isScanning && !scannedData && (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Pronto para escanear</h3>
                <p className="text-muted-foreground mb-6">
                  Escaneie o QR Code do lojista para realizar o pagamento e ganhar cashback
                </p>
                <Button onClick={startScanner} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Iniciar Scanner
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div id="qr-reader" className="border rounded-lg overflow-hidden"></div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  <Button variant="outline" onClick={stopScanner}>
                    Parar Scanner
                  </Button>
                </div>
              </div>
            )}

            {scannedData && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    QR Code escaneado com sucesso!
                  </AlertDescription>
                </Alert>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-3">Detalhes do Pagamento</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loja:</span>
                      <span className="font-medium">{scannedData.merchant_name}</span>
                    </div>
                    
                    {scannedData.amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-medium text-lg">
                          {formatCurrency(scannedData.amount)}
                        </span>
                      </div>
                    )}
                    
                    {scannedData.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descrição:</span>
                        <span className="font-medium">{scannedData.description}</span>
                      </div>
                    )}

                    {scannedData.amount && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Cashback estimado:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(scannedData.amount * 0.05)} (5%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={confirmPayment}
                    disabled={processPaymentMutation.isPending}
                    className="flex-1"
                  >
                    {processPaymentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" onClick={() => setScannedData(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Peça o QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Solicite ao lojista para gerar o QR Code com o valor da sua compra
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Escaneie</h4>
                  <p className="text-sm text-muted-foreground">
                    Use o scanner para ler o QR Code apresentado pelo lojista
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Confirme</h4>
                  <p className="text-sm text-muted-foreground">
                    Verifique os dados e confirme o pagamento para ganhar cashback
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Benefícios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium">5% de Cashback</h4>
                <p className="text-sm text-muted-foreground">
                  Ganhe 5% de volta em todas as compras
                </p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <QrCode className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium">Pagamento Rápido</h4>
                <p className="text-sm text-muted-foreground">
                  Processo simples e seguro
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}