import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Searchable agency picker: a dropdown with a search field, sorted A→Z.
 * onSelect receives the agency id, or null for "No Agency".
 */
export default function AgencyCombobox({
  agencies = [],
  value,
  onSelect,
  placeholder = "Select agency",
}) {
  const [open, setOpen] = useState(false);
  const selected = agencies.find((a) => a.id === value);

  const sortedAgencies = useMemo(
    () =>
      [...agencies].sort((a, b) =>
        (a.name || "").trim().localeCompare((b.name || "").trim(), undefined, { sensitivity: "base" })
      ),
    [agencies]
  );

  const choose = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between font-normal h-9"
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search agency..." />
          <CommandList>
            <CommandEmpty>No agency found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="no-agency" onSelect={() => choose(null)}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                No Agency
              </CommandItem>
              {sortedAgencies.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={`${(agency.name || "").trim()} ${agency.id}`}
                  onSelect={() => choose(agency.id)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === agency.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{(agency.name || "").trim()}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}