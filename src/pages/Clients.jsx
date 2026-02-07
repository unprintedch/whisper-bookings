import React, { useState, useEffect, useCallback } from "react";
import { Client, Agency, Reservation, Room, Site, User, BedConfiguration } from "@/entities/all";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Phone, Calendar as CalendarIcon, Edit, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import ClientForm from "../components/clients/ClientForm";
import BookingForm from "../components/bookings/BookingForm";
import ReservationsTable from "../components/clients/ReservationsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPageUrl } from "@/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from
"@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from
"@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from
"@/components/ui/select";


export default function ClientsPage() {
  // State for data
  const [clients, setClients] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [bedConfigurations, setBedConfigurations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for controls (previously in Layout.js)
  const [searchTerm, setSearchTerm] = useState(''); // Renamed from clientSearchText
  const [clientViewMode, setClientViewMode] = useState('reservations'); // 'clients' or 'reservations'
  const [columnVisibility, setColumnVisibility] = useState(null); // Will be loaded from user preferences
  const [selectedAgencyId, setSelectedAgencyId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState(null);
  const [filterDateEnd, setFilterDateEnd] = useState(null);

  // Dialog states
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [clientForNewBooking, setClientForNewBooking] = useState(null); // Added for new booking context

  const [clientToDelete, setClientToDelete] = useState(null); // Managed by !!clientToDelete for AlertDialog

  // New state to track if we've already processed the URL parameter
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Added

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const user = await User.me();

        // Load view mode preference
        if (user.client_view_mode) {
          setClientViewMode(user.client_view_mode);
        }

        // Load column visibility preference
        if (user.client_view_column_visibility) {
          setColumnVisibility(user.client_view_column_visibility);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, []);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Save view mode preference when it changes
  useEffect(() => {
    const saveViewModePreference = async () => {
      try {
        await User.updateMyUserData({ client_view_mode: clientViewMode });
      } catch (error) {
        console.error('Error saving view mode preference:', error);
      }
    };

    // Only save if not initial load and clientViewMode is not the default 'clients'
    // or if a URL param was processed, indicating a specific state
    if (clientViewMode !== 'clients' || hasProcessedUrlParam) {
      saveViewModePreference();
    }
  }, [clientViewMode, hasProcessedUrlParam]);

  // Handler to save column visibility preferences
  const handleColumnVisibilityChange = async (newVisibility) => {
    setColumnVisibility(newVisibility);
    try {
      await User.updateMyUserData({ client_view_column_visibility: newVisibility });
    } catch (error) {
      console.error('Error saving column visibility preference:', error);
    }
  };

  const generateNextClientNumber = useCallback((agencyId) => {
    let agencyCode = 'XXX'; // Default code for no agency

    if (agencyId) {
      const agency = agencies.find((a) => a.id === agencyId);
      if (agency && agency.code) {
        agencyCode = agency.code;
      }
    }

    // Find the highest numeric part across ALL clients
    let maxNum = 0;
    clients.forEach((c) => {
      if (c.client_number) {
        const match = c.client_number.match(/^(\d{4})/);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    });

    const nextNum = (maxNum + 1).toString().padStart(4, '0');
    return `${nextNum}${agencyCode}`;
  }, [clients, agencies]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clientsData, agenciesData, reservationsData, roomsData, sitesData, bedConfigsData] = await Promise.all([
        Client.list('-created_date'),
        Agency.list(),
        Reservation.list(),
        Room.list(),
        Site.list(),
        BedConfiguration.list('sort_order')]
      );
      setClients(clientsData);
      setAgencies(agenciesData);
      setReservations(reservationsData);
      setRooms(roomsData);
      setSites(sitesData);
      setBedConfigurations(bedConfigsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  }, []);

  const migrateClientNumbers = useCallback(async () => {
    // We filter `clients` here, which comes from the `clients` state in the dependency array.
    const clientsWithoutNumbers = clients.filter((c) => c.agency_id && !c.client_number);

    if (clientsWithoutNumbers.length === 0) {
      return false;
    }

    console.log(`Migrating numbers for ${clientsWithoutNumbers.length} clients.`);

    // Group by agency
    const byAgency = clientsWithoutNumbers.reduce((acc, client) => {
      if (!acc[client.agency_id]) acc[client.agency_id] = [];
      acc[client.agency_id].push(client);
      return acc;
    }, {});

    // Find global max to start from
    // We iterate through `clients` from the dependency array.
    let globalMax = 0;
    clients.forEach((c) => {
      if (c.client_number) {
        const match = c.client_number.match(/^(\d{4})/);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > globalMax) {
            globalMax = numPart;
          }
        }
      }
    });

    let currentNum = globalMax;
    const updates = [];

    for (const [agencyId, agencyClients] of Object.entries(byAgency)) {
      // We find `agency` from `agencies` in the dependency array.
      const agency = agencies.find((a) => a.id === agencyId);
      if (!agency?.code) continue;

      const agencyCode = agency.code;

      // Sort clients by creation date
      agencyClients.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (const client of agencyClients) {
        currentNum++;
        const clientNumber = `${currentNum.toString().padStart(4, '0')}${agencyCode}`;
        updates.push(Client.update(client.id, { client_number: clientNumber }));
      }
    }

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
        console.log("Client number migration complete.");
        await loadData(); // Re-fetch all data to update UI with new client numbers
        return true;
      } catch (error) {
        console.error("Error during client number migration:", error);
      }
    }
    return false;
  }, [clients, agencies, loadData]); // Depend on clients, agencies, and loadData.

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run migration after data is loaded and available
  useEffect(() => {
    // Only run migration if data has loaded and there are clients/agencies to potentially migrate
    if (!isLoading && clients.length > 0 && agencies.length > 0) {
      migrateClientNumbers();
    }
  }, [isLoading, clients.length, agencies.length, migrateClientNumbers]);

  useEffect(() => {
    // This effect runs after data is loaded to check for a bookingId in the URL
    // Only process once to avoid re-opening the modal
    if (!isLoading && reservations.length > 0 && rooms.length > 0 && clients.length > 0 && !hasProcessedUrlParam) {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingId = urlParams.get('bookingId');

      console.log('Checking for bookingId in URL:', bookingId);

      if (bookingId) {
        const reservationToOpen = reservations.find((r) => r.id === bookingId);
        console.log('Found reservation:', reservationToOpen);

        // Mark as processed immediately to prevent re-execution
        setHasProcessedUrlParam(true);

        if (reservationToOpen) {
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            setEditingReservation(reservationToOpen);
            setClientForNewBooking(null); // Clear this state when editing existing reservation via URL
            setShowBookingForm(true);
            console.log('Opening booking form for reservation:', reservationToOpen.id);
          }, 100);

          // Clean the URL after opening the modal
          window.history.replaceState({}, '', createPageUrl('Clients'));
        } else {
          console.warn('Reservation not found with ID:', bookingId);
          // Clean URL even if reservation not found
          window.history.replaceState({}, '', createPageUrl('Clients'));
        }
      }
    }
  }, [isLoading, reservations, rooms, clients, hasProcessedUrlParam]);

  const handleNewClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleSaveClient = async (clientData) => {
    try {
      // Uniqueness check for client_number
      // Check if a client_number is provided and if it's a duplicate of an existing one (excluding the client being edited)
      if (clientData.client_number) {
        const isDuplicate = clients.some(
          (c) => c.client_number && c.client_number.toLowerCase() === clientData.client_number.toLowerCase() &&
          c.id !== editingClient?.id
        );

        if (isDuplicate) {
          alert(`Error: Client Number "${clientData.client_number}" already exists. Please choose a unique number.`);
          return; // Prevent saving if duplicate
        }
      }

      if (editingClient) {
        await Client.update(editingClient.id, clientData);
      } else {
        // If agency user, automatically assign their agency_id if not already set
        if (currentUser?.custom_role === 'agency' && currentUser?.agency_id && !clientData.agency_id) {
          clientData.agency_id = currentUser.agency_id;
        }
        const dataWithColor = {
          ...clientData,
          color_hex: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
        };
        await Client.create(dataWithColor);
      }
      setShowClientForm(false);
      setEditingClient(null);
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.'); // Provide user feedback for saving errors
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      await Client.delete(clientId);
      setShowClientForm(false); // Close form if it was open for the deleted client
      setEditingClient(null); // Clear editing client
      setClientToDelete(null); // Clear client from delete confirmation state
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleEditReservation = (reservation) => {
    console.log('handleEditReservation called for:', reservation.id);
    setEditingReservation(reservation);
    setClientForNewBooking(null); // Clear this if we're editing an existing reservation
    setShowBookingForm(true);
  };

  const handleCreateReservation = async (reservationData) => {
    try {
      // This is a new reservation. Ensure client_id is set.
      if (clientForNewBooking && !reservationData.client_id) {
        reservationData.client_id = clientForNewBooking.id;
      }
      await Reservation.create(reservationData);
      setShowBookingForm(false);
      setEditingReservation(null);
      setClientForNewBooking(null); // Clear the clientForNewBooking state after saving
      loadData();
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('Failed to create reservation. Please try again.');
    }
  };

  const handleUpdateReservation = async (reservationData) => {
    try {
      if (editingReservation) { // Ensure editingReservation is not null for updates
        await Reservation.update(editingReservation.id, reservationData);
      }
      setShowBookingForm(false);
      setEditingReservation(null);
      setClientForNewBooking(null); // Clear the clientForNewBooking state after saving
      loadData();
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation. Please try again.');
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    try {
      await Reservation.delete(reservationId);
      setShowBookingForm(false);
      setEditingReservation(null);
      setClientForNewBooking(null); // Clear clientForNewBooking as well
      loadData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const getClientReservations = useCallback((clientId) => {
    return reservations.filter((reservation) => reservation.client_id === clientId);
  }, [reservations]);

  const getAgencyInfo = (agencyId) => {
    return agencies.find((agency) => agency.id === agencyId);
  };

  const getRoomInfo = (roomId) => {
    return rooms.find((room) => room.id === roomId);
  };

  const getSiteInfo = (siteId) => {
    return sites.find((site) => site.id === siteId);
  };

  const getRoomDisplayName = (roomId) => {
    const room = getRoomInfo(roomId);
    if (!room) return 'Unknown Room';

    const site = getSiteInfo(room.site_id);
    const siteName = site?.name || 'Unknown Site';

    return `${siteName} – ${room.name}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      OPTION: "bg-amber-100 text-amber-800 border border-amber-200",
      RESERVE: "bg-blue-100 text-blue-800 border border-blue-200",
      CONFIRME: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      PAYE: "bg-green-100 text-green-800 border border-green-200",
      ANNULE: "bg-gray-100 text-gray-600 border border-gray-200"
    };
    return colors[status] || "bg-gray-100 text-gray-600 border border-gray-200";
  };

  const filteredClients = React.useMemo(() => {
    let currentFilteredClients = [...clients];

    // 1. Filter by agency if current user is an agency user
    if (currentUser?.custom_role === 'agency' && currentUser?.agency_id) {
      currentFilteredClients = currentFilteredClients.filter((client) => client.agency_id === currentUser.agency_id);
    }

    // 2. Filter by selected agency
    if (selectedAgencyId !== 'all') {
      currentFilteredClients = currentFilteredClients.filter((client) => client.agency_id === selectedAgencyId);
    }

    // 3. Search filter (by text)
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      
      currentFilteredClients = currentFilteredClients.filter((client) => {
        // Search in client_number
        if (client.client_number && String(client.client_number).toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in client fields
        if (client.name?.toLowerCase().includes(searchLower)) return true;
        if (client.contact_name?.toLowerCase().includes(searchLower)) return true;
        if (client.contact_email?.toLowerCase().includes(searchLower)) return true;
        if (client.contact_phone?.toLowerCase().includes(searchLower)) return true;
        if (client.notes?.toLowerCase().includes(searchLower)) return true;
        
        // Search in agency name
        const agency = agencies.find(a => a.id === client.agency_id);
        if (agency?.name?.toLowerCase().includes(searchLower)) return true;
        
        // Search in client's reservations
        const clientReservations = getClientReservations(client.id);
        return clientReservations.some((res) => {
          if (res.id?.toLowerCase().includes(searchLower)) return true;
          if (res.comment?.toLowerCase().includes(searchLower)) return true;
          if (res.status?.toLowerCase().includes(searchLower)) return true;
          if (res.bed_configuration?.toLowerCase().includes(searchLower)) return true;
          
          const room = rooms.find(r => r.id === res.room_id);
          if (room?.name?.toLowerCase().includes(searchLower)) return true;
          if (room?.number?.toLowerCase().includes(searchLower)) return true;
          
          const site = sites.find(s => s.id === room?.site_id);
          if (site?.name?.toLowerCase().includes(searchLower)) return true;
          
          return false;
        });
      });
    }

    // 4. Filter by status
    if (selectedStatus !== 'all') {
      currentFilteredClients = currentFilteredClients.filter((client) => {
        const clientReservations = getClientReservations(client.id);
        return clientReservations.some((res) => res.status === selectedStatus);
      });
    }

    // 5. Date range filter
    if (filterDateStart) {
      currentFilteredClients = currentFilteredClients.filter((client) => {
        const clientReservations = getClientReservations(client.id);
        return clientReservations.some((res) => {
          try {
            const checkin = new Date(res.date_checkin);
            return checkin >= filterDateStart;
          } catch {
            return false;
          }
        });
      });
    }

    if (filterDateEnd) {
      currentFilteredClients = currentFilteredClients.filter((client) => {
        const clientReservations = getClientReservations(client.id);
        return clientReservations.some((res) => {
          try {
            const checkout = new Date(res.date_checkout);
            return checkout <= filterDateEnd;
          } catch {
            return false;
          }
        });
      });
    }

    return currentFilteredClients;
  }, [clients, currentUser, searchTerm, selectedAgencyId, selectedStatus, filterDateStart, filterDateEnd, getClientReservations, agencies, rooms, sites]);

  const filteredEnrichedReservations = React.useMemo(() => {
    let currentReservations = [...reservations];

    // Filter reservations based on current user's agency role
    if (currentUser?.custom_role === 'agency' && currentUser?.agency_id) {
      const agencyClientIds = clients.filter((c) => c.agency_id === currentUser.agency_id).map((c) => c.id);
      currentReservations = currentReservations.filter((res) => agencyClientIds.includes(res.client_id));
    }

    // Enrich reservations
    let enriched = currentReservations.map((reservation) => {
      const client = clients.find((c) => c.id === reservation.client_id);
      const room = rooms.find((r) => r.id === reservation.room_id);
      const site = sites.find((s) => s.id === room?.site_id);
      const agency = agencies.find((a) => a.id === client?.agency_id);

      return {
        ...reservation,
        clientName: client?.name || 'Unknown Client',
        clientColor: client?.color_hex,
        clientNumber: client?.client_number,
        contactName: client?.contact_name,
        contactEmail: client?.contact_email,
        contactPhone: client?.contact_phone,
        roomName: room ? `${site?.name || 'Unknown Site'} – ${room.name}` : 'Unknown Room',
        siteName: site?.name || 'Unknown Site',
        agencyName: agency?.name || '',
        agencyId: client?.agency_id
      };
    });

    // Apply text search
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      enriched = enriched.filter((res) => 
        (res.clientName && res.clientName.toLowerCase().includes(searchLower)) ||
        (res.clientNumber && String(res.clientNumber).toLowerCase().includes(searchLower)) ||
        (res.contactName && res.contactName.toLowerCase().includes(searchLower)) ||
        (res.contactEmail && res.contactEmail.toLowerCase().includes(searchLower)) ||
        (res.contactPhone && res.contactPhone.toLowerCase().includes(searchLower)) ||
        (res.roomName && res.roomName.toLowerCase().includes(searchLower)) ||
        (res.siteName && res.siteName.toLowerCase().includes(searchLower)) ||
        (res.agencyName && res.agencyName.toLowerCase().includes(searchLower)) ||
        (res.comment && res.comment.toLowerCase().includes(searchLower)) ||
        (res.status && res.status.toLowerCase().includes(searchLower)) ||
        (res.bed_configuration && res.bed_configuration.toLowerCase().includes(searchLower))
      );
    }

    // Apply agency filter
    if (selectedAgencyId !== 'all') {
      enriched = enriched.filter((res) => res.agencyId === selectedAgencyId);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      enriched = enriched.filter((res) => res.status === selectedStatus);
    }

    // Apply date range filter
    if (filterDateStart) {
      enriched = enriched.filter((res) => {
        try {
          const checkin = new Date(res.date_checkin);
          return checkin >= filterDateStart;
        } catch {
          return false;
        }
      });
    }

    if (filterDateEnd) {
      enriched = enriched.filter((res) => {
        try {
          const checkout = new Date(res.date_checkout);
          return checkout <= filterDateEnd;
        } catch {
          return false;
        }
      });
    }

    return enriched;
  }, [reservations, clients, rooms, sites, agencies, currentUser, searchTerm, selectedAgencyId, selectedStatus, filterDateStart, filterDateEnd]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Content based on view mode */}
        {clientViewMode === 'clients' ?
          // Client List View (existing)
          <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* View Toggles and Actions */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg">
                    <Button
                      size="sm"
                      variant={clientViewMode === 'reservations' ? 'default' : 'ghost'}
                      onClick={() => setClientViewMode('reservations')}
                      className="transition-all h-8 bg-white text-slate-800">

                      All Reservations
                    </Button>
                    <Button
                      size="sm"
                      variant={clientViewMode === 'clients' ? 'default' : 'ghost'}
                      onClick={() => setClientViewMode('clients')}
                      className="transition-all h-8 text-slate-600">

                      By Client
                    </Button>
                  </div>
                </div>
                <Button onClick={handleNewClient} className="bg-blue-600 hover:bg-blue-700 h-9">
                  <Plus className="w-4 h-4 mr-2" />
                  New Client
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ?
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) =>
                    <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24"></div>
                  )}
                </div> :
                filteredClients.length === 0 ?
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      {searchTerm || selectedStatus !== 'all' || filterDateStart || filterDateEnd ? 'No clients match your filters' : 'No clients created yet'}
                    </p>
                    <p className="text-sm">
                      {searchTerm || selectedStatus !== 'all' || filterDateStart || filterDateEnd ? 'Try adjusting your filters' : 'Create your first client to get started'}
                    </p>
                  </div> :

                  <div className="space-y-4"> {/* Using space-y-4 for consistent spacing */}
                    <TooltipProvider>
                      {filteredClients.map((client) => {
                        const agency = getAgencyInfo(client.agency_id);
                        const clientReservations = getClientReservations(client.id);
                        const activeReservations = clientReservations.filter((r) => r.status !== 'ANNULE');

                        let agencyContact = null;
                        if (agency) {
                          const specificContactIndex = client.agency_contact_id;
                          if (specificContactIndex !== undefined && specificContactIndex !== null && specificContactIndex !== '' && agency.contacts && agency.contacts[specificContactIndex]) {
                            const foundContact = agency.contacts[parseInt(specificContactIndex, 10)];
                            agencyContact = { ...foundContact, type: 'Specific' };
                          } else {
                            // No specific agency_contact_id set for the client, use general agency info
                            agencyContact = { name: agency.name, email: agency.email, phone: agency.phone, type: 'General' };
                          }
                        }

                        return (
                          <Card
                            key={client.id}
                            className="border-l-4 shadow-sm"
                            style={{ borderLeftColor: client.color_hex || '#3b82f6' }}>

                            <CardContent className="p-6">
                              <div className="flex flex-col gap-4">
                                {/* Header with title and buttons */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <h3 className="text-xl font-bold text-slate-800">{client.name}</h3>
                                      {client.client_number && <Badge variant="secondary">{client.client_number}</Badge>}
                                    </div>
                                    {agency &&
                                      <p className="text-slate-600 font-medium mt-1">{agency.name}</p>
                                    }
                                  </div>

                                  {/* Edit/Delete/Add Booking buttons - top right */}
                                  <div className="flex gap-1">
                                    <Button variant="outline" size="sm" className="hover:bg-amber-50 h-7 px-2 text-xs" onClick={() => handleEditClient(client)}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    {clientReservations.length > 0 ?
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span tabIndex="0">
                                            <Button variant="destructive" size="sm" disabled className="h-7 px-2 text-xs">
                                              <Trash2 className="w-3 h-3 mr-1" />
                                              Delete
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Clients avec des réservations ne peuvent pas être supprimés</p>
                                        </TooltipContent>
                                      </Tooltip> :

                                      <Button variant="destructive" size="sm" onClick={() => setClientToDelete(client)} className="h-7 px-2 text-xs">
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete
                                      </Button>
                                    }
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 h-7 px-2 text-xs"
                                      onClick={() => {
                                        // Create new booking for this client
                                        setClientForNewBooking(client); // Set the client for the new booking
                                        setEditingReservation(null); // Ensure we're creating a new one
                                        setShowBookingForm(true);
                                      }}>

                                      <Plus className="w-3 h-3 mr-1" />
                                      Booking
                                    </Button>
                                  </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Direct Client Contact */}
                                  <div className="space-y-1">
                                    <p className="font-medium text-slate-700">Direct Contact</p>
                                    {client.contact_name || client.contact_email || client.contact_phone ?
                                      <div className="flex flex-col gap-1 text-sm text-slate-600">
                                        {client.contact_name && <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{client.contact_name}</span></div>}
                                        {client.contact_email && <div className="flex items-center gap-1"><Mail className="w-4 h-4" /><a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:underline">{client.contact_email}</a></div>}
                                        {client.contact_phone && <div className="flex items-center gap-1"><Phone className="w-4 h-4" /><span>{client.contact_phone}</span></div>}
                                      </div> :
                                      <p className="text-sm text-slate-500 italic">None</p>}
                                  </div>

                                  {/* Agency Contact */}
                                  {agencyContact &&
                                    <div className="space-y-1">
                                      <p className="font-medium text-slate-700">{agencyContact.type} Agency Contact</p>
                                      {agencyContact.name || agencyContact.email || agencyContact.phone ?
                                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                                          {agencyContact.name && agencyContact.name !== agency.name && <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{agencyContact.name}</span></div>}
                                          {agencyContact.email && <div className="flex items-center gap-1"><Mail className="w-4 h-4" /><a href={`mailto:${agencyContact.email}`} className="text-blue-600 hover:underline">{agencyContact.email}</a></div>}
                                          {agencyContact.phone && <div className="flex items-center gap-1"><Phone className="w-4 h-4" /><span>{agencyContact.phone}</span></div>}
                                        </div> :
                                        <p className="text-sm text-slate-500 italic">No contact info</p>}
                                    </div>
                                  }
                                </div>

                                {client.notes &&
                                  <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-600">{client.notes}</p>
                                  </div>
                                }

                                {/* Status Badges and Meta Info */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(
                                      clientReservations.reduce((acc, reservation) => {
                                        const status = reservation.status;
                                        acc[status] = (acc[status] || 0) + 1;
                                        return acc;
                                      }, {})
                                    ).map(([status, count]) => (
                                      <Badge
                                        key={status}
                                        className={`${getStatusColor(status)} text-xs font-medium`}>

                                        {status} ({count})
                                      </Badge>
                                    ))}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    {activeReservations.length} active reservation{activeReservations.length !== 1 ? 's' : ''}
                                    {client.created_date && (
                                      <> · Created {format(new Date(client.created_date), 'd MMM yyyy', { locale: enUS })}</>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {clientReservations.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                  <h4 className="font-medium text-slate-700 mb-2">Reservations for this client</h4>
                                  <div className="space-y-2">
                                    {clientReservations.map((res) => {
                                      return (
                                        <div
                                          key={res.id}
                                          className="bg-slate-50/70 p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer hover:bg-slate-100 hover:shadow-sm transition-all"
                                          onClick={() => handleEditReservation(res)}
                                        >
                                          <div>
                                            <p className="font-semibold text-slate-800">{getRoomDisplayName(res.room_id)}</p>
                                            {res.date_checkin && res.date_checkout && (
                                              <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>
                                                  {format(new Date(res.date_checkin + 'T12:00:00'), 'd MMM yyyy')} - {format(new Date(res.date_checkout + 'T12:00:00'), 'd MMM yyyy')}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <Badge className={`${getStatusColor(res.status)} text-xs self-start sm:self-center`}>{res.status}</Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>);

                      })}
                    </TooltipProvider>
                  </div>
              }
            </CardContent>
          </Card> :

          // Reservations Table View (new)
          <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  {/* View Toggles */}
                  <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg">
                    <Button
                      size="sm"
                      variant={clientViewMode === 'reservations' ? 'default' : 'ghost'}
                      onClick={() => setClientViewMode('reservations')}
                      className="transition-all h-8 bg-white text-slate-800">

                      All Reservations
                    </Button>
                    <Button
                      size="sm"
                      variant={clientViewMode === 'clients' ? 'default' : 'ghost'}
                      onClick={() => setClientViewMode('clients')}
                      className="transition-all h-8 text-slate-600">

                      By Client
                    </Button>
                  </div>
                  
                  <Button onClick={handleNewClient} className="bg-blue-600 hover:bg-blue-700 h-9">
                    <Plus className="w-4 h-4 mr-2" />
                    New Client
                  </Button>
                </div>
                
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    placeholder="Search clients, reservations, rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md h-9"
                  />
                  
                  {currentUser?.custom_role !== 'agency' && (
                    <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Agencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agencies</SelectItem>
                        {agencies?.map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="OPTION">OPTION</SelectItem>
                      <SelectItem value="RESERVE">RESERVE</SelectItem>
                      <SelectItem value="CONFIRME">CONFIRME</SelectItem>
                      <SelectItem value="PAYE">PAYE</SelectItem>
                      <SelectItem value="ANNULE">ANNULE</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateStart ? format(filterDateStart, 'dd/MM/yyyy') : 'Date from'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterDateStart}
                        onSelect={setFilterDateStart}
                        initialFocus
                      />
                      {filterDateStart && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => setFilterDateStart(null)} className="w-full">
                            Clear
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateEnd ? format(filterDateEnd, 'dd/MM/yyyy') : 'Date to'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterDateEnd}
                        onSelect={setFilterDateEnd}
                        initialFocus
                      />
                      {filterDateEnd && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" onClick={() => setFilterDateEnd(null)} className="w-full">
                            Clear
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  
                  {(searchTerm || selectedAgencyId !== 'all' || selectedStatus !== 'all' || filterDateStart || filterDateEnd) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedAgencyId('all');
                        setSelectedStatus('all');
                        setFilterDateStart(null);
                        setFilterDateEnd(null);
                      }}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ReservationsTable
                reservations={filteredEnrichedReservations}
                isLoading={isLoading}
                onEditReservation={handleEditReservation}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={handleColumnVisibilityChange} />

            </CardContent>
          </Card>
        }
      </div>

      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Create New Client"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Update the details for this client." : "Fill in the details for the new client."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            client={editingClient}
            agencies={agencies}
            onSave={handleSaveClient}
            onCancel={() => setShowClientForm(false)}
            onDelete={handleDeleteClient}
            reservationsCount={editingClient ? getClientReservations(editingClient.id).length : 0}
            generateNextClientNumber={(agencyId) => generateNextClientNumber(agencyId)}
            allClients={clients}
            allAgencies={agencies}
            currentUser={currentUser} // Pass current user for role-based logic inside form
          />
        </DialogContent>
      </Dialog>

      {showBookingForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowBookingForm(false);
            setClientForNewBooking(null);
            setEditingReservation(null);
          }}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-slate-800">
                {editingReservation ? 'Edit Booking' : 'Create New Booking'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowBookingForm(false);
                  setClientForNewBooking(null);
                  setEditingReservation(null);
                }}
                className="h-9 w-9"
              >
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
            <div className="p-4">
              <BookingForm
                onSave={editingReservation ? handleUpdateReservation : handleCreateReservation}
                onDelete={editingReservation ? handleDeleteReservation : undefined}
                onCancel={() => {
                  setShowBookingForm(false);
                  setClientForNewBooking(null);
                  setEditingReservation(null);
                }}
                initialClient={clientForNewBooking}
                existingBooking={editingReservation}
                rooms={rooms}
                clients={clients}
                sites={sites}
                agencies={agencies}
                reservations={reservations}
                allBedConfigs={bedConfigurations}
                selectedSiteName="all"
                currentUser={currentUser} // Pass current user for role-based logic inside form
              />
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client "{clientToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteClient(clientToDelete.id)} className="bg-red-600 hover:bg-red-700">
              Yes, delete client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}