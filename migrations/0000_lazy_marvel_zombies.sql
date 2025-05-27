CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"interests" text,
	"last_contact_date" timestamp,
	"relationship_type" text,
	"reminder_frequency" integer DEFAULT 14,
	"last_message_date" timestamp,
	"priority_level" integer DEFAULT 1,
	"is_favorite" boolean DEFAULT false,
	"notes" text,
	"user_id" integer NOT NULL,
	CONSTRAINT "contacts_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"sender" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reminder_enabled" boolean DEFAULT true,
	"reminder_frequency" integer DEFAULT 14,
	"cloud_backup_enabled" boolean DEFAULT true,
	"notify_new_suggestions" boolean DEFAULT true,
	"notify_missed_connections" boolean DEFAULT true,
	"privacy_mode" boolean DEFAULT false,
	"language_preference" text DEFAULT 'en',
	"preferred_contact_method" text DEFAULT 'whatsapp',
	"theme" text DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"suggestion" text NOT NULL,
	"topics" text,
	"context" text,
	"used" boolean DEFAULT false,
	"effectiveness" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;