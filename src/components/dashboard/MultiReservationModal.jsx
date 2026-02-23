import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function MultiReservationModal({ isOpen, onClose, mergedRanges, rooms, clients, sites, allBedConfigs, onSuccess }) {
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("REQUEST");
  const [groupPax, setGroupPax] = useState("");
  const [perRoomDetails, setPerRoomDetails] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [clientSearch, setClientSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

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

  const updateRoomDetail = (key, field, value) => {
    setPerRoomDetails(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
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
        comment: groupPax ? `Groupe: ${groupPax} pax` : undefined,
      };
    });

    await base44.entities.Reservation.bulkCreate(reservationsToCreate);
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-800">Nouvelle réservation groupée</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Client selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Client <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="mb-1"
            />
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status + Group Pax */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Statut</Label>
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
                    {format(group.checkin, 'd MMM yyyy', { locale: fr })} → {format(group.checkout, 'd MMM yyyy', { locale: fr })}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({group.ranges.length} chambre{group.ranges.length > 1 ? 's' : ''})
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
                          <div className="px-4 pb-3 pt-1 bg-slate-50/50 grid grid-cols-2 gap-3">
                            {bedConfigs.length > 0 && (
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs text-slate-600">Config. lit</Label>
                                <Select
                                  value={details.bed_configuration || ""}
                                  onValueChange={v => updateRoomDetail(rowKey, 'bed_configuration', v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Choisir..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bedConfigs.map(bc => (
                                      <SelectItem key={bc.id} value={bc.name}>{bc.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Adultes</Label>
                              <Input className="h-8 text-xs" type="number" min="0" value={details.adults_count || ""} onChange={e => updateRoomDetail(rowKey, 'adults_count', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Enfants</Label>
                              <Input className="h-8 text-xs" type="number" min="0" value={details.children_count || ""} onChange={e => updateRoomDetail(rowKey, 'children_count', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Nourrissons</Label>
                              <Input className="h-8 text-xs" type="number" min="0" value={details.infants_count || ""} onChange={e => updateRoomDetail(rowKey, 'infants_count', e.target.value)} />
                            </div>
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
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            className="bg-yellow-700 hover:bg-yellow-800"
            onClick={handleSubmit}
            disabled={!clientId || isSubmitting}
          >
            {isSubmitting ? 'Création...' : `Créer ${mergedRanges.length} réservation${mergedRanges.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}