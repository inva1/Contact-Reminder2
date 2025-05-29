import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
// import { useContacts, useUpdateContact } from "@/hooks/use-contact"; // useUpdateContact is still used by ContactModal indirectly, but not directly in this file after removing dismissReminder. Let's check ContactModal usage.
// After review, updateContactMutation is used by dismissReminder. If dismissReminder is removed, and nothing else in THIS FILE uses updateContactMutation directly, this specific import line might be simplified.
// However, useUpdateContact is still used by the ContactModal. The hooks are fine.
import { useContacts, useUpdateContact, useDeleteContact } from "@/hooks/use-contact"; // Keep this line as is.
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ContactWithSuggestion } from "@shared/schema";
import ContactCard from "@/components/contacts/contact-card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Plus, Moon, Sun, Settings } from "lucide-react";
import { useLocation } from "wouter";
import ContactModal from "@/components/contacts/add-contact-modal";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { type Contact } from "@shared/schema"; // Removed ContactWithSuggestion from here as it's imported above

export default function Home() {
  const [, setLocation] = useLocation(); // location removed as it's not used
  const { theme, setTheme } = useTheme();
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactIdToDelete, setContactIdToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  
  const contactsQuery = useContacts();
  // const updateContactMutation = useUpdateContact(); // This instance is unused if dismissReminder is removed.
                                                 // The ContactModal uses its own instance from the hook.
  const deleteContactMutation = useDeleteContact(); 
  
  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const navigateToSettings = () => {
    setLocation("/settings");
  };

  const handleOpenAddModal = () => {
    setContactToEdit(null);
    setShowContactModal(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setContactToEdit(contact);
    setShowContactModal(true);
  };
  
  const handleDeleteRequest = (id: number) => {
    setContactIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (contactIdToDelete === null) return;
    try {
      await deleteContactMutation.mutateAsync(contactIdToDelete);
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error deleting contact",
        description: (error as Error)?.message || "Could not delete the contact.",
        variant: "destructive",
      });
    } finally {
      setContactIdToDelete(null); 
      // setShowDeleteConfirm(false); // Dialog onOpenChange handles this
    }
  };
  
  // Removed dismissReminder function
  // const dismissReminder = async (contactId: number) => { ... };
  
  const contacts = (contactsQuery.data as ContactWithSuggestion[] || []).sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1; // is_favorite from Drizzle is camelCase
    if (!a.is_favorite && b.is_favorite) return 1;
    if ((a.priority_level || 0) > (b.priority_level || 0)) return -1; // priority_level from Drizzle is camelCase
    if ((a.priority_level || 0) < (b.priority_level || 0)) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
  
  const allContacts = contacts; 

  return (
    <MainLayout>
      <header className="px-6 py-4 bg-card shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-medium">Contact Reminders</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={navigateToSettings} aria-label="Open settings">
              <Settings size={20} />
            </Button>
          </div>
        </div>
      </header>
      
      <section className="px-6 py-4">
        {contactsQuery.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        )}
        {contactsQuery.isError && (
          <div className="text-center py-8">
            <p className="text-destructive mb-2">Failed to load contacts.</p>
            <Button variant="outline" onClick={() => contactsQuery.refetch()}>Retry</Button>
          </div>
        )}
        {!contactsQuery.isLoading && !contactsQuery.isError && allContacts.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">No contacts yet. Add your first one!</p>
            <Button onClick={handleOpenAddModal}>Add Contact</Button>
          </div>
        )}
        {!contactsQuery.isLoading && !contactsQuery.isError && allContacts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allContacts.map((contact: ContactWithSuggestion) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onMessageClick={() => setLocation(`/contact/${contact.id}`)}
                onEdit={() => handleOpenEditModal(contact as Contact)}
                onDelete={() => handleDeleteRequest(contact.id)}
              />
            ))}
          </div>
        )}
      </section>
      
      <Button 
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={handleOpenAddModal}
        aria-label="Add new contact"
      >
        <Plus size={24} />
      </Button>
      
      <ContactModal
        open={showContactModal}
        onOpenChange={setShowContactModal}
        contactToEdit={contactToEdit}
      />
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete this contact? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonVariant="destructive"
      />
    </MainLayout>
  );
}
