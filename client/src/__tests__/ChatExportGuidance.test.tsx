import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatExportGuidanceModal } from '../components/chat-export/guidance-modal';
import { useLogChatExportPrompt, useSnoozeChatExportPrompt } from '../hooks/use-chat-export';

jest.mock('../hooks/use-chat-export');

describe('ChatExportGuidanceModal', () => {
  const mockContacts = [
    { id: 1, name: 'Test User 1' },
    { id: 2, name: 'Test User 2' }
  ];

  beforeEach(() => {
    (useLogChatExportPrompt as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn()
    });
    (useSnoozeChatExportPrompt as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn()
    });
  });

  it('should display contacts needing export', () => {
    render(
      <ChatExportGuidanceModal
        open={true}
        onOpenChange={() => {}}
        contacts={mockContacts}
      />
    );

    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText('Test User 2')).toBeInTheDocument();
  });

  it('should show export guide when button clicked', async () => {
    const logPrompt = jest.fn();
    (useLogChatExportPrompt as jest.Mock).mockReturnValue({
      mutateAsync: logPrompt
    });

    render(
      <ChatExportGuidanceModal
        open={true}
        onOpenChange={() => {}}
        contacts={mockContacts}
      />
    );

    fireEvent.click(screen.getAllByText('Show Export Guide')[0]);

    await waitFor(() => {
      expect(screen.getByText('Follow these steps to export your WhatsApp chat history')).toBeInTheDocument();
      expect(logPrompt).toHaveBeenCalledWith(1);
    });
  });

  it('should handle snooze functionality', async () => {
    const snoozePrompt = jest.fn();
    (useSnoozeChatExportPrompt as jest.Mock).mockReturnValue({
      mutateAsync: snoozePrompt
    });

    render(
      <ChatExportGuidanceModal
        open={true}
        onOpenChange={() => {}}
        contacts={mockContacts}
      />
    );

    fireEvent.click(screen.getAllByText('Snooze (7 days)')[0]);

    await waitFor(() => {
      expect(snoozePrompt).toHaveBeenCalledWith({
        contactId: 1,
        durationDays: 7
      });
    });
  });
});
