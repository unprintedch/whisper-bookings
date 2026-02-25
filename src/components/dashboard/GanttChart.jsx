import React, { useState } from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Edit, Eye, Clock, CheckCircle2, DollarSign, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";

// ── LAYOUT RULE (NEVER CHANGE) ────────────────────────────────────────────────
// COL_WIDTH = 120px per day column.
// A booking bar starts at the MIDPOINT of the check-in day column
// and ends at the MIDPOINT of the check-out day column.
// startPixel = checkinIndex * 120 + 60   (or 0 if starts before view)
// endPixel   = checkoutIndex * 120 + 60  (or n*120 if ends after view)
// The same midpoint rule applies to hover / selected highlights.
// ─────────────────────────────────────────────────────────────────────────────
const COL_WIDTH = 120;
const HALF = 60; // midpoint = midday

const statusIcons = {
  OPTION:   { icon: Clock,        color: "text-amber-600"   },
  RESERVE:  { icon: Clock,        color: "text-yellow-700"  },
  CONFIRME: { icon: CheckCircle2, color: "text-emerald-600" },
  PAYE:     { icon: DollarSign,   color: "text-green-600"   },
  ANNULE:   { icon: X,            color: "text-gray-500"    },
};

const statusBackgrounds = {
  OPTION:   '#fef3c7',
  RESERVE:  '#dbeafe',
  CONFIRME: '#d1fae5',
  PAYE:     '#d1fae5',
  ANNULE:   '#f1f5f9',
};

