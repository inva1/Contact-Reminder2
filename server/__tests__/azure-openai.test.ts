import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateSuggestions } from '../services/azure-openai';
import { getRecommendations } from '../services/chat-export';
import { db } from '../db';

describe('Azure OpenAI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully connect to Azure OpenAI', async () => {
    const mockResponse = {
      choices: [{ text: 'Test suggestion' }]
    };
    
    const azureOpenAI = jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)
    );

    const result = await generateSuggestions('Test input');
    
    expect(azureOpenAI).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle Azure OpenAI errors gracefully', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.reject(new Error('Azure API Error'))
    );

    await expect(generateSuggestions('Test input')).rejects.toThrow('Azure API Error');
  });
});

describe('Chat Export Recommendations', () => {
  beforeEach(async () => {
    await db.delete('prompt_history').execute();
    await db.delete('contacts').execute();
  });

  it('should identify contacts needing export prompts', async () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    // Insert test contact
    await db.insert('contacts').values({
      id: 1,
      name: 'Test User',
      user_id: 1,
      last_message_date: thirtyOneDaysAgo,
      last_contact_date: thirtyOneDaysAgo
    });

    const recommendations = await getRecommendations(1); // user_id = 1
    
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].id).toBe(1);
  });

  it('should respect snooze periods', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert('prompt_history').values({
      user_id: 1,
      contact_id: 1,
      snoozed_until: tomorrow
    });

    const recommendations = await getRecommendations(1);
    
    expect(recommendations).toHaveLength(0);
  });
});
