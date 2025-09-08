import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || "Muitas tentativas, tente novamente mais tarde.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Speed limiting for sensitive operations
export const createSpeedLimit = (windowMs: number, delayAfter: number, delayMs: number) => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
  });
};

// Common rate limits
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5, "Muitas tentativas de login");
export const apiRateLimit = createRateLimit(15 * 60 * 1000, 100);
export const paymentRateLimit = createRateLimit(60 * 1000, 10, "Muitas transações, aguarde um momento");
export const transferRateLimit = createRateLimit(60 * 1000, 5, "Muitas transferências, aguarde um momento");

// Speed limits for sensitive operations
export const paymentSpeedLimit = createSpeedLimit(60 * 1000, 3, 2000);
export const withdrawalSpeedLimit = createSpeedLimit(60 * 1000, 2, 5000);

// Validation middleware
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === "string") {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

// Common validation schemas
export const paymentSchema = z.object({
  merchant_id: z.number().int().positive("ID do lojista deve ser um número positivo"),
  amount: z.number().positive("Valor deve ser maior que zero").max(10000, "Valor máximo é R$ 10.000"),
  description: z.string().min(1, "Descrição é obrigatória").max(200, "Descrição muito longa"),
  payment_method: z.enum(["credit_card", "debit_card", "pix", "qrcode"], {
    errorMap: () => ({ message: "Método de pagamento inválido" })
  }),
  qr_code_id: z.string().optional(),
});

export const transferSchema = z.object({
  to_user_email: z.string().email("Email inválido"),
  amount: z.number().positive("Valor deve ser maior que zero").max(1000, "Valor máximo é R$ 1.000"),
  description: z.string().max(200, "Descrição muito longa").optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive("Valor deve ser maior que zero").max(5000, "Valor máximo é R$ 5.000"),
  full_name: z.string().min(2, "Nome completo é obrigatório").max(100, "Nome muito longo"),
  store_name: z.string().min(2, "Nome da loja é obrigatório").max(100, "Nome muito longo"),
  phone: z.string().min(10, "Telefone inválido").max(15, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  bank_name: z.string().min(2, "Nome do banco é obrigatório").max(50, "Nome muito longo"),
  agency: z.string().min(3, "Agência inválida").max(10, "Agência inválida"),
  account: z.string().min(5, "Conta inválida").max(20, "Conta inválida"),
  payment_method: z.enum(["bank_transfer", "pix"], {
    errorMap: () => ({ message: "Método de pagamento inválido" })
  }),
});

export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 10000;
  }, "Preço deve ser entre R$ 0,01 e R$ 10.000"),
  category: z.string().min(1, "Categoria é obrigatória").max(50, "Categoria muito longa"),
  stock_quantity: z.number().int().min(0, "Estoque deve ser 0 ou maior").optional(),
  active: z.boolean().optional(),
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};

// CSRF protection for state-changing operations
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.get("Origin");
    const host = req.get("Host");
    
    if (!origin || !host) {
      return res.status(403).json({ message: "Forbidden: Missing origin or host header" });
    }
    
    const allowedOrigins = [
      `http://${host}`,
      `https://${host}`,
      `http://localhost:5000`,
      `http://localhost:3000`,
    ];
    
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: "Forbidden: Invalid origin" });
    }
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: (req as any).user?.id,
    };
    
    console.log(`${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
    
    return originalSend.call(this, data);
  };
  
  next();
};

export default {
  createRateLimit,
  createSpeedLimit,
  validateSchema,
  sanitizeInput,
  securityHeaders,
  csrfProtection,
  requestLogger,
  authRateLimit,
  apiRateLimit,
  paymentRateLimit,
  transferRateLimit,
  paymentSpeedLimit,
  withdrawalSpeedLimit,
  paymentSchema,
  transferSchema,
  withdrawalSchema,
  productSchema,
};