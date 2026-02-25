import React from "react";
import { format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";

export default function DateHeader({ dateColumns, highlightDate }) {
  return (
    <div className="flex flex-shrink-0">
      {dateColumns.map((date) => (
        <div
          key={date.toISOString()}
          className={`border-r border-slate-200 flex items-center justify-center py-3 flex-shrink-0 ${
            highlightDate && isSameDay(date, highlightDate) ? 'bg-slate-100' : 'bg-slate-50/40'
          } ${format(date, 'EEE', { locale: enUS }) === 'Sun' ? 'border-r-2 border-r-slate-300' : ''}`}
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
      ))}
    </div>
  );
}