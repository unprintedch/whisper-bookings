import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mergeConsecutiveSlots } from "./multiSelectLogic";

// Wrapper pour compatibilité (adapte le format de slots)
export function mergeSlots(slots) {
  if (!slots.length) return [];
  
  // Convertir format UI (Date objects) en format métier (ISO strings)
  const slotsIso = slots.map(s => ({
    roomId: s.roomId,
    date: typeof s.date === 'string' 
      ? s.date 
      : s.date.toISOString().split('T')[0]
  }));
  
  // Utilise logique métier pure
  const merged = mergeConsecutiveSlots(slotsIso);
  
  // Convertir en format de retour (Date objects pour compatibilité)
  return merged.map(m => ({
    roomId: m.roomId,
    checkin: new Date(m.checkin),
    checkout: new Date(m.checkout)
  }));
}

export default function MultiSelectionPanel({ selectedSlots, onRemoveSlot, onClearAll, onConfirm, rooms, sites }) {
  if (!selectedSlots.length) return null;

  const mergedRanges = mergeSlots(selectedSlots);

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return roomId;
    const site = sites.find(s => s.id === room.site_id);
    return `${site?.name || ''} – ${room.number ? room.number + ' – ' : ''}${room.name}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-80">
      <div className="flex items-center justify-between p-3 border-b bg-yellow-50 rounded-t-xl">
        <span className="font-semibold text-slate-800 text-sm">
          {mergedRanges.length} selected reservation{mergedRanges.length > 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearAll}>
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
        </Button>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
        {mergedRanges.map((range, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{getRoomName(range.roomId)}</p>
              <p className="text-xs text-slate-500">
                {format(range.checkin, 'd MMM', { locale: fr })} → {format(range.checkout, 'd MMM', { locale: fr })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => onRemoveSlot(range.roomId)}
            >
              <X className="w-3 h-3 text-slate-400" />
            </Button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t">
        <Button
          className="w-full bg-yellow-700 hover:bg-yellow-800 text-white text-sm"
          onClick={() => onConfirm(mergedRanges)}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Create reservations
        </Button>
      </div>
    </div>
  );
}