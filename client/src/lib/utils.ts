import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se o dispositivo é móvel com base no user agent
 * @returns true se for dispositivo móvel, false caso contrário
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
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
  
  let numValue: number;
  
  if (typeof value === 'string') {
    // Remover possíveis caracteres de moeda e espaços da string antes de converter
    const cleanValue = value.replace(/[$,\s]/g, '');
    numValue = parseFloat(cleanValue);
  } else {
    numValue = value;
  }
  
  if (isNaN(numValue)) {
    return showSymbol ? '$ 0.00' : '0.00';
  }
  
  // Formatação para dólar americano com 2 casas decimais
  const formattedValue = numValue.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  return showSymbol ? `$ ${formattedValue}` : formattedValue;
}

/**
 * Formata uma data como string legível usando o fuso horário dos EUA
 * @param date Data a ser formatada
 * @param showTime Se true, inclui o horário junto com a data
 * @returns String formatada com a data (e hora, se showTime=true) no formato dos EUA
 */
export function formatDate(date: Date | string | null | undefined, showTime: boolean = true): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Opções de formatação para a data no formato dos EUA
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/New_York', // Fuso horário de Nova York (EST/EDT)
      ...(showTime && {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Formato AM/PM usado nos EUA
      })
    };
    
    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid date';
  }
}
