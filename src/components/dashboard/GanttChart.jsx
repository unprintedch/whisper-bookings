import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Edit, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import DateHeader from "./DateHeader";
import RoomRow from "./RoomRow";
import BookingCell from "./BookingCell";



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
            <DateHeader dateColumns={dateColumns} highlightDate={highlightDate} />
          </div>

          <div className="relative">
            {rooms.map((room, roomIndex) => {
              const roomReservations = getReservationsForRoom(room.id);
              const bookingPositions = roomReservations
                .map((reservation) => calculateBookingPosition(reservation, dateColumns))
                .filter((position) => position !== null);
              const siteInfo = getSiteInfo(room.site_id);

              return (
                <RoomRow
                  key={`${room.id}-${roomIndex}`}
                  room={room}
                  siteInfo={siteInfo}
                  dateColumns={dateColumns}
                  bookingPositions={bookingPositions}
                  highlightDate={highlightDate}
                  isPublicView={isPublicView}
                  onRoomClick={handleRoomClick}
                  onBookingClick={handleBookingClick}
                  getClientForReservation={getClientForReservation}
                  canSeeClientName={canSeeClientName}
                />
              );
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