import { pgTable, text, serial, integer, numeric, boolean, timestamp, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types enum
export const UserType = {
  CLIENT: "client",
  MERCHANT: "merchant",
  ADMIN: "admin",
} as const;

export type UserTypeValues = typeof UserType[keyof typeof UserType];

// Transaction status enum
export const TransactionStatus = {
  COMPLETED: "completed",
  PENDING: "pending",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export type TransactionStatusValues = typeof TransactionStatus[keyof typeof TransactionStatus];

// Payment methods enum
export const PaymentMethod = {
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  CASHBACK: "cashback",
  PIX: "pix",
} as const;

export type PaymentMethodValues = typeof PaymentMethod[keyof typeof PaymentMethod];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  country: text("country"),
  country_code: text("country_code"),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  photo: text("photo"),
  security_question: text("security_question"),
  security_answer: text("security_answer"),
  invitation_code: text("invitation_code"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  last_login: timestamp("last_login"),
});

// Merchants table (extends users)
export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  store_name: text("store_name").notNull(),
  logo: text("logo"),
  category: text("category").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  company_logo: text("company_logo"),
  commission_rate: numeric("commission_rate").notNull().default("2.0"),
  approved: boolean("approved").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Cashback balances
export const cashbacks = pgTable("cashbacks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance").notNull().default("0.0"),
  total_earned: numeric("total_earned").notNull().default("0.0"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Products/Services
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  merchant_id: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),
  category: text("category"),
  inventory_count: integer("inventory_count"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  merchant_id: integer("merchant_id").notNull().references(() => merchants.id),
  amount: numeric("amount").notNull(),
  cashback_amount: numeric("cashback_amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("completed"),
  payment_method: text("payment_method").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  // Optional fields that might not be in all database instances
  manual_amount: numeric("manual_amount"),
});

// Transaction Items
export const transactionItems = pgTable("transaction_items", {
  id: serial("id").primaryKey(),
  transaction_id: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  product_id: integer("product_id").references(() => products.id),
  product_name: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Transfers
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  from_user_id: integer("from_user_id").notNull().references(() => users.id),
  to_user_id: integer("to_user_id").notNull().references(() => users.id),
  amount: numeric("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("completed"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  type: text("type"),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrer_id: integer("referrer_id").notNull().references(() => users.id),
  referred_id: integer("referred_id").notNull().references(() => users.id),
  bonus: numeric("bonus").notNull(),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// QR Codes
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// System settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Commission settings
export const commissionSettings = pgTable("commission_settings", {
  id: serial("id").primaryKey(),
  platform_fee: numeric("platform_fee").notNull().default("2.0"),
  merchant_commission: numeric("merchant_commission").notNull().default("2.0"),
  client_cashback: numeric("client_cashback").notNull().default("2.0"),
  referral_bonus: numeric("referral_bonus").notNull().default("1.0"),
  min_withdrawal: numeric("min_withdrawal").notNull().default("50.0"),
  max_cashback_bonus: numeric("max_cashback_bonus").notNull().default("10.0"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  updated_by: integer("updated_by").references(() => users.id),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  ip_address: text("ip_address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, created_at: true, last_login: true });

export const insertMerchantSchema = createInsertSchema(merchants)
  .omit({ id: true, created_at: true });

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, created_at: true });

export const insertTransferSchema = createInsertSchema(transfers)
  .omit({ id: true, created_at: true });

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true, created_at: true });

export const insertQRCodeSchema = createInsertSchema(qrCodes)
  .omit({ id: true, created_at: true, used: true });

export const insertCommissionSettingsSchema = createInsertSchema(commissionSettings)
  .omit({ id: true, updated_at: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

export type Cashback = typeof cashbacks.$inferSelect;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionItem = typeof transactionItems.$inferSelect;

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type QRCode = typeof qrCodes.$inferSelect;
export type InsertQRCode = z.infer<typeof insertQRCodeSchema>;

export type Setting = typeof settings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type CommissionSetting = typeof commissionSettings.$inferSelect;
export type InsertCommissionSetting = z.infer<typeof insertCommissionSettingsSchema>;
