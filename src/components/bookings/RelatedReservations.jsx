import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import MiniReservationForm from "./MiniReservationForm";

export default function RelatedReservations({
  existingBooking,
  selectedClient,
  reservations,
  allRooms,
  allSites,
  onBookingEdit,
  onReservationDeleted,
  // BookingForm props
  allClients,
  allAgencies,
  allBedConfigs,
  selectedSiteName,
  onReservationsUpdated,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [deleteDialogId, setDeleteDialogId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localReservations, setLocalReservations] = useState(reservations);

  // Keep local state in sync when prop changes (e.g. initial load)
  React.useEffect(() => {
    setLocalReservations(reservations);
  }, [reservations]);

  const relatedReservations = (!existingBooking || !selectedClient) ? [] : localReservations.filter(r =>
    r.client_id === selectedClient.id &&
    r.status !== 'ANNULE'
  );

  // Group by date range
  const groups = {};
  relatedReservations.forEach(r => {
    const key = `${r.date_checkin}_${r.date_checkout}`;
    if (!groups[key]) groups[key] = { checkin: r.date_checkin, checkout: r.date_checkout, items: [] };
    groups[key].items.push(r);
  });

  if (!existingBooking || !selectedClient || relatedReservations.length === 0) return null;

  const handleDelete = async (reservationId) => {
    setIsDeleting(true);
    // Remove from local state immediately
    const updated = localReservations.filter(r => r.id !== reservationId);
    setLocalReservations(updated);
    setDeleteDialogId(null);
    setIsDeleting(false);
    try {
      await base44.entities.Reservation.delete(reservationId);
      if (onReservationDeleted) onReservationDeleted(reservationId);
      if (onReservationsUpdated) onReservationsUpdated(updated);
    } catch (error) {
      console.warn('Delete error:', error.message);
      // Revert on error
      setLocalReservations(localReservations);
    }
  };

  const handleEditSave = async (reservationId, formData) => {
    const { notifications, ...data } = formData;
    await base44.entities.Reservation.update(reservationId, data);
    const updated = localReservations.map(r => r.id === reservationId ? { ...r, ...data } : r);
    setLocalReservations(updated);
    if (onReservationsUpdated) onReservationsUpdated(updated);
  };

  const handleChangeStatus = async (reservationId, newStatus) => {
    await base44.entities.Reservation.update(reservationId, { status: newStatus });
    const updated = localReservations.map(r => r.id === reservationId ? { ...r, status: newStatus } : r);
    setLocalReservations(updated);
    if (onReservationsUpdated) onReservationsUpdated(updated);
  };



  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="divide-y divide-slate-100">
        {Object.entries(groups).map(([key, group]) => (
          <div key={key}>
            <div className="bg-slate-50/50 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {format(new Date(group.checkin + 'T00:00:00'), 'd MMM yyyy')} → {format(new Date(group.checkout + 'T00:00:00'), 'd MMM yyyy')}
              </span>

            </div>
            {group.items.map(r => {
               const room = allRooms.find(rm => rm.id === r.room_id);
               const site = allSites.find(s => s.id === room?.site_id);
               const isExpanded = expandedId === r.id;
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
                  {/* Row - always visible, with Edit/Delete on the right */}
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                    {/* Left: clickable to expand details */}
                    <div
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => toggleExpand(r.id)}
                    >
                      <span className="text-sm text-slate-700">
                        {site?.name || ''}{room ? ` – ${room.number ? room.number + ' – ' : ''}${room.name}` : r.room_id}
                      </span>
                      {(occupancySummary || r.bed_configuration) && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {[occupancySummary, r.bed_configuration].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>

                    {/* Right: Status + Delete buttons + chevron */}
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                       {[
                         { value: 'REQUEST', label: 'Request', color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' },
                         { value: 'OPTION', label: 'Option', color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' },
                         { value: 'RESERVE', label: 'Reserved', color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' },
                         { value: 'CONFIRME', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' },
                         { value: 'PAYE', label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' },
                       ].map(s => (
                         <button
                           key={s.value}
                           type="button"
                           onClick={() => handleChangeStatus(r.id, s.value)}
                           className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                             r.status === s.value
                               ? `${s.color} ring-1 ring-offset-1 ring-current`
                               : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                           }`}
                         >
                           {s.label}
                         </button>
                       ))}
                     </div>
                       <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                         onClick={e => { e.stopPropagation(); setDeleteDialogId(r.id); }}
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </Button>
                      <div
                        className="cursor-pointer p-1"
                        onClick={() => toggleExpand(r.id)}
                      >
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded content - always show form */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-3">
                      <MiniReservationForm
                        reservation={r}
                        allRooms={allRooms}
                        allSites={allSites}
                        allBedConfigs={allBedConfigs || []}
                        reservations={currentReservations}
                        onSave={(formData) => handleEditSave(r.id, formData)}
                        onCancel={() => setExpandedId(null)}
                        disabled={false}
                      />
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