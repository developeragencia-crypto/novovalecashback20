import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleLayout } from "@/components/layout/simple-layout";
import { 
  Users, 
  Store, 
  DollarSign, 
  TrendingUp, 
  BarChart3,
  UserCheck,
  Activity
} from "lucide-react";
import { Link } from "wouter";

export default function SimpleAdminPanel() {
  const { data: adminStats } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch admin stats');
      return response.json();
    }
  });

  const actions = (
    <div className="flex gap-2">
      <Link href="/admin/users">
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Gerenciar Usuários
        </Button>
      </Link>
      <Link href="/admin/reports">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <BarChart3 className="h-4 w-4" />
          Relatórios
        </Button>
      </Link>
    </div>
  );

  return (
    <SimpleLayout 
      title="Painel Administrativo" 
      subtitle="Visão geral completa do sistema Vale Cashback"
      actions={actions}
      userType="admin"
    >
      <div className="space-y-6">
        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-[#3db54e]/20 bg-gradient-to-r from-[#3db54e]/5 to-[#36a146]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Usuários
              </CardTitle>
              <Users className="h-5 w-5 text-[#3db54e]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {adminStats?.totalUsers || 116}
              </div>
              <p className="text-xs text-[#3db54e] mt-1 font-medium">
                +12% este mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#f58220]/20 bg-gradient-to-r from-[#f58220]/5 to-[#e37718]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Lojistas Ativos
              </CardTitle>
              <Store className="h-5 w-5 text-[#f58220]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {adminStats?.totalMerchants || 26}
              </div>
              <p className="text-xs text-[#f58220] mt-1 font-medium">
                3 aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Volume Total
              </CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                R$ 34.330,42
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Transações processadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-r from-purple-50 to-purple-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Crescimento
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                +18%
              </div>
              <p className="text-xs text-purple-600 mt-1 font-medium">
                Comparado ao mês anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumo de atividades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#3db54e]" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">Novo usuário cadastrado</p>
                      <p className="text-sm text-gray-600">Cliente Teste</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Lojista aprovado</p>
                      <p className="text-sm text-gray-600">Tech Store Brasil</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Aprovado</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">Transação processada</p>
                      <p className="text-sm text-gray-600">R$ 899,99</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700">Concluído</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#f58220]" />
                Estatísticas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Clientes Ativos</span>
                  <span className="font-bold text-[#3db54e]">86</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Administradores</span>
                  <span className="font-bold text-blue-600">4</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cashback Total</span>
                  <span className="font-bold text-[#f58220]">R$ 1.539,92</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxa Média</span>
                  <span className="font-bold text-purple-600">2.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </Button>
              </Link>
              <Link href="/admin/merchants">
                <Button variant="outline" className="w-full gap-2">
                  <Store className="h-4 w-4" />
                  Lojistas
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="outline" className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Relatórios
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Configurações
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}