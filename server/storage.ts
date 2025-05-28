import { 
  users, contacts, messages, suggestions, settings,
  type User, type InsertUser, 
  type Contact, type InsertContact,
  type Message, type InsertMessage,
  type Suggestion, type InsertSuggestion,
  type Settings, type InsertSettings
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contact operations
  getContacts(userId: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  
  // Message operations
  getMessages(contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createMessages(messages: InsertMessage[]): Promise<Message[]>;
  
  // Suggestion operations
  getSuggestion(contactId: number): Promise<Suggestion | undefined>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  deleteSuggestions(contactId: number): Promise<boolean>;
  
  // Settings operations
  getSettings(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private messages: Map<number, Message>;
  private suggestions: Map<number, Suggestion>;
  private settingsMap: Map<number, Settings>;
  private currentUserId: number;
  private currentContactId: number;
  private currentMessageId: number;
  private currentSuggestionId: number;
  private currentSettingsId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.messages = new Map();
    this.suggestions = new Map();
    this.settingsMap = new Map();
    this.currentUserId = 1;
    this.currentContactId = 1;
    this.currentMessageId = 1;
    this.currentSuggestionId = 1;
    this.currentSettingsId = 1;
    
    // Create demo user
    this.createUser({ username: "demo", password: "password" });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Contact operations
  async getContacts(userId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.user_id === userId,
    );
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updatedContact = { ...contact, ...data };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Message operations
  async getMessages(contactId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.contact_id === contactId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { ...insertMessage, id };
    this.messages.set(id, message);
    return message;
  }
  
  async createMessages(insertMessages: InsertMessage[]): Promise<Message[]> {
    const createdMessages: Message[] = [];
    
    for (const insertMessage of insertMessages) {
      const message = await this.createMessage(insertMessage);
      createdMessages.push(message);
    }
    
    return createdMessages;
  }

  // Suggestion operations
  async getSuggestion(contactId: number): Promise<Suggestion | undefined> {
    return Array.from(this.suggestions.values())
      .filter((suggestion) => suggestion.contact_id === contactId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
  }

  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const id = this.currentSuggestionId++;
    const suggestion: Suggestion = { ...insertSuggestion, id };
    this.suggestions.set(id, suggestion);
    return suggestion;
  }
  
  async deleteSuggestions(contactId: number): Promise<boolean> {
    let success = true;
    
    for (const [id, suggestion] of this.suggestions.entries()) {
      if (suggestion.contact_id === contactId) {
        const deleted = this.suggestions.delete(id);
        if (!deleted) success = false;
      }
    }
    
    return success;
  }

  // Settings operations
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settingsMap.values()).find(
      (setting) => setting.user_id === userId,
    );
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.currentSettingsId++;
    const settings: Settings = { ...insertSettings, id };
    this.settingsMap.set(id, settings);
    return settings;
  }

  async updateSettings(userId: number, data: Partial<Settings>): Promise<Settings | undefined> {
    const settings = Array.from(this.settingsMap.values()).find(
      (setting) => setting.user_id === userId,
    );
    
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...data };
    this.settingsMap.set(settings.id, updatedSettings);
    return updatedSettings;
  }
}

// export const storage = new MemStorage();

import { PostgresStorage } from './postgres_storage';
export const storage = new PostgresStorage();
