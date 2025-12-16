import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function GroupForm({ group, agencies, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    agency_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        agency_id: group.agency_id || '',
        contact_name: group.contact_name || '',
        contact_email: group.contact_email || '',
        contact_phone: group.contact_phone || '',
        notes: group.notes || ''
      });
    } else {
      // Reset for new group
      setFormData({
        name: '',
        agency_id: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: ''
      });
    }
  }, [group]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Group Name *</Label>
          <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agency_id">Agency</Label>
          <Select value={formData.agency_id} onValueChange={(value) => handleChange('agency_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select agency (optional)" />
            </SelectTrigger>
            <SelectContent>
              {agencies.map(agency => (
                <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name</Label>
          <Input id="contact_name" value={formData.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => handleChange('contact_email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => handleChange('contact_phone', e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Group</Button>
      </div>
    </form>
  );
}