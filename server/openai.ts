import OpenAI from "openai";

// Azure OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY || "3OprBLX9YmiUWsUoRtkT9bcFqs9LdtthSfhl9nIWU4s9JYDyoT6VJQQJ99BEACHYHv6XJ3w3AAAAACOGzS4B",
  baseURL: "https://emma-mawyj0x1-eastus2.cognitiveservices.azure.com/openai/deployments/model-router/chat/completions?api-version=2025-01-01-preview",
});

// Fallback to regular OpenAI if Azure credentials aren't available
// const openai = new OpenAI({ 
//   apiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key-for-development"
// });

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatAnalysis {
  last_interaction_date: string;
  topics: string[];
  suggestion: string;
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
      model: "o4-mini", // Using Azure OpenAI o4-mini model
      messages: [
        {
          role: "system",
          content: 
            "You are an AI assistant helping an introverted user maintain social connections. Given a WhatsApp chat history with a contact, perform the following tasks:\n\n" +
            "1. Identify the date of the last interaction (most recent message) in YYYY-MM-DD format.\n" +
            "2. Extract key topics, interests, or events discussed in the most recent 20 messages. Look for recurring themes (mentioned ≥2 times) such as hobbies, events, or emotions. Ignore generic greetings (e.g., \"Hi\", \"How are you\").\n" +
            "3. Suggest a conversation starter to reconnect with the contact, based on the context and relationship type (e.g., friend, family). The suggestion should:\n" +
            "   - Reference a specific topic or event from the chat history.\n" +
            "   - Be friendly, concise (≤20 words), and low-pressure, suitable for an introverted user.\n" +
            "   - Use a casual tone for friends (e.g., \"Hey, how's that hiking trip going?\") and a warmer tone for family (e.g., \"Hi Mom, how's the garden coming along?\").\n" +
            "   - Encourage a response without being demanding.\n" +
            "   - If the chat history has fewer than 5 messages or lacks clear topics, suggest a generic but appropriate reconnect message (e.g., \"Hey [name], been a while! What's new?\" for friends; \"Hi [name], just checking in—how's everything?\" for family)."
        },
        {
          role: "user",
          content: 
            `Chat History:\n${chatHistory}\n\nContact Name: ${contactName}\nRelationship Type: ${relationshipType}\n\nOutput in JSON format:\n{\n  "last_interaction_date": "YYYY-MM-DD",\n  "topics": ["topic1", "topic2"],\n  "suggestion": "Suggested message text"\n}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}') as ChatAnalysis;
    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      last_interaction_date: new Date().toISOString().split('T')[0],
      topics: [],
      suggestion: `Hey ${contactName}, just wanted to check in and see how you're doing!`
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
