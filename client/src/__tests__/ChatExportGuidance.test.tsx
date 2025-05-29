import { render, screen } from '@testing-library/react';
import ChatExportGuidance from '../../components/chat-export/chat-export-guidance';

describe('ChatExportGuidance', () => {
  it('renders correctly', () => {
    render(<ChatExportGuidance />);
    expect(screen.getByText(/Exporting chats will generate a text file/i)).toBeInTheDocument();
  });
});
