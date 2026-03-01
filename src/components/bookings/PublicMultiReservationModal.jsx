import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function PublicMultiReservationModal({
  isOpen,
  onClose,
  mergedRanges = [],
  rooms = [],
  sites = [],
  allBedConfigs = [],
  agencies = [],
  onSuccess,
}) {
  // Client identity
  const [clientName, setClientName] = useState('');
  // Agency
  const [agencyId, setAgencyId] = useState('');
  const [agencyContactId, setAgencyContactId] = useState('');
  // Contact details (optional)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  // Comment
  const [comment, setComment] = useState('');
  // Room details
  const [perRoomDetails, setPerRoomDetails] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setClientName('');
      setAgencyId('');
      setAgencyContactId('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setComment('');
      setPerRoomDetails({});
      setExpandedRows({});
      setErrors({});
    }
  }, [isOpen]);

  const selectedAgency = agencies.find(a => a.id === agencyId);

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return roomId;
    const site = sites.find(s => s.id === room.site_id);
    return `${site?.name || ''} – ${room.name}`;
  };

  const getBedConfigsForRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room?.bed_configuration_ids?.length) return allBedConfigs;
    return allBedConfigs.filter(bc => room.bed_configuration_ids.includes(bc.id));
  };

  const toggleRow = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateRoomDetail = (key, field, value, bedConfigs) => {
    setPerRoomDetails(prev => {
      const current = prev[key] || {};
      let newDetail = { ...current, [field]: value };

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

      if (field === 'bed_configuration') {
        const selectedBedConfig = bedConfigs?.find(bc => bc.name === value);
        if (selectedBedConfig) {
          newDetail = { ...current, bed_configuration: value, adults_count: selectedBedConfig.max_occupancy, children_count: 0, infants_count: 0 };
        }
      }

      return { ...prev, [key]: newDetail };
    });
  };

  const groupedByDate = useMemo(() => {
    const groups = {};
    mergedRanges.forEach(range => {
      const checkinStr = typeof range.checkin === 'string' ? range.checkin : format(range.checkin, 'yyyy-MM-dd');
      const checkoutStr = typeof range.checkout === 'string' ? range.checkout : format(range.checkout, 'yyyy-MM-dd');
      const dateKey = `${checkinStr}_${checkoutStr}`;
      if (!groups[dateKey]) groups[dateKey] = { checkin: range.checkin, checkout: range.checkout, ranges: [] };
      groups[dateKey].ranges.push(range);
    });
    return Object.entries(groups);
  }, [mergedRanges]);

  const handleSubmit = async () => {
    const newErrors = {};
    if (!clientName.trim()) newErrors.clientName = 'Required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = urlParams.get('base44_data_env') === 'dev';
      const dbClient = isTestMode ? base44.asDataEnv('dev') : base44;

      const newClient = await dbClient.entities.Client.create({
        name: clientName,
        agency_id: agencyId || undefined,
        agency_contact_id: agencyContactId !== '' ? agencyContactId : undefined,
        contact_name: contactName || undefined,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
      });

      for (const range of mergedRanges) {
        const checkinStr = typeof range.checkin === 'string' ? range.checkin : format(range.checkin, 'yyyy-MM-dd');
        const key = `${range.roomId}_${checkinStr}`;
        const details = perRoomDetails[key] || {};
        await dbClient.entities.Reservation.create({
          client_id: newClient.id,
          room_id: range.roomId,
          date_checkin: checkinStr,
          date_checkout: typeof range.checkout === 'string' ? range.checkout : format(range.checkout, 'yyyy-MM-dd'),
          bed_configuration: details.bed_configuration || '',
          adults_count: parseInt(details.adults_count, 10) || 0,
          children_count: parseInt(details.children_count, 10) || 0,
          infants_count: parseInt(details.infants_count, 10) || 0,
          comment: comment || '',
          status: 'REQUEST',
        });
      }

      onSuccess({ clientName, count: mergedRanges.length });
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* 1. Client name */}
          <div className="space-y-1">
            <Label className={errors.clientName ? 'text-red-600' : ''}>
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={clientName}
              onChange={e => { setClientName(e.target.value); setErrors(prev => ({ ...prev, clientName: undefined })); }}
              placeholder="Name or company"
              className={errors.clientName ? 'border-red-300' : ''}
            />
            {errors.clientName && <p className="text-xs text-red-600">{errors.clientName}</p>}
          </div>

          {/* 2. Agency (optional) */}
          {agencies.length > 0 && (
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50/70 text-sm">
              <h4 className="font-medium text-slate-800">Agency <span className="text-xs font-normal text-slate-400">(optional)</span></h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Agency</Label>
                  <Select value={agencyId || '__none__'} onValueChange={v => { setAgencyId(v === '__none__' ? '' : v); setAgencyContactId(''); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Agency</SelectItem>
                      {agencies.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAgency?.contacts?.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Agency Contact</Label>
                    <Select value={agencyContactId || '__none__'} onValueChange={v => setAgencyContactId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="General contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">General Contact</SelectItem>
                        {selectedAgency.contacts.map((c, i) => (
                          <SelectItem key={i} value={String(i)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Contact details (optional) */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50/70 text-sm">
            <h4 className="font-medium text-slate-800">Contact Details <span className="text-xs font-normal text-slate-400">(optional)</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Contact person"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* 4. Comment */}
          <div className="space-y-1">
            <Label className="text-sm">Special Requests <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Any special requests, dietary requirements, or additional information..."
              className="h-20"
            />
          </div>

          {/* 5. Rooms grouped by date */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Selected Rooms</h3>
            {groupedByDate.map(([dateKey, group]) => {
              const checkinStr = typeof group.checkin === 'string' ? group.checkin : format(group.checkin, 'yyyy-MM-dd');
              const checkoutStr = typeof group.checkout === 'string' ? group.checkout : format(group.checkout, 'yyyy-MM-dd');
              return (
                <div key={dateKey} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b">
                    <span className="text-sm font-semibold text-slate-700">
                      {format(new Date(checkinStr + 'T12:00:00'), 'd MMM yyyy')} → {format(new Date(checkoutStr + 'T12:00:00'), 'd MMM yyyy')}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({group.ranges.length} room{group.ranges.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.ranges.map(range => {
                      const rCheckinStr = typeof range.checkin === 'string' ? range.checkin : format(range.checkin, 'yyyy-MM-dd');
                      const rowKey = `${range.roomId}_${rCheckinStr}`;
                      const isExpanded = expandedRows[rowKey];
                      const bedConfigs = getBedConfigsForRoom(range.roomId);
                      const details = perRoomDetails[rowKey] || {};
                      const selectedBedConfig = bedConfigs.find(bc => bc.name === details.bed_configuration);
                      const maxOcc = selectedBedConfig?.max_occupancy;
                      const currentOcc = (parseInt(details.adults_count, 10) || 0) + (parseInt(details.children_count, 10) || 0) + (parseInt(details.infants_count, 10) || 0);

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

                              <div className="flex gap-2 items-end">
                                <div className="space-y-1 flex-1">
                                  <Label className="text-xs text-slate-600">Adults</Label>
                                  <Input className="h-7 text-xs" type="number" min="0" max={maxOcc || undefined} value={details.adults_count ?? ""} onChange={e => updateRoomDetail(rowKey, 'adults_count', e.target.value, bedConfigs)} />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <Label className="text-xs text-slate-600">Children</Label>
                                  <Input className="h-7 text-xs" type="number" min="0" max={maxOcc || undefined} value={details.children_count ?? ""} onChange={e => updateRoomDetail(rowKey, 'children_count', e.target.value, bedConfigs)} />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <Label className="text-xs text-slate-600">Infants</Label>
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-yellow-700 hover:bg-yellow-800"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : `Request ${mergedRanges.length} reservation${mergedRanges.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
