import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

import GanttChart from "../components/dashboard/GanttChart";
import AvailableRooms from "../components/dashboard/AvailableRooms";
import BookingForm from "../components/bookings/BookingForm";
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
  // Props are now passed from Layout
  selectedSiteName,
  dateRange,
  currentDate,
  filters,
  showBookingForm,
  setShowBookingForm,
  selectedRoomForBooking,
  setSelectedRoomForBooking,
  selectedDateForBooking,
  setSelectedDateForBooking,
  editingBooking,
  setEditingBooking,
  currentUser,
}) {
  // Local state for data fetched from DB
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [agencies, setAgencies] = useState([]); // New state for agencies
  const [clients, setClients] = useState([]); // New state for clients
  const [allBedConfigs, setAllBedConfigs] = useState([]); // New state for bed configs
  const [isLoading, setIsLoading] = useState(true);

  // Room form modal state remains local
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Multi-selection state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [multiModalRanges, setMultiModalRanges] = useState([]);

  const startDate = startOfDay(currentDate);
  const endDate = endOfDay(addDays(currentDate, dateRange - 1));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, reservationsData, groupsData, sitesData, agenciesData, clientsData, bedConfigsData] = await Promise.all([
        base44.entities.Room.list('-name'),
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

  // Lightweight refresh - only updates reservations without showing loading spinner
  const refreshReservationsOnly = async () => {
    try {
      const reservationsData = await base44.entities.Reservation.list('-created_date');
      setReservations(reservationsData);
    } catch (error) {
      console.error('Error refreshing reservations:', error);
    }
  };

  const sendNotificationEmails = async (bookingDetails, bookingType = 'new') => {
       const { notifications, ...bookingData } = bookingDetails;
       if (!notifications || (!notifications.toAdmin && !notifications.toAgency && !notifications.toClient)) {
           return;
       }

       const client = clients.find(c => c.id === bookingData.client_id);
       const room = rooms.find(r => r.id === bookingData.room_id);
       const agency = agencies.find(a => a.id === client?.agency_id);

       if (!client || !room) return;

       try {
         const settingsList = await base44.entities.NotificationSettings.list();
         const settings = settingsList[0] || {};
        
        let template = '';
        if (bookingType === 'new') {
          template = settings.template_new_booking || 'A new booking has been created for [CLIENT_NAME].';
        } else if (bookingType === 'update') {
          template = settings.template_update_booking || 'A booking has been updated for [CLIENT_NAME].';
        } else if (bookingType === 'cancellation') {
          template = settings.template_cancellation || 'A booking has been cancelled for [CLIENT_NAME].';
        }

        const bookingUrl = bookingData.id ? `${window.location.origin}${createPageUrl('Clients')}?bookingId=${bookingData.id}` : '';

        const placeholders = {
          '[CLIENT_NAME]': client.name,
          '[ROOM_NAME]': room.name,
          '[CHECKIN_DATE]': format(new Date(bookingData.date_checkin + 'T00:00:00'), 'dd MMM yyyy'),
          '[CHECKOUT_DATE]': format(new Date(bookingData.date_checkout + 'T00:00:00'), 'dd MMM yyyy'),
          '[STATUS]': bookingData.status,
          '[AGENCY_NAME]': agency?.name || 'N/A',
          '[BOOKING_LINK]': bookingUrl,
        };

        let body = template;
        for (const [key, value] of Object.entries(placeholders)) {
          body = body.replace(new RegExp(key.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), value);
        }
        
        const subject = bookingType === 'cancellation'
            ? `Booking Cancellation: ${client.name} - ${room.name}`
            : (bookingType === 'update' 
                ? `Booking Update: ${client.name} - ${room.name}`
                : `New Booking Confirmation: ${client.name} - ${room.name}`);

        // Send emails with proper error handling
        const emailPromises = [];
        
        if (notifications.toAdmin) {
          const adminEmails = settings.admin_emails || [];
          adminEmails.forEach(email => {
            emailPromises.push(
              base44.integrations.Core.SendEmail({ to: email, subject, body }).catch(err => {
                console.warn(`Could not send email to ${email}:`, err.message);
              })
            );
          });
        }

        if (notifications.toAgency && agency?.email) {
          emailPromises.push(
            base44.integrations.Core.SendEmail({ to: agency.email, subject, body }).catch(err => {
              console.warn(`Could not send email to agency ${agency.email}:`, err.message);
            })
          );
        }

        if (notifications.toClient && client.contact_email) {
          emailPromises.push(
            base44.integrations.Core.SendEmail({ to: client.contact_email, subject, body }).catch(err => {
              console.warn(`Could not send email to client ${client.contact_email}:`, err.message);
            })
          );
        }

        // Wait for all email attempts to complete (but don't fail if some fail)
        await Promise.allSettled(emailPromises);
        
      } catch (error) {
          console.error("Failed to send notification emails:", error);
          // Don't block the booking operation - just log the error
      }
  };

  const handleCreateBooking = async (bookingDataWithNotifications) => {
    const { notifications, ...bookingData } = bookingDataWithNotifications;
    try {
      const newBooking = await base44.entities.Reservation.create(bookingData);
      setShowBookingForm(false);
      setSelectedRoomForBooking(null);
      setSelectedDateForBooking(null);
      await loadData();
      await sendNotificationEmails({ ...bookingDataWithNotifications, id: newBooking.id }, 'new');
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setSelectedRoomForBooking(rooms.find((r) => r.id === booking.room_id));
    setSelectedDateForBooking(null);
    setShowBookingForm(true);
  };

  const handleUpdateBooking = async (bookingDataWithNotifications) => {
    const { notifications, ...bookingData } = bookingDataWithNotifications;
    try {
      if (editingBooking) {
        await base44.entities.Reservation.update(editingBooking.id, bookingData);
        setEditingBooking(null);
      }
      setShowBookingForm(false);
      setSelectedRoomForBooking(null);
      setSelectedDateForBooking(null);
      await loadData();
      await sendNotificationEmails(bookingDataWithNotifications, 'update');
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    try {
      const bookingToDelete = reservations.find(r => r.id === bookingId);
      if (bookingToDelete) {
         await sendNotificationEmails({ ...bookingToDelete, notifications: { toAdmin: true, toAgency: false, toClient: false }}, 'cancellation');
      }

      await base44.entities.Reservation.delete(bookingId);
      setShowBookingForm(false);
      setSelectedRoomForBooking(null);
      setSelectedDateForBooking(null);
      setEditingBooking(null);
      loadData();
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoomForBooking(room);
    setSelectedDateForBooking(null);
    setEditingBooking(null);
    setShowBookingForm(true);
  };

  const handleCalendarCellClick = (room, date) => {
    setSelectedRoomForBooking(room);
    setSelectedDateForBooking(date);
    setEditingBooking(null);
    setShowBookingForm(true);
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

        await base44.entities.Reservation.update(bookingId, {
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
      await base44.entities.Reservation.update(bookingId, {
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
    setEditingRoom(room);
    setShowRoomForm(true);
  };

  const handleCreateUpdateRoom = async (roomData) => {
    try {
      if (editingRoom) {
        await base44.entities.Room.update(editingRoom.id, roomData);
      } else {
        await base44.entities.Room.create(roomData);
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      loadData();
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
              reservations={filteredReservations}
              groups={groups}
              clients={clients}
              dateColumns={getDateColumns()}
              highlightDate={currentDate}
              isLoading={isLoading}
              onSlotToggle={handleSlotToggle}
              onBookingEdit={handleEditBooking}
              onBookingMove={handleBookingMove}
              onBookingResize={handleBookingResize}
              onRoomEdit={handleRoomEdit}
              sites={sites}
              selectedSlots={selectedSlots}
              refreshKey={reservations.length}
            />
          </CardContent>
        </Card>


      </div>

      {showBookingForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowBookingForm(false);
            setSelectedRoomForBooking(null);
            setSelectedDateForBooking(null);
            setEditingBooking(null);
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-slate-800">
                {editingBooking ? 'Edit Booking' : 'Create New Booking'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowBookingForm(false);
                  setSelectedRoomForBooking(null);
                  setSelectedDateForBooking(null);
                  setEditingBooking(null);
                }}
                className="h-9 w-9"
              >
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
            <div className="p-4">
              <BookingForm
                onSave={editingBooking ? handleUpdateBooking : handleCreateBooking}
                onDelete={editingBooking ? handleDeleteBooking : undefined}
                onCancel={() => {
                  setShowBookingForm(false);
                  setSelectedRoomForBooking(null);
                  setSelectedDateForBooking(null);
                  setEditingBooking(null);
                }}
                onBookingEdit={handleEditBooking}
                initialRoom={selectedRoomForBooking}
                initialDates={selectedDateForBooking ? {
                  checkin: format(selectedDateForBooking, 'yyyy-MM-dd'),
                  checkout: format(addDays(selectedDateForBooking, 1), 'yyyy-MM-dd')
                } : null}
                existingBooking={editingBooking}
                rooms={rooms}
                clients={clients}
                groups={groups}
                sites={sites}
                agencies={agencies}
                reservations={reservations}
                allBedConfigs={allBedConfigs}
                selectedSiteName={selectedSiteName}
                onReservationsUpdated={refreshReservationsOnly}
              />
            </div>
          </div>
        </div>
      )}

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