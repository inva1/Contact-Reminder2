import { vi, describe, it, expect, beforeEach } from 'vitest';
import { analyzeChat, generateSuggestion } from '../openai'; // Adjust path if your test file is elsewhere

// Mock the OpenAI library
const mockCreate = vi.fn();
vi.mock('openai', () => {
  // Default export is the OpenAI class
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('server/openai.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules(); // Important to reset module state for OPENAI_API_KEY checks
    process.env = { ...originalEnv }; // Restore original env
    mockCreate.mockReset(); // Reset the mock function before each test
    // Default OPENAI_API_KEY to a dummy value for tests that don't specifically test its absence
    process.env.OPENAI_API_KEY = 'test-api-key'; 
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original env after tests
  });

  describe('analyzeChat', () => {
    const messages = [{ sender: 'user', content: 'Hello', timestamp: new Date().toISOString() }];
    const contactName = 'Test Contact';
    const relationshipType = 'friend';

    it('should return fallback response when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY; // Simulate missing API key
      
      // Re-import openai functions after env change if they capture env at import time
      // Vitest's vi.resetModules() in beforeEach should handle this if openai.ts re-evaluates process.env
      // For robustness, could also dynamically import analyzeChat inside the test.

      const result = await analyzeChat(messages, contactName, relationshipType);

      expect(result.source).toBe('fallback');
      expect(result.suggestion).toContain(`Hey ${contactName}`);
      expect(result.error_message).toBe('OpenAI API interaction failed. Using fallback analysis.');
      expect(mockCreate).not.toHaveBeenCalled(); // Should not even attempt to call if key is checked first
    });
    
    it('should return fallback response when chat.completions.create throws an error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API Error'));
      
      const result = await analyzeChat(messages, contactName, relationshipType);

      expect(result.source).toBe('fallback');
      expect(result.suggestion).toContain(`Hey ${contactName}`);
      expect(result.error_message).toBe('OpenAI API interaction failed. Using fallback analysis.');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return parsed response with source "openai" on success', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                last_interaction_date: '2024-01-01',
                topics: ['topic1', 'topic2'],
                suggestion: 'AI suggestion for analyzeChat',
                sentiment: 'positive',
                relationship_strength: 8,
                interaction_frequency: 'frequent',
                context_notes: 'AI notes',
                conversation_themes: ['themeA'],
                message_preview: 'AI preview',
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValueOnce(mockApiResponse);

      const result = await analyzeChat(messages, contactName, relationshipType);

      expect(result.source).toBe('openai');
      expect(result.suggestion).toBe('AI suggestion for analyzeChat');
      expect(result.topics).toEqual(['topic1', 'topic2']);
      expect(result.error_message).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateSuggestion', () => {
    const contactName = 'Friend Name';
    const relationshipType = 'friend';
    const interests = ['coding', 'music'];

    it('should return fallback response when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await generateSuggestion(contactName, relationshipType, interests);
      
      expect(result.source).toBe('fallback');
      expect(result.message).toContain(`Hey ${contactName}`);
      expect(result.error_message).toBe('OpenAI API interaction failed. Using fallback suggestion.');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return fallback response when chat.completions.create throws an error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API Error'));
      
      const result = await generateSuggestion(contactName, relationshipType, interests);

      expect(result.source).toBe('fallback');
      expect(result.message).toContain(`Hey ${contactName}`);
      expect(result.error_message).toBe('OpenAI API interaction failed. Using fallback suggestion.');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return parsed response with source "openai" on success', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'AI suggestion for generateSuggestion',
                tone_analysis: 'Friendly tone',
                context_relevance: 'Relevant context',
                alternative_options: ['alt1', 'alt2'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValueOnce(mockApiResponse);

      const result = await generateSuggestion(contactName, relationshipType, interests);

      expect(result.source).toBe('openai');
      expect(result.message).toBe('AI suggestion for generateSuggestion');
      expect(result.tone_analysis).toBe('Friendly tone');
      expect(result.alternative_options).toEqual(['alt1', 'alt2']);
      expect(result.error_message).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});
