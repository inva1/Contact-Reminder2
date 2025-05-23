import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  interests: text("interests"), // JSON string, e.g., ["hiking", "movies"]
  last_contact_date: timestamp("last_contact_date"),
  relationship_type: text("relationship_type"), // e.g., "friend", "family"
  reminder_frequency: integer("reminder_frequency").default(14),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  contact_id: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  timestamp: timestamp("timestamp").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
});

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  contact_id: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  suggestion: text("suggestion").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  reminder_enabled: boolean("reminder_enabled").default(true),
  reminder_frequency: integer("reminder_frequency").default(14),
  cloud_backup_enabled: boolean("cloud_backup_enabled").default(true),
  theme: text("theme").default("system"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestions.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Client-side types
export interface ContactWithSuggestion extends Contact {
  suggestion?: string;
  daysSinceLastContact?: number;
}
