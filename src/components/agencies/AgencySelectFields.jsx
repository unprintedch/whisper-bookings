import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AgencyCombobox from "@/components/agencies/AgencyCombobox";

/**
 * Agency + agency contact selection, with an inline shortcut to create a new agency.
 * Controlled: the parent keeps agencyId / agencyContactId and receives every change
 * through onChange({ agency_id, agency_contact_id }).
 */
export default function AgencySelectFields({
  agencyId,
  agencyContactId,
  agencies = [],
  onChange,
  onAgencyCreated,
  showAgencyLabel = true,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: "", email: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedAgency = agencies.find((a) => a.id === agencyId);

  const closeCreate = () => {
    setIsCreating(false);
    setNewAgency({ name: "", email: "", phone: "" });
    setError("");
  };

  const handleCreate = async () => {
    if (!newAgency.name.trim()) {
      setError("Agency name is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const created = await base44.entities.Agency.create({
        name: newAgency.name.trim(),
        email: newAgency.email.trim() || undefined,
        phone: newAgency.phone.trim() || undefined,
        is_active: true,
      });
      if (onAgencyCreated) onAgencyCreated(created);
      onChange({ agency_id: created.id, agency_contact_id: null });
      closeCreate();
    } catch (err) {
      console.error("Error creating agency:", err);
      setError("Could not save this agency. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {showAgencyLabel && <Label>Agency</Label>}
        <div className="flex items-center gap-2">
          <AgencyCombobox
            agencies={agencies}
            value={agencyId}
            onSelect={(id) => onChange({
              agency_id: id,
              agency_contact_id: null,
            })}
          />
          {!isCreating && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shadow-sm flex-shrink-0"
              onClick={() => { setIsCreating(true); setError(""); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">New agency</p>
          <Input
            className="h-9"
            placeholder="Agency name *"
            value={newAgency.name}
            onChange={(e) => setNewAgency((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            className="h-9"
            type="email"
            placeholder="Email"
            value={newAgency.email}
            onChange={(e) => setNewAgency((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            className="h-9"
            placeholder="Phone"
            value={newAgency.phone}
            onChange={(e) => setNewAgency((p) => ({ ...p, phone: e.target.value }))}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeCreate} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-800"
              onClick={handleCreate}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Create agency"}
            </Button>
          </div>
        </div>
      )}

      {selectedAgency && (
        <div className="space-y-2">
          <Label>Agency Contact</Label>
          <Select
            value={agencyContactId || ""}
            onValueChange={(v) => onChange({
              agency_id: agencyId,
              agency_contact_id: v === "null-string" ? null : v,
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="General Contact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null-string">General Contact ({selectedAgency.email || 'N/A'})</SelectItem>
              {selectedAgency.contacts?.map((contact, index) => (
                <SelectItem key={index} value={String(index)}>{contact.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}