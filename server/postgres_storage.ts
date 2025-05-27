import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, inArray, sql, SQL } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { IStorage } from './storage';
// User, Contact, Message, Suggestion, Settings are from schema now, ContactWithSuggestion is also from schema
import { type User, type Contact, type Message, type Suggestion, type Settings, type ContactWithSuggestion } from '../shared/schema'; 

export class PostgresStorage implements IStorage {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema });
  }

  // User methods
  async getUser(id: number): Promise<User | null> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result.length > 0 ? result[0] : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return result.length > 0 ? result[0] : null;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const result = await this.db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // Contact methods
  async getContacts(userId: number): Promise<Contact[]> {
    return this.db.select().from(schema.contacts).where(eq(schema.contacts.userId, userId));
  }

  async getContact(id: number, userId: number): Promise<Contact | null> {
    const result = await this.db.select().from(schema.contacts).where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)));
    return result.length > 0 ? result[0] : null;
  }

  async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const result = await this.db.insert(schema.contacts).values(contact).returning();
    return result[0];
  }

  async updateContact(id: number, userId: number, updates: Partial<Contact>): Promise<Contact | null> {
    const result = await this.db.update(schema.contacts)
      .set(updates)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
      .returning();
    return result.length > 0 ? result[0] : null;
  }

  async deleteContact(id: number, userId: number): Promise<void> {
    await this.db.delete(schema.contacts).where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)));
  }

  async getContactsWithLatestSuggestions(userId: number): Promise<ContactWithSuggestion[]> {
    const userContacts: Contact[] = await this.db.select().from(schema.contacts).where(eq(schema.contacts.userId, userId));
    if (userContacts.length === 0) {
      return [];
    }

    const contactIds = userContacts.map(c => c.id);

    // Subquery to rank suggestions for each contact
    const rankedSuggestions = this.db
      .select({
        contactId: schema.suggestions.contactId,
        suggestion: schema.suggestions.suggestion,
        createdAt: schema.suggestions.createdAt,
        // Rank suggestions by creation date, descending
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.suggestions.contactId} ORDER BY ${schema.suggestions.createdAt} DESC)`.as('rn'),
      })
      .from(schema.suggestions)
      .where(inArray(schema.suggestions.contactId, contactIds))
      .as('ranked_suggestions');

    // Select only the latest suggestion (rank = 1) for each contact
    const latestSuggestionsData = await this.db
      .select({
        contactId: rankedSuggestions.contactId,
        suggestion: rankedSuggestions.suggestion,
      })
      .from(rankedSuggestions)
      .where(eq(rankedSuggestions.rn, 1));

    const suggestionsMap = new Map<number, string>();
    latestSuggestionsData.forEach(s => {
      if (s.contactId !== null && s.suggestion !== null) { // Ensure contactId and suggestion are not null
         suggestionsMap.set(s.contactId, s.suggestion);
      }
    });
    
    // Augment contacts with their latest suggestion text
    const contactsWithSuggestionsResult: ContactWithSuggestion[] = userContacts.map(contact => ({
      ...contact,
      suggestion: suggestionsMap.get(contact.id) || undefined, // Ensure undefined if no suggestion, matching ContactWithSuggestion type
      // Other fields for ContactWithSuggestion like daysSinceLastContact will be calculated in routes.ts
    }));
    
    return contactsWithSuggestionsResult;
  }


  // Message methods
  async getMessages(contactId: number, userId: number): Promise<Message[]> {
    // First, ensure the contact belongs to the user to prevent unauthorized access
    const contact = await this.getContact(contactId, userId);
    if (!contact) {
      return []; // Or throw an error
    }
    return this.db.select().from(schema.messages).where(eq(schema.messages.contactId, contactId));
  }

  async createMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const result = await this.db.insert(schema.messages).values(message).returning();
    return result[0];
  }

  async createMessages(messages: Omit<Message, 'id'>[]): Promise<Message[]> {
    if (messages.length === 0) return [];
    const result = await this.db.insert(schema.messages).values(messages).returning();
    return result;
  }

  // Suggestion methods
  async getSuggestion(contactId: number, userId: number): Promise<Suggestion | null> {
    // Ensure the contact belongs to the user
    const contact = await this.getContact(contactId, userId);
    if (!contact) {
      return null; // Or throw an error
    }
    const result = await this.db.select().from(schema.suggestions)
      .where(eq(schema.suggestions.contactId, contactId))
      .orderBy(desc(schema.suggestions.createdAt)) // Get the latest suggestion
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  async createSuggestion(suggestion: Omit<Suggestion, 'id'>): Promise<Suggestion> {
    const result = await this.db.insert(schema.suggestions).values(suggestion).returning();
    return result[0];
  }

  async deleteSuggestions(contactId: number, userId: number): Promise<void> {
    // Ensure the contact belongs to the user
    const contact = await this.getContact(contactId, userId);
    if (!contact) {
      return; // Or throw an error
    }
    await this.db.delete(schema.suggestions).where(eq(schema.suggestions.contactId, contactId));
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | null> {
    const result = await this.db.select().from(schema.settings).where(eq(schema.settings.userId, userId));
    return result.length > 0 ? result[0] : null;
  }

  async createSettings(settings: Omit<Settings, 'id' | 'userId'> & { userId: number }): Promise<Settings> {
    const existingSettings = await this.getSettings(settings.userId);
    if (existingSettings) {
        // Update existing settings if they already exist, as per MemStorage logic
        return (await this.updateSettings(settings.userId, settings))!;
    }
    const result = await this.db.insert(schema.settings).values(settings).returning();
    return result[0];
  }

  async updateSettings(userId: number, updates: Partial<Settings>): Promise<Settings | null> {
    const result = await this.db.update(schema.settings)
      .set(updates)
      .where(eq(schema.settings.userId, userId))
      .returning();
    return result.length > 0 ? result[0] : null;
  }
}
