export interface User {
  userId: number;
  username: string;
}

// You can add other shared client-side types here as needed.
// For example, if your Contact, Message, Suggestion, Settings types from @shared/schema
// are also used directly in the client in many places and you want a central client-side
// definition, although it's often better to import them from @shared/schema if possible.

// Example of how you might re-export or define types based on shared schema if needed:
// import type { Contact as DbContact } from '@shared/schema';
// export type Contact = DbContact;
