import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FeeExplanationPage() {
  const feeData = [
    { name: "Taxa de Plataforma", value: 2.0, color: "#0066B3" },
    { name: "Comissão do Lojista", value: 1.0, color: "#FF7700" },
    { name: "Cashback do Cliente", value: 2.0, color: "#00A651" },
    { name: "Bônus de Indicação", value: 1.0, color: "#FFD700" }
  ];

  const COLORS = ['#0066B3', '#FF7700', '#00A651', '#FFD700'];

  const exampleTransaction = {
    value: 100,
    platformFee: 2,
    merchantCommission: 1,
    clientCashback: 2,
    referralBonus: 1,
    merchantReceives: 97,
    clientReceives: 2
  };

  const exampleReferral = {
    purchaseValue: 100,
    referralBonus: 1,
    referrerReceives: 1
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Funcionamento das Taxas no Vale Cashback</h1>
      
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Demonstração</AlertTitle>
        <AlertDescription>
          Esta página explica como as taxas são calculadas no sistema Vale Cashback. 
          Todos os valores são baseados nas configurações atuais do sistema.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição das Taxas</CardTitle>
            <CardDescription>
              Visão geral de como as taxas são distribuídas em cada transação
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {feeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Descrição das Taxas</CardTitle>
            <CardDescription>
              Detalhamento de cada taxa aplicada no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Taxa de Plataforma</TableCell>
                  <TableCell>2.0%</TableCell>
                  <TableCell>Cobrada em cada transação para manutenção do sistema</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Comissão do Lojista</TableCell>
                  <TableCell>1.0%</TableCell>
                  <TableCell>Valor pago pelo lojista por transação</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cashback do Cliente</TableCell>
                  <TableCell>2.0%</TableCell>
                  <TableCell>Retorno para o cliente em cada compra</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Bônus de Indicação</TableCell>
                  <TableCell>1.0%</TableCell>
                  <TableCell>Valor recebido por indicar novos usuários</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-8" />
      
      <h2 className="text-2xl font-bold mb-4">Exemplos Práticos</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Exemplo de Transação</CardTitle>
            <CardDescription>
              Como as taxas são aplicadas em uma compra de ${exampleTransaction.value}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-md">
                <span>Valor da Compra:</span>
                <span className="font-bold">${exampleTransaction.value.toFixed(2)}</span>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-medium">Taxa de Plataforma (2%):</h4>
                <p className="text-slate-600">${exampleTransaction.platformFee.toFixed(2)}</p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <h4 className="font-medium">Comissão do Lojista (1%):</h4>
                <p className="text-slate-600">${exampleTransaction.merchantCommission.toFixed(2)}</p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-medium">Cashback do Cliente (2%):</h4>
                <p className="text-slate-600">${exampleTransaction.clientCashback.toFixed(2)}</p>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                <span className="font-medium">Lojista recebe:</span>
                <span className="font-bold">${exampleTransaction.merchantReceives.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                <span className="font-medium">Cliente recebe em cashback:</span>
                <span className="font-bold">${exampleTransaction.clientReceives.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Exemplo de Indicação</CardTitle>
            <CardDescription>
              Como funciona o bônus quando um usuário indicado faz uma compra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-md bg-slate-50">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Fluxo de indicação
                </h4>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Um usuário (indicador) convida um novo cliente</li>
                  <li>O novo cliente se cadastra com o código de indicação</li>
                  <li>Quando o novo cliente faz compras, o indicador recebe bônus</li>
                </ol>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-md mt-4">
                <span>Valor da compra do indicado:</span>
                <span className="font-bold">${exampleReferral.purchaseValue.toFixed(2)}</span>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <h4 className="font-medium">Bônus de Indicação (1%):</h4>
                <p className="text-slate-600">${exampleReferral.referralBonus.toFixed(2)}</p>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                <span className="font-medium">Indicador recebe:</span>
                <span className="font-bold">${exampleReferral.referrerReceives.toFixed(2)}</span>
              </div>
              
              <Alert className="mt-4">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Processamento automático</AlertTitle>
                <AlertDescription>
                  O processamento do bônus de indicação acontece automaticamente quando o usuário 
                  indicado realiza uma compra. O valor é creditado imediatamente na carteira do indicador.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Resumo do Fluxo Financeiro</CardTitle>
          <CardDescription>
            Visão geral de como o dinheiro flui no sistema Vale Cashback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border p-4 rounded-md">
                <h3 className="font-bold text-lg mb-2">Para o Lojista</h3>
                <p className="text-slate-600 mb-3">Em uma transação de $100:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Recebe $97 (valor menos taxas)</li>
                  <li>Paga 3% em taxas totais</li>
                  <li>Mantém 97% do valor da compra</li>
                </ul>
              </div>
              
              <div className="border p-4 rounded-md">
                <h3 className="font-bold text-lg mb-2">Para o Cliente</h3>
                <p className="text-slate-600 mb-3">Em uma transação de $100:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Paga $100 pela compra</li>
                  <li>Recebe $2 em cashback (2%)</li>
                  <li>Custo final efetivo: $98</li>
                </ul>
              </div>
              
              <div className="border p-4 rounded-md">
                <h3 className="font-bold text-lg mb-2">Para o Indicador</h3>
                <p className="text-slate-600 mb-3">Quando um indicado gasta $100:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Recebe $1 como bônus (1%)</li>
                  <li>Valor creditado automaticamente</li>
                  <li>Não há limite de indicações</li>
                </ul>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-bold text-lg mb-2">Observações Importantes</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Todas as taxas são configuradas pelo administrador do sistema</li>
                <li>O cashback é aplicado instantaneamente após a conclusão da transação</li>
                <li>Os bônus de indicação são processados automaticamente em cada compra do indicado</li>
                <li>Os valores de cashback e bônus ficam disponíveis imediatamente para uso ou saque</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}