
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
// Added import for date-fns format

export default function ReservationFilters({ 
  filters, 
  setFilters,
  selectedSiteName,
  setSelectedSiteName,
  sites,
  dateRange, // dateRange remains a prop as it might be used for display
  currentDate,
  setCurrentDate,
  navigateDate,
  hideSiteSelector = false
}) {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const uniqueSiteNames = [...new Set(sites.map(site => site.name))];

  // Added handleDateSelect function as per outline, with an empty body as no implementation details were provided
  const handleDateSelect = (date) => {
    // This function body was not provided in the outline,
    // so it's left empty or with its original (if any) content.
    // If it was meant to update dateRange, that logic would go here.
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Sites - Only show if not hidden */}
        {!hideSiteSelector && sites.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
            <Button
              size="sm"
              variant={selectedSiteName === 'all' ? 'default' : 'ghost'}
              onClick={() => setSelectedSiteName('all')}
              className={`transition-all ${selectedSiteName === 'all' ? 'bg-white text-slate-800' : 'text-slate-600'}`}
            >
              All Sites
            </Button>
            {uniqueSiteNames.map(siteName => (
              <Button
                key={siteName}
                size="sm"
                variant={selectedSiteName === siteName ? 'default' : 'ghost'}
                onClick={() => setSelectedSiteName(siteName)}
                className={`transition-all ${selectedSiteName === siteName ? 'bg-white text-slate-800' : 'text-slate-600'}`}
              >
                {siteName}
              </Button>
            ))}
          </div>
        )}

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPTION">Option</SelectItem>
            <SelectItem value="RESERVE">Reserved</SelectItem>
            <SelectItem value="CONFIRME">Confirmed</SelectItem>
            <SelectItem value="PAYE">Paid</SelectItem>
          </SelectContent>
        </Select>

        {/* Capacity Filter */}
        <Select value={filters.capacity} onValueChange={(value) => handleFilterChange("capacity", value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Capacity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any capacity</SelectItem>
            <SelectItem value="2">2 people</SelectItem>
            <SelectItem value="4">4+ people</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-grow" /> {/* Added flex-grow div */}

        {/* Date Navigation */}
        <div className="flex items-center gap-2"> {/* Changed gap from 1 to 2 */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigateDate('prev')}
            className="hover:bg-blue-50 h-9 w-9"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="hover:bg-blue-50 h-9"
          >
            Today
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigateDate('next')}
            className="hover:bg-blue-50 h-9 w-9"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
