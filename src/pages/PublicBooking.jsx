import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Room, Site, BedConfiguration, Client, Reservation } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { addDays, format, startOfDay } from "date-fns";
import AirbnbStyleBooking from "../components/bookings/AirbnbStyleBooking.jsx";
import GanttChart from "../components/dashboard/GanttChart";

export default function PublicBookingPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [bedConfigurations, setBedConfigurations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [submittedBookingDetails, setSubmittedBookingDetails] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const [selectedSiteName, setSelectedSiteName] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ bedConfigId: 'all' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, sitesData, bedConfigsData, reservationsData] = await Promise.all([
        Room.list(),
        Site.list(),
        BedConfiguration.list('sort_order'),
        Reservation.list()
      ]);
      setRooms(roomsData);
      setSites(sitesData);
      setBedConfigurations(bedConfigsData);
      setReservations(reservationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const handleBookingSubmit = async (bookingData) => {
    try {
      // Check if client exists by email
      const existingClients = await Client.filter({ contact_email: bookingData.contact_email });
      
      let clientId;
      if (existingClients && existingClients.length > 0) {
        // Use existing client
        clientId = existingClients[0].id;
      } else {
        // Create new client
        const newClient = await Client.create({
          name: bookingData.contact_name || 'Guest',
          contact_name: bookingData.contact_name,
          contact_email: bookingData.contact_email,
          contact_phone: bookingData.contact_phone,
          notes: bookingData.notes || '',
          color_hex: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
        });
        clientId = newClient.id;
      }

      // Create reservation with OPTION status
      const reservation = await Reservation.create({
        client_id: clientId,
        room_id: bookingData.room_id,
        bed_configuration: bookingData.bed_configuration,
        date_checkin: bookingData.date_checkin,
        date_checkout: bookingData.date_checkout,
        status: 'OPTION',
        adults_count: bookingData.adults_count || 0,
        children_count: bookingData.children_count || 0,
        infants_count: bookingData.infants_count || 0,
        comment: bookingData.comment || ''
      });

      // Get room and site info for confirmation message
      const room = rooms.find(r => r.id === bookingData.room_id);
      const site = sites.find(s => s.id === room?.site_id);

      setSubmittedBookingDetails({
        roomName: room?.name,
        siteName: site?.name,
        checkin: bookingData.date_checkin,
        checkout: bookingData.date_checkout
      });

      setBookingSubmitted(true);

      // TODO: Send notification email to admin
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('An error occurred while creating your booking. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (bookingSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">
              Booking Request Received!
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Thank you for your booking request. Your reservation is currently on hold (OPTION status) and awaiting confirmation.
            </p>
            {submittedBookingDetails && (
              <div className="bg-slate-50 rounded-lg p-6 mb-6 text-left">
                <h2 className="font-semibold text-slate-800 mb-3">Booking Details:</h2>
                <div className="space-y-2 text-slate-700">
                  <p><strong>Site:</strong> {submittedBookingDetails.siteName}</p>
                  <p><strong>Room:</strong> {submittedBookingDetails.roomName}</p>
                  <p><strong>Check-in:</strong> {submittedBookingDetails.checkin}</p>
                  <p><strong>Check-out:</strong> {submittedBookingDetails.checkout}</p>
                </div>
              </div>
            )}
            <p className="text-slate-600 mb-8">
              We will contact you shortly to confirm your reservation and provide further details.
            </p>
            <button
              onClick={() => {
                setBookingSubmitted(false);
                setSubmittedBookingDetails(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Make Another Booking
            </button>
          </CardContent>
        </Card>
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
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                className="absolute right-0 top-1/2 -translate-y-1/2"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
          <p className="text-xl text-slate-600">Book Your Stay</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <AirbnbStyleBooking
            rooms={rooms}
            sites={sites}
            bedConfigurations={bedConfigurations}
            reservations={reservations}
            onSubmit={handleBookingSubmit}
          />
        </div>

        {/* Availability Calendar Section */}
        <div className="max-w-7xl mx-auto mt-12">
          <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Room Availability</h2>
                <p className="text-slate-600">View real-time availability for all rooms</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {/* Sites Filter */}
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

                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(prev => addDays(prev, -7))}
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
                    size="sm"
                    className="w-40 justify-start text-left font-normal h-9 pointer-events-none"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(currentDate, 'dd MMM')}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                    className="hover:bg-blue-50 h-9 w-9"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Bed Configuration Filter */}
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

              {/* Gantt Chart */}
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
                onCellClick={null}
                onBookingEdit={null}
                onRoomEdit={null}
                isPublicView={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}