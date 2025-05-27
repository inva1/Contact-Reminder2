import { useEffect, useMemo } from "react"; // Added useMemo
import { useForm } from "react-hook-form";
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
import { format, parseISO } from "date-fns"; // Added parseISO
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAddContact, useUpdateContact } from "@/hooks/use-contact"; // Added useUpdateContact
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertContactSchema, type Contact } from "@shared/schema"; // Import base schema and Contact type

interface ContactModalProps { // Renamed for clarity
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactToEdit?: Contact | null; // Added contactToEdit prop
}

// Client-side schema for the form
const contactFormSchema = insertContactSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  interests: z.string().optional(), // Input as comma-separated string
  reminder_frequency: z.coerce.number().min(1, "Must be at least 1 day").optional().default(14),
  priority_level: z.coerce.number().min(1).max(5).optional().default(3),
  notes: z.string().optional(),
  last_contact_date: z.date().optional().nullable(), // Allow null
  is_favorite: z.boolean().optional().default(false),
  relationship_type: z.string().optional().default("friend"),
}).omit({ user_id: true, id: true }); // user_id and id are not set by the form directly

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactModal({ // Renamed
  open,
  onOpenChange,
  contactToEdit,
}: ContactModalProps) {
  const { toast } = useToast();
  const addContact = useAddContact();
  const updateContact = useUpdateContact(); // Hook for updating

  const isEditMode = !!contactToEdit;

  const defaultValues = useMemo(() => ({
    name: contactToEdit?.name || "",
    phone: contactToEdit?.phone || "",
    interests: contactToEdit?.interests ? JSON.parse(contactToEdit.interests).join(", ") : "",
    relationship_type: contactToEdit?.relationship_type || "friend",
    reminder_frequency: contactToEdit?.reminder_frequency || 14,
    priority_level: contactToEdit?.priority_level || 3,
    is_favorite: contactToEdit?.is_favorite || false,
    notes: contactToEdit?.notes || "",
    last_contact_date: contactToEdit?.last_contact_date ? parseISO(contactToEdit.last_contact_date as unknown as string) : undefined,
  }), [contactToEdit]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });
  
  useEffect(() => {
    if (open) {
      form.reset(defaultValues); // Reset form with default or contactToEdit values
    }
  }, [open, form, defaultValues, contactToEdit]);

  const onSubmit = async (data: ContactFormValues) => {
    const submissionData: any = {
      ...data,
      interests: data.interests ? JSON.stringify(data.interests.split(",").map(i => i.trim())) : null,
      reminder_frequency: Number(data.reminder_frequency),
      priority_level: Number(data.priority_level),
      last_contact_date: data.last_contact_date ? data.last_contact_date.toISOString() : null,
    };

    try {
      if (isEditMode && contactToEdit) {
        await updateContact.mutateAsync({ id: contactToEdit.id, ...submissionData });
        toast({
          title: "Contact updated",
          description: "The contact has been updated successfully",
        });
      } else {
        await addContact.mutateAsync(submissionData);
        toast({
          title: "Contact added",
          description: "The contact has been added successfully",
        });
      }
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
      if (!isOpen) form.reset(defaultValues); // Ensure form resets if closed via 'x' or overlay click
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
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="John Doe" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            
            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...form.register("phone")} placeholder="+1 (555) 123-4567" />
              {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
            </div>

            {/* Relationship Type */}
            <div className="space-y-1">
              <Label htmlFor="relationship_type">Relationship</Label>
              <Controller
                control={form.control}
                name="relationship_type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="relationship_type">
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
              {form.formState.errors.relationship_type && <p className="text-xs text-destructive">{form.formState.errors.relationship_type.message}</p>}
            </div>

            {/* Interests */}
            <div className="space-y-1">
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input id="interests" {...form.register("interests")} placeholder="hiking, movies, cooking" />
              {form.formState.errors.interests && <p className="text-xs text-destructive">{form.formState.errors.interests.message}</p>}
            </div>

            {/* Last Contact Date */}
            <div className="space-y-1">
              <Label htmlFor="last_contact_date">Last Contact Date</Label>
              <Controller
                control={form.control}
                name="last_contact_date"
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
              {form.formState.errors.last_contact_date && <p className="text-xs text-destructive">{form.formState.errors.last_contact_date.message}</p>}
            </div>

            {/* Reminder Frequency */}
            <div className="space-y-1">
              <Label htmlFor="reminder_frequency">Reminder Frequency (days)</Label>
              <Input id="reminder_frequency" type="number" {...form.register("reminder_frequency")} placeholder="e.g., 14" />
              {form.formState.errors.reminder_frequency && <p className="text-xs text-destructive">{form.formState.errors.reminder_frequency.message}</p>}
            </div>

            {/* Priority Level */}
            <div className="space-y-1">
              <Label htmlFor="priority_level">Priority Level (1-5)</Label>
              <Controller
                  control={form.control}
                  name="priority_level"
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                      <SelectTrigger id="priority_level">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(level => <SelectItem key={level} value={String(level)}>{level}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              {form.formState.errors.priority_level && <p className="text-xs text-destructive">{form.formState.errors.priority_level.message}</p>}
            </div>
            
            {/* Is Favorite */}
            <div className="flex items-center space-x-2 pt-2">
               <Controller
                control={form.control}
                name="is_favorite"
                render={({ field }) => (
                  <Switch id="is_favorite" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="is_favorite" className="cursor-pointer">Mark as Favorite</Label>
            </div>
             {form.formState.errors.is_favorite && <p className="text-xs text-destructive mt-1">{form.formState.errors.is_favorite.message}</p>}


            {/* Notes */}
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
