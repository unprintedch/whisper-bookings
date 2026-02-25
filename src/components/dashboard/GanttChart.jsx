import React, { useState, useEffect } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Eye, Clock, CheckCircle2, DollarSign, X, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * GANTT GRID — MIDI-TO-MIDI (NIGHT-BASED)
 *
 * Each column = one NIGHT (column "Jun 1" = night Jun 1 noon → Jun 2 noon)
 * A reservation checkin=Jun1, checkout=Jun3 occupies nights Jun1 + Jun2 (2 nights).
 * Rule: column N is occupied if checkin <= N < checkout
 *
 * Bar left  = checkinColIndex * COL_WIDTH
 * Bar right = checkoutColIndex * COL_WIDTH
 * Bar width = (checkoutColIndex - checkinColIndex) * COL_WIDTH
 */

const COL_WIDTH = 80;
const ROW_HEIGHT = 52;
const ROOM_COL_WIDTH = 220;

const STATUS_STYLES = {
  REQUEST:  { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
  OPTION:   { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  RESERVE:  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  CONFIRME: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  PAYE:     { bg: '#bbf7d0', border: '#16a34a', text: '#14532d' },
  ANNULE:   { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8' },
};

const STATUS_ICONS = {
  REQUEST:  Clock,
  OPTION:   Clock,
  RESERVE:  Clock,
  CONFIRME: CheckCircle2,
  PAYE:     DollarSign,
  ANNULE:   X,
};

function RoomModal({ room, isOpen, onClose }) {
  if (!room) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-700" />
            {room.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {room.photo_url && (
            <img src={room.photo_url} alt={room.name} className="w-full h-40 object-cover rounded" />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">Type:</span> <span className="font-medium">{room.type_label}</span></div>
            <div><span className="text-slate-500">Capacité max:</span> <span className="font-medium">{room.capacity_max}</span></div>
          </div>
          {room.notes && <p className="text-slate-600 bg-slate-50 p-2 rounded">{room.notes}</p>}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GanttChart({
  rooms = [],
  reservations = [],
  clients = [],
  sites = [],
  dateColumns = [],
  highlightDate,
  isLoading = false,
  onBookingEdit,
  selectedSlots = [],
  onSlotToggle,
  isPublicView = false,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const canSeeClient = (reservation) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;
    const client = clients.find(c => c.id === reservation.client_id);
    return client?.agency_id === currentUser.agency_id;
  };

  /**
   * Returns { left, width } in pixels for a reservation bar.
   * left  = checkinColIndex * COL_WIDTH
   * right = checkoutColIndex * COL_WIDTH
   */
  const getBookingLayout = (reservation) => {
    if (!reservation.date_checkin || !reservation.date_checkout || dateColumns.length === 0) return null;

    const checkin = parseISO(reservation.date_checkin);
    const checkout = parseISO(reservation.date_checkout);

    const viewStart = dateColumns[0];
    const lastCol = dateColumns[dateColumns.length - 1];
    // Day after last visible night
    const viewEnd = new Date(lastCol);
    viewEnd.setDate(viewEnd.getDate() + 1);

    // No overlap
    if (checkout <= viewStart || checkin >= viewEnd) return null;

    // Find checkin column index
    let leftColIdx = dateColumns.findIndex(d =>
      d.getFullYear() === checkin.getFullYear() &&
      d.getMonth() === checkin.getMonth() &&
      d.getDate() === checkin.getDate()
    );
    if (leftColIdx === -1) {
      if (checkin < viewStart) leftColIdx = 0; // starts before view
      else return null;
    }

    // Find checkout column index (first col NOT occupied)
    let rightColIdx = dateColumns.findIndex(d =>
      d.getFullYear() === checkout.getFullYear() &&
      d.getMonth() === checkout.getMonth() &&
      d.getDate() === checkout.getDate()
    );
    if (rightColIdx === -1) {
      if (checkout > lastCol) rightColIdx = dateColumns.length; // ends after view
      else return null;
    }

    if (rightColIdx <= leftColIdx) return null;

    return {
      left: leftColIdx * COL_WIDTH,
      width: (rightColIdx - leftColIdx) * COL_WIDTH,
    };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-56 h-12" />
            <div className="flex gap-1 flex-1">
              {Array(10).fill(0).map((_, j) => <Skeleton key={j} className="h-12 flex-1" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: `${ROOM_COL_WIDTH + dateColumns.length * COL_WIDTH}px` }}>

          {/* HEADER */}
          <div className="flex sticky top-0 z-50 bg-white border-b border-slate-200" style={{ height: '40px' }}>
            <div
              className="flex-shrink-0 sticky left-0 z-50 bg-slate-50 border-r border-slate-200 flex items-center justify-center"
              style={{ width: ROOM_COL_WIDTH }}
            >
              <span className="text-sm font-semibold text-slate-600">Chambres</span>
            </div>
            {dateColumns.map((date, i) => {
              const isToday = highlightDate && isSameDay(date, highlightDate);
              const isSun = format(date, 'EEE', { locale: enUS }) === 'Sun';
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 border-r flex flex-col items-center justify-center ${
                    isSun ? 'border-r-2 border-r-slate-300' : 'border-slate-200'
                  } ${isToday ? 'bg-yellow-50' : 'bg-slate-50/60'}`}
                  style={{ width: COL_WIDTH }}
                >
                  <span className="text-xs font-medium text-slate-500 uppercase leading-none">
                    {format(date, 'EEE', { locale: enUS })}
                  </span>
                  <span className={`text-xs font-bold leading-tight ${isToday ? 'text-yellow-700' : 'text-slate-700'}`}>
                    {format(date, 'd MMM', { locale: enUS })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ROWS */}
          {rooms.map((room) => {
            const site = sites.find(s => s.id === room.site_id);
            const roomReservations = reservations.filter(r => r.room_id === room.id && r.status !== 'ANNULE');

            return (
              <div
                key={room.id}
                className="flex border-b border-slate-100 group relative"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Room label */}
                <div
                  className="flex-shrink-0 sticky left-0 z-30 bg-white border-r border-slate-200 flex flex-col justify-center px-3 cursor-pointer hover:bg-slate-50"
                  style={{ width: ROOM_COL_WIDTH }}
                  onClick={() => { setSelectedRoom(room); setIsRoomModalOpen(true); }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {site?.name || ''}{room.number ? ` – ${room.number}` : ''}{room.name ? ` – ${room.name}` : ''}
                    </span>
                    {!isPublicView && <Eye className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{room.type_label}</span>
                    <span>·</span>
                    <Users className="w-3 h-3" />
                    <span>{room.capacity_max}</span>
                  </div>
                </div>

                {/* Grid cells + bars */}
                <div className="relative flex-shrink-0" style={{ width: dateColumns.length * COL_WIDTH }}>
                  {/* Clickable background cells */}
                  <div className="absolute inset-0 flex">
                    {dateColumns.map((date, i) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isSelected = selectedSlots.some(s => s.roomId === room.id && s.date === dateStr);
                      const isToday = highlightDate && isSameDay(date, highlightDate);
                      const isSun = format(date, 'EEE', { locale: enUS }) === 'Sun';
                      return (
                        <div
                          key={i}
                          className={`flex-shrink-0 border-r h-full flex items-center justify-center cursor-pointer group/cell transition-colors ${
                            isSun ? 'border-r-2 border-r-slate-200' : 'border-slate-100'
                          } ${
                            isSelected
                              ? 'bg-yellow-100 hover:bg-yellow-200'
                              : isToday
                              ? 'bg-yellow-50/40 hover:bg-yellow-100/60'
                              : 'hover:bg-blue-50'
                          }`}
                          style={{ width: COL_WIDTH }}
                          onClick={() => !isPublicView && onSlotToggle && onSlotToggle(room.id, dateStr)}
                        >
                          {!isPublicView && !isSelected && (
                            <Plus className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                          )}
                          {!isPublicView && isSelected && (
                            <X className="w-3.5 h-3.5 text-yellow-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reservation bars */}
                  <div className="absolute inset-0 pointer-events-none">
                    {roomReservations.map((reservation) => {
                      const layout = getBookingLayout(reservation);
                      if (!layout) return null;

                      const client = clients.find(c => c.id === reservation.client_id);
                      const visible = canSeeClient(reservation);
                      const style = STATUS_STYLES[reservation.status] || STATUS_STYLES.REQUEST;
                      const Icon = STATUS_ICONS[reservation.status] || Clock;

                      const adults = reservation.adults_count || 0;
                      const children = reservation.children_count || 0;
                      const infants = reservation.infants_count || 0;
                      const pax = [
                        adults > 0 ? `${adults}A` : null,
                        children > 0 ? `${children}C` : null,
                        infants > 0 ? `${infants}I` : null,
                      ].filter(Boolean).join(' ');

                      return (
                        <div
                          key={reservation.id}
                          className="absolute top-1 bottom-1 pointer-events-auto cursor-pointer group/booking"
                          style={{ left: layout.left, width: layout.width }}
                          onClick={(e) => { e.stopPropagation(); if (onBookingEdit && visible) onBookingEdit(reservation); }}
                        >
                          <div
                            className="h-full rounded flex flex-col justify-center px-2 overflow-hidden relative"
                            style={{
                              backgroundColor: visible ? style.bg : '#f1f5f9',
                              borderLeft: `4px solid ${visible ? (client?.color_hex || style.border) : '#cbd5e1'}`,
                              border: `1px solid ${visible ? style.border : '#e2e8f0'}`,
                              borderLeftWidth: '4px',
                            }}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: visible ? style.text : '#94a3b8' }} />
                              <span className="text-xs font-semibold truncate" style={{ color: visible ? style.text : '#94a3b8' }}>
                                {visible ? (client?.name || 'Client') : '•••'}
                              </span>
                            </div>
                            {visible && (pax || reservation.bed_configuration) && (
                              <div className="text-xs truncate" style={{ color: style.text, opacity: 0.8 }}>
                                {[pax, reservation.bed_configuration].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {visible && onBookingEdit && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                                <Edit className="w-3 h-3" style={{ color: style.text }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {rooms.length === 0 && !isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <div className="text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune chambre à afficher</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <RoomModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
      />
    </>
  );
}