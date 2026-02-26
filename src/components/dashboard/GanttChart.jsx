import React, { useState } from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Edit, Eye, Clock, CheckCircle2, DollarSign } from "lucide-react";
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

const GRID_CONFIG = {
  COL_WIDTH: 120,
  ROW_HEIGHT: 50,
  ROOM_LABEL_WIDTH: 230
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

function GanttBooking({ reservation, client, dateColumns, isOwnAgency, onBookingClick }) {
  if (!reservation.date_checkin || !reservation.date_checkout) return null;

  const checkin = new Date(reservation.date_checkin);
  const checkout = new Date(reservation.date_checkout);
  
  const startIdx = dateColumns.findIndex(d => isSameDay(d, checkin));
  const endIdx = dateColumns.findIndex(d => isSameDay(d, checkout));
  
  if (startIdx === -1) return null;
  const colSpan = endIdx === -1 ? dateColumns.length - startIdx : Math.max(1, endIdx - startIdx);
  
  const adults = reservation.adults_count || 0;
  const children = reservation.children_count || 0;
  const infants = reservation.infants_count || 0;
  const occupancyDisplay = [
    adults > 0 ? `${adults}A` : null,
    children > 0 ? `${children}C` : null,
    infants > 0 ? `${infants}I` : null
  ].filter(Boolean).join(' ');

  const reservationStatus = reservation.status;
  const StatusIcon = statusIcons[reservationStatus]?.icon || Clock;
  const statusColor = statusIcons[reservationStatus]?.color || "text-gray-500";
  const backgroundColor = statusBackgrounds[reservationStatus] || '#f8fafc';

  return (
    <div
      className={`col-span-${colSpan} rounded px-2 py-1 ${isOwnAgency ? 'cursor-pointer group' : 'cursor-default'}`}
      style={{
        backgroundColor: isOwnAgency ? backgroundColor : '#cbd5e1',
        borderLeft: `4px solid ${isOwnAgency ? client?.color_hex || '#3b82f6' : '#94a3b8'}`,
        gridColumn: `${startIdx + 1} / span ${colSpan}`
      }}
      onClick={() => isOwnAgency && onBookingClick(reservation)}>
      <div className="flex items-center gap-2 min-h-6">
        <StatusIcon className={`w-3 h-3 flex-shrink-0 ${isOwnAgency ? statusColor : 'text-slate-400'}`} />
        <span className="text-xs font-semibold text-slate-800 truncate">
          {isOwnAgency ? client?.name || 'Client' : '•••'}
        </span>
        {isOwnAgency && (
          <Edit className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
        )}
      </div>
      {isOwnAgency && (occupancyDisplay || reservation.bed_configuration) && (
        <div className="text-xs text-slate-600 truncate">
          {occupancyDisplay && reservation.bed_configuration
            ? `${occupancyDisplay} - ${reservation.bed_configuration}`
            : occupancyDisplay || reservation.bed_configuration}
        </div>
      )}
    </div>
  );
}

export default function GanttChart({
  rooms,
  reservations,
  clients = [],
  dateColumns,
  highlightDate,
  isLoading,
  onCellClick,
  onBookingEdit,
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

  const canSeeClientName = (reservation) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;
    const client = clients.find((c) => c.id === reservation.client_id);
    return client?.agency_id === currentUser.agency_id;
  };

  const getSiteInfo = (siteId) => sites.find((site) => site.id === siteId);
  const getClientForReservation = (res) => clients.find((c) => c.id === res?.client_id);
  const getRoomReservations = (roomId) => reservations.filter((r) => r.room_id === roomId);

  const handleBookingClick = (reservation, event) => {
    if (event) event.stopPropagation();
    if (currentUser?.custom_role === 'agency') {
      const client = clients.find((c) => c.id === reservation.client_id);
      if (client?.agency_id !== currentUser.agency_id) return;
    }
    onBookingEdit?.(reservation);
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

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

  const totalWidth = GRID_CONFIG.ROOM_LABEL_WIDTH + dateColumns.length * GRID_CONFIG.COL_WIDTH;

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div style={{ width: `${totalWidth}px` }}>
          {/* Header */}
          <div className="flex sticky top-0 z-50 bg-white border-b border-slate-200">
            <div
              className="bg-slate-50 font-semibold text-slate-700 border-r border-slate-200 flex items-center justify-center flex-shrink-0 sticky left-0 z-50"
              style={{ width: `${GRID_CONFIG.ROOM_LABEL_WIDTH}px` }}>
              Rooms
            </div>
            <div className="flex">
              {dateColumns.map((date) => (
                <div
                  key={date.toISOString()}
                  className={`border-r border-slate-200 flex items-center justify-center py-3 flex-shrink-0 ${
                    highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50/40'} ${
                    format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                  style={{ width: `${GRID_CONFIG.COL_WIDTH}px` }}>
                  <div className="text-sm font-bold text-slate-800 text-center">
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      {format(date, 'EEE', { locale: enUS })}
                    </span>
                    <div>{format(date, 'd MMM', { locale: enUS })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rooms.map((room) => {
            const siteInfo = getSiteInfo(room.site_id);
            const roomReservations = getRoomReservations(room.id);

            return (
              <div key={room.id} className="flex border-b border-slate-200 group">
                {/* Room Label */}
                <div
                  className={`border-r border-slate-200 p-3 flex-shrink-0 sticky left-0 z-40 ${
                    !isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
                  style={{ width: `${GRID_CONFIG.ROOM_LABEL_WIDTH}px`, height: `${GRID_CONFIG.ROW_HEIGHT}px` }}
                  onClick={!isPublicView ? () => handleRoomClick(room) : undefined}>
                  <div className="flex flex-col justify-center h-full">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 text-sm truncate">
                        {siteInfo?.name || 'Unknown'} – {room.number ? `${room.number} – ` : ''}{room.name}
                      </h4>
                      {!isPublicView && <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {room.type_label} – <Users className="w-3 h-3" /> {room.capacity_max}
                    </p>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex">
                  {dateColumns.map((date, idx) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const dayReservations = roomReservations.filter(
                      r => {
                        const checkin = new Date(r.date_checkin);
                        const checkout = new Date(r.date_checkout);
                        return date >= checkin && date < checkout;
                      }
                    );

                    return (
                      <div
                        key={`${room.id}-${idx}`}
                        className={`border-r border-slate-200 flex flex-col relative group/cell flex-shrink-0 ${
                          !isPublicView ? 'cursor-pointer hover:bg-blue-50' : ''} ${
                          highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100/50' : ''} ${
                          format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                        style={{ width: `${GRID_CONFIG.COL_WIDTH}px`, height: `${GRID_CONFIG.ROW_HEIGHT}px`, padding: '2px' }}
                        onClick={!isPublicView && onCellClick ? () => onCellClick(room, date) : undefined}>
                        {dayReservations.length > 0 ? (
                          dayReservations.map(res => (
                            <GanttBooking
                              key={res.id}
                              reservation={res}
                              client={getClientForReservation(res)}
                              dateColumns={dateColumns}
                              isOwnAgency={canSeeClientName(res)}
                              onBookingClick={handleBookingClick}
                            />
                          ))
                        ) : !isPublicView ? (
                          <div className="flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-yellow-700 text-xs">
                            <Plus className="w-3 h-3" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RoomDetailsModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onEdit={(r) => {
          setIsRoomModalOpen(false);
          onRoomEdit?.(r);
        }}
      />
    </>
  );
}