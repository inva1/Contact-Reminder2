import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handleCreateContact, handleGetContacts, AuthenticatedRequest } from '../routes'; // Adjust path as necessary
import { Response } from 'express'; // Import Response type from express
import { ZodError } from 'zod'; // Import ZodError for testing

// Mock storage module
const mockStorage = {
  createContact: vi.fn(),
  getContactsWithLatestSuggestions: vi.fn(),
  // Add other storage methods if needed for other tests
};
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

// Mock shared/schema for insertContactSchema
const mockSafeParse = vi.fn();
vi.mock('../../shared/schema', async (importOriginal) => {
  const original = await importOriginal() as any; // Import original to keep other exports
  return {
    ...original, // Spread all original exports
    insertContactSchema: { // Mock only insertContactSchema
      safeParse: mockSafeParse,
    },
  };
});


describe('API Route Handlers', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let statusSpy: vi.SpyInstance;
  let jsonSpy: vi.SpyInstance;
  let sendSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks

    jsonSpy = vi.fn();
    sendSpy = vi.fn();
    statusSpy = vi.fn(() => ({ json: jsonSpy, send: sendSpy } as unknown as Response)); // Ensure status returns an object with json and send methods

    mockReq = {
      user: { id: 1, username: 'testuser' }, // Mock authenticated user
    };
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      send: sendSpy,
    };
  });

  describe('handleCreateContact (POST /api/contacts)', () => {
    it('should create a contact and return 201 on valid request', async () => {
      const validContactData = { name: 'Test Contact', phone: '1234567890', user_id: 1 };
      const createdContact = { id: 1, ...validContactData };
      
      mockSafeParse.mockReturnValue({ success: true, data: validContactData });
      mockStorage.createContact.mockResolvedValue(createdContact);

      mockReq.body = { name: 'Test Contact', phone: '1234567890' }; // Client sends without user_id

      await handleCreateContact(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockSafeParse).toHaveBeenCalledWith({ name: 'Test Contact', phone: '1234567890', user_id: 1 });
      expect(mockStorage.createContact).toHaveBeenCalledWith(validContactData);
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith(createdContact);
    });

    it('should return 400 on invalid request data (Zod validation failure)', async () => {
      const errors = { formErrors: { _errors: ['Invalid data'] }, fieldErrors: {} }; // Simplified Zod error structure
      mockSafeParse.mockReturnValue({ success: false, error: errors });
      mockReq.body = { name: '' }; // Invalid data

      await handleCreateContact(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "Validation failed", errors: errors.formErrors });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined; // Simulate unauthenticated user
      mockReq.body = { name: 'Test Contact', phone: '1234567890' };

      await handleCreateContact(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "User not authenticated" });
    });

    it('should return 500 if storage.createContact throws an error', async () => {
      const validContactData = { name: 'Test Contact', phone: '1234567890', user_id: 1 };
      mockSafeParse.mockReturnValue({ success: true, data: validContactData });
      mockStorage.createContact.mockRejectedValue(new Error('Database error'));
      mockReq.body = { name: 'Test Contact', phone: '1234567890' };

      await handleCreateContact(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Failed to create contact' });
    });
  });

  describe('handleGetContacts (GET /api/contacts)', () => {
    it('should return contacts and 200 on valid request', async () => {
      const sampleContacts = [
        { id: 1, name: 'Contact 1', lastContactDate: new Date().toISOString(), suggestion: 'Hi 1' },
        { id: 2, name: 'Contact 2', lastContactDate: null, suggestion: 'Hi 2' },
      ];
      // Mock the storage method to return camelCased data as Drizzle would
      mockStorage.getContactsWithLatestSuggestions.mockResolvedValue(sampleContacts.map(c => ({
        ...c, 
        lastContactDate: c.lastContactDate ? new Date(c.lastContactDate) : null 
      })) as any);


      await handleGetContacts(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockStorage.getContactsWithLatestSuggestions).toHaveBeenCalledWith(mockReq.user!.id);
      // The map function in the handler will calculate daysSinceLastContact
      // We expect res.json to be called with the result of this map
      expect(statusSpy).toHaveBeenCalledWith(200); // Default status is 200 if not set
      expect(jsonSpy).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 1, name: 'Contact 1', daysSinceLastContact: expect.any(Number) }),
        expect.objectContaining({ id: 2, name: 'Contact 2', daysSinceLastContact: null }),
      ]));
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await handleGetContacts(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "User not authenticated" });
    });
    
    it('should return 500 if storage.getContactsWithLatestSuggestions throws an error', async () => {
      mockStorage.getContactsWithLatestSuggestions.mockRejectedValue(new Error('Database error'));

      await handleGetContacts(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Failed to fetch contacts' });
    });
  });
});
