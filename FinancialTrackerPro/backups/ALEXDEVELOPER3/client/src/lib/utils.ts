import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor para moeda dólar (USD)
 * @param value Valor a ser formatado
 * @param showSymbol Se true, exibe o símbolo $ antes do valor (padrão: true)
 * @returns String formatada em dólar
 */
export function formatCurrency(value: number | string | null | undefined, showSymbol = true): string {
  if (value === null || value === undefined) {
    return showSymbol ? '$ 0.00' : '0.00';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return showSymbol ? '$ 0.00' : '0.00';
  }
  
  // Formatação para dólar americano com 2 casas decimais
  const formattedValue = numValue.toFixed(2);
  return showSymbol ? `$ ${formattedValue}` : formattedValue;
}
