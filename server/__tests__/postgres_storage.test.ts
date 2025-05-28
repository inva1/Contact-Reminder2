import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostgresStorage } from '../postgres_storage'; // Adjust path as necessary
import * as schema from '../../shared/schema'; // Adjust path for schema

// Mock the 'postgres' library
vi.mock('postgres', () => {
  // Mock the default export which is the 'postgres' function
  const mockClient = vi.fn();
  // Mock the Drizzle methods that will be chained
  const mockDrizzleInstance = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(), // if used
    and: vi.fn().mockReturnThis(), // if used directly, usually it's an operator
    or: vi.fn().mockReturnThis(),  // if used directly
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(), // for onConflictDoUpdate set
    returning: vi.fn().mockResolvedValue([]), // Default to empty array for returning calls
    execute: vi.fn(), // For raw SQL or specific execution paths
  };

  // Ensure that when 'postgres' is called, it returns something that can be passed to Drizzle
  // and that Drizzle then returns our mockDrizzleInstance
  mockClient.mockReturnValue(mockDrizzleInstance); // This is simplified; Drizzle expects a specific client object

  // The default export of 'postgres' is a function.
  // We also need to make sure it can be called with 'new' if Drizzle does that,
  // or that the drizzle(client) call works.
  // This mock setup might need refinement based on how Drizzle is initialized.
  // For now, let's assume drizzle(postgres(connectionString)) will use the mockDrizzleInstance setup
  // by mocking the drizzle function itself or its interaction with the postgres client.

  // Let's refine: We need to mock the client that `postgres(connectionString)` returns,
  // and then ensure `drizzle(client, { schema })` uses this to produce our mock DB.
  const actualPostgresClientInstance = {
    // Mock any methods on the actual postgres client instance if drizzle calls them directly
    // e.g., query, end, etc. For now, this is likely not needed as drizzle abstracts it.
  };
  const mockPostgresConstructor = vi.fn(() => actualPostgresClientInstance);
  
  // Mocking the default export of 'drizzle-orm/postgres-js'
  // This is tricky because drizzle is imported and then called.
  // It's better to mock the 'postgres' constructor and what it returns,
  // and let the actual drizzle function consume it.
  // The `this.db` in PostgresStorage will be the result of `drizzle(client, { schema })`.
  // So, we need `drizzle` to return our `mockDrizzleInstance` when called with the mocked `client`.

  return { default: mockPostgresConstructor }; // `postgres` is typically used as default import
});


// Mock the drizzle function from 'drizzle-orm/postgres-js'
// This is a more direct way to control `this.db`
const mockDbInstance = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  // Add any other methods used by PostgresStorage if not covered
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  // Mock a property that might be accessed if schema is spread, e.g. for raw sql
  // This might not be needed if schema parameter to drizzle handles everything.
  query: {}, // Placeholder for potential schema table access like db.query.users
};

vi.mock('drizzle-orm/postgres-js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original, // Spread original exports
    drizzle: vi.fn(() => mockDbInstance), // Mock the drizzle function to return our mockDbInstance
  };
});


describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  const mockUserId = 1;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set a dummy DATABASE_URL, though the mock won't use it
    process.env.DATABASE_URL = "postgresql://testuser:testpass@localhost:5432/testdb";
    storage = new PostgresStorage(); 
    // Now storage.db should be our mockDbInstance due to the drizzle mock
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  describe('getChatExportRecommendations', () => {
    it('should return contacts needing recommendations', async () => {
      const mockContacts = [
        { id: 10, name: 'Contact A' },
        { id: 11, name: 'Contact B' },
      ];
      // When storage.db.select(...).from(...).leftJoin(...).where(...).limit(...) is called,
      // the final chained method that executes the query (e.g. .returning() or await) 
      // needs to be mocked to return the data.
      // Since getChatExportRecommendations directly awaits the chain, the last call in the chain is implicitly awaited.
      // We need to find what that last call is. It's usually .execute() or the chain itself being awaitable.
      // For a select, it's often just awaiting the chain.
      // So, the mock for the final part of the chain (e.g., limit or where if it's last before await) should resolve.
      // Or, if select itself is what's awaited (e.g. `await this.db.select()...`), then mockDbInstance.select should resolve.
      // Let's assume the chain ending with limit() is awaitable or followed by an implicit .execute()
      
      // Refined mocking: `select` returns `this` (mockDbInstance), `from` returns `this`, etc.
      // The actual execution happens when the promise is awaited.
      // So, we can mock the final method in the chain that returns a promise, or mock select if it returns a thenable.
      // Many Drizzle chains are thenable. So, we can make select return a thenable.
      
      const mockThenable = {
        then: function(onFulfilled: any) {
          // Simulate async resolution with mockContacts
          Promise.resolve(mockContacts).then(onFulfilled);
          return this; // Return this to allow further chaining if any, though not typical for then.
        },
        catch: function() { /* no-op */ return this; } // Add catch for completeness if it's a real promise mock
      };
      // Mock the select method to return our thenable mock, specific to this test case
      mockDbInstance.select.mockImplementation(() => mockThenable as any);


      const recommendations = await storage.getChatExportRecommendations(mockUserId);
      
      expect(recommendations).toEqual(mockContacts);
      expect(mockDbInstance.select).toHaveBeenCalledWith({
        id: schema.contacts.id,
        name: schema.contacts.name,
      });
      expect(mockDbInstance.from).toHaveBeenCalledWith(schema.contacts);
      expect(mockDbInstance.leftJoin).toHaveBeenCalled(); // Further checks on join conditions can be added
      expect(mockDbInstance.where).toHaveBeenCalled();    // Further checks on where clauses can be added
      expect(mockDbInstance.limit).toHaveBeenCalledWith(3);
    });

    it('should return an empty array if no contacts need recommendations', async () => {
      const mockThenableEmpty = {
        then: function(onFulfilled: any) {
          Promise.resolve([]).then(onFulfilled);
          return this;
        },
        catch: function() { return this; }
      };
      mockDbInstance.select.mockImplementation(() => mockThenableEmpty as any);

      const recommendations = await storage.getChatExportRecommendations(mockUserId);
      expect(recommendations).toEqual([]);
    });

    // TODO: Add more specific tests for WHERE clauses and JOIN conditions by inspecting mock calls.
    // This requires a more granular mock of the Drizzle operators (eq, and, or, etc.) or
    // capturing the arguments passed to .where() and .leftJoin() for deep inspection.
  });

  // TODO: Add tests for logChatExportPrompt
  describe('logChatExportPrompt', () => {
    it('should insert or update prompt history correctly', async () => {
      // Mock the onConflictDoUpdate chain
      // insert().values() is expected to be called
      mockDbInstance.insert.mockReturnValue({ // Make sure insert returns an object that has values
        values: vi.fn().mockReturnValue({ // values returns an object that has onConflictDoUpdate
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) // onConflictDoUpdate resolves (no return needed)
        })
      } as any);


      await storage.logChatExportPrompt(mockUserId, 20);

      expect(mockDbInstance.insert).toHaveBeenCalledWith(schema.prompt_history);
      expect(mockDbInstance.insert(schema.prompt_history).values).toHaveBeenCalledWith({
        user_id: mockUserId,
        contact_id: 20,
        last_prompted_at: expect.any(Date),
        snoozed_until: null,
      });
      const insertValuesCall = mockDbInstance.insert(schema.prompt_history).values as vi.Mock;
      const onConflictCall = insertValuesCall.mock.results[0].value.onConflictDoUpdate as vi.Mock;

      expect(onConflictCall).toHaveBeenCalledWith({
        target: [schema.prompt_history.user_id, schema.prompt_history.contact_id],
        set: {
          last_prompted_at: expect.any(Date),
          snoozed_until: null,
        },
      });
    });
  });

  // TODO: Add tests for snoozeChatExportPrompt
  describe('snoozeChatExportPrompt', () => {
    it('should insert or update prompt history with snooze date', async () => {
      mockDbInstance.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
        })
      } as any);

      const snoozeDate = new Date();
      await storage.snoozeChatExportPrompt(mockUserId, 21, snoozeDate);

      expect(mockDbInstance.insert).toHaveBeenCalledWith(schema.prompt_history);
      expect(mockDbInstance.insert(schema.prompt_history).values).toHaveBeenCalledWith({
        user_id: mockUserId,
        contact_id: 21,
        last_prompted_at: expect.any(Date),
        snoozed_until: snoozeDate,
      });
      const insertValuesCall = mockDbInstance.insert(schema.prompt_history).values as vi.Mock;
      const onConflictCall = insertValuesCall.mock.results[0].value.onConflictDoUpdate as vi.Mock;
      expect(onConflictCall).toHaveBeenCalledWith({
        target: [schema.prompt_history.user_id, schema.prompt_history.contact_id],
        set: {
          snoozed_until: snoozeDate,
        },
      });
    });
  });

});
