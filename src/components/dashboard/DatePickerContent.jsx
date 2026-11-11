import React, { useEffect, useState } from "react";
import { format, addMonths, addYears, isValid, parse, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Formats acceptés dans le champ texte
const DATE_FORMATS = [
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd.MM.yyyy",
  "d.M.yyyy",
  "dd-MM-yyyy",
  "yyyy-MM-dd",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd MMMM yyyy",
  "d MMMM yyyy",
  "dd/MM",
  "d/M",
];

const parseTypedDate = (text) => {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  for (const pattern of DATE_FORMATS) {
    const parsed = parse(cleaned, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function DatePickerContent({ value, onSelectDate }) {
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(value || new Date()));
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (value) setVisibleMonth(startOfMonth(value));
  }, [value]);

  const submitText = () => {
    const parsed = parseTypedDate(text);
    if (!parsed) {
      setError(true);
      return;
    }
    setError(false);
    setText("");
    setVisibleMonth(startOfMonth(parsed));
    onSelectDate(parsed);
  };

  return (
    <div className="p-3 w-[19rem]">
      {/* Saisie clavier */}
      <div className="flex items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitText();
            }
          }}
          placeholder="dd/mm/yyyy"
          className={`h-8 text-sm ${error ? "border-red-400 focus-visible:ring-red-300" : ""}`}
          aria-label="Type a date"
        />
        <Button size="sm" className="h-8 px-2" onClick={submitText}>
          Go
        </Button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">Use dd/mm/yyyy, e.g. 15/03/2027</p>
      )}

      {/* Navigation rapide par mois / année */}
      <div className="mt-3 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setVisibleMonth((m) => addYears(m, -1))}
            title="Previous year"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {format(visibleMonth, "MMMM yyyy")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setVisibleMonth((m) => addYears(m, 1))}
            title="Next year"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Calendar
        mode="single"
        month={visibleMonth}
        onMonthChange={setVisibleMonth}
        selected={value}
        onSelect={(date) => date && onSelectDate(date)}
        className="p-0 mt-2"
        classNames={{ caption: "hidden" }}
      />

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-slate-600"
        onClick={() => {
          const today = new Date();
          setVisibleMonth(startOfMonth(today));
          onSelectDate(today);
        }}
      >
        <CalendarIcon className="w-4 h-4 mr-2" />
        Jump to today
      </Button>
    </div>
  );
}