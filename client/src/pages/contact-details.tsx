import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useParams, useLocation } from "wouter";
import { 
  useContact, 
  useContactMessages, 
  useGenerateSuggestion,
  useContactAnalysis,
  useSuggestionAlternatives,
  useUpdateSuggestion
} from "@/hooks/use-contact";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  RefreshCw, 
  MessageSquare, 
  Plus, 
  Send, 
  Star, 
  StarOff, 
  Phone, 
  Calendar, 
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImportChatModal from "@/components/contacts/import-chat-modal";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ContactWithSuggestion } from "@shared/schema";
import ContactAnalysis from "@/components/contacts/contact-analysis";
import SuggestionAlternatives from "@/components/contacts/suggestion-alternatives";

export default function ContactDetails() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const { toast } = useToast();
  const [setupComplete] = useLocalStorage("setupComplete", false);
  
  const { data: contact, isLoading: contactLoading } = useContact(id || "");
  const { data: messages, isLoading: messagesLoading } = useContactMessages(id || "");
  const { data: analysis, isLoading: analysisLoading } = useContactAnalysis(id || "");
  const { data: alternatives, isLoading: alternativesLoading } = useSuggestionAlternatives(id || "");
  
  const generateSuggestion = useGenerateSuggestion();
  const updateSuggestion = useUpdateSuggestion();
  
  const navigateBack = () => {
    setLocation("/");
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
    const contactData = contact as ContactWithSuggestion;
    const message = encodeURIComponent(contactData.suggestion || "");
    // Remove any non-numeric characters from phone
    const phone = contactData.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };
  
  // Group messages by date for display
  const groupedMessages = () => {
    if (!messages) return {};
    
    const groups: Record<string, any[]> = {};
    
    const messageArray = Array.isArray(messages) ? messages : [];
    
    messageArray.forEach((message: any) => {
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
    setLocation("/setup");
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
            {contactLoading ? <Skeleton className="h-7 w-32" /> : (contact as ContactWithSuggestion)?.name}
          </h1>
        </div>
      </header>
      
      <section className="px-6 py-4">
        {/* Contact Info and Suggestion Card */}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-full ${(contact as ContactWithSuggestion)?.name?.toLowerCase().includes("mom") ? "bg-secondary" : "bg-primary"} text-white flex items-center justify-center mr-3`}>
                    <span>{getInitials((contact as ContactWithSuggestion)?.name || "")}</span>
                  </div>
                  <div>
                    <h2 className="font-medium text-lg">{(contact as ContactWithSuggestion)?.name}</h2>
                    <p className="text-sm text-muted-foreground">{(contact as ContactWithSuggestion)?.phone}</p>
                  </div>
                </div>
                
                {/* Status badges */}
                <div className="flex flex-col items-end">
                  {(contact as ContactWithSuggestion)?.is_favorite && (
                    <Badge variant="secondary" className="mb-1">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      Favorite
                    </Badge>
                  )}
                  {(contact as ContactWithSuggestion)?.priority_level && (contact as ContactWithSuggestion)?.priority_level > 3 && (
                    <Badge variant="outline" className="bg-primary/10">
                      Priority Contact
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Conversation Starter Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Conversation Starter</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleRefreshSuggestion}
                  disabled={generateSuggestion.isPending}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              
              {contactLoading ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : (contact as ContactWithSuggestion)?.suggestion ? (
                <div className="bg-muted p-3 rounded-lg italic text-sm relative group">
                  <p>{(contact as ContactWithSuggestion).suggestion}</p>
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 rounded-full w-7 p-0"
                      onClick={() => navigator.clipboard.writeText((contact as ContactWithSuggestion).suggestion || "")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="bg-muted p-3 rounded-lg text-sm">
                  No suggestion available. Try importing chat messages to generate one.
                </p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                className="flex items-center" 
                onClick={openWhatsApp}
                disabled={contactLoading || !contact}
              >
                <Send className="h-4 w-4 mr-1" />
                Message
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center" 
                onClick={() => setShowImportModal(true)}
                disabled={contactLoading}
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
          ) : (Array.isArray(messages) && messages.length === 0) ? (
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
                          message.sender === "Me" || message.sender === (contact as ContactWithSuggestion)?.name 
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
                      {(contact as ContactWithSuggestion)?.interests ? (
                        JSON.parse((contact as ContactWithSuggestion)?.interests || '[]').map((interest: string, idx: number) => (
                          <Badge key={idx} variant="outline">{interest}</Badge>
                        ))
                      ) : (
                        <p className="text-sm">No interests added</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Relationship</h3>
                    <p className="text-sm capitalize">{(contact as ContactWithSuggestion)?.relationship_type || "Friend"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Reminder Frequency</h3>
                    <div className="flex items-center">
                      <p className="text-sm mr-2">Every {(contact as ContactWithSuggestion)?.reminder_frequency || 14} days</p>
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
