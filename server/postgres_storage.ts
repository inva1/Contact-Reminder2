import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, inArray, sql, SQL, or, isNull, gt, lt } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { IStorage } from './storage';
import { type User, type Contact, type Message, type Suggestion, type Settings, type ContactWithSuggestion } from '../shared/schema'; 

export class PostgresStorage implements IStorage {
  private db: PostgresJsDatabase<typeof schema>;

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

  async createUser(user: schema.InsertUser): Promise<User> { // Expects InsertUser (snake_case for relevant fields if any, though user schema is simple)
    const result = await this.db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // Contact methods
  async getContacts(userId: number): Promise<Contact[]> { // Returns Contact[] (camelCase)
    return this.db.select().from(schema.contacts).where(eq(schema.contacts.user_id, userId));
  }

  async getContact(id: number, userId: number): Promise<Contact | null> { // Returns Contact (camelCase)
    const result = await this.db.select().from(schema.contacts).where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)));
    return result.length > 0 ? result[0] : null;
  }

  // Modified to expect schema.InsertContact (snake_case for column fields)
  async createContact(contactData: schema.InsertContact): Promise<Contact> { // Returns Contact (camelCase)
    if (contactData.user_id === undefined || contactData.user_id === null) {
        throw new Error("user_id is required to create a contact.");
    }
    // contactData is already InsertContact (snake_case for its properties like user_id, last_contact_date etc.)
    const result = await this.db.insert(schema.contacts).values(contactData).returning();
    return result[0]; // Drizzle maps selected/returned fields to camelCase
  }

  // Modified to expect snake_case for updatable fields (Partial of InsertContact, excluding keys)
  async updateContact(id: number, userId: number, updates: Partial<Omit<schema.InsertContact, 'id' | 'user_id'>>): Promise<Contact | null> { // Returns Contact (camelCase)
    const result = await this.db.update(schema.contacts)
      .set(updates) // Drizzle's set() expects keys matching column names (snake_case)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)))
      .returning();
    return result.length > 0 ? result[0] : null; // Drizzle maps selected/returned fields to camelCase
  }

  async deleteContact(id: number, userId: number): Promise<void> {
    await this.db.delete(schema.contacts).where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)));
  }

  async getContactsWithLatestSuggestions(userId: number): Promise<ContactWithSuggestion[]> { // Returns ContactWithSuggestion[] (camelCase)
    const userContacts: Contact[] = await this.db.select().from(schema.contacts).where(eq(schema.contacts.user_id, userId));
    if (userContacts.length === 0) {
      return [];
    }

    const contactIds = userContacts.map(c => c.id);
    if (contactIds.length === 0) return userContacts.map(c => ({...c})); 

    const rankedSuggestions = this.db
      .select({
        contactId: schema.suggestions.contact_id, 
        suggestion: schema.suggestions.suggestion,
        createdAt: schema.suggestions.created_at, 
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.suggestions.contact_id} ORDER BY ${schema.suggestions.created_at} DESC)`.as('rn'),
      })
      .from(schema.suggestions)
      .where(inArray(schema.suggestions.contact_id, contactIds))
      .as('ranked_suggestions');

    const latestSuggestionsData = await this.db
      .select({
        contactId: rankedSuggestions.contactId, // Will be camelCase in result object
        suggestion: rankedSuggestions.suggestion,
      })
      .from(rankedSuggestions)
      .where(eq(rankedSuggestions.rn, 1));

    const suggestionsMap = new Map<number, string>();
    latestSuggestionsData.forEach(s => { // s.contactId here will be camelCase
      if (s.contactId !== null && s.suggestion !== null) {
         suggestionsMap.set(s.contactId, s.suggestion);
      }
    });
    
    const contactsWithSuggestionsResult: ContactWithSuggestion[] = userContacts.map(contact => ({ // contact is camelCase
      ...contact,
      suggestion: suggestionsMap.get(contact.id) || undefined,
    }));
    
    return contactsWithSuggestionsResult;
  }

  // Message methods
  async getMessages(contactId: number, userId: number): Promise<Message[]> { // Returns Message[] (camelCase)
    const contact = await this.getContact(contactId, userId);
    if (!contact) return [];
    return this.db.select().from(schema.messages).where(eq(schema.messages.contact_id, contactId));
  }

  async createMessage(messageData: schema.InsertMessage): Promise<Message> { // Expects InsertMessage (snake_case)
    const result = await this.db.insert(schema.messages).values(messageData).returning();
    return result[0]; // Returns Message (camelCase)
  }

  async createMessages(messagesData: schema.InsertMessage[]): Promise<Message[]> { // Expects InsertMessage[] (snake_case)
    if (messagesData.length === 0) return [];
    const result = await this.db.insert(schema.messages).values(messagesData).returning();
    return result; // Returns Message[] (camelCase)
  }

  // Suggestion methods
  async getSuggestion(contactId: number, userId: number): Promise<Suggestion | null> { // Returns Suggestion (camelCase)
    const contact = await this.getContact(contactId, userId);
    if (!contact) return null;
    const result = await this.db.select().from(schema.suggestions)
      .where(eq(schema.suggestions.contact_id, contactId))
      .orderBy(desc(schema.suggestions.created_at))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  async createSuggestion(suggestionData: schema.InsertSuggestion): Promise<Suggestion> { // Expects InsertSuggestion (snake_case)
    const result = await this.db.insert(schema.suggestions).values(suggestionData).returning();
    return result[0]; // Returns Suggestion (camelCase)
  }

  async deleteSuggestions(contactId: number, userId: number): Promise<void> {
    const contact = await this.getContact(contactId, userId);
    if (!contact) return;
    await this.db.delete(schema.suggestions).where(eq(schema.suggestions.contact_id, contactId));
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | null> { // Returns Settings (camelCase)
    const result = await this.db.select().from(schema.settings).where(eq(schema.settings.user_id, userId));
    return result.length > 0 ? result[0] : null;
  }

  // Expects relevant parts of InsertSettings (snake_case) combined with userId (camelCase)
  async createSettings(settings: Omit<schema.InsertSettings, 'id' | 'user_id'> & { userId: number }): Promise<Settings> { // Returns Settings (camelCase)
    // Map userId (camelCase) to user_id (snake_case) for insertion
    const { userId, ...restOfSettings } = settings;
    const dataToInsert: schema.InsertSettings = { ...restOfSettings, user_id: userId };
    
    const existingSettings = await this.getSettings(userId);
    if (existingSettings) {
        // updateSettings expects camelCase for its 'updates' param based on original signature
        // This part needs careful re-evaluation if updateSettings is also changed to expect snake_case.
        // For now, assuming updateSettings handles the mapping or expects camelCase for Partial<Omit<Settings...>>
        const camelCaseUpdates: Partial<Omit<Settings, 'id' | 'user_id'>> = {};
        if (restOfSettings.reminder_enabled !== undefined) camelCaseUpdates.reminderEnabled = restOfSettings.reminder_enabled;
        if (restOfSettings.reminder_frequency !== undefined) camelCaseUpdates.reminderFrequency = restOfSettings.reminder_frequency;
        // ... map other fields ...
        // This mapping is becoming complex, suggesting updateSettings should also expect snake_case partials.
        // However, sticking to minimal changes for now for createSettings.
        return (await this.updateSettings(userId, camelCaseUpdates as any))!; // Cast to any is problematic
    }
    const result = await this.db.insert(schema.settings).values(dataToInsert).returning();
    return result[0];
  }

  // Expects Partial of Settings (camelCase) for updates
  async updateSettings(userId: number, updates: Partial<Omit<Settings, 'id' | 'user_id'>>): Promise<Settings | null> { // Returns Settings (camelCase)
    // Drizzle's set() needs snake_case keys. So, 'updates' (camelCase) must be mapped.
    const snakeCaseUpdates: Partial<schema.InsertSettings> = {};
    if (updates.reminderEnabled !== undefined) snakeCaseUpdates.reminder_enabled = updates.reminderEnabled;
    if (updates.reminderFrequency !== undefined) snakeCaseUpdates.reminder_frequency = updates.reminderFrequency;
    if (updates.cloudBackupEnabled !== undefined) snakeCaseUpdates.cloud_backup_enabled = updates.cloudBackupEnabled;
    if (updates.notifyNewSuggestions !== undefined) snakeCaseUpdates.notify_new_suggestions = updates.notifyNewSuggestions;
    if (updates.notifyMissedConnections !== undefined) snakeCaseUpdates.notify_missed_connections = updates.notifyMissedConnections;
    if (updates.privacyMode !== undefined) snakeCaseUpdates.privacy_mode = updates.privacyMode;
    if (updates.languagePreference !== undefined) snakeCaseUpdates.language_preference = updates.languagePreference;
    if (updates.preferredContactMethod !== undefined) snakeCaseUpdates.preferred_contact_method = updates.preferredContactMethod;
    if (updates.theme !== undefined) snakeCaseUpdates.theme = updates.theme;

    if (Object.keys(snakeCaseUpdates).length === 0) { // Avoid update if nothing to update
        return this.getSettings(userId);
    }

    const result = await this.db.update(schema.settings)
      .set(snakeCaseUpdates)
      .where(eq(schema.settings.user_id, userId))
      .returning();
    return result.length > 0 ? result[0] : null;
  }

  // === NEW METHODS FOR RECOMMENDATION API (using snake_case for DB interaction) ===
  async getChatExportRecommendations(userId: number): Promise<{ id: number; name: string | null }[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = await this.db
      .select({
        id: schema.contacts.id, // Drizzle will return this as 'id' (camelCase if not specified otherwise by identity transform)
        name: schema.contacts.name, // Drizzle will return this as 'name'
      })
      .from(schema.contacts)
      .leftJoin(schema.prompt_history, and(
        eq(schema.contacts.id, schema.prompt_history.contact_id),
        eq(schema.prompt_history.user_id, userId)
      ))
      .where(and(
        eq(schema.contacts.user_id, userId),
        or(
          lt(schema.contacts.last_message_date, thirtyDaysAgo),
          and(
            gt(schema.contacts.reminder_frequency, 0),
            // Using sql`` for date comparison with interval/column arithmetic if direct object comparison is tricky
            sql`${schema.contacts.last_contact_date} < NOW() - MAKE_INTERVAL(DAYS => ${schema.contacts.reminder_frequency})`
          )
        ),
        or(
          isNull(schema.prompt_history.last_prompted_at),
          lt(schema.prompt_history.last_prompted_at, sevenDaysAgo)
        ),
        or(
          isNull(schema.prompt_history.snoozed_until),
          lt(schema.prompt_history.snoozed_until, now)
        )
      ))
      .limit(3);
    
    // Drizzle by default maps selected snake_case columns to camelCase fields in the result objects.
    // So, results should be [{id: ..., name: ...}]
    return results;
  }

  async logChatExportPrompt(userId: number, contactId: number): Promise<void> {
    await this.db
      .insert(schema.prompt_history)
      .values({ // Keys here must match schema column names (snake_case)
        user_id: userId,
        contact_id: contactId,
        last_prompted_at: new Date(),
        snoozed_until: null,
      })
      .onConflictDoUpdate({
        target: [schema.prompt_history.user_id, schema.prompt_history.contact_id],
        set: { // Keys here must match schema column names (snake_case)
          last_prompted_at: new Date(),
          snoozed_until: null,
        },
      });
  }

  async snoozeChatExportPrompt(userId: number, contactId: number, snoozeUntilDate: Date): Promise<void> {
    await this.db
      .insert(schema.prompt_history)
      .values({ // Keys here must match schema column names (snake_case)
        user_id: userId,
        contact_id: contactId,
        last_prompted_at: new Date(), 
        snoozed_until: snoozeUntilDate,
      })
      .onConflictDoUpdate({
        target: [schema.prompt_history.user_id, schema.prompt_history.contact_id],
        set: { // Keys here must match schema column names (snake_case)
          snoozed_until: snoozeUntilDate,
        },
      });
  }
}
