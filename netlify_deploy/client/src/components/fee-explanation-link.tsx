import React from 'react';
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Link } from "wouter";

export function FeeExplanationLink() {
  return (
    <Link href="/demo/fee-explanation">
      <Button variant="outline" className="gap-2 mt-4 w-full">
        <Info className="h-4 w-4" />
        Ver como funcionam as taxas
      </Button>
    </Link>
  );
}

export function FeeExplanationHeader() {
  return (
    <div className="flex flex-col items-center justify-center my-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-700 mb-2">Entenda as taxas do sistema</h3>
      <p className="text-sm text-blue-600 text-center mb-3">
        Saiba como funcionam as taxas de plataforma, comissão, cashback e bônus de indicação
      </p>
      <Link href="/demo/fee-explanation">
        <Button variant="outline" className="gap-2 border-blue-300">
          <Info className="h-4 w-4" />
          Ver detalhes das taxas
        </Button>
      </Link>
    </div>
  );
}