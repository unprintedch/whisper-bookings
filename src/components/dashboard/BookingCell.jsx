import React from "react";
import { Edit, Clock, CheckCircle2, DollarSign, X } from "lucide-react";

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

const COL_WIDTH = 120;

export default function BookingCell({ position, client, isOwnAgency, onClick }) {
  const { startIndex, endIndex, startsBefore, endsAfter, reservation } = position;

  const HALF_COL_WIDTH = COL_WIDTH / 2;

  let startPixel = startsBefore
    ? startIndex * COL_WIDTH
    : startIndex * COL_WIDTH + HALF_COL_WIDTH;

  let endPixel = endsAfter
    ? endIndex * COL_WIDTH
    : endIndex * COL_WIDTH + HALF_COL_WIDTH;

  let widthPixel = endPixel - startPixel;

  const adults = reservation.adults_count || 0;
  const children = reservation.children_count || 0;
  const infants = reservation.infants_count || 0;
  const occupancyDisplay = [
    adults > 0 ? `${adults}A` : null,
    children > 0 ? `${children}C` : null,
    infants > 0 ? `${infants}I` : null
  ].filter(Boolean).join(' ');

  const StatusIcon = statusIcons[reservation.status]?.icon || Clock;
  const statusColor = statusIcons[reservation.status]?.color || "text-gray-500";
  const backgroundColor = statusBackgrounds[reservation.status] || '#f8fafc';

  return (
    <div
      className={`absolute top-0 pointer-events-auto transition-all duration-200 ${
        isOwnAgency ? 'cursor-pointer group/booking' : 'cursor-default'
      }`}
      style={{
        left: `${startPixel}px`,
        width: `${Math.max(widthPixel, COL_WIDTH / 2)}px`,
        height: '100%'
      }}
      onClick={onClick}
    >
      <div
        className="absolute inset-y-1 w-full flex flex-col justify-center relative rounded px-2 py-1 opacity-40 h-full"
        style={{
          backgroundColor: isOwnAgency ? backgroundColor : '#cbd5e1',
          borderLeft: `5px solid ${isOwnAgency ? client?.color_hex || '#3b82f6' : '#94a3b8'}`
        }}
      >
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${isOwnAgency ? statusColor : 'text-slate-400'} flex-shrink-0`} />
          <div className="text-sm font-semibold text-slate-800 truncate">
            {isOwnAgency ? client?.name || 'Client' : '•••'}
          </div>
        </div>

        {isOwnAgency && (
          <div>
            {(occupancyDisplay || reservation.bed_configuration) && (
              <div className="text-xs text-slate-600 truncate">
                {occupancyDisplay && reservation.bed_configuration
                  ? `${occupancyDisplay} - ${reservation.bed_configuration}`
                  : occupancyDisplay || reservation.bed_configuration}
              </div>
            )}
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
}