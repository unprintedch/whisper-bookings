import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RelatedReservations({ existingBooking, selectedClient, reservations, allRooms, allSites, onBookingEdit }) {
  const [expandedRelated, setExpandedRelated] = useState({});

  if (!existingBooking || !selectedClient) return null;

  const relatedReservations = reservations.filter(r =>
    r.client_id === selectedClient.id &&
    r.id !== existingBooking.id &&
    r.status !== 'ANNULE'
  );

  if (relatedReservations.length === 0) return null;

  // Group by date range
  const groups = {};
  relatedReservations.forEach(r => {
    const key = `${r.date_checkin}_${r.date_checkout}`;
    if (!groups[key]) groups[key] = { checkin: r.date_checkin, checkout: r.date_checkout, items: [] };
    groups[key].items.push(r);
  });

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          Other reservations for {selectedClient.name}
        </span>
        <span className="text-xs text-slate-500">{relatedReservations.length} reservation{relatedReservations.length > 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {Object.entries(groups).map(([key, group]) => (
          <div key={key}>
            <div className="bg-slate-50/50 px-4 py-1.5 border-b">
              <span className="text-xs font-semibold text-slate-600">
                {format(new Date(group.checkin + 'T00:00:00'), 'd MMM yyyy')} → {format(new Date(group.checkout + 'T00:00:00'), 'd MMM yyyy')}
              </span>
            </div>
            {group.items.map(r => {
              const room = allRooms.find(rm => rm.id === r.room_id);
              const site = allSites.find(s => s.id === room?.site_id);
              const isExpanded = expandedRelated[r.id];
              const adults = r.adults_count || 0;
              const children = r.children_count || 0;
              const infants = r.infants_count || 0;
              const occupancySummary = [
                adults > 0 ? `${adults}A` : null,
                children > 0 ? `${children}C` : null,
                infants > 0 ? `${infants}I` : null
              ].filter(Boolean).join(' ');

              return (
                <div key={r.id}>
                  <div
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedRelated(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  >
                    <span className="text-sm text-slate-700">
                      {site?.name || ''}{room ? ` – ${room.number ? room.number + ' – ' : ''}${room.name}` : r.room_id}
                    </span>
                    <div className="flex items-center gap-2">
                      {(occupancySummary || r.bed_configuration) && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {[occupancySummary, r.bed_configuration].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {onBookingEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={e => { e.stopPropagation(); onBookingEdit(r); }}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 bg-slate-50/50 text-xs text-slate-600 space-y-1">
                      {r.bed_configuration && <div>Bed: <span className="font-medium">{r.bed_configuration}</span></div>}
                      {occupancySummary && <div>Guests: <span className="font-medium">{occupancySummary}</span></div>}
                      {r.comment && <div>Comment: <span className="font-medium">{r.comment}</span></div>}
                      <div>Status: <span className="font-medium">{r.status}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}