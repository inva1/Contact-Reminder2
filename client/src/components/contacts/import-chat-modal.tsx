import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useImportChat } from "@/hooks/use-contact";
import { Upload } from "lucide-react";

interface ImportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number | string;
}

export default function ImportChatModal({
  open,
  onOpenChange,
  contactId,
}: ImportChatModalProps) {
  const [chatText, setChatText] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const importChat = useImportChat();
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "text/plain") {
      toast({
        title: "Invalid file type",
        description: "Please select a .txt file",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setChatText(content);
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the file",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };
  
  const handleImport = async () => {
    if (!chatText) {
      toast({
        title: "No chat text",
        description: "Please select a WhatsApp chat export file",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await importChat.mutateAsync({
        id: contactId,
        chatText,
      });
      
      toast({
        title: "Chat imported successfully",
        description: "The chat history has been imported and analyzed",
      });
      
      setChatText("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error importing the chat",
        variant: "destructive",
      });
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (file.type !== "text/plain") {
      toast({
        title: "Invalid file type",
        description: "Please select a .txt file",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setChatText(content);
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the file",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Chat</DialogTitle>
          <DialogDescription>
            Select a WhatsApp chat export file (.txt) to import chat history.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8 mb-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm mb-4">
              {chatText ? "File selected. Ready to import!" : "Drag and drop a chat export, or"}
            </p>
            <Button
              onClick={() => document.getElementById("chat-file-input")?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Reading file..." : "Select File"}
            </Button>
            <input
              id="chat-file-input"
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">How to export WhatsApp chats:</h3>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Open a chat in WhatsApp</li>
            <li>Tap on the contact name at the top</li>
            <li>Scroll down and tap "Export Chat"</li>
            <li>Choose "Without Media"</li>
            <li>Select a method to share the file</li>
          </ol>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!chatText || importChat.isPending}
          >
            {importChat.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
