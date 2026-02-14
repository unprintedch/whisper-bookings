import React, { useState } from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Edit, Eye, Clock, CheckCircle2, DollarSign, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";

const statusColors = {
  OPTION: "bg-amber-100 border-amber-300 text-amber-800",
  RESERVE: "bg-blue-100 border-blue-300 text-blue-800",
  CONFIRME: "bg-emerald-100 border-emerald-300 text-emerald-800",
  PAYE: "bg-green-100 border-green-300 text-green-800",
  ANNULE: "bg-gray-100 border-gray-300 text-gray-500"
};

const statusIcons = {
  OPTION: { icon: Clock, color: "text-amber-600" },
  RESERVE: { icon: Clock, color: "text-yellow-700" },
  CONFIRME: { icon: CheckCircle2, color: "text-emerald-600" },
  PAYE: { icon: DollarSign, color: "text-green-600" },
  ANNULE: { icon: X, color: "text-gray-500" }
};

const statusBackgrounds = {
  OPTION: '#fef3c7',
  RESERVE: '#dbeafe',
  CONFIRME: '#d1fae5',
  PAYE: '#d1fae5',
  ANNULE: '#f1f5f9'
};

function RoomDetailsModal({ room, isOpen, onClose, onEdit }) {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
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
          {room.photo_url ?
          <div className="aspect-video w-full overflow-hidden">
              <img
              src={room.photo_url}
              alt={room.name}
              className="w-full h-full object-cover"
              loading="lazy" />

            </div> :

          <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-slate-400" />
            </div>
          }

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
                  <Badge variant={room.is_active ? "default" : "secondary"} className={room.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                    {room.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-600 mb-2">Bed Configurations</h4>
              <div className="space-y-2">
                {room.bed_configurations?.map((config, index) =>
                <div key={index} className="bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{config.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {config.max_occupancy} people
                      </Badge>
                    </div>
                  </div>
                ) || <p className="text-sm text-slate-500">No bed configurations defined</p>}
              </div>
            </div>
          </div>

          {room.notes &&
          <div>
              <h4 className="font-medium text-slate-600 mb-2">Notes</h4>
              <div className="bg-slate-50 p-3">
                <p className="text-sm text-slate-700">{room.notes}</p>
              </div>
            </div>
          }

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {isAdmin &&
            <Button onClick={() => onEdit(room)} className="bg-yellow-700 hover:bg-yellow-800">
                <Edit className="w-4 h-4 mr-2" />
                Edit Room
              </Button>
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>);

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
  isPublicView = false
}) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const getReservationsForRoom = (roomId) => {
    return reservations.filter((reservation) => reservation.room_id === roomId);
  };

  const getGroupForReservation = (reservation) => {
    return groups.find((group) => group.id === reservation?.group_id);
  };

  const getClientForReservation = (reservation) => {
    return clients.find((client) => client.id === reservation?.client_id);
  };

  const calculateBookingPosition = (reservation, dateColumns) => {
    if (!reservation.date_checkin || !reservation.date_checkout) {
      console.warn("Skipping reservation with invalid dates:", reservation);
      return null;
    }

    const checkin = new Date(reservation.date_checkin + 'T00:00:00');
    const checkout = new Date(reservation.date_checkout + 'T00:00:00');

    const normalizedDateColumns = dateColumns.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));

    const viewStart = normalizedDateColumns[0];
    const viewEnd = new Date(normalizedDateColumns[normalizedDateColumns.length - 1].getFullYear(), normalizedDateColumns[normalizedDateColumns.length - 1].getMonth(), normalizedDateColumns[normalizedDateColumns.length - 1].getDate() + 1, 0, 0, 0);

    if (checkin >= viewEnd || checkout <= viewStart) {
      return null;
    }

    let startIndex;
    let startsBefore = false;
    if (checkin < viewStart) {
      startIndex = 0;
      startsBefore = true;
    } else {
      startIndex = normalizedDateColumns.findIndex((date) =>
      date.getFullYear() === checkin.getFullYear() &&
      date.getMonth() === checkin.getMonth() &&
      date.getDate() === checkin.getDate()
      );
    }

    if (startIndex === -1) return null;

    let endIndex;
    let endsAfter = false;
    const checkoutDateOnly = new Date(checkout.getFullYear(), checkout.getMonth(), checkout.getDate());
    const foundEndIndex = normalizedDateColumns.findIndex((date) => date.getTime() === checkoutDateOnly.getTime());

    if (foundEndIndex !== -1) {
      endIndex = foundEndIndex;
    } else {
      endIndex = normalizedDateColumns.length;
      if (checkout > viewEnd) {
        endsAfter = true;
      }
    }

    return {
      startIndex,
      endIndex,
      reservation,
      startsBefore: startsBefore,
      endsAfter: endsAfter
    };
  };

  const handleBookingClick = (reservation, event) => {
    event.stopPropagation();

    if (currentUser?.custom_role === 'agency') {
      const client = clients.find((c) => c.id === reservation.client_id);
      if (client?.agency_id !== currentUser.agency_id) {
        return;
      }
    }

    if (onBookingEdit) {
      onBookingEdit(reservation);
    }
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  const handleRoomEdit = (room) => {
    setIsRoomModalOpen(false);
    if (onRoomEdit) {
      onRoomEdit(room);
    }
  };

  const getSiteInfo = (siteId) => {
    return sites.find((site) => site.id === siteId);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array(8).fill(0).map((_, i) =>
        <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-80 h-20" />
            <div className="flex-1 grid grid-cols-7 gap-1">
              {Array(7).fill(0).map((_, j) =>
            <Skeleton key={j} className="h-20" />
            )}
            </div>
          </div>
        )}
      </div>);

  }

  const ROOM_COLUMN_WIDTH = 230;

  const canSeeClientName = (reservation) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;

    const client = clients.find((c) => c.id === reservation.client_id);
    return client?.agency_id === currentUser.agency_id;
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div className="relative" style={{ minWidth: `${ROOM_COLUMN_WIDTH + dateColumns.length * 120}px` }}>
          <div className="flex sticky top-0 z-50 bg-white border-b border-slate-200">
            <div className="bg-slate-50 font-semibold text-slate-700 border-r border-slate-200 flex items-center justify-center flex-shrink-0 sticky left-0 z-50"
            style={{ width: `${ROOM_COLUMN_WIDTH}px` }}>
              <span className="text-lg">Rooms</span>
            </div>
            <div className="flex flex-shrink-0">
              {dateColumns.map((date) =>
              <div
                key={date.toISOString()}
                className={`border-r border-slate-200 flex items-center justify-center py-3 flex-shrink-0 ${
                highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50/40'} ${
                format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                style={{ width: '120px' }}>
                  <div className="text-sm font-bold text-slate-800 text-center">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide mr-1">
                      {format(date, 'EEE', { locale: enUS })}
                    </span>
                    <span>
                      {format(date, 'd MMM', { locale: enUS })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            {rooms.map((room, roomIndex) => {
              const roomReservations = getReservationsForRoom(room.id);
              const bookingPositions = roomReservations.
              map((reservation) => calculateBookingPosition(reservation, dateColumns)).
              filter((position) => position !== null);
              const siteInfo = getSiteInfo(room.site_id);

              return (
                <div
                  key={`${room.id}-${roomIndex}`}
                  className="flex border-b border-slate-200 group relative"
                  style={{ height: '50px' }}>

                  <div
                    className={`bg-white border-r border-slate-200 p-3 flex-shrink-0 sticky left-0 z-40 h-full ${
                    !isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''}`
                    }
                    style={{ width: `${ROOM_COLUMN_WIDTH}px` }}
                    onClick={!isPublicView ? () => handleRoomClick(room) : undefined}>

                    <div className="flex items-center gap-2 h-full">
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm truncate">
                            {siteInfo?.name || 'Unknown'} – {room.number ? `${room.number} – ` : ''}{room.name}
                          </h4>
                          {!isPublicView &&
                          <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          }
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

                  <div className="relative flex-shrink-0 h-full">
                    <div className="flex h-full relative z-10">
                      {dateColumns.map((date, dateIndex) => (
                        <div
                          key={`${room.id}-${date.toISOString()}-${dateIndex}`}
                          className={`border-r border-slate-200 relative flex-shrink-0 ${
                          highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100/50' : ''} ${
                          format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                          style={{
                            width: '120px',
                            height: '100%'
                          }}>
                          {isPublicView && onCellClick && (
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-[60px] cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-center group/book z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCellClick(room, date);
                              }}
                            >
                              <div className="flex items-center gap-1 text-yellow-700 text-xs font-medium opacity-0 group-hover/book:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4" />
                                <span>Book</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-0 pointer-events-none">
                      {bookingPositions.map((position, posIndex) => {
                        const client = getClientForReservation(position.reservation);
                        const isOwnAgency = canSeeClientName(position.reservation);

                        const COL_WIDTH = 120;
                        const HALF_COL_WIDTH = COL_WIDTH / 2;

                        let startPixel;
                        if (position.startsBefore) {
                          startPixel = position.startIndex * COL_WIDTH;
                        } else {
                          startPixel = position.startIndex * COL_WIDTH + HALF_COL_WIDTH;
                        }

                        let widthPixel;
                        if (position.endsAfter) {
                          widthPixel = position.endIndex * COL_WIDTH - startPixel;
                        } else {
                          const endPixel = position.endIndex * COL_WIDTH + HALF_COL_WIDTH;
                          widthPixel = endPixel - startPixel;
                        }

                        const adults = position.reservation.adults_count || 0;
                        const children = position.reservation.children_count || 0;
                        const infants = position.reservation.infants_count || 0;
                        const occupancyDisplay = [
                        adults > 0 ? `${adults}A` : null,
                        children > 0 ? `${children}C` : null,
                        infants > 0 ? `${infants}I` : null].
                        filter(Boolean).join(' ');

                        const reservationStatus = position.reservation.status;
                        const StatusIcon = statusIcons[reservationStatus]?.icon || Clock;
                        const statusColor = statusIcons[reservationStatus]?.color || "text-gray-500";
                        const backgroundColor = statusBackgrounds[reservationStatus] || '#f8fafc';

                        return (
                          <div
                            key={position.reservation.id}
                            className={`absolute top-0 pointer-events-auto transition-all duration-200 ${
                            isOwnAgency ? 'cursor-pointer group/booking' : 'cursor-default'}`
                            }
                            style={{
                              left: `${startPixel}px`,
                              width: `${Math.max(widthPixel, COL_WIDTH / 2)}px`,
                              height: '100%'
                            }}
                            onClick={(e) => handleBookingClick(position.reservation, e)}>

                            <div className="absolute inset-y-1 w-full flex flex-col justify-center relative rounded px-2 py-1  opacity-40 h-full"



                            style={{
                              backgroundColor: isOwnAgency ? backgroundColor : '#cbd5e1',
                              borderLeft: `5px solid ${isOwnAgency ? client?.color_hex || '#3b82f6' : '#94a3b8'}`
                            }}>

                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 ${isOwnAgency ? statusColor : 'text-slate-400'} flex-shrink-0`} />
                                <div className="text-sm font-semibold text-slate-800 truncate">
                                  {isOwnAgency ? client?.name || 'Client' : '•••'}
                                </div>
                              </div>

                              {isOwnAgency &&
                              <div>
                                  {(occupancyDisplay || position.reservation.bed_configuration) &&
                                <div className="text-xs text-slate-600 truncate">
                                      {occupancyDisplay && position.reservation.bed_configuration ?
                                  `${occupancyDisplay} - ${position.reservation.bed_configuration}` :
                                  occupancyDisplay || position.reservation.bed_configuration}
                                    </div>
                                }
                                </div>
                              }

                              {isOwnAgency &&
                              <div className="absolute top-1 right-1 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                                  <Edit className="w-3 h-3 text-slate-500" />
                                </div>
                              }
                            </div>
                          </div>);

                      })}
                    </div>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </div>

      <RoomDetailsModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onEdit={handleRoomEdit} />

    </>);

}