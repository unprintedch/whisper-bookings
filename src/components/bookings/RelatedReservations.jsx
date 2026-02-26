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
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogId, setDeleteDialogId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localReservations, setLocalReservations] = useState(null);
  const [perDateStatus, setPerDateStatus] = useState({});

  if (!existingBooking || !selectedClient) return null;

  const currentReservations = localReservations || reservations;

  const relatedReservations = currentReservations.filter(r =>
    r.client_id === selectedClient.id &&
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
    try {
      await base44.entities.Reservation.delete(reservationId);
      if (onReservationDeleted) onReservationDeleted(reservationId);
    } catch (error) {
      console.warn('Delete error:', error.message);
      // Reservation may already be deleted, remove from local view anyway
    }
    setDeleteDialogId(null);
    setIsDeleting(false);
    // Remove from local view
    setLocalReservations((localReservations || reservations).filter(r => r.id !== reservationId));
  };

  const handleEditSave = async (formData) => {
    const { notifications, ...data } = formData;
    await base44.entities.Reservation.update(editingId, data);
    // Update local
    const updated = (localReservations || reservations).map(r =>
      r.id === editingId ? { ...r, ...data } : r
    );
    setLocalReservations(updated);
    setEditingId(null);
    setExpandedId(null);
  };

  const handleChangeStatus = async (reservationId, newStatus) => {
    await base44.entities.Reservation.update(reservationId, { status: newStatus });
    // Update local
    const updated = (localReservations || reservations).map(r =>
      r.id === reservationId ? { ...r, status: newStatus } : r
    );
    setLocalReservations(updated);
  };

  const handleChangeAllStatusInDateRange = async (dateRangeKey, newStatus) => {
    setPerDateStatus(prev => ({ ...prev, [dateRangeKey]: newStatus }));
    // Find all reservations in this date range and update them
    const key = dateRangeKey;
    const reservationsInRange = (localReservations || reservations).filter(r => {
      return `${r.date_checkin}_${r.date_checkout}` === key;
    });
    
    for (const res of reservationsInRange) {
      await base44.entities.Reservation.update(res.id, { status: newStatus });
    }
    
    // Update local
    const updated = (localReservations || reservations).map(r => {
      if (`${r.date_checkin}_${r.date_checkout}` === key) {
        return { ...r, status: newStatus };
      }
      return r;
    });
    setLocalReservations(updated);
  };

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
      setEditingId(null);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
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
              const isExpanded = expandedId === r.id;
              const isEditing = editingId === r.id;
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

                    {/* Right: Edit + Delete buttons + chevron */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-slate-600 hover:text-slate-800"
                        onClick={e => {
                          e.stopPropagation();
                          if (editingId === r.id) {
                            setEditingId(null);
                            setExpandedId(null);
                          } else {
                            setEditingId(r.id);
                            setExpandedId(r.id);
                          }
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={e => { e.stopPropagation(); setDeleteDialogId(r.id); }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
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

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30">
                      {isEditing ? (
                        <div className="p-3">
                          <MiniReservationForm
                            reservation={r}
                            allRooms={allRooms}
                            allSites={allSites}
                            allBedConfigs={allBedConfigs || []}
                            reservations={currentReservations}
                            onSave={handleEditSave}
                            onCancel={() => { setEditingId(null); setExpandedId(null); }}
                          />
                        </div>
                      ) : (
                        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
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
                      )}
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