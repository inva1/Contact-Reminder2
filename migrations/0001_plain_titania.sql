CREATE TABLE "prompt_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"last_prompted_at" timestamp NOT NULL,
	"snoozed_until" timestamp
);
--> statement-breakpoint
ALTER TABLE "prompt_history" ADD CONSTRAINT "prompt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_history" ADD CONSTRAINT "prompt_history_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;