import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogChatExportPrompt, useSnoozeChatExportPrompt } from "@/hooks/use-chat-export";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ChatExportGuidanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Array<{ id: number; name: string; }>;
}

export default function ChatExportGuidanceModal({
  open,
  onOpenChange,
  contacts,
}: ChatExportGuidanceModalProps) {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [showingGuide, setShowingGuide] = useState(false);
  const logPrompt = useLogChatExportPrompt();
  const snoozePrompt = useSnoozeChatExportPrompt();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleShowGuide = async (contactId: number) => {
    setShowingGuide(true);
    await logPrompt.mutateAsync(contactId);
  };

  const handleSnooze = async (contactId: number) => {
    try {
      await snoozePrompt.mutateAsync({ contactId, durationDays: 7 });
      toast({
        title: "Reminder snoozed",
        description: "We'll remind you again in 7 days",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to snooze reminder",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chat Export Recommendations</DialogTitle>
          <DialogDescription>
            {showingGuide 
              ? "Follow these steps to export your WhatsApp chat history"
              : "We've noticed some contacts might need their chat history updated"}
          </DialogDescription>
        </DialogHeader>

        {!showingGuide ? (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                <span className="font-medium">{contact.name}</span>
                <div className="space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleShowGuide(contact.id)}
                  >
                    Show Export Guide
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSnooze(contact.id)}
                  >
                    Snooze (7 days)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="android">
              <TabsList>
                <TabsTrigger value="android">Android</TabsTrigger>
                <TabsTrigger value="ios">iOS</TabsTrigger>
                <TabsTrigger value="web">Web/Desktop</TabsTrigger>
              </TabsList>
              
              <TabsContent value="android" className="space-y-4">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Open WhatsApp and go to the chat</li>
                  <li>Tap the three dots menu (⋮) at the top right</li>
                  <li>Select "More" {'>'} "Export chat"</li>
                  <li>Choose "WITHOUT MEDIA"</li>
                  <li>Save or share the exported file</li>
                </ol>
              </TabsContent>
              
              <TabsContent value="ios" className="space-y-4">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Open WhatsApp and go to the chat</li>
                  <li>Tap the contact name at the top</li>
                  <li>Scroll down and tap "Export Chat"</li>
                  <li>Choose "WITHOUT MEDIA"</li>
                  <li>Save or share the exported file</li>
                </ol>
              </TabsContent>
              
              <TabsContent value="web" className="space-y-4">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Open WhatsApp Web/Desktop</li>
                  <li>Open the chat you want to export</li>
                  <li>Click the three dots menu (⋮) at the top right</li>
                  <li>Select "Export chat"</li>
                  <li>Choose "WITHOUT MEDIA"</li>
                </ol>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => setShowingGuide(false)}
              >
                Back to List
              </Button>
              <Button
                onClick={() => setLocation(`/contacts/${selectedContact.id}`)}
              >
                I've exported, take me to import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
