import React from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Building2, Users, Plus, Eye } from "lucide-react";
import BookingCell from "./BookingCell";

export default function RoomRow({
  room,
  siteInfo,
  dateColumns,
  bookingPositions,
  highlightDate,
  isPublicView,
  onRoomClick,
  onBookingClick,
  getClientForReservation,
  canSeeClientName
}) {
  const ROOM_COLUMN_WIDTH = 230;

  return (
    <div
      className="flex border-b border-slate-200 group relative"
      style={{ height: '50px' }}>
      <div
        className={`bg-white border-r border-slate-200 p-3 flex-shrink-0 sticky left-0 z-40 h-full ${
          !isPublicView ? 'cursor-pointer hover:bg-blue-50/50' : ''
        }`}
        style={{ width: `${ROOM_COLUMN_WIDTH}px` }}
        onClick={!isPublicView ? () => onRoomClick(room) : undefined}>
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

      <div className="relative flex-shrink-0 h-full">
        <div className="flex h-full">
          {dateColumns.map((date, dateIndex) => (
            <div
              key={`${room.id}-${date.toISOString()}-${dateIndex}`}
              className={`border-r border-slate-200 flex items-center justify-center relative group/cell flex-shrink-0 ${
                !isPublicView ? 'cursor-pointer hover:bg-blue-50' : ''
              } ${highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100/50' : ''} ${
                format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''
              }`}
              style={{
                width: '120px',
                height: '100%'
              }}>
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
                onBookingClick={onBookingClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}