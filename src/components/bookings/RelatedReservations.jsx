import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";

export default function RelatedReservations({ existingBooking, selectedClient, reservations, allRooms, allSites, onBookingEdit, onReservationDeleted }) {
  const [expandedRelated, setExpandedRelated] = useState({});
  const [deleteDialogId, setDeleteDialogId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async (reservationId) => {
    setIsDeleting(true);
    await base44.entities.Reservation.delete(reservationId);
    setDeleteDialogId(null);
    setIsDeleting(false);
    if (onReservationDeleted) onReservationDeleted(reservationId);
  };

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
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-3">
                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                        {r.bed_configuration && (
                          <div><span className="text-slate-400">Bed:</span> <span className="font-medium">{r.bed_configuration}</span></div>
                        )}
                        {occupancySummary && (
                          <div><span className="text-slate-400">Guests:</span> <span className="font-medium">{occupancySummary}</span></div>
                        )}
                        <div><span className="text-slate-400">Status:</span> <span className="font-medium">{r.status}</span></div>
                        {r.comment && (
                          <div className="col-span-2"><span className="text-slate-400">Comment:</span> <span className="font-medium">{r.comment}</span></div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {onBookingEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-3"
                            onClick={e => { e.stopPropagation(); onBookingEdit(r); }}
                          >
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={e => { e.stopPropagation(); setDeleteDialogId(r.id); }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteDialogId} onOpenChange={(open) => { if (!open) setDeleteDialogId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reservation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialogId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}