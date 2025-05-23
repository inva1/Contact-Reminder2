import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAddContact } from "@/hooks/use-contact";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddContactModal({
  open,
  onOpenChange,
}: AddContactModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationshipType, setRelationshipType] = useState("friend");
  const [interests, setInterests] = useState("");
  
  const { toast } = useToast();
  const addContact = useAddContact();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone) {
      toast({
        title: "Required fields missing",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addContact.mutateAsync({
        name,
        phone,
        relationship_type: relationshipType,
        interests: interests ? JSON.stringify(interests.split(",").map(i => i.trim())) : null,
        reminder_frequency: 14, // Default
      });
      
      toast({
        title: "Contact added",
        description: "The contact has been added successfully",
      });
      
      // Reset form
      setName("");
      setPhone("");
      setRelationshipType("friend");
      setInterests("");
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to add contact",
        description: "There was an error adding the contact",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to keep in touch with
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select 
                value={relationshipType} 
                onValueChange={setRelationshipType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="colleague">Colleague</SelectItem>
                  <SelectItem value="acquaintance">Acquaintance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="hiking, movies, cooking"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={addContact.isPending}
            >
              {addContact.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
