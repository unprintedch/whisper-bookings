
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function ClientForm({ client, agencies, onSave, onCancel, onDelete, reservationsCount = 0, allClients = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    client_number: '',
    agency_id: null,
    agency_contact_id: null,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    receives_email_notifications: true,
    receives_sms_notifications: false,
    notes: ''
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Define a placeholder for Client. In a real application, this would be an actual data service.
  // This mock ensures `Client.list()` exists as per the outline's requirement.
  // It will resolve to the `allClients` prop, treating it as the "current" list from a service.
  // NOTE: In a production application, `Client.list()` would typically be an actual API call
  // from a data service, and `allClients` prop would usually be derived from such a call.
  const Client = {
    list: () => Promise.resolve(allClients),
  };

  // Helper function for email validation
  const isValidEmail = (email) => {
    // Basic regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const generateNextClientNumber = useCallback((agencyId, clientsList) => {
    let agencyCode = 'XXX'; // Default code for no agency
    
    if (agencyId) {
      const agency = agencies.find(a => a.id === agencyId);
      if (agency && agency.code) {
        agencyCode = agency.code;
      }
    }
    
    // Find the highest numeric part across ALL clients (not just this agency)
    let maxNum = 0;
    clientsList.forEach(c => {
      if (c.client_number) {
        const match = c.client_number.match(/^(\d{4})/);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    });

    const nextNum = (maxNum + 1).toString().padStart(4, '0');
    return `${nextNum}${agencyCode}`;
  }, [agencies]); // Only agencies is a dependency as clientsList is passed dynamically

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        client_number: client.client_number || '',
        agency_id: client.agency_id || null,
        agency_contact_id: client.agency_contact_id || null,
        contact_name: client.contact_name || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        receives_email_notifications: client.receives_email_notifications ?? true,
        receives_sms_notifications: client.receives_sms_notifications ?? false,
        notes: client.notes || ''
      });
    } else {
      // Reset for new client
      setFormData({
        name: '',
        client_number: '',
        agency_id: null,
        agency_contact_id: null,
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        receives_email_notifications: true,
        receives_sms_notifications: false,
        notes: ''
      });
    }
    // Clear email error when client changes
    setEmailError('');
  }, [client]);

  const handleChange = (field, value) => {
    // The Select component will pass "null-string" for our null value item
    const finalValue = value === "null-string" ? null : value;

    setFormData(prev => {
      let newData = { ...prev, [field]: finalValue };

      if (field === 'agency_id') {
        newData.agency_contact_id = null; // Reset specific contact when agency changes
        // Fetch all clients to generate the next unique client number
        Client.list().then(allClientsData => {
          const nextNumber = generateNextClientNumber(finalValue, allClientsData);
          setFormData(current => ({ ...current, client_number: nextNumber }));
        });
      } else if (field === 'contact_email') {
          if (finalValue && !isValidEmail(finalValue)) {
              setEmailError('Please enter a valid email address.');
          } else {
              setEmailError(''); // Clear error if email is valid or empty
          }
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Perform email validation on submit
    if (formData.contact_email && !isValidEmail(formData.contact_email)) {
      setEmailError('Please enter a valid email address.');
      return; // Prevent form submission
    }

    // Validate client number format and uniqueness
    if (formData.client_number) {
      const numericMatch = formData.client_number.match(/^(\d{4})/);
      if (!numericMatch) {
        alert('Client number must start with 4 digits (e.g., 0001ABC)');
        return;
      }
      
      const numericPart = numericMatch[1];
      const allClientsData = await Client.list(); // Fetch latest client list for validation
      const isDuplicate = allClientsData.some(c => {
        // Skip current client's own number when editing
        if (client && c.id === client.id) return false; 
        if (!c.client_number) return false;
        const otherNumericMatch = c.client_number.match(/^(\d{4})/);
        return otherNumericMatch && otherNumericMatch[1] === numericPart;
      });

      if (isDuplicate) {
        alert(`Error: The numeric part "${numericPart}" is already used by another client. Please choose a different number or let it auto-generate.`);
        return;
      }
    }

    onSave(formData);
  };

  const handleDeleteConfirm = () => {
    if (client && onDelete) {
      onDelete(client.id);
    }
    setIsDeleteDialogOpen(false);
  };

  const selectedAgency = formData.agency_id ? agencies.find(a => a.id === formData.agency_id) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {/* Client & Agency Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name *</Label>
            <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_number">Client Number</Label>
            <Input 
              id="client_number" 
              value={formData.client_number} 
              onChange={(e) => handleChange('client_number', e.target.value)} 
              placeholder="e.g. 0001AGY"
              readOnly={!!formData.agency_id && !client} // Added readOnly logic as per original
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="agency_id">Agency</Label>
                <Select value={formData.agency_id || ""} onValueChange={(value) => handleChange('agency_id', value)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={"null-string"}>No Agency</SelectItem>
                    {agencies.map(agency => (
                    <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            {selectedAgency && (
                <div className="space-y-2">
                    <Label htmlFor="agency_contact_id">Agency Contact</Label>
                    <Select value={formData.agency_contact_id || ""} onValueChange={(value) => handleChange('agency_contact_id', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="General Contact / Choose specific" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={"null-string"}>General Contact ({selectedAgency.email || 'N/A'})</SelectItem>
                            {selectedAgency.contacts && selectedAgency.contacts.map((contact, index) => (
                                <SelectItem key={index} value={index.toString()}>{contact.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
      </div>
      
      {/* Direct Contact Info */}
      <div className="space-y-4">
         <h3 className="text-lg font-medium text-slate-800">Direct Contact (Optional)</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" value={formData.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input 
                id="contact_email" 
                type="email" 
                value={formData.contact_email} 
                onChange={(e) => handleChange('contact_email', e.target.value)} 
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => handleChange('contact_phone', e.target.value)} />
            </div>
         </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800">Notifications</h3>
        <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="receives_email_notifications"
                    checked={formData.receives_email_notifications}
                    onCheckedChange={(checked) => handleChange('receives_email_notifications', checked)}
                />
                <Label htmlFor="receives_email_notifications">Receives Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="receives_sms_notifications"
                    checked={formData.receives_sms_notifications}
                    onCheckedChange={(checked) => handleChange('receives_sms_notifications', checked)}
                />
                <Label htmlFor="receives_sms_notifications">Receives SMS Notifications</Label>
            </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any specific details about this client..."/>
      </div>
      
      {/* Actions */}
      <div className="flex justify-between items-center gap-2 pt-4 border-t">
        <div>
          {client && onDelete && (
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                     <Button type="button" variant="destructive" disabled={reservationsCount > 0} onClick={() => reservationsCount === 0 && setIsDeleteDialogOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Client
                    </Button>
                  </span>
                </TooltipTrigger>
                {reservationsCount > 0 && (
                  <TooltipContent>
                    <p>Cannot delete client with reservations</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Client</Button>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the client "{client?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Yes, delete client
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
