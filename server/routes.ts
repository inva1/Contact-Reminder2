import express, { type Express, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from "./storage"; 
import { authenticateToken } from './middleware/auth';
import { z } from "zod";
import { 
  insertContactSchema, 
  insertMessageSchema,
  type Contact, 
  type InsertContact, 
  type Settings as SettingsType,
  type User as UserType, 
  type Suggestion as SuggestionType,
  type InsertSuggestion as InsertSuggestionType
} from "@shared/schema"; 
import * as schema from "@shared/schema"; 
import { analyzeChat, generateSuggestion } from "./openai";
import { addDays, isBefore, startOfDay } from 'date-fns';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-and-long-jwt-key"; 
if (JWT_SECRET === "your-super-secret-and-long-jwt-key" && process.env.NODE_ENV !== 'test') {
  console.warn("Warning: JWT_SECRET is using a default insecure value. Please set a strong secret in your environment variables.");
}

// Define AuthenticatedRequest interface (already present)
export interface AuthenticatedRequest extends express.Request { // Exporting for test usage
  user?: {
    id: number; 
    username: string;
  };
}

// === Extracted Route Handlers for Testing ===

export async function handleGetContacts(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: "User not authenticated" });
  const userId = req.user.id; 
  try {
    const contactsFromDb = await storage.getContactsWithLatestSuggestions(userId); 
    const contactsWithDays = contactsFromDb.map(contact => {
      const daysSinceLastContact = contact.lastContactDate 
        ? Math.floor((Date.now() - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...contact, daysSinceLastContact };
    });
    res.json(contactsWithDays);
  } catch (error) {
    console.error("Error fetching contacts with suggestions:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
}

export async function handleCreateContact(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: "User not authenticated" });
  const userId = req.user.id;
  try {
    const validationResult = insertContactSchema.safeParse({ ...req.body, user_id: userId });
    if (!validationResult.success) {
        return res.status(400).json({ message: "Validation failed", errors: validationResult.error.formErrors });
    }
    const contact = await storage.createContact(validationResult.data); 
    res.status(201).json(contact);
  } catch (error) {
    console.error("Error creating contact:", error);
    if (error instanceof z.ZodError) { 
      return res.status(400).json({ message: "Invalid data format", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create contact" });
  }
}


export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // === Recommendation API ===
  router.get("/recommendations/chat-export-needed", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    
    try {
      const needyContacts = await storage.getChatExportRecommendations(userId);
      res.json(needyContacts);
    } catch (error) {
        console.error("Error fetching chat export needed recommendations:", error);
        res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  router.post("/recommendations/log-chat-export-prompt", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const { contact_id } = req.body; 
    const userId = req.user.id;

    if (contact_id == null) {
        return res.status(400).json({ message: "contact_id is required" });
    }
    
    try {
      await storage.logChatExportPrompt(userId, Number(contact_id));
      res.json({ success: true });
    } catch (error) {
        console.error("Error logging chat export prompt:", error);
        res.status(500).json({ message: "Failed to log prompt" });
    }
  });

  router.post("/recommendations/snooze-chat-export-prompt", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const { contact_id, duration_days } = req.body;
    const userId = req.user.id;

    if (contact_id == null || duration_days == null) {
        return res.status(400).json({ message: "contact_id and duration_days are required" });
    }
    
    const snoozedUntilDate = new Date();
    snoozedUntilDate.setDate(snoozedUntilDate.getDate() + Number(duration_days));
    
    try {
      await storage.snoozeChatExportPrompt(userId, Number(contact_id), snoozedUntilDate);
      res.json({ success: true });
    } catch (error) {
        console.error("Error snoozing chat export prompt:", error);
        res.status(500).json({ message: "Failed to snooze prompt" });
    }
  });

  // === Auth API ===
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
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({ username, password: hashedPassword });
      const { password: _, ...userWithoutPassword } = newUser; 
      res.status(201).json({ message: "User registered successfully", user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) { 
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

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
        { id: user.id, username: user.username }, 
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.json({ message: "Login successful", token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login user" });
    }
  });

  // Apply authenticateToken middleware for all routes defined below this line in the router
  router.use(authenticateToken); 

  // === Contacts API (Using Extracted Handlers) ===
  router.get("/contacts", handleGetContacts);
  router.post("/contacts", handleCreateContact);
  
  // Other contact routes remain as anonymous handlers for now, can be refactored if tests are needed for them
  router.get("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    try {
      const contact = await storage.getContact(contactId, userId); 
      if (!contact) {
        return res.status(404).json({ message: "Contact not found or unauthorized" });
      }
      const suggestion = await storage.getSuggestion(contact.id, userId); 
      const daysSinceLastContact = contact.lastContactDate 
        ? Math.floor((Date.now() - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      res.json({ ...contact, suggestion: suggestion?.suggestion, daysSinceLastContact });
    } catch (error) {
        console.error("Error fetching single contact:", error);
        res.status(500).json({ message: "Failed to fetch contact" });
    }
  });
    
  router.patch("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    try {
      const { user_id, id, ...updatePayloadFromRequest } = req.body; 
      const updatedContact = await storage.updateContact(contactId, userId, 
        updatePayloadFromRequest as Partial<Omit<schema.InsertContact, 'id' | 'user_id'>>); 
      
      if (!updatedContact) {
        return res.status(404).json({ message: "Contact not found or failed to update" });
      }
      res.json(updatedContact); 
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });
  
  router.delete("/contacts/:id", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    try {
      await storage.deleteContact(contactId, userId); 
      res.status(204).send(); 
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  
  // === Messages API ===
  // ... (rest of the message, suggestion, settings, reminders, sync APIs remain as anonymous handlers) ...
  // For brevity, I'm not including the full remaining routes, but they would be here.
  // The key is that handleGetContacts and handleCreateContact are now defined and exported.

  router.get("/contacts/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    try {
      const contact = await storage.getContact(contactId, userId); 
      if (!contact) {
          return res.status(404).json({ message: "Contact not found or unauthorized" });
      }
      const messages = await storage.getMessages(contactId, userId); 
      res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  router.post("/contacts/:id/import", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    try {
      const contact = await storage.getContact(contactId, userId); 
      if (!contact) {
        return res.status(404).json({ message: "Contact not found or unauthorized" });
      }
      
      const { chatText } = req.body;
      if (!chatText) {
        return res.status(400).json({ message: "Chat text is required" });
      }
      
      const parsedMessages = parseWhatsAppChat(chatText, contactId); 
      const messages = await storage.createMessages(parsedMessages); 
      
      const lastMessages = messages.slice(-40); 
      const analysis = await analyzeChat( 
        lastMessages.map(m => ({ sender: m.sender, content: m.content, timestamp: m.timestamp.toISOString() })),
        contact.name, 
        contact.relationshipType || "friend" 
      );
      
      const topicsJson = analysis.topics && analysis.topics.length > 0 ? JSON.stringify(analysis.topics) : null;
      
      if (analysis.suggestion) {
        const suggestionToSave: InsertSuggestionType = { 
          contact_id: contactId, 
          suggestion: analysis.suggestion,
          topics: topicsJson,
          context: analysis.context_notes, 
          created_at: new Date(),
          source: analysis.source, 
          error_message: analysis.error_message 
        };
        if (suggestionToSave.topics === undefined) delete suggestionToSave.topics;
        if (suggestionToSave.context === undefined) delete suggestionToSave.context;
        if (suggestionToSave.source === undefined) delete suggestionToSave.source;
        if (suggestionToSave.error_message === undefined) delete suggestionToSave.error_message;

        await storage.createSuggestion(suggestionToSave);
        
        if (analysis.last_interaction_date) {
            const lastDate = new Date(analysis.last_interaction_date);
            const updateData: Partial<schema.InsertContact> = { 
              last_contact_date: lastDate,
              last_message_date: lastDate
            };
            if (analysis.relationship_strength) {
              updateData.priority_level = Math.ceil(analysis.relationship_strength / 2);
            }
            if (contact.interests === null && topicsJson) { 
              updateData.interests = topicsJson; 
            }
            await storage.updateContact(contactId, userId, updateData);
        }
      }
      
      res.json({ 
        success: true, messagesImported: messages.length, suggestion: analysis.suggestion,
        analysis: { 
          topics: analysis.topics || [], sentiment: analysis.sentiment || 'neutral',
          relationship_strength: analysis.relationship_strength || 5,
          interaction_frequency: analysis.interaction_frequency || 'occasional',
          conversation_themes: analysis.conversation_themes || [],
          last_interaction_date: analysis.last_interaction_date,
          message_preview: analysis.message_preview || '',
          source: analysis.source,
          error_message: analysis.error_message
        }
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import chat" });
    }
  });
  
  router.post("/contacts/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id; 
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }

    try {
      const contact = await storage.getContact(contactId, userId); 
      if (!contact) {
        return res.status(404).json({ message: "Contact not found or unauthorized" });
      }
      const validationResult = insertMessageSchema.safeParse({ ...req.body, contact_id: contactId });
      if (!validationResult.success) {
          return res.status(400).json({ message: "Validation failed", errors: validationResult.error.formErrors });
      }
      const message = await storage.createMessage(validationResult.data); 
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // === Suggestions API ===
  router.get("/contacts/:id/suggestion", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    try {
      const suggestion = await storage.getSuggestion(contactId, userId); 
      if (!suggestion) {
        return res.status(404).json({ message: "No suggestion found or unauthorized" });
      }
      res.json(suggestion);
    } catch (error) {
        console.error("Error fetching suggestion:", error);
        res.status(500).json({ message: "Failed to fetch suggestion" });
    }
  });
  
  router.post("/contacts/:id/suggestion", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    
    try {
      const contact = await storage.getContact(contactId, userId); 
      if (!contact) {
        return res.status(404).json({ message: "Contact not found or unauthorized" });
      }
      
      const messages = await storage.getMessages(contactId, userId); 
      let suggestionResultFromOpenAI;
      let topicsForDb: string | null = null;
      let contextForDb: string | null = null;

      if (messages.length === 0) {
        suggestionResultFromOpenAI = await generateSuggestion(
          contact.name, 
          contact.relationshipType || "friend", 
          contact.interests ? JSON.parse(contact.interests) : [] 
        );
        contextForDb = suggestionResultFromOpenAI.context_relevance;
        topicsForDb = suggestionResultFromOpenAI.alternative_options ? JSON.stringify(suggestionResultFromOpenAI.alternative_options) : null;

      } else {
        const lastMessages = messages.slice(-40); 
        const analysisResult = await analyzeChat( 
          lastMessages.map(m => ({ sender: m.sender, content: m.content, timestamp: m.timestamp.toISOString() })),
          contact.name, 
          contact.relationshipType || "friend" 
        );
        suggestionResultFromOpenAI = {
            message: analysisResult.suggestion,
            source: analysisResult.source,
            error_message: analysisResult.error_message,
            topics: analysisResult.topics, 
            context_notes: analysisResult.context_notes,
        };
        topicsForDb = analysisResult.topics && analysisResult.topics.length > 0 ? JSON.stringify(analysisResult.topics) : null;
        contextForDb = analysisResult.context_notes;
        
        if (analysisResult.last_interaction_date) {
            const lastDate = new Date(analysisResult.last_interaction_date);
            const updateData: Partial<schema.InsertContact> = { 
                last_contact_date: lastDate, last_message_date: lastDate 
            };
            if (analysisResult.relationship_strength) {
              updateData.priority_level = Math.ceil(analysisResult.relationship_strength / 2);
            }
            await storage.updateContact(contactId, userId, updateData);
        }
      }
      
      const suggestionToSave: InsertSuggestionType = {
        contact_id: contactId,
        suggestion: suggestionResultFromOpenAI.message,
        topics: topicsForDb,
        context: contextForDb,
        created_at: new Date(),
        source: suggestionResultFromOpenAI.source,
        error_message: suggestionResultFromOpenAI.error_message,
      };
      if (suggestionToSave.topics === undefined) delete suggestionToSave.topics;
      if (suggestionToSave.context === undefined) delete suggestionToSave.context;
      if (suggestionToSave.source === undefined) delete suggestionToSave.source;
      if (suggestionToSave.error_message === undefined) delete suggestionToSave.error_message;
      
      const newDbSuggestion = await storage.createSuggestion(suggestionToSave); 
      
      res.json(newDbSuggestion); 

    } catch (error) {
      console.error("Suggestion generation error:", error);
      res.status(500).json({ message: "Failed to generate suggestion" });
    }
  });
  
  // === Settings API ===
  router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    try {
        let settings = await storage.getSettings(userId); 
        if (!settings) {
          settings = await storage.createSettings({ 
            userId: userId, reminder_enabled: true, reminder_frequency: 14, 
            cloud_backup_enabled: false, notify_new_suggestions: true,
            notify_missed_connections: true, privacy_mode: false,
            language_preference: 'en', preferred_contact_method: 'email', theme: "system"
          });
        }
        res.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  
  router.patch("/settings", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    try {
      const { user_id, ...settingsDataFromRequest } = req.body; 
      let updated = await storage.updateSettings(userId, settingsDataFromRequest as Partial<Omit<SettingsType, 'id' | 'user_id'>>);
      if (!updated) {
        updated = await storage.createSettings({ ...(settingsDataFromRequest as any), userId: userId }); 
        if (!updated) { 
            return res.status(500).json({ message: "Failed to create or update settings" });
        }
      }
      res.json(updated); 
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // === Reminders API ===
  router.get("/reminders/pending", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    const userId = req.user.id;
    try {
      const userSettings = await storage.getSettings(userId); 
      if (!userSettings || !userSettings.reminderEnabled) { 
        return res.json([]);
      }
      const currentContacts = await storage.getContacts(userId); 
      const pendingReminders = [];
      const today = startOfDay(new Date());

      for (const contact of currentContacts) { 
        if (contact.lastContactDate && contact.reminderFrequency != null) { 
          const lastContactDate = new Date(contact.lastContactDate);
          const dueDate = startOfDay(addDays(lastContactDate, contact.reminderFrequency));
          if (isBefore(dueDate, today) || dueDate.getTime() === today.getTime()) {
            const suggestionResult = await storage.getSuggestion(contact.id, userId); 
            if (suggestionResult) {
              pendingReminders.push({
                contactId: contact.id, contactName: contact.name,
                suggestion: suggestionResult.suggestion, 
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
  
  router.post("/sync", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "User not authenticated" });
    res.json({ success: true, message: "Sync complete (dummy)" });
  });

  app.use("/api", router);
  
  const httpServer = createServer(app);
  return httpServer;
}

function parseWhatsAppChat(chatText: string, contactId: number): any[] {
  const lines = chatText.split('\n');
  const messages: any[] = [];
  const regex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)/;
  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const [_, dateStr, timeStr, sender, content] = match;
      try {
        const [month, day, yearSuffix] = dateStr.split('/').map(Number);
        const year = yearSuffix < 100 ? 2000 + yearSuffix : yearSuffix;
        let [hourStr, minuteStrPart] = timeStr.split(':'); 
        let minute = 0;
        let ampm = "";

        const ampmMatch = minuteStrPart.match(/([0-9]+)\s*([AP]M)/i);
        if (ampmMatch) {
            minute = parseInt(ampmMatch[1]);
            ampm = ampmMatch[2].toUpperCase();
        } else {
            minute = parseInt(minuteStrPart);
        }
        
        let hourNum = parseInt(hourStr);

        if (ampm === 'PM' && hourNum < 12) {
          hourNum += 12;
        } else if (ampm === 'AM' && hourNum === 12) { 
          hourNum = 0;
        }
        
        const date = new Date(year, month - 1, day, hourNum, minute);
        messages.push({
          contact_id: contactId, 
          timestamp: date,
          sender: sender.trim(),
          content: content.trim()
        });
      } catch (e) {
        console.error("Failed to parse message date line:", line, e);
      }
    }
  });
  return messages;
}
