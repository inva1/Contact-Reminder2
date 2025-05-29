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
  Phone, 
  Calendar, 
  Clock,
  BarChart,
  FileText,
  PieChart,
  Copy as CopyIcon // Added CopyIcon
} from "lucide-react"; 
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImportChatModal from "@/components/contacts/import-chat-modal";
import { useToast } from "@/hooks/use-toast";
import { type Contact, type ContactWithSuggestion, type Suggestion } from "@shared/schema"; // Added Suggestion type
import ContactAnalysis from "@/components/contacts/contact-analysis";
import SuggestionAlternatives from "@/components/contacts/suggestion-alternatives";

export default function ContactDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation(); 
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const { toast } = useToast();
  
  const { data: contactData, isLoading: contactLoading, error: contactError, refetch: refetchContact } = useContact(id || ""); // Added refetchContact
  const contact = contactData as ContactWithSuggestion | null;

  const { data: messages, isLoading: messagesLoading } = useContactMessages(id || "");
  const { data: analysisData, isLoading: analysisLoading } = useContactAnalysis(id || ""); // Renamed to analysisData
  // The 'analysis' object from useContactAnalysis likely contains the suggestion source if it's from there.
  // However, the primary suggestion displayed on the card is from contact.suggestion (which is just text).
  // We need to ensure the Suggestion object (with source/errorMessage) is available.
  // The `contact` object (ContactWithSuggestion) might need to be updated to hold the full suggestion object.
  // For now, handleRefreshSuggestion will get the full suggestion object from its API call.

  const { data: alternatives, isLoading: alternativesLoading } = useSuggestionAlternatives(id || "");
  
  const generateSuggestion = useGenerateSuggestion();
  const updateSuggestionMutation = useUpdateSuggestion();
  
  const handleUpdateSuggestion = async (newSuggestionText: string) => {
    if (!id || !contact) return;
    // When updating with an alternative, we assume it's an OpenAI suggestion.
    // Or, the backend PUT /api/contacts/:id/suggestion should also return the full suggestion object.
    // For now, we only update the text.
    try {
      const updatedSuggestion = await updateSuggestionMutation.mutateAsync({ 
        id, 
        suggestion: newSuggestionText,
        // Ideally, if we know this is an AI suggestion, we'd set source: "openai" here
        // but the PUT endpoint might not support setting source directly, it's for the text.
        // The source is set when the suggestion is *created*.
      });

      if (updatedSuggestion.source === "fallback") {
        toast({
          title: "Using Default Suggestion",
          description: updatedSuggestion.errorMessage || "AI suggestion could not be generated. Displaying a default suggestion.",
        });
      } else {
        toast({
          title: "Suggestion updated",
          description: "Your conversation starter has been updated.",
        });
      }
      // Invalidate contact query to refetch the main contact data which includes the suggestion text
      refetchContact(); 
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update suggestion",
        variant: "destructive"
      });
    }
  };
  
  const navigateBack = () => {
    setLocation("/");
  };
  
  const handleRefreshSuggestion = async () => {
    if (!id) return;
    try {
      // The result from mutateAsync is the full suggestion object from the backend
      const newSuggestion: Suggestion = await generateSuggestion.mutateAsync(id);
      
      if (newSuggestion.source === "fallback") {
        toast({
          title: "Using Default Suggestion",
          description: newSuggestion.errorMessage || "AI features may be unavailable. Displaying a default suggestion.",
          variant: "default", 
        });
      } else {
        toast({
          title: "Suggestion refreshed",
          description: "A new AI-powered conversation starter has been generated.",
        });
      }
      // Queries are invalidated by the useGenerateSuggestion hook's onSuccess,
      // so contactData (and its suggestion field) will be updated.
    } catch (error) {
      toast({
        title: "Error Refreshing Suggestion",
        description: (error as Error).message || "Could not generate a new suggestion.",
        variant: "destructive",
      });
    }
  };
  
  const openWhatsApp = () => {
    if (!contact) return;
    const message = encodeURIComponent(contact.suggestion || "");
    const phone = contact.phone?.replace(/\D/g, "") || ""; 
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };
  
  const groupedMessages = () => {
    if (!messages) return {};
    const groups: Record<string, any[]> = {};
    const messageArray = Array.isArray(messages) ? messages : [];
    messageArray.forEach((message: any) => {
      const date = new Date(message.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };
  
  const getInitials = (name?: string) => {
    if (!name) return "";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (contactError) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <p className="text-destructive">Error loading contact: {contactError.message}</p>
          <Button onClick={() => setLocation('/')} className="mt-4">Go Home</Button>
        </div>
      </MainLayout>
    );
  }
  
  // Determine if the current suggestion is a fallback
  // The `contact.suggestion_details` field was proposed in shared/schema.ts for ContactWithSuggestion
  // If it's not populated by useContact, we might need to fetch the full suggestion object separately
  // or rely on the toast from handleRefreshSuggestion.
  // For now, the toast provides immediate feedback. A visual indicator would require contact.suggestion_details.
  // const isFallbackSuggestion = contact?.suggestion_details?.source === "fallback";

  return (
    <MainLayout>
      <header className="px-6 py-4 bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={navigateBack}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-medium">
              {contactLoading ? <Skeleton className="h-7 w-32" /> : contact?.name}
            </h1>
          </div>
        </div>
      </header>
      
      <section className="px-6 py-4">
        <Card className="mb-6">
          <CardHeader>
             {contactLoading ? (
              <div className="flex items-center mb-4">
                <Skeleton className="h-12 w-12 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ) : contact ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-full ${contact.name?.toLowerCase().includes("mom") ? "bg-secondary" : "bg-primary"} text-primary-foreground flex items-center justify-center mr-3`}>
                    <span>{getInitials(contact.name)}</span>
                  </div>
                  <div>
                    <CardTitle>{contact.name}</CardTitle>
                    <CardDescription>{contact.phone}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {contact.isFavorite && ( 
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" /> Favorite
                    </Badge>
                  )}
                  {contact.priorityLevel && contact.priorityLevel >= 4 && ( 
                    <Badge variant="outline" className="border-primary text-primary">High Priority</Badge>
                  )}
                </div>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Conversation Starter</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleRefreshSuggestion}
                  disabled={generateSuggestion.isPending || contactLoading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              
              {contactLoading ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : contact?.suggestion ? ( // Display suggestion from contact object
                <div className="bg-muted p-3 rounded-lg italic text-sm relative group">
                  <p>{contact.suggestion}</p>
                  {/* Visual indicator for fallback could go here if contact.suggestion_details was populated */}
                  {/* {isFallbackSuggestion && <InfoIcon className="h-4 w-4 text-muted-foreground inline-block ml-2" title={contact.suggestion_details?.errorMessage}/>} */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 rounded-full w-7 p-0"
                      onClick={() => navigator.clipboard.writeText(contact.suggestion || "")}
                    >
                      <CopyIcon className="h-3 w-3" /> {/* Restored CopyIcon */}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="bg-muted p-3 rounded-lg text-sm">
                  No suggestion available. Try importing chat messages or refreshing.
                </p>
              )}
            </div>
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
                <Plus className="h-4 w-4 mr-1" /> 
                Import for Suggestion
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="messages" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="messages" className="text-sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-sm">
              <BarChart className="h-4 w-4 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Alternatives
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="space-y-4">
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
            
            {messagesLoading ? (
              <>
                <Skeleton className="h-10 w-full mb-3" />
                <Skeleton className="h-10 w-full mb-3" />
                <Skeleton className="h-10 w-3/4" />
              </>
            ) : (Array.isArray(messages) && messages.length === 0) ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet.</p>
                <p className="text-sm">Import your chat history to get started.</p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedMessages()).map(([date, msgsInGroup]: [string, any[]]) => (
                  <div key={date} className="mb-4">
                    <div className="flex justify-center my-2">
                      <Badge variant="outline" className="text-xs">{date}</Badge>
                    </div>
                    {msgsInGroup.map((msg: any) => (
                      <div key={msg.id} className={`flex mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-2 rounded-lg max-w-[70%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground/80'} text-right`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analysis">
            <ContactAnalysis
              isLoading={analysisLoading || contactLoading}
              topics={(analysisData as any)?.topics} // Cast as any if analysisData structure is not strictly typed yet for these
              sentiment={(analysisData as any)?.sentiment}
              relationshipStrength={(analysisData as any)?.relationship_strength}
              interactionFrequency={(analysisData as any)?.interaction_frequency}
              conversationThemes={(analysisData as any)?.conversation_themes}
              lastInteractionDate={(analysisData as any)?.last_interaction_date}
              messagePreview={(analysisData as any)?.message_preview}
            />
          </TabsContent>
          
          <TabsContent value="suggestions">
            <SuggestionAlternatives
              isLoading={alternativesLoading}
              alternatives={alternatives?.alternative_options || []}
              onSelect={handleUpdateSuggestion}
              onRefresh={() => handleRefreshSuggestion()}
            />
          </TabsContent>
        </Tabs>
        
        <div>
          <h2 className="text-lg font-medium mb-3">Details</h2>
          <Card>
            <CardContent className="pt-6">
              {contactLoading ? (
                <>
                  <div className="mb-3">
                    <Skeleton className="h-4 w-1/4 mb-2" /> {/* Title: Interests */}
                    <Skeleton className="h-6 w-full" />      {/* Content */}
                  </div>
                  <div className="mb-3">
                    <Skeleton className="h-4 w-1/4 mb-2" /> {/* Title: Relationship */}
                    <Skeleton className="h-6 w-1/2" />      {/* Content */}
                  </div>
                  <div>
                    <Skeleton className="h-4 w-1/3 mb-2" /> {/* Title: Reminder Frequency */}
                    <Skeleton className="h-6 w-3/4" />      {/* Content */}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {contact?.interests ? (
                        JSON.parse(contact.interests || '[]').map((interest: string, idx: number) => (
                          <Badge key={idx} variant="outline">{interest}</Badge>
                        ))
                      ) : (
                        <p className="text-sm">No interests added</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Relationship</h3>
                    <p className="text-sm capitalize">{contact?.relationshipType || "Friend"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Reminder Frequency</h3>
                    <div className="flex items-center">
                      <p className="text-sm mr-2">Every {contact?.reminderFrequency || 14} days</p>
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
      
      <ImportChatModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        contactId={id || ""}
      />
    </MainLayout>
  );
}
