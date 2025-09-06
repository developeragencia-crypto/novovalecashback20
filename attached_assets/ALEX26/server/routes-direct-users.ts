import { Express } from "express";
import { db } from "./db";
import { users } from "@shared/schema";

export function addDirectUsersRoute(app: Express) {
  // Direct database access route for authentic users
  app.get("/api/direct/users", async (req, res) => {
    try {
      console.log("Accessing authentic users directly from database");
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      
      // Get all users directly from database
      const allUsers = await db.select().from(users);
      
      console.log(`Found ${allUsers.length} authentic users in database`);
      
      // Process users with basic information
      const processedUsers = allUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        status: user.status,
        created_at: user.created_at,
        phone: user.phone,
        country: user.country
      }));
      
      // Count by type
      const clientCount = processedUsers.filter(u => u.type === 'client').length;
      const merchantCount = processedUsers.filter(u => u.type === 'merchant').length;
      const adminCount = processedUsers.filter(u => u.type === 'admin').length;
      
      const response = {
        users: processedUsers,
        totalUsers: processedUsers.length,
        clientCount,
        merchantCount,
        adminCount,
        success: true,
        source: 'direct_database_access'
      };
      
      console.log(`Returning ${processedUsers.length} users: ${clientCount} clients, ${merchantCount} merchants, ${adminCount} admins`);
      
      res.json(response);
    } catch (error) {
      console.error("Error accessing users directly:", error);
      res.status(500).json({ 
        message: "Error accessing user data",
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  });
}