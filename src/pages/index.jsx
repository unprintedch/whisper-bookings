import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, ChevronLeft, ChevronRight, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { startOfDay, addDays, format } from "date-fns";
import GanttChart from "../components/dashboard/GanttChart";
import BookingForm from "../components/bookings/BookingForm";

export default function HomePage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [bedConfigurations, setBedConfigurations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteName, setSelectedSiteName] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ bedConfigId: 'all' });
  const [showCalendarBookingForm, setShowCalendarBookingForm] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      setIsAuthenticated(isAuth);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    }
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Detect test mode from URL
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = urlParams.get('base44_data_env') === 'dev';
      const dbClient = isTestMode ? base44.asDataEnv('dev') : base44;
      
      const [roomsData, sitesData, bedConfigsData, reservationsData, agenciesData, clientsData] = await Promise.all([
        dbClient.entities.Room.list(),
        dbClient.entities.Site.list(),
        dbClient.entities.BedConfiguration.list('sort_order'),
        dbClient.entities.Reservation.list(),
        dbClient.entities.Agency.list(),
        dbClient.entities.Client.list()
      ]);
      setRooms(roomsData);
      setSites(sitesData);
      setBedConfigurations(bedConfigsData);
      setReservations(reservationsData);
      setAgencies(agenciesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };



  const navigateDate = (direction) => {
    const days = direction === 'prev' ? -7 : 7;
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const handleCalendarCellClick = (room, date) => {
    setSelectedRoomForBooking(room);
    setSelectedDateForBooking(date);
    setShowCalendarBookingForm(true);
  };

  const handleCalendarBookingSubmit = async (bookingData) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = urlParams.get('base44_data_env') === 'dev';
      const dbClient = isTestMode ? base44.asDataEnv('dev') : base44;
      
      await dbClient.entities.Reservation.create(bookingData);
      setShowCalendarBookingForm(false);
      setSelectedRoomForBooking(null);
      setSelectedDateForBooking(null);
      loadData();
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading availability...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
              alt="Whisper B. Logo" 
              className="w-12 h-12" 
            />
            <h1 className="text-4xl font-bold text-slate-800">Whisper B.</h1>
            {isAuthenticated ? (
              <Button
                variant="default"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-yellow-700 hover:bg-yellow-800"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-4 h-4 mr-1" />
                Admin
              </Button>
            )}
          </div>
          <p className="text-xl text-slate-600">Safari Lodge Availability</p>
        </div>

        <Card className="max-w-7xl mx-auto border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Room Availability Calendar</h2>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('all')}
                    className={`transition-all ${
                      selectedSiteName === 'all' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    All Sites
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('Tarangire')}
                    className={`transition-all ${
                      selectedSiteName === 'Tarangire' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    Tarangire
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('Serengeti')}
                    className={`transition-all ${
                      selectedSiteName === 'Serengeti' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    Serengeti
                  </Button>
                </div>

                <div className="flex items-center gap-1">
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

                <Select 
                  value={filters.bedConfigId} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, bedConfigId: value }))}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Bed configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bed configurations</SelectItem>
                    {bedConfigurations.map(config => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} ({config.max_occupancy} max)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <GanttChart
              rooms={(() => {
                let filteredRooms = rooms.filter(room => room.is_active);
                
                if (selectedSiteName !== 'all') {
                  const site = sites.find(s => s.name === selectedSiteName);
                  if (site) {
                    filteredRooms = filteredRooms.filter(room => room.site_id === site.id);
                  }
                }
                
                if (filters.bedConfigId !== 'all') {
                  filteredRooms = filteredRooms.filter(room => 
                    room.bed_configuration_ids?.includes(filters.bedConfigId)
                  );
                }
                
                return filteredRooms;
              })()}
              reservations={reservations}
              clients={[]}
              groups={[]}
              sites={sites}
              dateColumns={Array.from({ length: 30 }, (_, i) => startOfDay(addDays(currentDate, i)))}
              highlightDate={startOfDay(new Date())}
              isLoading={isLoading}
              onCellClick={handleCalendarCellClick}
              onBookingEdit={null}
              onRoomEdit={null}
              isPublicView={true}
            />
          </CardContent>
        </Card>
      </div>

      {showCalendarBookingForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowCalendarBookingForm(false);
            setSelectedRoomForBooking(null);
            setSelectedDateForBooking(null);
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-slate-800">Create New Booking</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCalendarBookingForm(false);
                  setSelectedRoomForBooking(null);
                  setSelectedDateForBooking(null);
                }}
                className="h-9 w-9"
              >
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
            <div className="p-4">
              <BookingForm
                onSave={handleCalendarBookingSubmit}
                onCancel={() => {
                  setShowCalendarBookingForm(false);
                  setSelectedRoomForBooking(null);
                  setSelectedDateForBooking(null);
                }}
                initialRoom={selectedRoomForBooking}
                initialDates={selectedDateForBooking ? {
                  checkin: format(selectedDateForBooking, 'yyyy-MM-dd'),
                  checkout: format(addDays(selectedDateForBooking, 1), 'yyyy-MM-dd')
                } : null}
                existingBooking={null}
                rooms={rooms}
                clients={clients}
                groups={[]}
                sites={sites}
                agencies={agencies}
                reservations={reservations}
                allBedConfigs={bedConfigurations}
                selectedSiteName={selectedSiteName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}