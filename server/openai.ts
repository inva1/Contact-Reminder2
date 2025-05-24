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
}

export async function analyzeChat(
  messages: Message[],
  contactName: string,
  relationshipType: string
): Promise<ChatAnalysis> {
  try {
    const chatHistory = messages.map(m => 
      `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.content}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the latest OpenAI model
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
      message_preview: result.message_preview || ''
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      last_interaction_date: new Date().toISOString().split('T')[0],
      topics: [],
      suggestion: `Hey ${contactName}, just wanted to check in and see how you're doing!`,
      sentiment: 'neutral',
      relationship_strength: 5,
      interaction_frequency: 'occasional',
      context_notes: '',
      conversation_themes: [],
      message_preview: ''
    };
  }
}

export async function generateSuggestion(
  contactName: string, 
  relationshipType: string,
  interests: string[] = []
): Promise<string> {
  try {
    const interestsText = interests.length > 0 
      ? `They are interested in: ${interests.join(', ')}.` 
      : '';

    const response = await openai.chat.completions.create({
      model: "o4-mini", // Using Azure OpenAI o4-mini model
      messages: [
        {
          role: "system",
          content: 
            "You are an AI assistant helping an introverted user maintain social connections. Generate a friendly, low-pressure conversation starter message for a contact."
        },
        {
          role: "user",
          content: 
            `I need to reconnect with ${contactName} who is my ${relationshipType}. ${interestsText}\n\nPlease suggest a friendly, casual conversation starter that is concise (under 20 words) and doesn't feel demanding. The message should be something an introverted person would feel comfortable sending.`
        }
      ]
    });

    const messageContent = response.choices[0]?.message?.content;
    return messageContent ? messageContent.replace(/^["']|["']$/g, '') : `Hey ${contactName}, just wanted to check in and see how you're doing!`;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return `Hey ${contactName}, just wanted to check in and see how you're doing!`;
  }
}
