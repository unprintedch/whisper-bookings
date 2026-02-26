import React, { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import { X, ChevronDown, ChevronUp, Users, Edit, Mail, Phone, User, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Client } from "@/entities/all";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ClientForm from "@/components/clients/ClientForm";

export default function MultiReservationModal({ isOpen, onClose, mergedRanges, rooms, clients, sites, allBedConfigs, agencies = [], onSuccess }) {
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("REQUEST");
  const [groupPax, setGroupPax] = useState("");
  const [perRoomDetails, setPerRoomDetails] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [clientSearch, setClientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientEditOpen, setIsClientEditOpen] = useState(false);
  const [isAgencyEditOpen, setIsAgencyEditOpen] = useState(false);
  const [editingClientNumber, setEditingClientNumber] = useState("");
  const [isEditingClientNumber, setIsEditingClientNumber] = useState(false);
  const [localClients, setLocalClients] = useState(clients);
  const searchRef = useRef(null);

  const selectedClient = localClients.find(c => c.id === clientId) || clients.find(c => c.id === clientId);
  const agencyForSelectedClient = selectedClient?.agency_id ? agencies.find(a => a.id === selectedClient.agency_id) : null;

  let agencyContactDisplay = null;
  if (agencyForSelectedClient && selectedClient) {
    const contactId = selectedClient.agency_contact_id;
    if (contactId && agencyForSelectedClient.contacts?.[parseInt(contactId, 10)]) {
      const contact = agencyForSelectedClient.contacts[parseInt(contactId, 10)];
      agencyContactDisplay = { ...contact, type: 'Specific Contact' };
    } else {
      agencyContactDisplay = {
        email: agencyForSelectedClient.email,
        phone: agencyForSelectedClient.phone,
        type: 'General Contact'
      };
    }
  }

  const filteredClients = clientSearch.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : [];

  const handleSelectClient = (c) => {
    setClientId(c.id);
    setClientSearch(c.name);
    setEditingClientNumber(c?.client_number || "");
    setIsEditingClientNumber(false);
    setShowSuggestions(false);
  };

  const handleClearClient = () => {
    setClientId("");
    setClientSearch("");
    setEditingClientNumber("");
    setIsEditingClientNumber(false);
  };

  const handleSaveClientNumber = async () => {
    if (!selectedClient) return;
    const updated = await base44.entities.Client.update(selectedClient.id, { client_number: editingClientNumber });
    setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    setIsEditingClientNumber(false);
  };

  const handleSaveClientInModal = async (clientData) => {
    if (!selectedClient) return;
    const updated = await base44.entities.Client.update(selectedClient.id, clientData);
    setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    setIsClientEditOpen(false);
  };

  const handleSaveAgencyInModal = async (clientWithNewAgency) => {
    if (!selectedClient) return;
    const updated = await base44.entities.Client.update(selectedClient.id, clientWithNewAgency);
    setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    setIsAgencyEditOpen(false);
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return roomId;
    const site = sites.find(s => s.id === room.site_id);
    return `${site?.name || ''} – ${room.number ? room.number + ' – ' : ''}${room.name}`;
  };

  const getBedConfigsForRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room?.bed_configuration_ids?.length) return [];
    return allBedConfigs.filter(bc => room.bed_configuration_ids.includes(bc.id));
  };

  const toggleRow = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateRoomDetail = (key, field, value, bedConfigs) => {
    setPerRoomDetails(prev => {
      const current = prev[key] || {};
      let newDetail = { ...current, [field]: value };

      // Apply occupancy cap if a bed config is selected
      if (['adults_count', 'children_count', 'infants_count'].includes(field)) {
        const selectedBedConfig = bedConfigs?.find(bc => bc.name === current.bed_configuration);
        const maxOccupancy = selectedBedConfig?.max_occupancy;

        if (maxOccupancy) {
          const newValue = parseInt(value, 10) || 0;
          let adults = field === 'adults_count' ? newValue : (parseInt(current.adults_count, 10) || 0);
          let children = field === 'children_count' ? newValue : (parseInt(current.children_count, 10) || 0);
          let infants = field === 'infants_count' ? newValue : (parseInt(current.infants_count, 10) || 0);
          const total = adults + children + infants;

          if (total > maxOccupancy) {
            const excess = total - maxOccupancy;
            if (field === 'adults_count') {
              if (children >= excess) { children -= excess; }
              else { infants = Math.max(0, infants - (excess - children)); children = 0; }
            } else if (field === 'children_count') {
              if (adults >= excess) { adults -= excess; }
              else { infants = Math.max(0, infants - (excess - adults)); adults = 0; }
            } else {
              if (adults >= excess) { adults -= excess; }
              else { children = Math.max(0, children - (excess - adults)); adults = 0; }
            }
          }

          newDetail = { ...current, adults_count: adults, children_count: children, infants_count: infants };
        }
      }

      // Reset occupancy when bed config changes
      if (field === 'bed_configuration') {
        const selectedBedConfig = bedConfigs?.find(bc => bc.name === value);
        if (selectedBedConfig) {
          newDetail = { ...current, bed_configuration: value, adults_count: selectedBedConfig.max_occupancy, children_count: 0, infants_count: 0 };
        }
      }

      return { ...prev, [key]: newDetail };
    });
  };

  // Group ranges by date range string for visual grouping
  const groupedByDate = useMemo(() => {
    const groups = {};
    mergedRanges.forEach(range => {
      const dateKey = `${format(range.checkin, 'yyyy-MM-dd')}_${format(range.checkout, 'yyyy-MM-dd')}`;
      if (!groups[dateKey]) groups[dateKey] = { checkin: range.checkin, checkout: range.checkout, ranges: [] };
      groups[dateKey].ranges.push(range);
    });
    return Object.entries(groups);
  }, [mergedRanges]);

  const handleSubmit = async () => {
    if (!clientId) return;
    setIsSubmitting(true);

    const reservationsToCreate = mergedRanges.map(range => {
      const key = `${range.roomId}_${format(range.checkin, 'yyyy-MM-dd')}`;
      const details = perRoomDetails[key] || {};
      return {
        client_id: clientId,
        room_id: range.roomId,
        date_checkin: format(range.checkin, 'yyyy-MM-dd'),
        date_checkout: format(range.checkout, 'yyyy-MM-dd'),
        status,
        bed_configuration: details.bed_configuration || undefined,
        adults_count: details.adults_count ? parseInt(details.adults_count) : 0,
        children_count: details.children_count ? parseInt(details.children_count) : 0,
        infants_count: details.infants_count ? parseInt(details.infants_count) : 0,
        comment: groupPax ? `Group: ${groupPax} pax` : undefined,
      };
    });

    await base44.entities.Reservation.bulkCreate(reservationsToCreate);
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-800">New Group Reservation</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Client selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Client <span className="text-red-500">*</span></Label>
            <div className="flex gap-3 items-start">
              {/* Autocomplete input */}
              <div className="flex-1 relative" ref={searchRef}>
                <Input
                  placeholder="Search or create a client..."
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setClientId("");
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="h-10"
                />
                {showSuggestions && filteredClients.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <div
                        key={c.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-yellow-50 flex items-center justify-between"
                        onMouseDown={() => handleSelectClient(c)}
                      >
                        <span className="font-medium text-slate-800">{c.name}</span>
                        {c.client_number && <span className="text-xs text-slate-400">{c.client_number}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Client number field - only when a client is selected */}
              {selectedClient && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Input
                    value={editingClientNumber}
                    onChange={e => setEditingClientNumber(e.target.value)}
                    placeholder="Client #"
                    className="w-32 h-10"
                    readOnly={!isEditingClientNumber}
                  />
                  {!isEditingClientNumber ? (
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setIsEditingClientNumber(true)}>
                      <Lock className="w-4 h-4" />
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => { setEditingClientNumber(selectedClient?.client_number || ""); setIsEditingClientNumber(false); }}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" className="h-10 w-10 bg-yellow-700 hover:bg-yellow-800" onClick={handleSaveClientNumber}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Agency + Client Contact block (like BookingForm) */}
          {selectedClient && (
            <div className="space-y-4 p-4 px-6 border rounded-lg bg-slate-50/70 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agency Details - Now First */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-slate-800">Agency</h4>
                    <Button type="button" variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setIsAgencyEditOpen(true)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                  {agencyForSelectedClient ? (
                    <div className="space-y-2 text-slate-700">
                      <p className="font-semibold">{agencyForSelectedClient.name}</p>
                      {agencyContactDisplay && (
                        <div className="space-y-1 pt-1">
                          {agencyContactDisplay.type === 'Specific Contact' && agencyContactDisplay.name && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{agencyContactDisplay.name}</span>
                            </div>
                          )}
                          {agencyContactDisplay.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-500" />
                              <a href={`mailto:${agencyContactDisplay.email}`} className="text-yellow-700 hover:underline">{agencyContactDisplay.email}</a>
                            </div>
                          )}
                          {agencyContactDisplay.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-500" />
                              <span>{agencyContactDisplay.phone}</span>
                            </div>
                          )}
                          {!agencyContactDisplay.name && !agencyContactDisplay.email && !agencyContactDisplay.phone && (
                            <p className="text-slate-500 italic text-xs">No contact info for this agency.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-2">No agency associated.</p>
                  )}
                </div>

                {/* Client Contact Details - Now Second with Edit Button */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-slate-800">Client Contact</h4>
                    <Button type="button" variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setIsClientEditOpen(true)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                  {selectedClient.contact_name || selectedClient.contact_email || selectedClient.contact_phone ? (
                    <div className="space-y-2 text-slate-700">
                      {selectedClient.contact_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span>{selectedClient.contact_name}</span>
                        </div>
                      )}
                      {selectedClient.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <a href={`mailto:${selectedClient.contact_email}`} className="text-yellow-700 hover:underline">{selectedClient.contact_email}</a>
                        </div>
                      )}
                      {selectedClient.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          <span>{selectedClient.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-2">No direct contact provided.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status + Group Pax */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["REQUEST","OPTION","RESERVE","CONFIRME","PAYE"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Group Pax (total)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="ex: 12"
                value={groupPax}
                onChange={e => setGroupPax(e.target.value)}
              />
            </div>
          </div>

          {/* Rooms grouped by date */}
          <div className="space-y-4">
            {groupedByDate.map(([dateKey, group]) => (
              <div key={dateKey} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <span className="text-sm font-semibold text-slate-700">
                    {format(group.checkin, 'd MMM yyyy')} → {format(group.checkout, 'd MMM yyyy')}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({group.ranges.length} room{group.ranges.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.ranges.map(range => {
                    const rowKey = `${range.roomId}_${format(range.checkin, 'yyyy-MM-dd')}`;
                    const isExpanded = expandedRows[rowKey];
                    const bedConfigs = getBedConfigsForRoom(range.roomId);
                    const details = perRoomDetails[rowKey] || {};

                    return (
                      <div key={rowKey}>
                        <div
                          className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleRow(rowKey)}
                        >
                          <span className="text-sm text-slate-700">{getRoomName(range.roomId)}</span>
                          <div className="flex items-center gap-2">
                            {(details.adults_count || details.bed_configuration) && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {[details.adults_count ? `${details.adults_count}A` : null, details.bed_configuration].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 bg-slate-50/50 space-y-2">
                            {bedConfigs.length > 0 && (
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Bed configuration</Label>
                                <Select
                                  value={details.bed_configuration || ""}
                                  onValueChange={v => updateRoomDetail(rowKey, 'bed_configuration', v, bedConfigs)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bedConfigs.map(bc => (
                                      <SelectItem key={bc.id} value={bc.name}>{bc.name} ({bc.max_occupancy} max)</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {(() => {
                              const selectedBedConfig = bedConfigs.find(bc => bc.name === details.bed_configuration);
                              const maxOcc = selectedBedConfig?.max_occupancy;
                              const currentOcc = (parseInt(details.adults_count, 10) || 0) + (parseInt(details.children_count, 10) || 0) + (parseInt(details.infants_count, 10) || 0);
                              return (
                                <div className="flex gap-2 items-end">
                                  <div className="space-y-1 flex-1">
                                    <Label className="text-xs text-slate-600">Adults</Label>
                                    <Input className="h-7 text-xs" type="number" min="0" max={maxOcc || undefined} value={details.adults_count ?? ""} onChange={e => updateRoomDetail(rowKey, 'adults_count', e.target.value, bedConfigs)} />
                                  </div>
                                  <div className="space-y-1 flex-1">
                                    <Label className="text-xs text-slate-600">Kids</Label>
                                    <Input className="h-7 text-xs" type="number" min="0" max={maxOcc || undefined} value={details.children_count ?? ""} onChange={e => updateRoomDetail(rowKey, 'children_count', e.target.value, bedConfigs)} />
                                  </div>
                                  <div className="space-y-1 flex-1">
                                    <Label className="text-xs text-slate-600">Baby</Label>
                                    <Input className="h-7 text-xs" type="number" min="0" max={maxOcc || undefined} value={details.infants_count ?? ""} onChange={e => updateRoomDetail(rowKey, 'infants_count', e.target.value, bedConfigs)} />
                                  </div>
                                  {maxOcc && (
                                    <div className="flex-shrink-0">
                                      <span className={`text-xs px-2 py-1 rounded font-medium ${currentOcc > maxOcc ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {currentOcc}/{maxOcc}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-yellow-700 hover:bg-yellow-800"
            onClick={handleSubmit}
            disabled={!clientId || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : `Create ${mergedRanges.length} reservation${mergedRanges.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>

      {/* Edit Client Modal */}
      <Dialog open={isClientEditOpen} onOpenChange={setIsClientEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update the details for "{selectedClient?.name}".</DialogDescription>
          </DialogHeader>
          <ClientForm
            client={selectedClient}
            agencies={agencies}
            onSave={handleSaveClientInModal}
            onCancel={() => setIsClientEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Agency Modal */}
      <Dialog open={isAgencyEditOpen} onOpenChange={setIsAgencyEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client's Agency</DialogTitle>
            <DialogDescription>Change the agency associated with "{selectedClient?.name}".</DialogDescription>
          </DialogHeader>
          <AgencyEditForm
            client={selectedClient}
            agencies={agencies}
            onSave={handleSaveAgencyInModal}
            onCancel={() => setIsAgencyEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline agency edit form (copied from BookingForm pattern)
function AgencyEditForm({ client, agencies, onSave, onCancel }) {
  const [agencyId, setAgencyId] = useState(client?.agency_id || null);
  const [agencyContactId, setAgencyContactId] = useState(client?.agency_contact_id || null);
  const selectedAgency = agencies.find(a => a.id === agencyId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Agency</Label>
        <Select value={agencyId || ""} onValueChange={v => { setAgencyId(v === "null-string" ? null : v); setAgencyContactId(null); }}>
          <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="null-string">No Agency</SelectItem>
            {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {selectedAgency && (
        <div className="space-y-2">
          <Label>Agency Contact</Label>
          <Select value={agencyContactId || ""} onValueChange={v => setAgencyContactId(v === "null-string" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="General Contact" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="null-string">General Contact ({selectedAgency.email || 'N/A'})</SelectItem>
              {selectedAgency.contacts?.map((c, i) => <SelectItem key={i} value={String(i)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ ...client, agency_id: agencyId, agency_contact_id: agencyContactId })}>Save Changes</Button>
      </div>
    </div>
  );
}