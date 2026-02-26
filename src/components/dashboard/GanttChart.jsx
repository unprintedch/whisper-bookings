import React, { useState } from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Edit, Eye, Clock, CheckCircle2, DollarSign, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";

const statusIcons = {
  OPTION: { icon: Clock, color: "text-amber-600" },
  RESERVE: { icon: Clock, color: "text-yellow-700" },
  CONFIRME: { icon: CheckCircle2, color: "text-emerald-600" },
  PAYE: { icon: DollarSign, color: "text-green-600" },
  ANNULE: { icon: X, color: "text-gray-500" }
};

const statusBackgrounds = {
  OPTION: 'bg-amber-50',
  RESERVE: 'bg-blue-50',
  CONFIRME: 'bg-emerald-50',
  PAYE: 'bg-green-50',
  ANNULE: 'bg-slate-50'
};

const COL_WIDTH = 120;

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
            <div className="aspect-video w-full overflow-hidden rounded">
              <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center rounded">
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
                  <span className="font-medium">{room.capacity_max}</span>
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
              <div className="space-y-2 text-sm">
                {room.bed_configurations?.map((config, idx) =>
                  <div key={idx} className="bg-slate-50 p-2 rounded">
                    <div>{config.name}</div>
                    <div className="text-xs text-slate-500">{config.max_occupancy} max</div>
                  </div>
                ) || <p className="text-slate-500">No configurations</p>}
              </div>
            </div>
          </div>
          {room.notes && (
            <div>
              <h4 className="font-medium text-slate-600 mb-2">Notes</h4>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{room.notes}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {isAdmin && (
              <Button onClick={() => onEdit(room)} className="bg-yellow-700 hover:bg-yellow-800">
                <Edit className="w-4 h-4 mr-2" />
                Edit
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
  clients = [],
  dateColumns,
  highlightDate,
  isLoading,
  onCellClick,
  onBookingEdit,
  onSlotToggle,
  onRoomEdit,
  sites = [],
  selectedSlots = [],
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-48 h-12" />
            <div className="flex-1 flex gap-1">
              {Array(7).fill(0).map((_, j) => <Skeleton key={j} className="flex-1 h-12" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getSiteInfo = (siteId) => sites.find((s) => s.id === siteId);
  const getClient = (id) => clients.find((c) => c.id === id);

  const canSeeClient = (res) => {
    if (isPublicView) return false;
    if (!currentUser) return true;
    if (currentUser.custom_role !== 'agency') return true;
    return getClient(res.client_id)?.agency_id === currentUser.agency_id;
  };

  const dateToString = (d) => {
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
  };

  const isDateInRange = (date, checkin, checkout) => {
    const ds = dateToString(date);
    const cis = dateToString(checkin);
    const cos = dateToString(checkout);
    return ds >= cis && ds < cos;
  };

  const getReservationPosition = (res) => {
    const checkinStr = dateToString(res.date_checkin);
    const checkoutStr = dateToString(res.date_checkout);
    
    const startIdx = dateColumns.findIndex(d => dateToString(d) === checkinStr);
    const endIdx = dateColumns.findIndex(d => dateToString(d) === checkoutStr);
    
    if (startIdx === -1 || endIdx === -1) return null;
    
    return {
      startIdx,
      endIdx: endIdx === -1 ? dateColumns.length : endIdx,
      width: (endIdx === -1 ? dateColumns.length : endIdx) - startIdx,
    };
  };

  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex border-b border-slate-200">
            <div
              className="bg-slate-50 border-r border-slate-200 p-3 font-semibold text-slate-700 flex items-center"
              style={{ width: '220px', minWidth: '220px' }}>
              Rooms
            </div>
            <div className="flex">
              {dateColumns.map((date) => (
                <div
                  key={dateToString(date)}
                  className={`border-r border-slate-200 p-2 text-center font-semibold text-sm flex-shrink-0 ${
                    highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50'
                  } ${format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
                  style={{ width: `${COL_WIDTH}px` }}>
                  <div className="text-xs uppercase text-slate-600">{format(date, 'EEE', { locale: enUS })}</div>
                  <div className="text-sm">{format(date, 'd MMM', { locale: enUS })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rooms.map((room) => {
            const roomReservations = reservations.filter(r => r.room_id === room.id);
            
            return (
              <div key={room.id} className="flex border-b border-slate-200 relative" style={{ minHeight: '80px' }}>
                {/* Room Label */}
                <div
                  className={`bg-white border-r border-slate-200 p-3 flex-shrink-0 ${!isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
                  style={{ width: '220px', minWidth: '220px' }}
                  onClick={!isPublicView ? () => {
                    setSelectedRoom(room);
                    setIsRoomModalOpen(true);
                  } : undefined}>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 truncate">
                      {getSiteInfo(room.site_id)?.name} – {room.number && `${room.number} – `}{room.name}
                      {!isPublicView && <Eye className="w-3 h-3 inline ml-1 text-slate-400" />}
                    </div>
                    <div className="text-xs text-slate-500">
                      {room.type_label} · {room.capacity_max} people
                    </div>
                  </div>
                </div>

                {/* Date Columns */}
                <div className="flex relative flex-1">
                  {dateColumns.map((date, idx) => {
                    const dateStr = dateToString(date);
                    const isSelected = selectedSlots.some(s => s.roomId === room.id && s.date === dateStr);

                    return (
                      <div
                        key={dateStr}
                        className={`border-r border-slate-200 flex-shrink-0 relative group/cell ${
                          !isPublicView ? 'cursor-pointer hover:bg-blue-50' : ''
                        } ${isSelected ? 'bg-yellow-100' : highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-50' : 'bg-white'} ${
                          format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''
                        }`}
                        style={{ width: `${COL_WIDTH}px` }}
                        onClick={!isPublicView && onCellClick ? () => onCellClick(room, date) : undefined}
                        onDoubleClick={!isPublicView && onSlotToggle ? () => onSlotToggle(room.id, dateStr) : undefined}>
                        {!isPublicView && (
                          <div className="text-yellow-700 text-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-xs">
                            <Plus className="w-3 h-3 mx-auto" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reservations (absolute overlay) */}
                <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: '220px' }}>
                  {roomReservations.map((res) => {
                    const pos = getReservationPosition(res);
                    if (!pos) return null;

                    const visible = canSeeClient(res);
                    const client = getClient(res.client_id);
                    const StatusIcon = statusIcons[res.status]?.icon || Clock;
                    const statusColor = statusIcons[res.status]?.color || 'text-gray-500';

                    return (
                      <div
                        key={res.id}
                        className={`absolute top-1 pointer-events-auto transition-all duration-200 ${visible ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{
                          left: `${pos.startIdx * COL_WIDTH}px`,
                          width: `${Math.max(pos.width * COL_WIDTH - 4, COL_WIDTH / 2)}px`,
                          height: 'calc(100% - 8px)',
                          borderRadius: '4px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (visible && onBookingEdit) onBookingEdit(res);
                        }}>
                        <div
                          className={`h-full flex flex-col justify-center px-2 py-1 rounded ${statusBackgrounds[res.status] || 'bg-slate-50'}`}
                          style={{
                            borderLeft: `4px solid ${visible ? client?.color_hex || '#3b82f6' : '#94a3b8'}`,
                          }}>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`w-3 h-3 flex-shrink-0 ${statusColor}`} />
                            <span className="font-semibold truncate text-slate-800 text-xs">
                              {visible ? client?.name || 'Client' : '•••'}
                            </span>
                          </div>
                          {visible && (res.adults_count || res.children_count || res.infants_count) && (
                            <div className="text-xs text-slate-600 truncate">
                              {[res.adults_count && `${res.adults_count}A`, res.children_count && `${res.children_count}C`, res.infants_count && `${res.infants_count}I`]
                                .filter(Boolean)
                                .join(' ')}
                            </div>
                          )}
                        </div>
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