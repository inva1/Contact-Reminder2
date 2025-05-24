import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useContacts, useUpdateContact } from "@/hooks/use-contact";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ContactWithSuggestion } from "@shared/schema";
import ContactCard from "@/components/contacts/contact-card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Plus, Moon, Sun, Settings } from "lucide-react";
import { useLocation } from "wouter";
import AddContactModal from "@/components/contacts/add-contact-modal";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [setupComplete, setSetupComplete] = useLocalStorage("setupComplete", false);
  const { toast } = useToast();
  
  const contactsQuery = useContacts();
  const updateContact = useUpdateContact();
  
  useEffect(() => {
    if (!setupComplete) {
      setLocation("/setup");
    }
  }, [setupComplete, setLocation]);
  
  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const navigateToSettings = () => {
    setLocation("/settings");
  };
  
  const dismissReminder = async (contactId: number) => {
    try {
      // Update the last_contact_date to today
      await updateContact.mutateAsync({
        id: contactId,
        data: {
          last_contact_date: new Date()
        }
      });
      
      toast({
        title: "Reminder dismissed",
        description: "We'll remind you again in the future"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not dismiss reminder",
        variant: "destructive"
      });
    }
  };
  
  // Filter and sort contacts by priority, relationship strength, and last contact date
  const contacts = contactsQuery.data as ContactWithSuggestion[] || [];
  
  // Priority categories
  const urgentContacts = contacts.filter(c => 
    (c.daysSinceLastContact && c.daysSinceLastContact >= 30) || // Over a month
    (c.reminderStatus === 'overdue') || 
    (c.priority_level && c.priority_level >= 4)  // High priority contacts
  );
  
  const needsAttentionContacts = contacts.filter(c => 
    !urgentContacts.includes(c) && // Not already in urgent
    ((c.daysSinceLastContact && c.daysSinceLastContact >= 14) || // 2+ weeks 
    (c.reminderStatus === 'due'))
  );
  
  const favoriteContacts = contacts.filter(c => 
    !urgentContacts.includes(c) && 
    !needsAttentionContacts.includes(c) && 
    c.is_favorite
  );
  
  // Regular contacts (not in any of the above categories)
  const otherContacts = contacts.filter(c => 
    !urgentContacts.includes(c) && 
    !needsAttentionContacts.includes(c) && 
    !favoriteContacts.includes(c)
  );

  return (
    <MainLayout>
      <header className="px-6 py-4 bg-card shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-medium">Contact Reminders</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={navigateToSettings}>
              <Settings size={20} />
            </Button>
          </div>
        </div>
      </header>
      
      <section className="px-6 py-4">
        {contactsQuery.isLoading ? (
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded-lg"></div>
            <div className="h-20 bg-muted animate-pulse rounded-lg"></div>
          </div>
        ) : contactsQuery.isError ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load contacts</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => contactsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Urgent Contacts Section */}
            {urgentContacts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                  Urgent <span className="text-sm font-normal text-muted-foreground ml-2">(30+ days)</span>
                </h2>
                <div className="space-y-3">
                  {urgentContacts.map((contact: ContactWithSuggestion) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isPriority={true}
                      onDismiss={dismissReminder}
                      onMessageClick={() => setLocation(`/contacts/${contact.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Needs Attention Section */}
            {needsAttentionContacts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                  Needs Attention <span className="text-sm font-normal text-muted-foreground ml-2">(14+ days)</span>
                </h2>
                <div className="space-y-3">
                  {needsAttentionContacts.map((contact: ContactWithSuggestion) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isPriority={true}
                      onDismiss={dismissReminder}
                      onMessageClick={() => setLocation(`/contacts/${contact.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Favorites Section */}
            {favoriteContacts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
                  Favorites
                </h2>
                <div className="space-y-3">
                  {favoriteContacts.map((contact: ContactWithSuggestion) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onMessageClick={() => setLocation(`/contacts/${contact.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Other Contacts Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">All Contacts</h2>
              {otherContacts.length > 0 ? (
                <div className="space-y-3">
                  {otherContacts.map((contact: ContactWithSuggestion) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onMessageClick={() => setLocation(`/contacts/${contact.id}`)}
                    />
                  ))}
                </div>
              ) : (
                contacts.length === 0 && (
                  <div className="text-center py-8 bg-card rounded-lg border border-border">
                    <p className="text-muted-foreground mb-4">No contacts added yet</p>
                    <Button onClick={() => setShowAddContactModal(true)}>
                      Add Your First Contact
                    </Button>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>
      
      {/* Add Contact Button (FAB) */}
      <Button 
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setShowAddContactModal(true)}
      >
        <Plus size={24} />
      </Button>
      
      {/* Add Contact Modal */}
      <AddContactModal
        open={showAddContactModal}
        onOpenChange={setShowAddContactModal}
      />
    </MainLayout>
  );
}
