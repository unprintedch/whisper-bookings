import React, { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

import GanttChart from "@/components/dashboard/GanttChart.jsx";
import MultiSelectionPanel from "../components/dashboard/MultiSelectionPanel";
import MultiReservationModal from "../components/dashboard/MultiReservationModal";

export default function Dashboard({
  selectedSiteName = "all",
  dateRange = 30,
  currentDate = new Date(),
  filters = { bedConfigId: "all" },
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

  // Multi-selection state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [multiModalRanges, setMultiModalRanges] = useState([]);

  const startDate = startOfDay(currentDate);

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, reservationsData, groupsData, sitesData, agenciesData, clientsData, bedConfigsData] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Reservation.list('-created_date'),
        base44.entities.Group.list('-created_date'),
        base44.entities.Site.list(),
        base44.entities.Agency.list(),
        base44.entities.Client.list(),
        base44.entities.BedConfiguration.list('sort_order'),
      ]);

      setRooms(roomsData);
      setReservations(reservationsData);
      setGroups(groupsData);
      setSites(sitesData);
      setAgencies(agenciesData);
      setClients(clientsData);
      setAllBedConfigs(bedConfigsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const handleEditBooking = (booking) => {
    window.location.href = createPageUrl('Clients') + '?bookingId=' + booking.id;
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
    const booking = reservations.find((r) => r.id === bookingId);
    if (booking) {
      const checkin = new Date(booking.date_checkin);
      const checkout = new Date(booking.date_checkout);
      const duration = checkout.getTime() - checkin.getTime();
      const newCheckinDate = new Date(newStartDate);
      const newCheckoutDate = new Date(newCheckinDate.getTime() + duration);
      await base44.entities.Reservation.update(bookingId, {
        room_id: newRoomId,
        date_checkin: format(newCheckinDate, 'yyyy-MM-dd'),
        date_checkout: format(newCheckoutDate, 'yyyy-MM-dd')
      });
      loadData();
    }
  };

  const handleBookingResize = async (bookingId, newStartDate, newEndDate) => {
    await base44.entities.Reservation.update(bookingId, {
      date_checkin: format(new Date(newStartDate), 'yyyy-MM-dd'),
      date_checkout: format(new Date(newEndDate), 'yyyy-MM-dd')
    });
    loadData();
  };

  const getDateColumns = () => {
    const columns = [];
    for (let i = 0; i < dateRange; i++) {
      columns.push(addDays(startDate, i));
    }
    return columns;
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (selectedSiteName !== "all") {
        const roomSite = sites.find((s) => s.id === room.site_id);
        if (!roomSite || roomSite.name !== selectedSiteName) return false;
      }
      if (filters.bedConfigId !== "all") {
        if (!room.bed_configuration_ids || !room.bed_configuration_ids.includes(filters.bedConfigId)) {
          return false;
        }
      }
      return room.is_active;
    }).sort((a, b) => {
      const siteA = sites.find(s => s.id === a.site_id)?.name || '';
      const siteB = sites.find(s => s.id === b.site_id)?.name || '';
      if (siteA !== siteB) return siteA.localeCompare(siteB);
      return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
    });
  }, [rooms, sites, selectedSiteName, filters]);

  const filteredReservations = useMemo(() => {
    if (!currentUser || currentUser.custom_role !== 'agency') return reservations;
    return reservations.filter(res => {
      const client = clients.find(c => c.id === res.client_id);
      return client?.agency_id === currentUser.agency_id;
    });
  }, [reservations, clients, currentUser]);

  return (
    <div className="px-6 py-6">
      <div className="w-full space-y-6">
        <Card className="border shadow-sm text-card-foreground bg-white backdrop-blur-sm">
          <CardContent className="p-0">
            <GanttChart
              rooms={filteredRooms}
              reservations={filteredReservations}
              groups={groups}
              clients={clients}
              dateColumns={getDateColumns()}
              highlightDate={currentDate}
              isLoading={isLoading}
              onBookingEdit={handleEditBooking}
              onBookingMove={handleBookingMove}
              onBookingResize={handleBookingResize}
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