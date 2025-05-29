import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form"; // Added Controller
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAddContact, useUpdateContact } from "@/hooks/use-contact";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Contact, type InsertContact as SchemaInsertContact } from "@shared/schema"; // Use alias for InsertContact

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactToEdit?: Contact | null; 
}

// Client-side schema for the form (camelCase)
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  interests: z.string().optional(), // Input as comma-separated string
  relationshipType: z.string().optional().default("friend"), // camelCase
  reminderFrequency: z.coerce.number().min(1, "Must be at least 1 day").optional().default(14), // camelCase
  priorityLevel: z.coerce.number().min(1).max(5).optional().default(3), // camelCase
  isFavorite: z.boolean().optional().default(false), // camelCase
  notes: z.string().optional(),
  lastContactDate: z.date().optional().nullable(), // camelCase
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// Type for data being submitted to the backend (snake_case)
// Omitting fields not set by this form or handled by backend (like user_id, id, last_message_date)
type ContactSubmissionPayload = Omit<SchemaInsertContact, 'user_id' | 'id' | 'last_message_date'>;

export default function ContactModal({
  open,
  onOpenChange,
  contactToEdit,
}: ContactModalProps) {
  const { toast } = useToast();
  const addContact = useAddContact();
  const updateContact = useUpdateContact();

  const isEditMode = !!contactToEdit;

  const defaultValues = useMemo<ContactFormValues>(() => ({
    name: contactToEdit?.name || "",
    phone: contactToEdit?.phone || "",
    interests: contactToEdit?.interests ? JSON.parse(contactToEdit.interests).join(", ") : "",
    relationshipType: contactToEdit?.relationshipType || "friend", // Use camelCase from Contact type
    reminderFrequency: contactToEdit?.reminderFrequency || 14,   // Use camelCase from Contact type
    priorityLevel: contactToEdit?.priorityLevel || 3,         // Use camelCase from Contact type
    isFavorite: contactToEdit?.isFavorite || false,           // Use camelCase from Contact type
    notes: contactToEdit?.notes || "",
    // contactToEdit.lastContactDate is already a Date object or string, parseISO handles string
    lastContactDate: contactToEdit?.lastContactDate ? (typeof contactToEdit.lastContactDate === 'string' ? parseISO(contactToEdit.lastContactDate) : contactToEdit.lastContactDate) : undefined,
  }), [contactToEdit]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });
  
  useEffect(() => {
    if (open) {
      form.reset(defaultValues); 
    }
  }, [open, form, defaultValues]);

  const onSubmit = async (data: ContactFormValues) => { // data is camelCase
    // Transform data to snake_case for the backend
    const dataToSubmit: ContactSubmissionPayload = {
      name: data.name,
      phone: data.phone,
      interests: data.interests ? JSON.stringify(data.interests.split(",").map(i => i.trim())) : null,
      relationship_type: data.relationshipType, // map from camelCase to snake_case
      reminder_frequency: Number(data.reminderFrequency), // map and ensure number
      priority_level: Number(data.priorityLevel),       // map and ensure number
      is_favorite: data.isFavorite,                   // map
      notes: data.notes,
      last_contact_date: data.lastContactDate ? data.lastContactDate.toISOString() : null, // map and format
    };

    try {
      if (isEditMode && contactToEdit) {
        // updateContact mutation expects {id: number, data: Partial<InsertContact>}
        // where data should be snake_case.
        await updateContact.mutateAsync({ id: contactToEdit.id, data: dataToSubmit });
      } else {
        // addContact mutation expects InsertContact (snake_case)
        await addContact.mutateAsync(dataToSubmit);
      }
      toast({
        title: isEditMode ? "Contact updated" : "Contact added",
        description: `The contact has been ${isEditMode ? 'updated' : 'added'} successfully`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: isEditMode ? "Failed to update contact" : "Failed to add contact",
        description: (error as Error)?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) form.reset(defaultValues); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the details of your contact." : "Add a new contact to keep in touch with. Fill in the details below."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="John Doe" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...form.register("phone")} placeholder="+1 (555) 123-4567" />
              {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="relationshipType">Relationship</Label> {/* Changed htmlFor to camelCase */}
              <Controller
                control={form.control}
                name="relationshipType" /* Changed name to camelCase */
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="relationshipType"> {/* Changed id to camelCase */}
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="acquaintance">Acquaintance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.relationshipType && <p className="text-xs text-destructive">{form.formState.errors.relationshipType.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input id="interests" {...form.register("interests")} placeholder="hiking, movies, cooking" />
              {form.formState.errors.interests && <p className="text-xs text-destructive">{form.formState.errors.interests.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastContactDate">Last Contact Date</Label> {/* Changed htmlFor to camelCase */}
              <Controller
                control={form.control}
                name="lastContactDate" /* Changed name to camelCase */
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.lastContactDate && <p className="text-xs text-destructive">{form.formState.errors.lastContactDate.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reminderFrequency">Reminder Frequency (days)</Label> {/* Changed htmlFor to camelCase */}
              <Input id="reminderFrequency" type="number" {...form.register("reminderFrequency")} placeholder="e.g., 14" /> {/* Changed register name to camelCase */}
              {form.formState.errors.reminderFrequency && <p className="text-xs text-destructive">{form.formState.errors.reminderFrequency.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="priorityLevel">Priority Level (1-5)</Label> {/* Changed htmlFor to camelCase */}
              <Controller
                  control={form.control}
                  name="priorityLevel" /* Changed name to camelCase */
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                      <SelectTrigger id="priorityLevel"> {/* Changed id to camelCase */}
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(level => <SelectItem key={level} value={String(level)}>{level}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              {form.formState.errors.priorityLevel && <p className="text-xs text-destructive">{form.formState.errors.priorityLevel.message}</p>}
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
               <Controller
                control={form.control}
                name="isFavorite" /* Changed name to camelCase */
                render={({ field }) => (
                  <Switch id="isFavorite" checked={field.value} onCheckedChange={field.onChange} /> /* Changed id to camelCase */
                )}
              />
              <Label htmlFor="isFavorite" className="cursor-pointer">Mark as Favorite</Label> {/* Changed htmlFor to camelCase */}
            </div>
             {form.formState.errors.isFavorite && <p className="text-xs text-destructive mt-1">{form.formState.errors.isFavorite.message}</p>}


            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} placeholder="Any important notes about this contact..." />
              {form.formState.errors.notes && <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={addContact.isPending || updateContact.isPending}>
              {isEditMode 
                ? (updateContact.isPending ? "Saving..." : "Save Changes")
                : (addContact.isPending ? "Adding..." : "Add Contact")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
