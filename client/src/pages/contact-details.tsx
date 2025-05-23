import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useParams, useNavigate } from "wouter";
import { 
  useContact, 
  useContactMessages, 
  useGenerateSuggestion 
} from "@/hooks/use-contact";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, MessageSquare, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import ImportChatModal from "@/components/contacts/import-chat-modal";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function ContactDetails() {
  const { id } = useParams();
  const [_, navigate] = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);
  const { toast } = useToast();
  const [setupComplete] = useLocalStorage("setupComplete", false);
  
  const { data: contact, isLoading: contactLoading } = useContact(id || "");
  const { data: messages, isLoading: messagesLoading } = useContactMessages(id || "");
  const generateSuggestion = useGenerateSuggestion();
  
  const navigateBack = () => {
    navigate("/");
  };
  
  const handleRefreshSuggestion = async () => {
    try {
      await generateSuggestion.mutateAsync(id || "");
      toast({
        title: "Suggestion refreshed",
        description: "A new conversation starter has been generated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not generate a new suggestion",
        variant: "destructive"
      });
    }
  };
  
  const openWhatsApp = () => {
    if (!contact) return;
    
    // Construct WhatsApp URL
    const message = encodeURIComponent(contact.suggestion || "");
    // Remove any non-numeric characters from phone
    const phone = contact.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };
  
  // Group messages by date for display
  const groupedMessages = () => {
    if (!messages) return {};
    
    const groups: Record<string, any[]> = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      
      groups[date].push(message);
    });
    
    return groups;
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  // Check if user completed setup
  if (!setupComplete) {
    navigate("/setup");
    return null;
  }

  return (
    <MainLayout>
      <header className="px-6 py-4 bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={navigateBack}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-medium">
            {contactLoading ? <Skeleton className="h-7 w-32" /> : contact?.name}
          </h1>
        </div>
      </header>
      
      <section className="px-6 py-4">
        {/* Contact Info and Suggestion */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {contactLoading ? (
              <div className="flex items-center mb-4">
                <Skeleton className="h-12 w-12 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center mb-4">
                <div className={`h-12 w-12 rounded-full ${contact?.name.toLowerCase().includes("mom") ? "bg-secondary" : "bg-primary"} text-white flex items-center justify-center mr-3`}>
                  <span>{getInitials(contact?.name || "")}</span>
                </div>
                <div>
                  <h2 className="font-medium text-lg">{contact?.name}</h2>
                  <p className="text-sm text-muted-foreground">{contact?.phone}</p>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Conversation Starter</h3>
              {contactLoading ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : contact?.suggestion ? (
                <p className="bg-muted p-3 rounded-lg italic text-sm">
                  {contact.suggestion}
                </p>
              ) : (
                <p className="bg-muted p-3 rounded-lg text-sm">
                  No suggestion available. Try importing chat messages to generate one.
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                className="flex items-center" 
                onClick={openWhatsApp}
                disabled={contactLoading || !contact}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Message
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center" 
                onClick={handleRefreshSuggestion}
                disabled={contactLoading || generateSuggestion.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${generateSuggestion.isPending ? "animate-spin" : ""}`} />
                New Suggestion
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Conversation History */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Conversation History</h2>
            <Button 
              variant="ghost" 
              className="flex items-center text-primary text-sm font-medium" 
              onClick={() => setShowImportModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Import Chat
            </Button>
          </div>
          
          {/* Message Timeline */}
          {messagesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-24 mx-auto" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground mb-4">No messages yet</p>
              <Button onClick={() => setShowImportModal(true)}>
                Import WhatsApp Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMessages()).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date Divider */}
                  <div className="flex items-center justify-center">
                    <div className="bg-muted px-4 py-1 rounded-full text-xs text-muted-foreground">
                      {date}
                    </div>
                  </div>
                  
                  {/* Messages */}
                  {dateMessages.map((message, index) => (
                    <div key={index} className="flex mb-3">
                      <div 
                        className={`max-w-[80%] ${
                          message.sender === "Me" || message.sender === contact?.name 
                            ? "bg-primary bg-opacity-10 ml-auto" 
                            : "bg-muted mr-auto"
                        } rounded-lg py-2 px-3`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Contact Details */}
        <div>
          <h2 className="text-lg font-medium mb-3">Details</h2>
          <Card>
            <CardContent className="pt-6">
              {contactLoading ? (
                <>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-8 w-full mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-5 w-24 mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-5 w-36" />
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {contact?.interests ? (
                        JSON.parse(contact.interests).map((interest: string, idx: number) => (
                          <Badge key={idx} variant="outline">{interest}</Badge>
                        ))
                      ) : (
                        <p className="text-sm">No interests added</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Relationship</h3>
                    <p className="text-sm capitalize">{contact?.relationship_type || "Friend"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Reminder Frequency</h3>
                    <div className="flex items-center">
                      <p className="text-sm mr-2">Every {contact?.reminder_frequency || 14} days</p>
                      <Button variant="link" className="text-primary text-sm p-0 h-auto">
                        Edit
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Import Chat Modal */}
      <ImportChatModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        contactId={id || ""}
      />
    </MainLayout>
  );
}
