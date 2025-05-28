import { useQuery, useMutation } from '@tanstack/react-query';

interface ChatExportRecommendation {
  id: number;
  name: string;
}

export function useChatExportRecommendations() {
  return useQuery({
    queryKey: ['chatExportRecommendations'],
    queryFn: async () => {
      const response = await fetch('/api/recommendations/chat-export-needed');
      return response.json() as Promise<ChatExportRecommendation[]>;
    },
    // Check every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useLogChatExportPrompt() {
  return useMutation({
    mutationFn: async (contactId: number) => {
      await fetch('/api/recommendations/log-chat-export-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      });
    },
  });
}

export function useSnoozeChatExportPrompt() {
  return useMutation({
    mutationFn: async ({ contactId, durationDays }: { contactId: number; durationDays: number }) => {
      await fetch('/api/recommendations/snooze-chat-export-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, duration_days: durationDays }),
      });
    },
  });
}