// ── Room Details Modal ────────────────────────────────────────────────────────
function RoomDetailsModal({ room, isOpen, onClose, onEdit }) {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    User.me().then(setUser).catch(() => {});
  }, []);

  if (!room) return null;
  const isAdmin = user?.role === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-yellow-700" />
            {room.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {room.photo_url ? (
            <div className="aspect-video w-full overflow-hidden">
              <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-slate-400" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-slate-600 mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium">{room.type_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Capacity:</span>
                  <span className="font-medium">{room.capacity_max} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <Badge className={room.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                    {room.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-600 mb-2">Bed Configurations</h4>
              <div className="space-y-2">
                {room.bed_configurations?.map((config, index) => (
                  <div key={index} className="bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{config.name}</span>
                      <Badge variant="outline" className="text-xs">{config.max_occupancy} people</Badge>
                    </div>
                  </div>
                )) || <p className="text-sm text-slate-500">No bed configurations defined</p>}
              </div>
            </div>
          </div>
          {room.notes && (
            <div>
              <h4 className="font-medium text-slate-600 mb-2">Notes</h4>
              <div className="bg-slate-50 p-3">
                <p className="text-sm text-slate-700">{room.notes}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {isAdmin && (
              <Button onClick={() => onEdit(room)} className="bg-yellow-700 hover:bg-yellow-800">
                <Edit className="w-4 h-4 mr-2" /> Edit Room
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── GanttChart ────────────────────────────────────────────────────────────────
export default function GanttChart({
  rooms,
  reservations,
  groups,
  clients = [],
  dateColumns,
  highlightDate,
  isLoading,
  onCellClick,
  onBookingEdit,
  onBookingMove,
  onBookingResize,
  onRoomEdit,
  sites = [],
  isPublicView = false,
  selectedSlots = [],
  onSlotToggle,
}) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null); // { roomId, dateStr }

  React.useEffect(() => {
    User.me().then(setCurrentUser).catch(() => {});
  }, []);

  const getReservationsForRoom = (roomId) =>
    reservations.filter((r) => r.room_id === roomId);

  const getClientForReservation = (reservation) =>
    clients.find((c) => c.id === reservation?.client_id);

  const canSeeClientName = (reservation) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;
    const client = clients.find((c) => c.id === reservation.client_id);
    return client?.agency_id === currentUser.agency_id;
  };

  // MIDDAY-TO-MIDDAY: bar starts at midpoint of check-in col, ends at midpoint of check-out col
  const calculateBookingPosition = (reservation) => {
    if (!reservation.date_checkin || !reservation.date_checkout) return null;

    const checkin  = new Date(reservation.date_checkin  + 'T00:00:00');
    const checkout = new Date(reservation.date_checkout + 'T00:00:00');

    const normalized = dateColumns.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    const viewStart  = normalized[0];
    const lastCol    = normalized[normalized.length - 1];
    const viewEnd    = new Date(lastCol.getFullYear(), lastCol.getMonth(), lastCol.getDate() + 1);

    if (checkin >= viewEnd || checkout <= viewStart) return null;

    let startIndex, startsBefore = false;
    if (checkin < viewStart) {
      startIndex = 0;
      startsBefore = true;
    } else {
      startIndex = normalized.findIndex((d) =>
        d.getFullYear() === checkin.getFullYear() &&
        d.getMonth()    === checkin.getMonth()    &&
        d.getDate()     === checkin.getDate()
      );
      if (startIndex === -1) return null;
    }

    let endIndex, endsAfter = false;
    const checkoutOnly = new Date(checkout.getFullYear(), checkout.getMonth(), checkout.getDate());
    const foundEnd = normalized.findIndex((d) => d.getTime() === checkoutOnly.getTime());
    if (foundEnd !== -1) {
      endIndex = foundEnd;
    } else {
      endIndex = normalized.length;
      if (checkout > viewEnd) endsAfter = true;
    }

    return { startIndex, endIndex, reservation, startsBefore, endsAfter };
  };

  const handleBookingClick = (reservation, event) => {
    event.stopPropagation();
    if (currentUser?.custom_role === 'agency') {
      const client = clients.find((c) => c.id === reservation.client_id);
      if (client?.agency_id !== currentUser.agency_id) return;
    }
    if (onBookingEdit) onBookingEdit(reservation);
  };

  const getSiteInfo = (siteId) => sites.find((s) => s.id === siteId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-80 h-20" />
            <div className="flex-1 grid grid-cols-7 gap-1">
              {Array(7).fill(0).map((_, j) => <Skeleton key={j} className="h-20" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const ROOM_COLUMN_WIDTH = 230;

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div className="relative" style={{ minWidth: `${ROOM_COLUMN_WIDTH + dateColumns.length * COL_WIDTH}px` }}>

          {/* Header */}
          <div className="flex sticky top-0 z-50 bg-white border-b border-slate-200">
            <div
              className="bg-slate-50 font-semibold text-slate-700 border-r border-slate-200 flex items-center justify-center flex-shrink-0 sticky left-0 z-50"
              style={{ width: `${ROOM_COLUMN_WIDTH}px` }}
            >
              <span className="text-lg">Rooms</span>
            </div>
            <div className="flex flex-shrink-0">
              {dateColumns.map((date) => (
                <div
                  key={date.toISOString()}
                  className={`border-r border-slate-200 flex items-center justify-center py-3 flex-shrink-0 ${
                    highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50/40'
                  } ${format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                  style={{ width: `${COL_WIDTH}px` }}
                >
                  <div className="text-sm font-bold text-slate-800 text-center">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide mr-1">
                      {format(date, 'EEE', { locale: enUS })}
                    </span>
                    <span>{format(date, 'd MMM', { locale: enUS })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room rows */}
          <div className="relative">
            {rooms.map((room, roomIndex) => {
              const bookingPositions = getReservationsForRoom(room.id)
                .map(calculateBookingPosition)
                .filter(Boolean);
              const siteInfo = getSiteInfo(room.site_id);

              return (
                <div
                  key={`${room.id}-${roomIndex}`}
                  className="flex border-b border-slate-200 group relative"
                  style={{ height: '50px' }}
                >
                  {/* Room label */}
                  <div
                    className={`bg-white border-r border-slate-200 p-3 flex-shrink-0 sticky left-0 z-40 h-full ${
                      !isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''
                    }`}
                    style={{ width: `${ROOM_COLUMN_WIDTH}px` }}
                    onClick={!isPublicView ? () => { setSelectedRoom(room); setIsRoomModalOpen(true); } : undefined}
                  >
                    <div className="flex items-center gap-2 h-full">
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm truncate">
                            {siteInfo?.name || 'Unknown'} – {room.number ? `${room.number} – ` : ''}{room.name}
                          </h4>
                          {!isPublicView && <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <span className="truncate">{room.type_label}</span>
                          <span className="text-slate-400">–</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Users className="w-3 h-3" />
                            <span>{room.capacity_max}</span>
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cell grid + booking bars */}
                  <div className="relative flex-shrink-0 h-full">

                    {/* Day cells */}
                    <div className="flex h-full">
                      {dateColumns.map((date, dateIndex) => {
                        const dateStr    = format(date, 'yyyy-MM-dd');
                        const isSelected = selectedSlots.some(s => s.roomId === room.id && s.date === dateStr);
                        const isHovered  = !isPublicView && hoveredCell?.roomId === room.id && hoveredCell?.dateStr === dateStr;
                        const isSunday   = format(date, 'EEE', { locale: enUS }) === 'Sun';
                        const isHighlighted = highlightDate && isSameDay(date, highlightDate);

                        return (
                          <div
                            key={`${room.id}-${date.toISOString()}-${dateIndex}`}
                            className={`border-r border-slate-200 relative flex-shrink-0 ${
                              !isPublicView ? 'cursor-pointer' : ''
                            } ${isSunday ? 'border-r-2 border-r-slate-300' : ''} ${
                              isHighlighted && !isSelected && !isHovered ? 'bg-slate-100/50' : ''
                            }`}
                            style={{ width: `${COL_WIDTH}px`, height: '100%' }}
                            onClick={!isPublicView && onCellClick ? () => onCellClick(room, date) : undefined}
                            onMouseEnter={!isPublicView ? () => setHoveredCell({ roomId: room.id, dateStr }) : undefined}
                            onMouseLeave={!isPublicView ? () => setHoveredCell(null) : undefined}
                          >
                            {/* Right half = the night starting this day (midday-to-midday rule) */}
                            {isSelected && (
                              <div
                                className="absolute top-0 bottom-0 right-0 pointer-events-none flex items-center justify-center"
                                style={{ width: `${HALF}px`, backgroundColor: 'rgba(234,179,8,0.25)' }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" />
                              </div>
                            )}
                            {!isSelected && isHovered && (
                              <div
                                className="absolute top-0 bottom-0 right-0 pointer-events-none flex items-center justify-center"
                                style={{ width: `${HALF}px`, backgroundColor: 'rgba(59,130,246,0.10)' }}
                              >
                                <Plus className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Booking bars — MIDDAY-TO-MIDDAY */}
                    <div className="absolute inset-0 pointer-events-none">
                      {bookingPositions.map((position) => {
                        const client      = getClientForReservation(position.reservation);
                        const isOwnAgency = canSeeClientName(position.reservation);

                        // startPixel = midpoint of check-in column
                        const startPixel = position.startsBefore
                          ? position.startIndex * COL_WIDTH
                          : position.startIndex * COL_WIDTH + HALF;

                        // endPixel = midpoint of check-out column
                        const endPixel = position.endsAfter
                          ? position.endIndex * COL_WIDTH
                          : position.endIndex * COL_WIDTH + HALF;

                        const widthPixel = Math.max(endPixel - startPixel, HALF);

                        const adults   = position.reservation.adults_count   || 0;
                        const children = position.reservation.children_count || 0;
                        const infants  = position.reservation.infants_count  || 0;
                        const occupancyDisplay = [
                          adults   > 0 ? `${adults}A`   : null,
                          children > 0 ? `${children}C` : null,
                          infants  > 0 ? `${infants}I`  : null,
                        ].filter(Boolean).join(' ');

                        const status          = position.reservation.status;
                        const StatusIcon      = statusIcons[status]?.icon || Clock;
                        const statusColor     = statusIcons[status]?.color || 'text-gray-500';
                        const backgroundColor = statusBackgrounds[status]  || '#f8fafc';

                        return (
                          <div
                            key={position.reservation.id}
                            className={`absolute top-0 pointer-events-auto transition-all duration-200 ${
                              isOwnAgency ? 'cursor-pointer group/booking' : 'cursor-default'
                            }`}
                            style={{ left: `${startPixel}px`, width: `${widthPixel}px`, height: '100%' }}
                            onClick={(e) => handleBookingClick(position.reservation, e)}
                          >
                            <div
                              className="absolute inset-y-1 w-full flex flex-col justify-center rounded px-2 py-1"
                              style={{
                                backgroundColor: isOwnAgency ? backgroundColor : '#cbd5e1',
                                borderLeft: `5px solid ${isOwnAgency ? client?.color_hex || '#3b82f6' : '#94a3b8'}`,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 ${isOwnAgency ? statusColor : 'text-slate-400'} flex-shrink-0`} />
                                <div className="text-sm font-semibold text-slate-800 truncate">
                                  {isOwnAgency ? client?.name || 'Client' : '•••'}
                                </div>
                              </div>
                              {isOwnAgency && (occupancyDisplay || position.reservation.bed_configuration) && (
                                <div className="text-xs text-slate-600 truncate">
                                  {occupancyDisplay && position.reservation.bed_configuration
                                    ? `${occupancyDisplay} - ${position.reservation.bed_configuration}`
                                    : occupancyDisplay || position.reservation.bed_configuration}
                                </div>
                              )}
                              {isOwnAgency && (
                                <div className="absolute top-1 right-1 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                                  <Edit className="w-3 h-3 text-slate-500" />
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
          </div>
        </div>
      </div>

      <RoomDetailsModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onEdit={(room) => { setIsRoomModalOpen(false); if (onRoomEdit) onRoomEdit(room); }}
      />
    </>
  );
}