import { type Contact, type ContactWithSuggestion } from "@shared/schema"; // Import Contact
import { useLocation } from "wouter";
import { MoreVertical, MessageSquare, Edit, Trash2 } from "lucide-react"; // Added Edit, Trash2
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Added Separator
} from "@/components/ui/dropdown-menu";

type ContactCardProps = {
  contact: ContactWithSuggestion;
  isPriority?: boolean;
  onDismiss?: (id: number) => void;
  onMessageClick?: (contact: ContactWithSuggestion) => void;
  onEdit: (contact: Contact) => void; // Added onEdit
  onDelete: (contactId: number) => void; // Added onDelete
};

export default function ContactCard({
  contact,
  isPriority = false,
  onDismiss,
  onMessageClick,
  onEdit,
  onDelete,
}: ContactCardProps) {
  const [_, setLocation] = useLocation();

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleAction = (e: React.MouseEvent, actionFn: () => void) => {
    e.stopPropagation(); // Prevent card click (navigation)
    actionFn();
  };
  
  const openWhatsApp = (e: React.MouseEvent) => {
    handleAction(e, () => {
      if (onMessageClick) {
        onMessageClick(contact);
      } else {
        const message = encodeURIComponent(contact.suggestion || "");
        const phone = contact.phone.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      }
    });
  };

  const dismissReminder = (e: React.MouseEvent) => {
    handleAction(e, () => {
      if (onDismiss) onDismiss(contact.id);
    });
  };

  const navigateToContact = () => {
    setLocation(`/contact/${contact.id}`);
  };

  return (
    <div
      className="bg-card rounded-lg shadow-sm p-4 border border-border cursor-pointer hover:shadow-md transition-shadow"
      onClick={navigateToContact} // Main card click navigates
    >
      <div className="flex items-start mb-2"> {/* Changed items-center to items-start for better alignment with dropdown */}
        <div
          className={`h-10 w-10 rounded-full flex-shrink-0 ${
            contact.name?.toLowerCase().includes("mom") ? "bg-pink-500" : "bg-primary"
          } text-primary-foreground flex items-center justify-center mr-3`}
        >
          <span>{getInitials(contact.name)}</span>
        </div>
        <div className="flex-grow">
          <h3 className="font-medium">{contact.name}</h3>
          <p className="text-xs text-muted-foreground">
            {contact.phone}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last contacted: {contact.daysSinceLastContact ?? "?"} days ago
          </p>
        </div>
        {/* Dropdown Menu for all cards */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-8 w-8 rounded-full self-start" // Align to top
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleAction(e, () => onEdit(contact as Contact))}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openWhatsApp}> {/* Still uses openWhatsApp for messaging */}
              <MessageSquare className="mr-2 h-4 w-4" /> Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, navigateToContact)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => handleAction(e, () => onDelete(contact.id))} 
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isPriority && contact.suggestion && ( // This section remains for priority contacts
        <div className="mt-2">
          <p className="text-sm bg-muted p-3 rounded-lg italic mb-3">
            "{contact.suggestion}"
          </p>
          <div className="flex space-x-2">
            <Button
              className="rounded-full text-sm flex items-center"
              onClick={openWhatsApp} // Still uses openWhatsApp
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
            {onDismiss && ( // Only show Later button if onDismiss is provided
              <Button
                variant="outline"
                className="rounded-full text-sm"
                onClick={dismissReminder} // Still uses dismissReminder
              >
                Later
              </Button>
            )}
          </div>
        </div>
      )}
       {!isPriority && contact.suggestion && ( // Show suggestion snippet for non-priority cards too
        <p className="text-xs text-muted-foreground mt-2 truncate italic">
          Suggests: "{contact.suggestion}"
        </p>
      )}
    </div>
  );
}
