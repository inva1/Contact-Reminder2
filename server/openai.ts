import OpenAI from "openai";

// Using OpenAI for chat analysis and suggestion generation
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatAnalysis {
  last_interaction_date: string;
  topics: string[];
  suggestion: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relationship_strength: number; // 1-10 scale
  interaction_frequency: 'frequent' | 'regular' | 'occasional' | 'rare';
  context_notes: string;
  conversation_themes: string[];
  message_preview: string;
  source?: "openai" | "fallback"; // New field
  error_message?: string; // New field
}

export async function analyzeChat(
  messages: Message[],
  contactName: string,
  relationshipType: string
): Promise<ChatAnalysis> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Explicitly throw an error that the calling function can catch if key is missing
      // Or handle fallback here directly. Current design is fallback.
      console.warn("OpenAI API key is missing. Returning fallback analysis.");
      throw new Error("OpenAI API key not configured."); // This will be caught by the catch block below
    }
    const chatHistory = messages.map(m => 
      `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.content}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: 
            "You are an AI assistant helping an introverted user maintain meaningful social connections through WhatsApp chat analysis. Given a chat history, provide a comprehensive analysis to help the user understand their relationship and reconnect appropriately.\n\n" +
            "Perform the following analysis:\n\n" +
            "1. Identify the date of the last interaction (most recent message) in YYYY-MM-DD format.\n" +
            "2. Extract key topics and interests discussed in the conversation (3-5 topics).\n" +
            "3. Analyze the emotional tone/sentiment of the conversation (positive, neutral, negative).\n" +
            "4. Assess the apparent strength of the relationship on a scale of 1-10 based on conversation depth, frequency, and emotional content.\n" +
            "5. Determine the interaction frequency pattern (frequent, regular, occasional, rare).\n" +
            "6. Identify recurring conversation themes or patterns.\n" +
            "7. Create a short preview of the most significant/revealing message.\n" +
            "8. Add brief context notes that might help understanding the relationship dynamics.\n" +
            "9. Suggest a conversation starter to reconnect that:\n" +
            "   - References a specific topic or event from the chat history\n" +
            "   - Is friendly, concise (≤20 words), and low-pressure, suitable for an introverted person\n" +
            "   - Uses a casual tone for friends and a warmer tone for family\n" +
            "   - Encourages a response without being demanding\n" +
            "   - Feels natural and personalized, not generic"
        },
        {
          role: "user",
          content: 
            `Chat History:\n${chatHistory}\n\nContact Name: ${contactName}\nRelationship Type: ${relationshipType}\n\nProvide a comprehensive analysis in JSON format.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      last_interaction_date: result.last_interaction_date || new Date().toISOString().split('T')[0],
      topics: result.topics || [],
      suggestion: result.suggestion || `Hey ${contactName}, just wanted to check in and see how you're doing!`,
      sentiment: result.sentiment || 'neutral',
      relationship_strength: result.relationship_strength || 5,
      interaction_frequency: result.interaction_frequency || 'occasional',
      context_notes: result.context_notes || '',
      conversation_themes: result.conversation_themes || [],
      message_preview: result.message_preview || '',
      source: "openai", // Mark source as openai for successful calls
    };
  } catch (error: any) { // Catch any error
    console.error("OpenAI API error in analyzeChat:", error.message);
    return {
      last_interaction_date: new Date().toISOString().split('T')[0],
      topics: [],
      suggestion: `Hey ${contactName}, just wanted to check in and see how you're doing!`,
      sentiment: 'neutral',
      relationship_strength: 5,
      interaction_frequency: 'occasional',
      context_notes: 'Default analysis due to error.',
      conversation_themes: [],
      message_preview: '',
      source: "fallback", // New property
      error_message: "OpenAI API interaction failed. Using fallback analysis." // New property
    };
  }
}

interface SuggestionResponse {
  message: string;
  tone_analysis: string;
  context_relevance: string;
  alternative_options: string[];
  source?: "openai" | "fallback"; // New field
  error_message?: string; // New field
}

export async function generateSuggestion(
  contactName: string, 
  relationshipType: string,
  interests: string[] = [],
  lastContactDate?: string,
  previousMessages: Message[] = [],
  occasionContext?: string
): Promise<SuggestionResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is missing. Returning fallback suggestion.");
      throw new Error("OpenAI API key not configured."); // This will be caught by the catch block below
    }
    const interestsText = interests.length > 0 
      ? `They are interested in: ${interests.join(', ')}.` 
      : '';
    
    const timeContext = lastContactDate 
      ? `Last contact was on ${lastContactDate}.` 
      : 'It has been a while since we last spoke.';
    
    const messageHistory = previousMessages.length > 0
      ? `Recent conversation snippets:\n${previousMessages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n')}`
      : '';
    
    const specialOccasion = occasionContext 
      ? `Context for this message: ${occasionContext}.` 
      : '';

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an AI assistant specializing in relationship psychology and communication. Help an introverted user maintain meaningful social connections by generating personalized, thoughtful conversation starters that feel natural and authentic.\n\n" +
            "Consider the following in your suggestions:\n" +
            "- Relationship type and dynamics (friends need different approaches than family)\n" +
            "- Time since last contact (longer periods require more gentle re-engagement)\n" +
            "- The contact's interests and previous conversation topics\n" +
            "- Any special contexts or occasions\n" +
            "- The psychological comfort of an introverted sender\n\n" +
            "Your suggestions should be:\n" +
            "- Authentic and personal, never generic\n" +
            "- Concise and clear (under 25 words)\n" +
            "- Low-pressure and non-demanding\n" +
            "- Conversation-starting rather than just greeting\n" +
            "- Appropriate for the relationship type and history"
        },
        {
          role: "user",
          content: `I need to reconnect with ${contactName} who is my ${relationshipType}. 
${interestsText}
${timeContext}
${messageHistory}
${specialOccasion}

Please generate a thoughtful conversation starter along with analysis of its tone, relevance to our relationship context, and a few alternative options I could use instead.

Respond in JSON format with: message, tone_analysis, context_relevance, and alternative_options.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      message: result.message || `Hey ${contactName}, just wanted to check in and see how you're doing!`,
      tone_analysis: result.tone_analysis || 'Casual and friendly tone suitable for reconnecting.',
      context_relevance: result.context_relevance || 'General check-in message.',
      alternative_options: result.alternative_options || [`Hi ${contactName}, hope you've been well!`],
      source: "openai", // Mark source as openai
    };
  } catch (error: any) { // Catch any error
    console.error("OpenAI API error in generateSuggestion:", error.message);
    return {
      message: `Hey ${contactName}, just wanted to check in and see how you're doing!`,
      tone_analysis: 'Casual and friendly tone suitable for reconnecting.',
      context_relevance: 'General check-in message.',
      alternative_options: [`Hi ${contactName}, hope you've been well!`],
      source: "fallback", // New property
      error_message: "OpenAI API interaction failed. Using fallback suggestion." // New property
    };
  }
}
