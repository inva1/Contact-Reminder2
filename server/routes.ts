import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertContactSchema, 
  insertMessageSchema, 
  insertSuggestionSchema, 
  insertSettingsSchema 
} from "@shared/schema";
import { analyzeChat, generateSuggestion } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // Default user ID for demo (normally would use auth)
  const DEFAULT_USER_ID = 1;

  // === Contacts API ===
  
  // Get all contacts
  router.get("/contacts", async (req, res) => {
    const contacts = await storage.getContacts(DEFAULT_USER_ID);
    
    // Get latest suggestion for each contact
    const contactsWithSuggestions = await Promise.all(
      contacts.map(async (contact) => {
        const suggestion = await storage.getSuggestion(contact.id);
        
        // Calculate days since last contact
        const daysSinceLastContact = contact.last_contact_date 
          ? Math.floor((Date.now() - contact.last_contact_date.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          ...contact,
          suggestion: suggestion?.suggestion,
          daysSinceLastContact
        };
      })
    );
    
    res.json(contactsWithSuggestions);
  });
  
  // Get a single contact
  router.get("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    const suggestion = await storage.getSuggestion(contact.id);
    
    // Calculate days since last contact
    const daysSinceLastContact = contact.last_contact_date 
      ? Math.floor((Date.now() - contact.last_contact_date.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    res.json({
      ...contact,
      suggestion: suggestion?.suggestion,
      daysSinceLastContact
    });
  });
  
  // Create a new contact
  router.post("/contacts", async (req, res) => {
    try {
      const data = insertContactSchema.parse({
        ...req.body,
        user_id: DEFAULT_USER_ID
      });
      
      const contact = await storage.createContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });
  
  // Update a contact
  router.patch("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    try {
      const updatedContact = await storage.updateContact(id, req.body);
      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });
  
  // Delete a contact
  router.delete("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const deleted = await storage.deleteContact(id);
    if (!deleted) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    res.json({ success: true });
  });
  
  // === Messages API ===
  
  // Get messages for a contact
  router.get("/contacts/:id/messages", async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    const messages = await storage.getMessages(contactId);
    res.json(messages);
  });
  
  // Import chat messages
  router.post("/contacts/:id/import", async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    try {
      const { chatText } = req.body;
      
      if (!chatText) {
        return res.status(400).json({ message: "Chat text is required" });
      }
      
      // Parse WhatsApp chat
      const parsedMessages = parseWhatsAppChat(chatText, contactId);
      
      // Store messages
      const messages = await storage.createMessages(parsedMessages);
      
      // Generate a conversation suggestion using OpenAI
      const lastMessages = messages.slice(-20);
      const analysis = await analyzeChat(
        lastMessages.map(m => ({ 
          sender: m.sender, 
          content: m.content, 
          timestamp: m.timestamp.toISOString()
        })),
        contact.name || "Contact",
        contact.relationship_type || "friend"
      );
      
      // Save the suggestion
      if (analysis.suggestion) {
        await storage.createSuggestion({
          contact_id: contactId,
          suggestion: analysis.suggestion,
          created_at: new Date()
        });
        
        // Update last contact date if it was provided in the analysis
        if (analysis.last_interaction_date) {
          await storage.updateContact(contactId, {
            last_contact_date: new Date(analysis.last_interaction_date)
          });
        }
      }
      
      res.json({ 
        success: true,
        messagesImported: messages.length,
        suggestion: analysis.suggestion
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import chat" });
    }
  });
  
  // Add a message
  router.post("/contacts/:id/messages", async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        contact_id: contactId
      });
      
      const message = await storage.createMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // === Suggestions API ===
  
  // Get suggestion for a contact
  router.get("/contacts/:id/suggestion", async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const suggestion = await storage.getSuggestion(contactId);
    if (!suggestion) {
      return res.status(404).json({ message: "No suggestion found" });
    }
    
    res.json(suggestion);
  });
  
  // Generate a new suggestion
  router.post("/contacts/:id/suggestion", async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    try {
      // Get recent messages
      const messages = await storage.getMessages(contactId);
      
      if (messages.length === 0) {
        // If no messages, generate a generic suggestion
        const genericSuggestion = await generateSuggestion(
          contact.name || "Contact",
          contact.relationship_type || "friend",
          contact.interests ? JSON.parse(contact.interests) : []
        );
        
        const suggestion = await storage.createSuggestion({
          contact_id: contactId,
          suggestion: genericSuggestion,
          created_at: new Date()
        });
        
        return res.json(suggestion);
      }
      
      // Use last 20 messages for analysis
      const lastMessages = messages.slice(-20);
      
      // Analyze chat
      const analysis = await analyzeChat(
        lastMessages.map(m => ({ 
          sender: m.sender, 
          content: m.content, 
          timestamp: m.timestamp.toISOString()
        })),
        contact.name || "Contact",
        contact.relationship_type || "friend"
      );
      
      // Save the suggestion
      if (analysis.suggestion) {
        const newSuggestion = await storage.createSuggestion({
          contact_id: contactId,
          suggestion: analysis.suggestion,
          created_at: new Date()
        });
        
        res.json(newSuggestion);
      } else {
        res.status(500).json({ message: "Failed to generate suggestion" });
      }
    } catch (error) {
      console.error("Suggestion generation error:", error);
      res.status(500).json({ message: "Failed to generate suggestion" });
    }
  });
  
  // === Settings API ===
  
  // Get user settings
  router.get("/settings", async (req, res) => {
    const settings = await storage.getSettings(DEFAULT_USER_ID);
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await storage.createSettings({
        user_id: DEFAULT_USER_ID,
        reminder_enabled: true,
        reminder_frequency: 14,
        cloud_backup_enabled: true,
        theme: "system"
      });
      
      return res.json(defaultSettings);
    }
    
    res.json(settings);
  });
  
  // Update settings
  router.patch("/settings", async (req, res) => {
    try {
      let settings = await storage.getSettings(DEFAULT_USER_ID);
      
      if (!settings) {
        // Create settings if they don't exist
        settings = await storage.createSettings({
          ...req.body,
          user_id: DEFAULT_USER_ID
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(DEFAULT_USER_ID, req.body);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  
  // Sync with cloud (dummy endpoint for now)
  router.post("/sync", async (req, res) => {
    // This would actually sync with a cloud service
    // For now, just return success
    res.json({ success: true, message: "Sync complete" });
  });

  app.use("/api", router);
  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse WhatsApp chat export text
function parseWhatsAppChat(chatText: string, contactId: number): any[] {
  const lines = chatText.split('\n');
  const messages: any[] = [];
  
  // WhatsApp chat format: [MM/DD/YY, HH:MM] Name: Message
  const regex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)/;
  
  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const [_, dateStr, timeStr, sender, content] = match;
      
      try {
        // Parse the date and time
        const [month, day, year] = dateStr.split('/').map(Number);
        let [hour, minute] = timeStr.split(':').map(Number);
        
        // Handle AM/PM if present
        if (timeStr.includes('PM') && hour < 12) {
          hour += 12;
        } else if (timeStr.includes('AM') && hour === 12) {
          hour = 0;
        }
        
        // Create JavaScript date object (handle 2-digit years)
        const date = new Date(
          year < 100 ? 2000 + year : year, 
          month - 1, 
          day, 
          hour, 
          minute
        );
        
        messages.push({
          contact_id: contactId,
          timestamp: date,
          sender: sender.trim(),
          content: content.trim()
        });
      } catch (e) {
        console.error("Failed to parse message date:", e);
      }
    }
  });
  
  return messages;
}
