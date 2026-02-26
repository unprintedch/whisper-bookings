import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronsUpDown, Check } from "lucide-react";

export default function MiniReservationForm({ reservation, allRooms, allSites, allBedConfigs, reservations, onSave, onCancel }) {
  const [checkin, setCheckin] = useState(reservation.date_checkin || '');
  const [checkout, setCheckout] = useState(reservation.date_checkout || '');
  const [nights, setNights] = useState(1);
  const [bedConfigId, setBedConfigId] = useState('');
  const [roomId, setRoomId] = useState(reservation.room_id || '');
  const [adults, setAdults] = useState(reservation.adults_count || 1);
  const [children, setChildren] = useState(reservation.children_count || 0);
  const [infants, setInfants] = useState(reservation.infants_count || 0);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [roomComboOpen, setRoomComboOpen] = useState(false);

  const rooms = allRooms.filter(r => r.is_active);

  // Init bed config from reservation
  useEffect(() => {
    const bc = allBedConfigs.find(c => c.name === reservation.bed_configuration);
    setBedConfigId(bc?.id || '');
  }, []);

  // Sync nights
  useEffect(() => {
    if (checkin && checkout) {
      const diff = Math.ceil((new Date(checkout + 'T00:00:00') - new Date(checkin + 'T00:00:00')) / 86400000);
      if (diff > 0) setNights(diff);
    }
  }, [checkin, checkout]);

  const selectedConfig = allBedConfigs.find(c => c.id === bedConfigId);
  const maxOcc = selectedConfig?.max_occupancy || 0;
  const totalOcc = adults + children + infants;

  const getSiteName = (siteId) => allSites.find(s => s.id === siteId)?.name || '';

  const isRoomAvailable = useCallback((rId) => {
    if (!rId || !checkin || !checkout) return false;
    const cin = new Date(checkin + 'T00:00:00');
    const cout = new Date(checkout + 'T00:00:00');
    return !reservations.some(r => {
      if (r.id === reservation.id) return false;
      if (r.status === 'ANNULE') return false;
      if (r.room_id !== rId) return false;
      const rc = new Date(r.date_checkin + 'T00:00:00');
      const ro = new Date(r.date_checkout + 'T00:00:00');
      return cin < ro && cout > rc;
    });
  }, [checkin, checkout, reservations, reservation.id]);

  const availableRooms = useMemo(() => {
    let list = rooms;
    if (bedConfigId) list = list.filter(r => r.bed_configuration_ids?.includes(bedConfigId));
    if (checkin && checkout) list = list.filter(r => isRoomAvailable(r.id));
    return list.sort((a, b) => {
      const sa = getSiteName(a.site_id), sb = getSiteName(b.site_id);
      if (sa !== sb) return sa.localeCompare(sb);
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });
  }, [rooms, bedConfigId, checkin, checkout, isRoomAvailable]);

  const handleCheckin = (date) => {
    if (!date) return;
    const ds = format(date, 'yyyy-MM-dd');
    setCheckin(ds);
    setCheckout(format(addDays(date, nights), 'yyyy-MM-dd'));
    setCheckinOpen(false);
  };

  const handleNightsChange = (val) => {
    const n = parseInt(val, 10) || 1;
    setNights(n);
    if (checkin) setCheckout(format(addDays(new Date(checkin + 'T00:00:00'), n), 'yyyy-MM-dd'));
  };

  const handleCheckout = (date) => {
    if (!date) return;
    setCheckout(format(date, 'yyyy-MM-dd'));
    setCheckoutOpen(false);
  };

  const handleBedConfig = (id) => {
    setBedConfigId(id);
    const c = allBedConfigs.find(x => x.id === id);
    
    // Check if current room is compatible with new bed config
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom || !currentRoom.bed_configuration_ids?.includes(id)) {
      setRoomId(''); // Clear room only if incompatible
    }
    
    if (c) { setAdults(c.max_occupancy); setChildren(0); setInfants(0); }
  };

  const handleSave = () => {
    const config = allBedConfigs.find(c => c.id === bedConfigId);
    onSave({
      date_checkin: checkin,
      date_checkout: checkout,
      bed_configuration: config?.name || reservation.bed_configuration,
      room_id: roomId,
      adults_count: adults,
      children_count: children,
      infants_count: infants,
    });
  };

  const selectedRoom = rooms.find(r => r.id === roomId);

  return (
    <div className="space-y-3">
      {/* Dates row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Check-in</Label>
          <Popover open={checkinOpen} onOpenChange={setCheckinOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal h-8 text-xs">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {checkin ? format(new Date(checkin + 'T12:00:00'), 'dd/MM/yyyy') : 'Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkin ? new Date(checkin + 'T12:00:00') : undefined} onSelect={handleCheckin} /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nights</Label>
          <Select value={nights.toString()} onValueChange={handleNightsChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={n.toString()}>{n} night{n > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Check-out</Label>
          <Popover open={checkoutOpen} onOpenChange={setCheckoutOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal h-8 text-xs">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {checkout ? format(new Date(checkout + 'T12:00:00'), 'dd/MM/yyyy') : 'Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkout ? new Date(checkout + 'T12:00:00') : undefined} onSelect={handleCheckout} disabled={(d) => !checkin || d <= new Date(checkin + 'T00:00:00')} /></PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bed + Room */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Bed Setup</Label>
          <Select value={bedConfigId} onValueChange={handleBedConfig}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose..." /></SelectTrigger>
            <SelectContent>
              {allBedConfigs.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.max_occupancy} max)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Room</Label>
          <Popover open={roomComboOpen} onOpenChange={setRoomComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-8 text-xs" disabled={!checkin || !bedConfigId}>
                {selectedRoom ? `${getSiteName(selectedRoom.site_id)} – ${selectedRoom.number}` : 'Choose room...'}
                <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search..." className="h-8" />
                <CommandEmpty>No room available.</CommandEmpty>
                <CommandGroup className="max-h-48 overflow-y-auto">
                  {availableRooms.map(r => (
                    <CommandItem key={r.id} value={`${getSiteName(r.site_id)} ${r.number} ${r.name}`} onSelect={() => { setRoomId(r.id); setRoomComboOpen(false); }} className="text-xs">
                      <Check className={`mr-2 h-3 w-3 ${roomId === r.id ? 'opacity-100' : 'opacity-0'}`} />
                      {getSiteName(r.site_id)} – {r.number} – {r.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Guests */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Adults (+16)</Label>
          <Input type="number" min="0" max={maxOcc || 999} value={adults} onChange={e => setAdults(parseInt(e.target.value, 10) || 0)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Children (5-16)</Label>
          <Input type="number" min="0" max={maxOcc || 999} value={children} onChange={e => setChildren(parseInt(e.target.value, 10) || 0)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Infants (-5)</Label>
          <Input type="number" min="0" max={maxOcc || 999} value={infants} onChange={e => setInfants(parseInt(e.target.value, 10) || 0)} className="h-8 text-xs" />
        </div>
        <div className="flex items-end h-[52px]">
          {selectedConfig ? (
            <Badge variant={totalOcc > maxOcc ? "destructive" : "secondary"} className="text-xs px-2 py-1 h-8 flex items-center whitespace-nowrap">
              {totalOcc} / {maxOcc}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-2 py-1 h-8 flex items-center text-slate-400 whitespace-nowrap">– / –</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1 border-t">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" className="h-7 text-xs bg-yellow-700 hover:bg-yellow-800" onClick={handleSave} disabled={!checkin || !checkout || !roomId || !bedConfigId}>Save</Button>
      </div>
    </div>
  );
}