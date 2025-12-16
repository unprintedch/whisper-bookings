
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AgencyForm({ agency, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    notes: '',
    contacts: [],
    // New fields for notifications
    sendEmailNotifications: false,
    sendSmsNotifications: false,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState({}); // State for validation errors

  useEffect(() => {
    if (agency) {
      setFormData({
        name: agency.name || '',
        code: agency.code || '',
        email: agency.email || '',
        phone: agency.phone || '',
        notes: agency.notes || '',
        contacts: agency.contacts || [],
        // Populate new fields from agency if available, default to false
        sendEmailNotifications: agency.sendEmailNotifications ?? false,
        sendSmsNotifications: agency.sendSmsNotifications ?? false,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        email: '',
        phone: '',
        notes: '',
        contacts: [],
        sendEmailNotifications: false,
        sendSmsNotifications: false,
      });
    }
  }, [agency]);

  const generateCodeFromName = (name) => {
    if (!name) return '';
    const words = name.replace(/[^a-zA-Z\s]/g, "").toUpperCase().split(' ').filter(Boolean);
    if (words.length === 0) return '';
    if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join('');
    if (words.length === 2) return (words[0][0] + words[1].substring(0, 2));
    if (words.length === 1) return words[0].substring(0, 3);
    return '';
  };

  const isValidEmail = (email) => {
    // Allows empty email if it's not a required field, otherwise validates
    if (!email) return true;
    // Basic email regex for validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNameChange = (name) => {
    const newCode = generateCodeFromName(name);
    setFormData(prev => ({ ...prev, name, code: newCode }));
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', email: '', phone: '' }]
    }));
  };

  const removeContact = (index) => {
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate general email
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format.';
    }

    // Validate contact emails
    formData.contacts.forEach((contact, index) => {
      if (contact.email && !isValidEmail(contact.email)) {
        newErrors[`contact_email_${index}`] = 'Invalid email format.';
      }
    });

    setErrors(newErrors); // Update errors state

    if (Object.keys(newErrors).length > 0) {
      // If there are errors, prevent form submission
      return;
    }

    onSave(formData);
  };

  const handleDeleteConfirm = () => {
    if (agency && agency.id) {
      onDelete(agency.id);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {/* General Information */}
      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-4">General Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Agency Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Agency Code</Label>
              <Input 
                id="code" 
                value={formData.code} 
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())} 
                placeholder="Auto or custom"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">General Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => handleChange('email', e.target.value)} 
                className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} // Add error styling
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>} {/* Display error message */}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">General Phone</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-4 mt-8">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Input 
              id="sendEmailNotifications" 
              type="checkbox" 
              checked={formData.sendEmailNotifications} 
              onChange={(e) => handleChange('sendEmailNotifications', e.target.checked)} 
              className="w-4 h-4" 
            />
            <Label htmlFor="sendEmailNotifications">Send Email Notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Input 
              id="sendSmsNotifications" 
              type="checkbox" 
              checked={formData.sendSmsNotifications} 
              onChange={(e) => handleChange('sendSmsNotifications', e.target.checked)} 
              className="w-4 h-4" 
            />
            <Label htmlFor="sendSmsNotifications">Send SMS Notifications</Label>
          </div>
        </div>
      </div>

      {/* Specific Contacts */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-8">
          <h3 className="text-lg font-medium text-slate-800">Specific Contacts</h3>
          <Button type="button" variant="outline" size="sm" onClick={addContact}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
        <div className="space-y-4">
          {formData.contacts.map((contact, index) => (
            <div key={index} className="p-4 border rounded-lg bg-slate-50 relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`contact_name_${index}`}>Contact Name *</Label>
                  <Input id={`contact_name_${index}`} value={contact.name} onChange={(e) => handleContactChange(index, 'name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`contact_email_${index}`}>Contact Email</Label>
                  <Input 
                    id={`contact_email_${index}`} 
                    type="email" 
                    value={contact.email} 
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)} 
                    className={errors[`contact_email_${index}`] ? 'border-red-500 focus-visible:ring-red-500' : ''} // Add error styling
                  />
                  {errors[`contact_email_${index}`] && <p className="text-sm text-red-500 mt-1">{errors[`contact_email_${index}`]}</p>} {/* Display error message */}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`contact_phone_${index}`}>Contact Phone</Label>
                  <Input id={`contact_phone_${index}`} value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => removeContact(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {formData.contacts.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No specific contacts added.</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 pt-4 border-t">
        <div>
          {agency && onDelete && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Agency
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this agency?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the agency "{agency.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                    Yes, delete agency
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Agency</Button>
        </div>
      </div>
    </form>
  );
}
