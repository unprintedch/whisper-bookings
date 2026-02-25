import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Room } from "@/entities/Room";
import { Reservation } from "@/entities/Reservation";
import { Group } from "@/entities/Group";
import { Site } from "@/entities/Site";
import { Agency } from "@/entities/Agency";
import { Client } from "@/entities/Client";
import { BedConfiguration } from "@/entities/BedConfiguration";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";

import GanttChart from "../components/dashboard/GanttChart";
import MultiSelectionPanel from "../components/dashboard/MultiSelectionPanel";
import MultiReservationModal from "../components/dashboard/MultiReservationModal";


export default function Dashboard({
  selectedSiteName,
  dateRange,
  currentDate,
  filters,
}) {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [allBedConfigs, setAllBedConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Editing booking state (for edit via Gantt)
  const [editingBooking, setEditingBooking] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState(null);

  // Multi-selection state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [multiModalRanges, setMultiModalRanges] = useState([]);

  const startDate = startOfDay(currentDate);
  const endDate = endOfDay(addDays(currentDate, dateRange - 1));

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []); // Empty dependency array means this runs once on mount, which is correct for fetching all static data.

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, reservationsData, groupsData, sitesData, agenciesData, clientsData, bedConfigsData] = await Promise.all([
        Room.list('-name'), // Changed from Room.list() to Room.list('-name')
        Reservation.list('-created_date'),
        Group.list('-created_date'),
        Site.list(),
        Agency.list(), // Fetch agencies data
        Client.list(), // Fetch clients data
        BedConfiguration.list('sort_order'), // Fetch bed configurations sorted by sort_order
      ]);

      setRooms(roomsData);
      setReservations(reservationsData);
      setGroups(groupsData); // Setting groups
      setSites(sitesData);
      setAgencies(agenciesData); // Set agencies data
      setClients(clientsData); // Set clients data
      setAllBedConfigs(bedConfigsData); // Set bed configs data
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const handleEditBooking = (booking) => {
    // Redirect to Clients page with booking ID in URL
    window.location.href = createPageUrl('Clients') + '?bookingId=' + booking.id;
  };

  const handleCalendarCellClick = (room, date) => {
    // Store selection and open multi-select with one slot
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedSlots([{ roomId: room.id, date: dateStr }]);
  };

  const handleSlotToggle = (roomId, dateStr) => {
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.roomId === roomId && s.date === dateStr);
      if (exists) return prev.filter(s => !(s.roomId === roomId && s.date === dateStr));
      return [...prev, { roomId, date: dateStr }];
    });
  };

  const handleRemoveRoomSlots = (roomId) => {
    setSelectedSlots(prev => prev.filter(s => s.roomId !== roomId));
  };

  const handleConfirmMulti = (mergedRanges) => {
    setMultiModalRanges(mergedRanges);
    setShowMultiModal(true);
  };

  const handleBookingMove = async (bookingId, newRoomId, newStartDate) => {
    try {
      const booking = reservations.find((r) => r.id === bookingId);
      if (booking) {
        const checkin = new Date(booking.date_checkin);
        const checkout = new Date(booking.date_checkout);
        const duration = checkout.getTime() - checkin.getTime();

        const newCheckinDate = new Date(newStartDate);
        const newCheckoutDate = new Date(newCheckinDate.getTime() + duration);

        await Reservation.update(bookingId, {
          room_id: newRoomId,
          date_checkin: format(newCheckinDate, 'yyyy-MM-dd'),
          date_checkout: format(newCheckoutDate, 'yyyy-MM-dd')
        });
        loadData();
      }
    } catch (error) {
      console.error('Error moving booking:', error);
    }
  };

  const handleBookingResize = async (bookingId, newStartDate, newEndDate) => {
    try {
      await Reservation.update(bookingId, {
        date_checkin: format(new Date(newStartDate), 'yyyy-MM-dd'),
        date_checkout: format(new Date(newEndDate), 'yyyy-MM-dd')
      });
      loadData();
    } catch (error) {
      console.error('Error resizing booking:', error);
    }
  };

  // navigateDate function removed as it's handled by parent component

  const getDateColumns = () => {
    const columns = [];
    for (let i = 0; i < dateRange; i++) {
      columns.push(addDays(startDate, i));
    }
    return columns;
  };

  const filteredRooms = rooms.filter((room) => {
    if (selectedSiteName !== "all") {
      const roomSite = sites.find((s) => s.id === room.site_id);
      if (!roomSite || roomSite.name !== selectedSiteName) return false;
    }
    
    // New filter: by bed configuration ID
    if (filters.bedConfigId !== "all") {
      if (!room.bed_configuration_ids || !room.bed_configuration_ids.includes(filters.bedConfigId)) {
        return false;
      }
    }
    
    return room.is_active;
  }).sort((a, b) => {
    const siteA = sites.find(s => s.id === a.site_id)?.name || '';
    const siteB = sites.find(s => s.id === b.site_id)?.name || '';

    // Primary sort: by Site Name
    if (siteA !== siteB) {
        return siteA.localeCompare(siteB);
    }

    // Secondary sort: by Room Number, using natural sort for alphanumeric strings
    // This handles cases like "S-1", "S-10", "T-2" correctly.
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });

  // Filter reservations based on user role
  const filteredReservations = React.useMemo(() => {
    if (!currentUser || currentUser.custom_role !== 'agency') {
      return reservations;
    }
    
    // For agency users, filter to only their agency's clients
    return reservations.filter(res => {
      const client = clients.find(c => c.id === res.client_id);
      return client?.agency_id === currentUser.agency_id;
    });
  }, [reservations, clients, currentUser]);

  const handleRoomEdit = (room) => {
    console.log('Edit room:', room);
  };

  return (
    <div className="px-6 py-6">
      <div className="w-full space-y-6">

        {/* The filter bar has been removed from here and is now in the main layout */}

        <Card className="border shadow-sm text-card-foreground bg-white backdrop-blur-sm">
          {/* CardHeader has been removed as per new outline */}
          <CardContent className="p-0">
            <GanttChart
              rooms={filteredRooms}
              reservations={reservations}
              groups={groups}
              clients={clients}
              dateColumns={getDateColumns()}
              highlightDate={currentDate}
              isLoading={isLoading}
              onCellClick={handleCalendarCellClick}
              onBookingEdit={handleEditBooking}
              onBookingMove={handleBookingMove}
              onBookingResize={handleBookingResize}
              onRoomEdit={handleRoomEdit}
              sites={sites}
              selectedSlots={selectedSlots}
              onSlotToggle={handleSlotToggle}
            />
          </CardContent>
        </Card>

      </div>

      <MultiSelectionPanel
        selectedSlots={selectedSlots}
        onRemoveSlot={handleRemoveRoomSlots}
        onClearAll={() => setSelectedSlots([])}
        onConfirm={handleConfirmMulti}
        rooms={rooms}
        sites={sites}
      />

      <MultiReservationModal
        isOpen={showMultiModal}
        onClose={() => setShowMultiModal(false)}
        mergedRanges={multiModalRanges}
        rooms={rooms}
        clients={clients}
        sites={sites}
        agencies={agencies}
        allBedConfigs={allBedConfigs}
        onSuccess={() => { setSelectedSlots([]); setShowMultiModal(false); loadData(); }}
      />


    </div>
  );
}