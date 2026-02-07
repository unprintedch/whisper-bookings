import React, { useState, useEffect } from "react";
import { Room, Site, BedConfiguration, Client, Reservation } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle } from "lucide-react";
import PublicBookingForm from "../components/bookings/PublicBookingForm";

export default function PublicBookingPage() {
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [bedConfigurations, setBedConfigurations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [submittedBookingDetails, setSubmittedBookingDetails] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
              alt="Whisper B. Logo" 
              className="w-12 h-12" 
            />
            <h1 className="text-4xl font-bold text-slate-800">Whisper B.</h1>
          </div>
          <p className="text-xl text-slate-600">Book Your Stay</p>
        </div>

        <Card className="max-w-4xl mx-auto border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <PublicBookingForm
              rooms={rooms}
              sites={sites}
              bedConfigurations={bedConfigurations}
              reservations={reservations}
              onSubmit={handleBookingSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}