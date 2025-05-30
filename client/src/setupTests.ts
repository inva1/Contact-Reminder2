import '@testing-library/jest-dom';

jest.mock('@/hooks/use-chat-export', () => ({
  useLogChatExportPrompt: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined), // Ensure mutateAsync is a mock function
  })),
  useSnoozeChatExportPrompt: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined), // Ensure mutateAsync is a mock function
  })),
}));

jest.mock('wouter', () => ({
  ...jest.requireActual('wouter'), // Import and spread actual module
  useLocation: jest.fn(() => ['/current-path', jest.fn()]), // Mock useLocation
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));
