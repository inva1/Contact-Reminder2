import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatExportGuidanceModal from '@components/chat-export/guidance-modal';

// Mocks will be added in the setupTests.ts file in a later step
// jest.mock('@/hooks/use-chat-export', () => ({
//   useLogChatExportPrompt: jest.fn(() => ({
//     mutateAsync: jest.fn(),
//   })),
//   useSnoozeChatExportPrompt: jest.fn(() => ({
//     mutateAsync: jest.fn(),
//   })),
// }));
// jest.mock('wouter', () => ({
//   useLocation: jest.fn(() => [null, jest.fn()]),
// }));
// jest.mock('@/hooks/use-toast', () => ({
//   useToast: jest.fn(() => ({
//     toast: jest.fn(),
//   })),
// }));

describe('ChatExportGuidanceModal', () => {
  const mockContacts = [
    { id: 1, name: 'John Doe', phone: "1234567890" },
    { id: 2, name: 'Jane Smith', phone: "0987654321" },
  ];

  it('renders correctly when open', () => {
    render(
      <ChatExportGuidanceModal
        open={true}
        onOpenChange={() => {}}
        contacts={mockContacts}
      />
    );
    expect(screen.getByText(/Chat Export Recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/We've noticed some contacts might need their chat history updated/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows export guide when Show Export Guide is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ChatExportGuidanceModal
        open={true}
        onOpenChange={() => {}}
        contacts={mockContacts}
      />
    );

    // Find the specific contact card for John Doe
    const johnDoeTextElement = screen.getByText('John Doe');
    const johnDoeCard = johnDoeTextElement.closest('div.flex.items-center.justify-between.p-4.border.rounded-lg');
    
    if (!johnDoeCard) {
      throw new Error("Could not find John Doe's card container. The DOM structure might have changed.");
    }

    // Click the "Show Export Guide" button within John Doe's card
    await user.click(within(johnDoeCard).getByText(/Show Export Guide/i));
    
    expect(screen.getByText(/Follow these steps to export your WhatsApp chat history/i)).toBeInTheDocument();
  });
});
