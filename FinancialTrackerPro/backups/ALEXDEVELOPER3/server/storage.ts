import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Inicializa os usuários padrão se não existirem
    this.initializeDefaultUsers();
  }
  
  // Métodos para gerenciamento de senhas
  async hashPassword(password: string): Promise<string> {
    // Importar as funções necessárias
    const { scrypt, randomBytes } = await import('crypto');
    const { promisify } = await import('util');
    
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    try {
      // Importar as funções necessárias
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      
      const scryptAsync = promisify(scrypt);
      
      const [hashed, salt] = stored.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error('Erro ao comparar senhas:', error);
      return false;
    }
  }

  private async initializeDefaultUsers() {
    try {
      // Verificar se já existem usuários
      const existingUsers = await db.select().from(users).limit(1);
      
      if (existingUsers.length === 0) {
        // Criar usuários padrão
        const adminUser: InsertUser = {
          name: "Administrador",
          username: "admin",
          email: "admin@valecashback.com",
          password: await this.hashPassword("senha123"),
          type: "admin",
          status: "active",
          phone: null,
          country: "Brasil",
          country_code: "BR",
          security_question: "Qual o nome do seu primeiro animal de estimação?",
          security_answer: "Rex",
          photo: null,
          invitation_code: null,
        };
        
        const clientUser: InsertUser = {
          name: "Cliente Teste",
          username: "cliente",
          email: "cliente@valecashback.com",
          password: await this.hashPassword("senha123"),
          type: "client",
          status: "active",
          phone: "(11) 98765-4321",
          country: "Brasil",
          country_code: "BR",
          security_question: "Qual o nome da cidade onde você nasceu?",
          security_answer: "São Paulo",
          photo: null,
          invitation_code: "CL123456",
        };
        
        const merchantUser: InsertUser = {
          name: "Lojista Teste",
          username: "lojista",
          email: "lojista@valecashback.com",
          password: await this.hashPassword("senha123"),
          type: "merchant",
          status: "active",
          phone: "(11) 3456-7890",
          country: "Brasil",
          country_code: "BR",
          security_question: "Qual o modelo do seu primeiro carro?",
          security_answer: "Fusca",
          photo: null,
          invitation_code: "LJ123456",
        };
        
        await this.createUser(adminUser);
        await this.createUser(clientUser);
        await this.createUser(merchantUser);
        
        console.log("Usuários padrão criados com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao inicializar usuários padrão:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, id));
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(eq(users.email, username));
    
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Garantindo que todos os campos obrigatórios estejam preenchidos
    const userWithDefaults = {
      ...insertUser,
      status: insertUser.status || "active",
      username: insertUser.username || null,
      phone: insertUser.phone || null,
      country: insertUser.country || null,
      country_code: insertUser.country_code || null,
      security_question: insertUser.security_question || null,
      security_answer: insertUser.security_answer || null,
      photo: insertUser.photo || null,
      invitation_code: insertUser.invitation_code || null,
    };

    const result = await db.insert(users)
      .values(userWithDefaults)
      .returning();
    
    return result[0];
  }
}

export const storage = new DatabaseStorage();