CREATE TABLE prompt_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    last_prompted_at TIMESTAMP NOT NULL,
    snoozed_until TIMESTAMP,
    UNIQUE(user_id, contact_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_prompt_history_user_contact ON prompt_history(user_id, contact_id);
CREATE INDEX idx_prompt_history_last_prompted ON prompt_history(last_prompted_at);
CREATE INDEX idx_prompt_history_snoozed ON prompt_history(snoozed_until);
