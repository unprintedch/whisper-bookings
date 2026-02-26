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

  const isDateInRange = (date, checkin, checkout) => {
    const d = new Date(date);
    const ci = new Date(checkin);
    const co = new Date(checkout);
    return d >= ci && d < co;
  };

  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-slate-50 border-r border-slate-200 p-3 text-left font-semibold text-slate-700" style={{ width: '220px', minWidth: '220px' }}>
                Rooms
              </th>
              {dateColumns.map((date) => (
                <th
                  key={date.toISOString()}
                  className={`border-r border-slate-200 p-2 text-center font-semibold text-sm min-w-24 ${
                    highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50'
                  } ${format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}>
                  <div className="text-xs uppercase text-slate-600">{format(date, 'EEE', { locale: enUS })}</div>
                  <div className="text-sm">{format(date, 'd MMM', { locale: enUS })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td
                  className={`border-r border-slate-200 border-b p-3 ${!isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
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
                </td>
                {dateColumns.map((date) => {
                  const dayReservations = reservations.filter(
                    (r) => r.room_id === room.id && isDateInRange(date, r.date_checkin, r.date_checkout)
                  );

                  return (
                    <td
                      key={`${room.id}-${date.toISOString()}`}
                      className={`border-r border-b border-slate-200 p-1 align-top min-w-24 ${
                        !isPublicView ? 'cursor-pointer hover:bg-blue-50' : ''
                      } ${highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-50' : 'bg-white'} ${
                        format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''
                      }`}
                      onClick={!isPublicView && onCellClick ? () => onCellClick(room, date) : undefined}
                      style={{ height: '60px' }}>
                      {dayReservations.length > 0 ? (
                        <div className="space-y-1">
                          {dayReservations.map((res) => {
                            const visible = canSeeClient(res);
                            const client = getClient(res.client_id);
                            const StatusIcon = statusIcons[res.status]?.icon || Clock;
                            const statusColor = statusIcons[res.status]?.color || 'text-gray-500';

                            return (
                              <div
                                key={res.id}
                                className={`text-xs p-1 rounded border-l-4 cursor-pointer ${statusBackgrounds[res.status] || 'bg-slate-50'}`}
                                style={{ borderLeftColor: visible ? client?.color_hex || '#3b82f6' : '#94a3b8' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (visible && onBookingEdit) onBookingEdit(res);
                                }}>
                                <div className="flex items-center gap-1">
                                  <StatusIcon className={`w-3 h-3 flex-shrink-0 ${statusColor}`} />
                                  <span className="font-semibold truncate text-slate-800">
                                    {visible ? client?.name || 'Client' : '•••'}
                                  </span>
                                </div>
                                {visible && (res.adults_count || res.children_count || res.infants_count) && (
                                  <div className="text-xs text-slate-600">
                                    {[res.adults_count && `${res.adults_count}A`, res.children_count && `${res.children_count}C`, res.infants_count && `${res.infants_count}I`]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        !isPublicView && <div className="text-yellow-700 text-center opacity-0 hover:opacity-100 transition-opacity"><Plus className="w-3 h-3 mx-auto" /></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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