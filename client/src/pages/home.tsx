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
  
  // Filter contacts into priority (needs attention) and regular contacts
  const contacts = contactsQuery.data as ContactWithSuggestion[] || [];
  const priorityContacts = contacts.filter(c => c.daysSinceLastContact && c.daysSinceLastContact >= 14);
  const recentContacts = contacts.filter(c => !c.daysSinceLastContact || c.daysSinceLastContact < 14);

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
            {/* Priority Contacts Section */}
            {priorityContacts.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3">
                  Needs Attention <span className="text-sm font-normal text-muted-foreground">(14+ days)</span>
                </h2>
                <div className="space-y-3">
                  {priorityContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isPriority={true}
                      onDismiss={dismissReminder}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Contacts Section */}
            <div>
              <h2 className="text-lg font-medium mb-3">Recent Contacts</h2>
              {recentContacts.length > 0 ? (
                <div className="space-y-3">
                  {recentContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No contacts added yet</p>
                  <Button onClick={() => setShowAddContactModal(true)}>
                    Add Your First Contact
                  </Button>
                </div>
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
