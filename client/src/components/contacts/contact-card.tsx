import { ContactWithSuggestion } from "@shared/schema";
import { useLocation } from "wouter";
import { MoreVertical, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContactCardProps = {
  contact: ContactWithSuggestion;
  isPriority?: boolean;
  onDismiss?: (id: number) => void;
  onMessageClick?: (contact: ContactWithSuggestion) => void;
};

export default function ContactCard({
  contact,
  isPriority = false,
  onDismiss,
  onMessageClick,
}: ContactCardProps) {
  const [_, setLocation] = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessageClick) {
      onMessageClick(contact);
    } else {
      // Construct WhatsApp URL
      const message = encodeURIComponent(contact.suggestion || "");
      // Remove any non-numeric characters from phone
      const phone = contact.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    }
  };

  const dismissReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(contact.id);
    }
  };

  const navigateToContact = () => {
    setLocation(`/contact/${contact.id}`);
  };

  return (
    <div
      className="bg-card rounded-lg shadow-sm p-4 border border-border cursor-pointer"
      onClick={navigateToContact}
    >
      <div className="flex items-center mb-2">
        <div
          className={`h-10 w-10 rounded-full ${
            isPriority
              ? contact.name.toLowerCase().includes("mom")
                ? "bg-secondary"
                : "bg-primary"
              : "bg-muted"
          } text-white flex items-center justify-center mr-3`}
        >
          <span>{getInitials(contact.name)}</span>
        </div>
        <div className="flex-grow">
          <h3 className="font-medium">{contact.name}</h3>
          <p className="text-xs text-muted-foreground">
            Last contacted {contact.daysSinceLastContact || "?"} days ago
          </p>
        </div>
        {!isPriority && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 h-8 w-8 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openWhatsApp}>Message</DropdownMenuItem>
              <DropdownMenuItem onClick={navigateToContact}>
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isPriority && contact.suggestion && (
        <div className="mt-2">
          <p className="text-sm bg-muted p-3 rounded-lg italic mb-3">
            "{contact.suggestion}"
          </p>
          <div className="flex space-x-2">
            <Button
              className="rounded-full text-sm flex items-center"
              onClick={openWhatsApp}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-sm"
              onClick={dismissReminder}
            >
              Later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
