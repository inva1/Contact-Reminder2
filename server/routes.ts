import express, { type Express, Response, NextFunction } from "express"; // Removed Request here, will use AuthenticatedRequest
import { createServer, type Server } from "http";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { authenticateToken } from './middleware/auth'; // Import the auth middleware
import { z } from "zod";
import { 
  insertContactSchema, 
  insertMessageSchema, 
  insertSuggestionSchema, 
  insertSettingsSchema,
  users,
  type User as DbUser, // Renaming to avoid conflict with Express.User
  type Contact,        // Import Contact type
  type Suggestion      // Import Suggestion type
} from "@shared/schema";
import { analyzeChat, generateSuggestion } from "./openai";
import { addDays, isBefore, startOfDay } from 'date-fns'; // Date utility functions
import { eq, and, lt, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { prompt_history, contacts } from "../shared/schema";

// GET /api/recommendations/chat-export-needed
app.get("/api/recommendations/chat-export-needed", async (req, res) => {
  const userId = req.user.id; // Assuming auth middleware sets this
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Find contacts needing attention
  const needyContacts = await db
    .select()
    .from(contacts)
    .leftJoin(prompt_history, and(
      eq(contacts.id, prompt_history.contact_id),
      eq(prompt_history.user_id, userId)
    ))
    .where(and(
      eq(contacts.user_id, userId),
      or(
        lt(contacts.last_message_date, thirtyDaysAgo),
        and(
          gt(contacts.reminder_frequency, 0),
          lt(contacts.last_contact_date, new Date(now.getTime() - contacts.reminder_frequency * 24 * 60 * 60 * 1000))
        )
      ),
      or(
        isNull(prompt_history.last_prompted_at),
        lt(prompt_history.last_prompted_at, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      ),
      or(
        isNull(prompt_history.snoozed_until),
        lt(prompt_history.snoozed_until, now)
      )
    ))
    .limit(3);
    
  res.json(needyContacts.map(contact => ({
    id: contact.id,
    name: contact.name
  })));
});

// POST /api/recommendations/log-chat-export-prompt
app.post("/api/recommendations/log-chat-export-prompt", async (req, res) => {
  const { contact_id } = req.body;
  const userId = req.user.id;
  
  await db
    .insert(prompt_history)
    .values({
      user_id: userId,
      contact_id,
      last_prompted_at: new Date(),
      snoozed_until: null
    })
    .onConflict(['user_id', 'contact_id'])
    .merge({
      last_prompted_at: new Date(),
      snoozed_until: null
    });
    
  res.json({ success: true });
});

// POST /api/recommendations/snooze-chat-export-prompt
app.post("/api/recommendations/snooze-chat-export-prompt", async (req, res) => {
  const { contact_id, duration_days } = req.body;
  const userId = req.user.id;
  
  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + duration_days);
  
  await db
    .insert(prompt_history)
    .values({
      user_id: userId,
      contact_id,
      last_prompted_at: new Date(),
      snoozed_until: snoozedUntil
    })
    .onConflict(['user_id', 'contact_id'])
    .merge({
      snoozed_until: snoozedUntil
    });
    
  res.json({ success: true });
});

// JWT_SECRET is already defined in middleware/auth.ts, ensure consistency or centralize
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-and-long-jwt-key"; 
if (JWT_SECRET === "your-super-secret-and-long-jwt-key" && process.env.NODE_ENV !== 'test') { // Added a check for test environment
  console.warn("Warning: JWT_SECRET is using a default insecure value. Please set a strong secret in your environment variables.");
}

// Define an interface for requests that have the user object
interface AuthenticatedRequest extends express.Request {
  user?: {
    userId: number;
    username: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // === Auth API ===

  // Register a new user
  router.post("/auth/register", async (req: AuthenticatedRequest, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    try {
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10
      const newUser = await storage.createUser({ username, password: hashedPassword });
      
      // Exclude password from the returned user object
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ message: "User registered successfully", user: userWithoutPassword });

    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) { // Should not happen with manual validation here, but good practice
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Login a user
  router.post("/auth/login", async (req: AuthenticatedRequest, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
      );

      res.json({ message: "Login successful", token });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login user" });
    }
  });


  // === Contacts API ===
  // All routes below this will be protected by authenticateToken middleware
  router.use(authenticateToken); // Apply middleware to all subsequent routes in this router
  
  // Get all contacts
  router.get("/contacts", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    try {
      const contactsFromDb = await storage.getContactsWithLatestSuggestions(userId);
      
      const contactsWithDays = contactsFromDb.map(contact => {
        const daysSinceLastContact = contact.last_contact_date
          ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          ...contact,
          // suggestion field is already part of contact from getContactsWithLatestSuggestions
          daysSinceLastContact,
        };
      });
      res.json(contactsWithDays);
    } catch (error) {
      console.error("Error fetching contacts with suggestions:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  // Get a single contact
  router.get("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(id, userId); // Pass userId here
    // Important: Verify that the contact belongs to the authenticated user (already done by storage.getContact)
    if (!contact) { // storage.getContact now ensures it belongs to user or returns null
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }
    
    const suggestion = await storage.getSuggestion(contact.id, userId); // Pass userId here
    
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
  router.post("/contacts", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      const data = insertContactSchema.parse({
        ...req.body,
        user_id: userId 
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
  router.patch("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const existingContact = await storage.getContact(id);
    if (!existingContact || existingContact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }
    
    try {
      // Ensure user_id is not changed to another user's ID via req.body
      const updateData = { ...req.body, user_id: userId };
      const updatedContact = await storage.updateContact(id, updateData);
      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });
  
  // Delete a contact
  router.delete("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(id);
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }

    const deleted = await storage.deleteContact(id); // PostgresStorage.deleteContact already checks user_id
    if (!deleted) {
      // This condition might be tricky depending on how deleteContact signals "not found for this user" vs other errors
      return res.status(404).json({ message: "Failed to delete contact or contact not found" });
    }
    
    res.json({ success: true });
  });
  
  // === Messages API ===
  
  // Get messages for a contact
  router.get("/contacts/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId, userId); // Pass userId here
    if (!contact) { // storage.getContact now ensures it belongs to user or returns null
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }
    
    const messages = await storage.getMessages(contactId);
    res.json(messages);
  });
  
  // Import chat messages
  router.post("/contacts/:id/import", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
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
      
      // Generate a comprehensive conversation analysis using OpenAI
      const lastMessages = messages.slice(-40); // Analyze more messages for better context
      const analysis = await analyzeChat(
        lastMessages.map(m => ({ 
          sender: m.sender, 
          content: m.content, 
          timestamp: m.timestamp.toISOString()
        })),
        contact.name || "Contact",
        contact.relationship_type || "friend"
      );
      
      // Store topics as JSON string if available
      const topicsJson = analysis.topics && analysis.topics.length > 0 
        ? JSON.stringify(analysis.topics) 
        : null;
        
      // Store conversation themes as JSON string if available
      const themesJson = analysis.conversation_themes && analysis.conversation_themes.length > 0
        ? JSON.stringify(analysis.conversation_themes)
        : null;
      
      // Save the suggestion with enhanced data
      if (analysis.suggestion) {
        await storage.createSuggestion({
          contact_id: contactId,
          suggestion: analysis.suggestion,
          topics: topicsJson,
          context: analysis.context_notes,
          created_at: new Date()
        });
        
        // Update contact with more detailed information from analysis
        const lastDate = new Date(analysis.last_interaction_date);
        const updateData: any = { 
          last_contact_date: lastDate,
          last_message_date: lastDate
        };
        
        // Update priority based on relationship strength if available
        if (analysis.relationship_strength) {
          updateData.priority_level = Math.ceil(analysis.relationship_strength / 2); // Convert 1-10 to 1-5 scale
        }
        
        // Update interests from topics if available
        if (contact.interests === null && topicsJson) {
          updateData.interests = topicsJson;
        }
        
        await storage.updateContact(contactId, userId, updateData); // Pass userId here
      }
      
      res.json({ 
        success: true,
        messagesImported: messages.length,
        suggestion: analysis.suggestion,
        analysis: {
          topics: analysis.topics || [],
          sentiment: analysis.sentiment || 'neutral',
          relationship_strength: analysis.relationship_strength || 5,
          interaction_frequency: analysis.interaction_frequency || 'occasional',
          conversation_themes: analysis.conversation_themes || [],
          last_interaction_date: analysis.last_interaction_date,
          message_preview: analysis.message_preview || ''
        }
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import chat" });
    }
  });
  
  // Add a message
  router.post("/contacts/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }

    try {
      // Note: message schema in shared/schema.ts does not have user_id.
      // Ownership is through contact.
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
  router.get("/contacts/:id/suggestion", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }

    const suggestion = await storage.getSuggestion(contactId); // PostgresStorage.getSuggestion checks user_id via contact
    if (!suggestion) {
      return res.status(404).json({ message: "No suggestion found" });
    }
    
    res.json(suggestion);
  });
  
  // Generate a new suggestion
  router.post("/contacts/:id/suggestion", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    const contact = await storage.getContact(contactId);
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ message: "Contact not found or unauthorized" });
    }
    
    try {
      // Get recent messages
      const messages = await storage.getMessages(contactId);
      
      if (messages.length === 0) {
        // If no messages, generate a generic suggestion
        const suggestionResponse = await generateSuggestion(
          contact.name || "Contact",
          contact.relationship_type || "friend",
          contact.interests ? JSON.parse(contact.interests) : []
        );
        
        const suggestion = await storage.createSuggestion({
          contact_id: contactId,
          suggestion: suggestionResponse.message,
          context: suggestionResponse.context_relevance,
          topics: suggestionResponse.alternative_options ? JSON.stringify(suggestionResponse.alternative_options) : null,
          created_at: new Date()
        });
        
        return res.json({
          ...suggestion,
          tone_analysis: suggestionResponse.tone_analysis,
          alternative_options: suggestionResponse.alternative_options
        });
      }
      
      // Use last 40 messages for better analysis
      const lastMessages = messages.slice(-40);
      
      // Analyze chat with comprehensive analysis
      const analysis = await analyzeChat(
        lastMessages.map(m => ({ 
          sender: m.sender, 
          content: m.content, 
          timestamp: m.timestamp.toISOString()
        })),
        contact.name || "Contact",
        contact.relationship_type || "friend"
      );
      
      // Store topics as JSON string if available
      const topicsJson = analysis.topics && analysis.topics.length > 0 
        ? JSON.stringify(analysis.topics) 
        : null;
        
      // Store conversation themes as JSON string if available
      const themesJson = analysis.conversation_themes && analysis.conversation_themes.length > 0
        ? JSON.stringify(analysis.conversation_themes)
        : null;
      
      // Save the suggestion with enhanced data
      if (analysis.suggestion) {
        const newSuggestion = await storage.createSuggestion({
          contact_id: contactId,
          suggestion: analysis.suggestion,
          topics: topicsJson,
          context: analysis.context_notes,
          created_at: new Date()
        });
        
        // Update contact with more detailed information if available
        if (analysis.last_interaction_date) {
          const lastDate = new Date(analysis.last_interaction_date);
          const updateData: any = { 
            last_contact_date: lastDate,
            last_message_date: lastDate
          };
          
          // Update priority based on relationship strength if available
          if (analysis.relationship_strength) {
            updateData.priority_level = Math.ceil(analysis.relationship_strength / 2); // Convert 1-10 to 1-5 scale
          }
          
          await storage.updateContact(contactId, updateData);
        }
        
        res.json({
          ...newSuggestion,
          analysis: {
            topics: analysis.topics || [],
            sentiment: analysis.sentiment || 'neutral',
            relationship_strength: analysis.relationship_strength || 5,
            interaction_frequency: analysis.interaction_frequency || 'occasional',
            conversation_themes: analysis.conversation_themes || [],
            message_preview: analysis.message_preview || ''
          }
        });
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
  router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    let settings = await storage.getSettings(userId);
    
    if (!settings) {
      // Create default settings if none exist
      // Ensure all required fields for InsertSettings are provided, or that your DB schema has defaults
      settings = await storage.createSettings({
        user_id: userId,
        reminder_enabled: true,
        reminder_frequency: 14, // Default value
        cloud_backup_enabled: false, // Default value
        notify_new_suggestions: true, // Default value
        notify_missed_connections: true, // Default value
        privacy_mode: false, // Default value
        language_preference: 'en', // Default value
        preferred_contact_method: 'email', // Default value
        theme: "system"
      });
    }
    res.json(settings);
  });
  
  // Update settings
  router.patch("/settings", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    try {
      // Ensure req.body does not include user_id to prevent changing ownership
      const { user_id, ...settingsData } = req.body;
      const updatedSettings = await storage.updateSettings(userId, settingsData);
      
      if (!updatedSettings) {
         // If settings didn't exist, let's try to create them.
        // This matches behavior of MemStorage and common UX expectation.
        const newSettings = await storage.createSettings({ ...settingsData, user_id: userId });
        return res.json(newSettings);
      }
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // === Reminders API ===
  router.get("/reminders/pending", async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      const userSettings = await storage.getSettings(userId);
      if (!userSettings || !userSettings.reminder_enabled) {
        return res.json([]); // Reminders disabled or no settings found
      }

      const contacts = await storage.getContacts(userId);
      const pendingReminders = [];
      const today = startOfDay(new Date()); // Compare with the start of today

      for (const contact of contacts) {
        if (contact.last_contact_date && contact.reminder_frequency != null) {
          // Ensure last_contact_date is treated as a Date object
          const lastContact = new Date(contact.last_contact_date);
          const dueDate = startOfDay(addDays(lastContact, contact.reminder_frequency));

          if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) { // If due date is today or in the past
            const suggestionResult = await storage.getSuggestion(contact.id); // getSuggestion should check user ownership implicitly via contact
            if (suggestionResult) {
              pendingReminders.push({
                contactId: contact.id,
                contactName: contact.name,
                suggestion: suggestionResult.suggestion,
                // Add other relevant details if needed by the frontend notification
              });
            }
          }
        }
      }
      res.json(pendingReminders);
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
      res.status(500).json({ message: "Failed to fetch pending reminders" });
    }
  });
  
  // Sync with cloud (dummy endpoint for now)
  router.post("/sync", async (req: AuthenticatedRequest, res: Response) => { // Ensure AuthenticatedRequest type
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
