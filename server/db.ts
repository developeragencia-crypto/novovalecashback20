import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduzindo o número máximo de conexões
  idleTimeoutMillis: 30000, // Aumentando o tempo limite de inatividade
  connectionTimeoutMillis: 10000 // Aumentando o tempo limite de conexão
});
export const db = drizzle({ client: pool, schema });