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

// Helper component for Room Form (can be moved to its own file later)
const RoomForm = ({ onSave, onCancel, initialRoom, sites }) => {
  const [name, setName] = useState(initialRoom?.name || '');
  const [capacity, setCapacity] = useState(initialRoom?.capacity_max || 1);
  const [siteId, setSiteId] = useState(initialRoom?.site_id || (sites.length > 0 ? sites[0].id : ''));
  const [isActive, setIsActive] = useState(initialRoom?.is_active !== undefined ? initialRoom.is_active : true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      capacity_max: parseInt(capacity),
      site_id: siteId,
      is_active: isActive
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="room-name">Room Name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="room-capacity">Max Capacity</Label>
        <Input
          id="room-capacity"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          min="1"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="room-site">Site</Label>
        <Select value={siteId} onValueChange={setSiteId} required>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select a site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="room-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="room-active">Active</Label>
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialRoom ? 'Update Room' : 'Create Room'}
        </Button>
      </div>
    </form>
  );
};


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

  // New handler for room edit
  const handleRoomEdit = (room) => {
    // This function should be implemented or redirect to rooms page
    // For now, we'll just log it
    console.log('Edit room:', room);
  };

  // New handler for creating/updating room
  const handleCreateUpdateRoom = async (roomData) => {
    try {
      if (editingRoom) {
        await Room.update(editingRoom.id, roomData);
      } else {
        await Room.create(roomData);
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      loadData(); // Reload all data after change
    } catch (error) {
      console.error('Error saving room:', error);
    }
  };

  // New handler for closing room form
  const handleCloseRoomForm = () => {
    setShowRoomForm(false);
    setEditingRoom(null);
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

      {showRoomForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseRoomForm}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingRoom ? 'Edit Room' : 'Create New Room'}
              </h2>
            </div>
            <div className="p-6">
              <RoomForm
                onSave={handleCreateUpdateRoom}
                onCancel={handleCloseRoomForm}
                initialRoom={editingRoom}
                sites={sites}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}