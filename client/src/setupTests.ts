import '@testing-library/jest-dom';

vi.mock('@/hooks/use-chat-export', () => ({
  useLogChatExportPrompt: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined), // Ensure mutateAsync is a mock function
  })),
  useSnoozeChatExportPrompt: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined), // Ensure mutateAsync is a mock function
  })),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual, // Import and spread actual module
    useLocation: vi.fn(() => ['/current-path', vi.fn()]), // Mock useLocation
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));
