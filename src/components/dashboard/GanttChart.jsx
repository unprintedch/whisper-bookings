import React, { useState } from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Edit, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import BookingCell from "@/components/dashboard/BookingCell";

const ROOM_COLUMN_WIDTH = 230;
const COL_WIDTH = 120;

function RoomDetailsModal({ room, isOpen, onClose, onEdit }) {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
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
                <Edit className="w-4 h-4 mr-2" />
                Edit Room
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  selectedSlots = [],
  onSlotToggle,
  isPublicView = false
}) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const getReservationsForRoom = (roomId) =>
    reservations.filter((r) => r.room_id === roomId);

  const getClientForReservation = (reservation) =>
    clients.find((c) => c.id === reservation?.client_id);

  const calculateBookingPosition = (reservation) => {
    if (!reservation.date_checkin || !reservation.date_checkout) return null;

    const checkin = new Date(reservation.date_checkin + 'T00:00:00');
    const checkout = new Date(reservation.date_checkout + 'T00:00:00');
    const normalized = dateColumns.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    const viewStart = normalized[0];
    const last = normalized[normalized.length - 1];
    const viewEnd = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);

    if (checkin >= viewEnd || checkout <= viewStart) return null;

    let startIndex, startsBefore = false;
    if (checkin < viewStart) {
      startIndex = 0;
      startsBefore = true;
    } else {
      startIndex = normalized.findIndex((d) =>
        d.getFullYear() === checkin.getFullYear() &&
        d.getMonth() === checkin.getMonth() &&
        d.getDate() === checkin.getDate()
      );
    }
    if (startIndex === -1) return null;

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

  const canSeeClientName = (reservation) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;
    const client = clients.find((c) => c.id === reservation.client_id);
    return client?.agency_id === currentUser.agency_id;
  };

  const handleBookingClick = (reservation, event) => {
    event.stopPropagation();
    if (currentUser?.custom_role === 'agency') {
      const client = clients.find((c) => c.id === reservation.client_id);
      if (client?.agency_id !== currentUser.agency_id) return;
    }
    if (onBookingEdit) onBookingEdit(reservation);
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  const handleRoomEdit = (room) => {
    setIsRoomModalOpen(false);
    if (onRoomEdit) onRoomEdit(room);
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

          {/* Rows */}
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
                    onClick={!isPublicView ? () => handleRoomClick(room) : undefined}
                  >
                    <div className="flex items-center gap-2 h-full">
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm truncate">
                            {siteInfo?.name || 'Unknown'} – {room.number ? `${room.number} – ` : ''}{room.name}
                          </h4>
                          {!isPublicView && (
                            <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          )}
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

                  {/* Date cells + bookings */}
                  <div className="relative flex-shrink-0 h-full">
                    <div className="flex h-full">
                      {dateColumns.map((date, dateIndex) => (
                        <div
                          key={`${room.id}-${date.toISOString()}-${dateIndex}`}
                          className={`border-r border-slate-200 flex items-center justify-center relative group/cell flex-shrink-0 ${
                            !isPublicView ? 'cursor-pointer hover:bg-blue-50' : ''
                          } ${
                            highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100/50' : ''
                          } ${format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                          style={{ width: `${COL_WIDTH}px`, height: '100%' }}
                          onClick={!isPublicView && onCellClick ? () => onCellClick(room, date) : undefined}
                        >
                          {!isPublicView && (
                            <div className="flex items-center gap-1 text-yellow-700 text-sm opacity-0 group-hover/cell:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4" />
                              <span>Book</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-0 pointer-events-none">
                      {bookingPositions.map((position) => {
                        const client = getClientForReservation(position.reservation);
                        const isOwnAgency = canSeeClientName(position.reservation);
                        return (
                          <BookingCell
                            key={position.reservation.id}
                            position={position}
                            client={client}
                            isOwnAgency={isOwnAgency}
                            onClick={(e) => handleBookingClick(position.reservation, e)}
                          />
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
        onEdit={handleRoomEdit}
      />
    </>
  );
}