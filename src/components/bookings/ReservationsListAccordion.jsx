import React, { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Save, Trash2, X, CalendarIcon, AlertCircle } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

const statusColors = {
  REQUEST: "bg-gray-100 text-gray-800",
  OPTION: "bg-amber-100 text-amber-800",
  RESERVE: "bg-blue-100 text-blue-800",
  CONFIRME: "bg-emerald-100 text-emerald-800",
  PAYE: "bg-green-100 text-green-800",
  ANNULE: "bg-red-100 text-red-800"
};

export default function ReservationsListAccordion({
  reservations = [],
  selectedClient,
  allRooms = [],
  allSites = [],
  agencies = [],
  allClients = [],
  allBedConfigs = [],
  selectedSiteName = "all",
  onBookingEdit,
  onBookingDelete,
  onClose
}) {
  const [editingData, setEditingData] = useState({});
  const [dirtyLines, setDirtyLines] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (!selectedClient) return null;

  const clientReservations = reservations.filter(r => r.client_id === selectedClient.id);

  if (clientReservations.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500">
        No reservations for this client.
      </div>
    );
  }

  const getRoom = (roomId) => allRooms.find(r => r.id === roomId);
  const getSite = (siteId) => allSites.find(s => s.id === siteId);
  const getBedConfig = (configId) => allBedConfigs.find(c => c.id === configId);

  const initEditingData = (reservation) => {
    if (!editingData[reservation.id]) {
      setEditingData(prev => ({
        ...prev,
        [reservation.id]: { ...reservation }
      }));
    }
  };

  const handleFieldChange = (resId, field, value) => {
    setEditingData(prev => ({
      ...prev,
      [resId]: { ...prev[resId], [field]: value }
    }));
    setDirtyLines(prev => new Set([...prev, resId]));
    setErrors(prev => ({ ...prev, [resId]: {} }));
  };

  const validateLine = (resId, data) => {
    const lineErrors = {};
    
    if (!data.date_checkin) lineErrors.date_checkin = "Required";
    if (!data.date_checkout) lineErrors.date_checkout = "Required";
    if (!data.room_id) lineErrors.room_id = "Required";
    if (!data.bed_configuration) lineErrors.bed_configuration = "Required";

    if (data.date_checkin && data.date_checkout) {
      if (new Date(data.date_checkin) >= new Date(data.date_checkout)) {
        lineErrors.dates = "Check-out must be after check-in";
      }
    }

    const occupancy = data.adults_count + data.children_count + data.infants_count;
    const config = getBedConfig(data.bed_configuration);
    if (config && occupancy > config.max_occupancy) {
      lineErrors.occupancy = `Max ${config.max_occupancy} people`;
    }

    // Check room availability (exclude current reservation)
    const room = getRoom(data.room_id);
    if (room && data.date_checkin && data.date_checkout) {
      const conflicts = reservations.filter(r => 
        r.id !== resId && 
        r.room_id === data.room_id && 
        r.status !== 'ANNULE'
      ).some(r => {
        const existStart = new Date(r.date_checkin);
        const existEnd = new Date(r.date_checkout);
        const newStart = new Date(data.date_checkin);
        const newEnd = new Date(data.date_checkout);
        return newStart < existEnd && newEnd > existStart;
      });
      if (conflicts) {
        lineErrors.room_id = "Room not available for these dates";
      }
    }

    if (Object.keys(lineErrors).length > 0) {
      setErrors(prev => ({ ...prev, [resId]: lineErrors }));
      return false;
    }
    return true;
  };

  const handleSaveLine = async (resId) => {
    const data = editingData[resId];
    if (!validateLine(resId, data)) return;

    try {
      await onBookingEdit?.(resId, data);
      setDirtyLines(prev => {
        const newSet = new Set(prev);
        newSet.delete(resId);
        return newSet;
      });
    } catch (err) {
      setErrors(prev => ({ ...prev, [resId]: { submit: err.message } }));
    }
  };

  const handleSaveAll = async () => {
    let hasErrors = false;
    for (const resId of dirtyLines) {
      if (!validateLine(resId, editingData[resId])) {
        hasErrors = true;
      }
    }
    if (hasErrors) return;

    try {
      for (const resId of dirtyLines) {
        await onBookingEdit?.(resId, editingData[resId]);
      }
      setDirtyLines(new Set());
      onClose?.();
    } catch (err) {
      console.error("Save all error:", err);
    }
  };

  const handleDeleteLine = (resId) => {
    onBookingDelete?.(resId);
    setDeleteConfirm(null);
  };

  const handleCancelLine = (resId) => {
    const original = reservations.find(r => r.id === resId);
    setEditingData(prev => ({
      ...prev,
      [resId]: { ...original }
    }));
    setDirtyLines(prev => {
      const newSet = new Set(prev);
      newSet.delete(resId);
      return newSet;
    });
    setErrors(prev => ({ ...prev, [resId]: {} }));
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Reservations ({clientReservations.length})
        </h3>
        <div className="flex gap-2">
          {dirtyLines.size > 0 && (
            <Button size="sm" onClick={handleSaveAll} className="bg-yellow-700 hover:bg-yellow-800">
              Save All ({dirtyLines.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="border rounded-lg">
        {clientReservations.map((reservation) => {
          // Initialize if not already done
          if (!editingData[reservation.id]) {
            initEditingData(reservation);
          }
          const data = editingData[reservation.id] || { ...reservation };
          const isDirty = dirtyLines.has(reservation.id);
          const lineErrors = errors[reservation.id] || {};
          const room = getRoom(data.room_id);
          const site = getSite(room?.site_id);
          const config = getBedConfig(data.bed_configuration);
          const occupancy = data.adults_count + data.children_count + data.infants_count;
          const nights = data.date_checkin && data.date_checkout 
            ? differenceInDays(new Date(data.date_checkout), new Date(data.date_checkin))
            : 0;

          return (
            <AccordionItem key={reservation.id} value={reservation.id} className="border-b last:border-b-0">
              <AccordionTrigger className={`hover:bg-slate-100 px-4 py-3 ${isDirty ? 'bg-yellow-50' : ''}`}>
                <div className="flex items-center gap-3 text-left flex-1">
                  {isDirty && <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {site?.name && `${site.name} – `}{room?.number} – {room?.name}
                      </span>
                      <Badge className={statusColors[data.status] || "bg-gray-100"}>
                        {data.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.date_checkin && format(new Date(data.date_checkin), 'dd MMM')} → {data.date_checkout && format(new Date(data.date_checkout), 'dd MMM')}
                      {config && ` • ${config.name}`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="bg-white px-4 py-4 space-y-4">
                {/* Dates Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className={lineErrors.date_checkin ? 'text-red-600 text-xs' : 'text-xs'}>Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${lineErrors.date_checkin ? 'border-red-300' : ''}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data.date_checkin ? format(new Date(data.date_checkin), 'dd/MM/yyyy') : 'Date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={data.date_checkin ? new Date(data.date_checkin) : undefined}
                          onSelect={(date) => handleFieldChange(reservation.id, 'date_checkin', date?.toISOString().split('T')[0])}
                        />
                      </PopoverContent>
                    </Popover>
                    {lineErrors.date_checkin && <p className="text-xs text-red-600">{lineErrors.date_checkin}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Nights</Label>
                    <Select value={nights.toString()} onValueChange={(n) => {
                      if (data.date_checkin) {
                        const newEnd = addDays(new Date(data.date_checkin), parseInt(n));
                        handleFieldChange(reservation.id, 'date_checkout', newEnd.toISOString().split('T')[0]);
                      }
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'night' : 'nights'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className={lineErrors.date_checkout ? 'text-red-600 text-xs' : 'text-xs'}>Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${lineErrors.date_checkout ? 'border-red-300' : ''}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data.date_checkout ? format(new Date(data.date_checkout), 'dd/MM/yyyy') : 'Date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={data.date_checkout ? new Date(data.date_checkout) : undefined}
                          onSelect={(date) => handleFieldChange(reservation.id, 'date_checkout', date?.toISOString().split('T')[0])}
                        />
                      </PopoverContent>
                    </Popover>
                    {lineErrors.date_checkout && <p className="text-xs text-red-600">{lineErrors.date_checkout}</p>}
                  </div>
                </div>

                {lineErrors.dates && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    {lineErrors.dates}
                  </div>
                )}

                {/* Bed & Room Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className={lineErrors.bed_configuration ? 'text-red-600 text-xs' : 'text-xs'}>Bed Setup</Label>
                    <Select value={data.bed_configuration || ""} onValueChange={(v) => handleFieldChange(reservation.id, 'bed_configuration', v)}>
                      <SelectTrigger className={`h-9 ${lineErrors.bed_configuration ? 'border-red-300' : ''}`}>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {allBedConfigs.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.max_occupancy} max)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lineErrors.bed_configuration && <p className="text-xs text-red-600">{lineErrors.bed_configuration}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className={lineErrors.room_id ? 'text-red-600 text-xs' : 'text-xs'}>Room</Label>
                    <Select value={data.room_id || ""} onValueChange={(v) => handleFieldChange(reservation.id, 'room_id', v)}>
                      <SelectTrigger className={`h-9 ${lineErrors.room_id ? 'border-red-300' : ''}`}>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {getSite(r.site_id)?.name} – {r.number} – {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lineErrors.room_id && <p className="text-xs text-red-600">{lineErrors.room_id}</p>}
                  </div>
                </div>

                {/* Occupancy Row */}
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Adults (+16)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={data.adults_count}
                      onChange={(e) => handleFieldChange(reservation.id, 'adults_count', parseInt(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Children (5-16)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={data.children_count}
                      onChange={(e) => handleFieldChange(reservation.id, 'children_count', parseInt(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Infants (-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={data.infants_count}
                      onChange={(e) => handleFieldChange(reservation.id, 'infants_count', parseInt(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>

                  <div className="flex items-end h-[62px]">
                    <Badge variant={occupancy > config?.max_occupancy ? 'destructive' : 'secondary'}>
                      {occupancy} / {config?.max_occupancy || 0}
                    </Badge>
                  </div>
                </div>

                {lineErrors.occupancy && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    {lineErrors.occupancy}
                  </div>
                )}

                {/* Comments */}
                <div className="space-y-1">
                  <Label className="text-xs">Comments</Label>
                  <Textarea
                    value={data.comment || ""}
                    onChange={(e) => handleFieldChange(reservation.id, 'comment', e.target.value)}
                    className="h-16 text-sm"
                    placeholder="Special requests..."
                  />
                </div>

                {/* Notifications */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Notifications</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`admin-${reservation.id}`}
                      checked={data.notify_admin || false}
                      onCheckedChange={(checked) => handleFieldChange(reservation.id, 'notify_admin', checked)}
                    />
                    <Label htmlFor={`admin-${reservation.id}`} className="text-xs font-normal cursor-pointer">To admin</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`agency-${reservation.id}`}
                      checked={data.notify_agency || false}
                      onCheckedChange={(checked) => handleFieldChange(reservation.id, 'notify_agency', checked)}
                    />
                    <Label htmlFor={`agency-${reservation.id}`} className="text-xs font-normal cursor-pointer">To agency</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`client-${reservation.id}`}
                      checked={data.notify_client || false}
                      onCheckedChange={(checked) => handleFieldChange(reservation.id, 'notify_client', checked)}
                    />
                    <Label htmlFor={`client-${reservation.id}`} className="text-xs font-normal cursor-pointer">To client</Label>
                  </div>
                </div>

                {/* Line Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  {isDirty ? (
                    <>
                      <Button size="sm" onClick={() => handleSaveLine(reservation.id)} className="bg-yellow-700 hover:bg-yellow-800 gap-1">
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCancelLine(reservation.id)} className="gap-1">
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(reservation.id)} className="text-red-600 hover:text-red-700 gap-1">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reservation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDeleteLine(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}