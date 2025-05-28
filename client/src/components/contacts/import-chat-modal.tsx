import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useImportChat } from "@/hooks/use-contact";
import { Upload } from "lucide-react";
import { type Suggestion } from "@shared/schema"; // Import Suggestion type for analysis result

interface ImportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number | string;
}

// Define a type for the expected structure of the analysis part of the response
interface ImportAnalysisResult {
  source?: "openai" | "fallback";
  error_message?: string;
  // Include other fields from analysis if needed for context, though not strictly for this toast logic
  suggestion?: string; 
}

interface ImportChatResponse {
  success: boolean;
  messagesImported: number;
  suggestion?: string; // The suggestion text itself
  analysis?: ImportAnalysisResult; // The detailed analysis object
}


export default function ImportChatModal({
  open,
  onOpenChange,
  contactId,
}: ImportChatModalProps) {
  const [chatText, setChatText] = useState<string>("");
  const [fileName, setFileName] = useState<string>(""); // To display file name
  const [isUploading, setIsUploading] = useState(false); // For file reading state
  const { toast } = useToast();
  const importChat = useImportChat(); // This is the mutation hook
  
  const processFile = (file: File) => {
    if (file.type !== "text/plain") {
      toast({
        title: "Invalid file type",
        description: "Please select a .txt file",
        variant: "destructive",
      });
      return;
    }
    
    setFileName(file.name);
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
      setFileName("");
    };
    
    reader.readAsText(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };
  
  const handleImport = async () => {
    if (!chatText) {
      toast({
        title: "No chat text",
        description: "Please select or drop a WhatsApp chat export file (.txt)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // importChat.mutateAsync resolves with the backend API response
      const result: ImportChatResponse = await importChat.mutateAsync({
        id: contactId,
        chatText,
      });
      
      let toastTitle = "Chat imported successfully";
      let toastDescription = `Imported ${result.messagesImported} messages.`;

      if (result.analysis?.source === "fallback") {
        toastTitle = "Chat Imported (Default Suggestion)";
        toastDescription += ` ${result.analysis.error_message || "AI features unavailable, using a default suggestion."}`;
      } else if (result.analysis?.source === "openai") {
        toastDescription += " A new AI-powered suggestion is available.";
      } else if (result.suggestion) { // If no analysis.source but suggestion exists
        toastDescription += " A new suggestion is available.";
      }


      toast({
        title: toastTitle,
        description: toastDescription,
      });
      
      setChatText("");
      setFileName("");
      onOpenChange(false); // Close modal on success
    } catch (error) {
      toast({
        title: "Import failed",
        description: (error as Error)?.message || "There was an error importing the chat.",
        variant: "destructive",
      });
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Reset state when dialog is closed externally
  useEffect(() => {
    if (!open) {
      setChatText("");
      setFileName("");
      setIsUploading(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import WhatsApp Chat</DialogTitle>
          <DialogDescription>
            Select or drag & drop a WhatsApp chat export file (.txt).
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 mb-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm mb-2 text-center">
            {fileName ? `File: ${fileName}` : "Drag and drop a chat export, or"}
          </p>
          {chatText && !isUploading && <p className="text-xs text-green-600 mb-2">File content loaded.</p>}
          <Button
            type="button" // Ensure it doesn't submit a form if nested
            onClick={() => document.getElementById("chat-file-input")?.click()}
            disabled={isUploading}
            variant="outline"
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
        
        <div>
          <h3 className="text-sm font-medium mb-2">How to export WhatsApp chats:</h3>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Open a chat in WhatsApp</li>
            <li>Tap on the contact name at the top</li>
            <li>Scroll down and tap "Export Chat"</li>
            <li>Choose "Without Media"</li>
            <li>Save or share the .txt file</li>
          </ol>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!chatText || importChat.isPending || isUploading}
            type="button"
          >
            {importChat.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
