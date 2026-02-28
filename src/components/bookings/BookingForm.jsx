import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isSameDay, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, ChevronsUpDown, Check, X, Plus, Edit, User, Mail, Phone, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Client, Agency } from "@/entities/all";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClientForm from "../clients/ClientForm";
import RelatedReservations from "./RelatedReservations";

// A small component to manage agency selection in a modal
const EditClientAgencyForm = ({ client, agencies, onSave, onCancel }) => {
    // agency_contact_id is stored as a string index in the client entity.
    // The Select component expects a string value for its value prop,
    // and the client entity itself now stores this as a string or null.
    const [agencyId, setAgencyId] = useState(client?.agency_id || null);
    const [agencyContactId, setAgencyContactId] = useState(client?.agency_contact_id || null);

    const selectedAgency = agencies.find(a => a.id === agencyId);

    useEffect(() => {
        // When the selected agency changes, check if the current contact is still valid.
        // If not, reset it to 'General Contact' (null).
        if (agencyId === null) {
            if (agencyContactId !== null) setAgencyContactId(null);
        } else if (selectedAgency) {
            const currentContactIndex = agencyContactId ? parseInt(agencyContactId, 10) : -1;
            const contactIsValid = currentContactIndex >= 0 && currentContactIndex < (selectedAgency.contacts?.length || 0);
            if (!contactIsValid && agencyContactId !== null) {
                setAgencyContactId(null); // Reset to general contact
            }
        }
    }, [agencyId, selectedAgency, agencyContactId]);

    const handleSave = () => {
        // The agency_contact_id is already a string (or null), which is the correct type
        // for the client entity (string or null).
        onSave({ ...client, agency_id: agencyId, agency_contact_id: agencyContactId });
    };

    return (
        // Fix Modal Padding: Removed pt-4 from this root div to prevent double top padding with DialogContent
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="edit-agency-id">Agency</Label>
                <Select value={agencyId || ""} onValueChange={(v) => setAgencyId(v === "null-string" ? null : v)}>
                    <SelectTrigger id="edit-agency-id">
                        <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={"null-string"}>No Agency</SelectItem>
                        {agencies.map(agency => (
                            <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {selectedAgency && (
                <div className="space-y-2">
                    <Label htmlFor="edit-agency-contact-id">Agency Contact</Label>
                    <Select value={agencyContactId || ""} onValueChange={(v) => setAgencyContactId(v === "null-string" ? null : v)}>
                        <SelectTrigger id="edit-agency-contact-id">
                            <SelectValue placeholder="General Contact / Choose specific" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={"null-string"}>General Contact ({selectedAgency.email || 'N/A'})</SelectItem>
                            {selectedAgency.contacts && selectedAgency.contacts.map((contact, index) => (
                                <SelectItem key={index} value={String(index)}>{contact.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </div>
        </div>
    );
};

export default function BookingForm({
  onSave,
  onCancel,
  onDelete,
  initialRoom = null,
  initialDates = null,
  existingBooking = null,
  initialClient = null,
  rooms: allRooms = [],
  clients: allClients = [],
  sites: allSites = [],
  agencies: allAgencies = [],
  reservations = [],
  allBedConfigs = [],
  selectedSiteName = "all",
  onBookingEdit = null,
  onReservationsUpdated = null
}) {
  const [formData, setFormData] = useState({
    client_id: '',
    room_id: '',
    bed_configuration: '',
    date_checkin: '',
    date_checkout: '',
    status: 'RESERVE',
    hold_expires_at: '',
    adults_count: 2,
    children_count: 0,
    infants_count: 0,
    comment: ''
  });

  const [notificationOptions, setNotificationOptions] = useState({
    toAdmin: false,
    toAgency: false,
    toClient: false,
  });

  const [clients, setClients] = useState(allClients);
  const [rooms, setRooms] = useState(allRooms.filter(r => r.is_active));
  const [agencies, setAgencies] = useState(allAgencies);
  const [sites, setSites] = useState(allSites);
  const [nights, setNights] = useState(1);
  const [selectedBedConfigId, setSelectedBedConfigId] = useState('');

  // Client autocomplete state
  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [newClientData, setNewClientData] = useState({
    name: '',
    client_number: '',
    agency_id: null,
    agency_contact_id: null,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  });
  const [selectedAgencyContactId, setSelectedAgencyContactId] = useState(null);

  // New state for editing client number of existing client
  const [editingClientNumber, setEditingClientNumber] = useState('');
  const [isEditingClientNumber, setIsEditingClientNumber] = useState(false); // NEW: toggle for edit mode

  // New state for adding a contact to an agency
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [newContactForAgencyData, setNewContactForAgencyData] = useState({ name: '', email: '', phone: '' });


  // UI state
  const [roomComboboxOpen, setRoomComboboxOpen] = useState(false);
  const [checkinPopoverOpen, setCheckinPopoverOpen] = useState(false);
  const [checkoutPopoverOpen, setCheckoutPopoverOpen] = useState(false);

  // Inline editing modal states
  const [isClientEditOpen, setIsClientEditOpen] = useState(false);
  const [isAgencyEditOpen, setIsAgencyEditOpen] = useState(false);

  // Validation state - only show errors after submit attempt
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);



  const generateNextClientNumber = useCallback((agencyId) => {
    let agencyCode = 'XXX';

    if (agencyId) {
      const agency = agencies.find(a => a.id === agencyId);
      if (agency && agency.code) {
        agencyCode = agency.code;
      }
    }

    // Find the highest numeric part across ALL clients
    let maxNum = 0;
    clients.forEach(c => {
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

  // Initialize form data from props
  useEffect(() => {
    if (existingBooking) {
      const existingClient = allClients.find(c => c.id === existingBooking.client_id);

      // Pre-select bed configuration based on the name in existing booking
      const initialBedConfig = allBedConfigs.find(bc => bc.name === existingBooking.bed_configuration);
      if (initialBedConfig) {
        setSelectedBedConfigId(initialBedConfig.id);
      } else {
        setSelectedBedConfigId('');
      }

      setFormData({
        client_id: existingBooking.client_id || '',
        room_id: existingBooking.room_id || '',
        bed_configuration: existingBooking.bed_configuration || '',
        date_checkin: existingBooking.date_checkin || '',
        date_checkout: existingBooking.date_checkout || '',
        status: existingBooking.status || 'RESERVE',
        hold_expires_at: existingBooking.hold_expires_at || '',
        adults_count: existingBooking.adults_count || 2,
        children_count: existingBooking.children_count || 0,
        infants_count: existingBooking.infants_count || 0,
        comment: existingBooking.comment || ''
      });
      if (existingClient) {
        setSelectedClient(existingClient);
        setClientSearchText(existingClient.name);
        setEditingClientNumber(existingClient.client_number || '');
        setIsEditingClientNumber(false);
      }
    } else {
      // Initialize new booking
      let initialData = {
        client_id: '',
        room_id: initialRoom ? initialRoom.id : '',
        bed_configuration: '',
        date_checkin: initialDates ? initialDates.checkin : '',
        date_checkout: initialDates ? initialDates.checkout : '',
        status: 'RESERVE',
        hold_expires_at: '',
        adults_count: 2,
        children_count: 0,
        infants_count: 0,
        comment: ''
      };

      // Handle initialClient prop for pre-selecting a client
      if (initialClient) {
        initialData.client_id = initialClient.id;
        setSelectedClient(initialClient);
        setClientSearchText(initialClient.name);
        setEditingClientNumber(initialClient.client_number || '');
        setIsNewClient(false);
      }

      // Set up bed configuration and capacity if room is provided and bed configs are available
      if (initialRoom && initialRoom.bed_configuration_ids?.length > 0 && allBedConfigs.length > 0) {
        // Try to find the first bed config associated with the initial room
        const initialConfigId = initialRoom.bed_configuration_ids[0];
        const defaultConfig = allBedConfigs.find(bc => bc.id === initialConfigId);
        if (defaultConfig) {
          initialData.bed_configuration = defaultConfig.name;
          initialData.adults_count = defaultConfig.max_occupancy;
          setSelectedBedConfigId(defaultConfig.id);
        }
      }

      // Set default checkout date if checkin is provided
      if (initialData.date_checkin && !initialData.date_checkout) {
        const checkin = new Date(initialData.date_checkin + 'T00:00:00');
        initialData.date_checkout = format(addDays(checkin, 1), 'yyyy-MM-dd');
        setNights(1);
      }

      // Set option expiry date if status is OPTION
      // This block is now dependent on initialData.status which is 'RESERVE' by default
      // so it will not run unless initialData.status is explicitly 'OPTION' (e.g. from initialDates prop)
      if (initialData.status === 'OPTION' && initialData.date_checkin) {
        const checkin = new Date(initialData.date_checkin + 'T00:00:00');
        initialData.hold_expires_at = addDays(checkin, 15).toISOString();
      }

      setFormData(initialData);
    }
  }, [initialRoom, initialDates, existingBooking, initialClient, allClients, allBedConfigs]);

  // Sync props
  useEffect(() => { setClients(allClients); }, [allClients]);
  useEffect(() => { setRooms(allRooms.filter(r => r.is_active)); }, [allRooms]);
  useEffect(() => { setAgencies(allAgencies); }, [allAgencies]);
  useEffect(() => { setSites(allSites); }, [allSites]);

  const selectedAgency = newClientData.agency_id ? agencies.find(a => a.id === newClientData.agency_id) : null;
  const selectedAgencyContacts = selectedAgency?.contacts || [];

  // Calculate nights when dates change
  useEffect(() => {
    if (formData.date_checkin && formData.date_checkout) {
      const checkinDate = new Date(formData.date_checkin + 'T00:00:00');
      const checkoutDate = new Date(formData.date_checkout + 'T00:00:00');
      const diffTime = checkoutDate.getTime() - checkinDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setNights(diffDays);
      } else {
        setNights(1);
      }
    } else {
      setNights(1);
    }
  }, [formData.date_checkin, formData.date_checkout]);

  // DERIVED DATA (no more separate state)
  const selectedRoom = formData.room_id ? rooms.find(r => r.id === formData.room_id) : null;
  const selectedConfig = selectedBedConfigId ? allBedConfigs.find(c => c.id === selectedBedConfigId) : null;
  const maxOccupancyForConfig = selectedConfig?.max_occupancy || 0;
  // CHANGED: Infants now count towards occupancy
  const currentOccupancy = formData.adults_count + formData.children_count + formData.infants_count;

  // Derived for display
  const agencyForSelectedClient = selectedClient?.agency_id ? agencies.find(a => a.id === selectedClient.agency_id) : null;

  // Logic to determine which agency contact to display
  let agencyContactDisplay = null;
  if (agencyForSelectedClient && selectedClient) {
      const contactId = selectedClient.agency_contact_id;
      if (contactId && agencyForSelectedClient.contacts?.[parseInt(contactId, 10)]) {
          // Specific contact is selected
          const contact = agencyForSelectedClient.contacts[parseInt(contactId, 10)];
          agencyContactDisplay = { ...contact, type: 'Specific Contact' };
      } else {
          // General agency contact
          agencyContactDisplay = {
              name: null, // General contact doesn't have a separate name from the agency itself
              email: agencyForSelectedClient.email,
              phone: agencyForSelectedClient.phone,
              type: 'General Contact'
          };
      }
  }

  // Helper for email validation
  const isValidEmail = (email) => {
    if (!email) return false;
    // Simple regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // VALIDATION FUNCTIONS
  const validateAvailability = useCallback((currentFormData) => {
    if (!currentFormData.room_id || !currentFormData.date_checkin || !currentFormData.date_checkout) {
      return { isAvailable: true, conflicts: [] };
    }

    const checkinDate = new Date(currentFormData.date_checkin + 'T00:00:00');
    const checkoutDate = new Date(currentFormData.date_checkout + 'T00:00:00');

    const conflicts = reservations.filter(reservation => {
      if (existingBooking && reservation.id === existingBooking.id) return false;
      if (reservation.status === 'ANNULE') return false;
      if (reservation.room_id !== currentFormData.room_id) return false;

      const resCheckin = new Date(reservation.date_checkin + 'T00:00:00');
      const resCheckout = new Date(reservation.date_checkout + 'T00:00:00');

      return checkinDate < resCheckout && checkoutDate > resCheckin;
    });

    return { isAvailable: conflicts.length === 0, conflicts };
  }, [reservations, existingBooking]);

  const validateForm = useCallback((currentFormData) => {
    const newErrors = {};
    const newWarnings = {};

    // Required fields
    if (!currentFormData.client_id) newErrors.client_id = "Client is required";
    if (!currentFormData.room_id) newErrors.room_id = "Room is required";
    if (!currentFormData.date_checkin) newErrors.date_checkin = "Check-in date is required";
    if (!currentFormData.date_checkout) newErrors.date_checkout = "Check-out date is required";

    // Date validation
    if (currentFormData.date_checkin && currentFormData.date_checkout) {
      const checkin = new Date(currentFormData.date_checkin + 'T00:00:00');
      const checkout = new Date(currentFormData.date_checkout + 'T00:00:00');

      if (checkout <= checkin) {
        newErrors.date_checkout = "Check-out must be after check-in";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkin < today) {
        newWarnings.date_checkin = "Check-in date is in the past";
      }
    }

    // Capacity validation (Adults + Children + Infants)
    if (selectedConfig && currentOccupancy > maxOccupancyForConfig) {
      newErrors.occupancy = `Too many guests (${currentOccupancy} total) for selected bed configuration (max ${maxOccupancyForConfig})`;
    }

    if (currentOccupancy === 0) {
      newErrors.occupancy = "At least one guest is required";
    }

    // Availability validation
    const availability = validateAvailability(currentFormData);
    if (!availability.isAvailable) {
      newErrors.availability = `Room is not available for selected dates. Conflicts with ${availability.conflicts.length} existing reservation(s)`;
    }

    // Option expiry validation
    if (currentFormData.status === 'OPTION' && currentFormData.hold_expires_at) {
      const expiryDate = new Date(currentFormData.hold_expires_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        newWarnings.hold_expires_at = "Option has already expired";
      }
    }

    // NEW: Notification Email Validation
    // This part should still use the 'selectedClient' and 'agencyForSelectedClient' which
    // would have been updated if a new client was created.
    if (notificationOptions.toAgency) {
      if (!agencyForSelectedClient?.email) {
        newErrors.notification_agency_email = "To agency notifications selected, but agency has no email address.";
      } else if (!isValidEmail(agencyForSelectedClient.email)) {
        newErrors.notification_agency_email = "To agency notifications selected, but agency email is invalid.";
      }
    }

    if (notificationOptions.toClient) {
      if (!selectedClient?.contact_email) {
        newErrors.notification_client_email = "To client notifications selected, but client has no contact email.";
      } else if (!isValidEmail(selectedClient.contact_email)) {
        newErrors.notification_client_email = "To client notifications selected, but client contact email is invalid.";
      }
    }

    return { errors: newErrors, warnings: newWarnings, isValid: Object.keys(newErrors).length === 0 };
  }, [
    selectedConfig,
    currentOccupancy,
    maxOccupancyForConfig,
    validateAvailability,
    selectedBedConfigId,
    notificationOptions,
    agencyForSelectedClient,
    selectedClient
  ]);

  // HANDLERS
  const handleChange = (field, value) => {
    setFormData(prev => {
      let newData = { ...prev, [field]: value };

      if (field === 'room_id') {
        // This logic is now simplified as bed config is selected beforehand.
        // We no longer auto-select a bed config here. Occupancy is based on selectedBedConfigId.
      } else if (field === 'status') {
        if (value === 'OPTION') {
          const checkinDate = prev.date_checkin ? new Date(prev.date_checkin + 'T00:00:00') : new Date();
          newData.hold_expires_at = addDays(checkinDate, 15).toISOString();
        } else {
          newData.hold_expires_at = '';
        }
      } else if (field === 'adults_count' || field === 'children_count' || field === 'infants_count') {
        // Auto-adjust occupancy to stay within max capacity
        if (selectedConfig) {
          const maxCapacity = selectedConfig.max_occupancy;
          const newValue = parseInt(value, 10) || 0;

          let adults = field === 'adults_count' ? newValue : prev.adults_count;
          let children = field === 'children_count' ? newValue : prev.children_count;
          let infants = field === 'infants_count' ? newValue : prev.infants_count;

          const total = adults + children + infants;

          // If we exceed capacity, intelligently reduce other fields
          if (total > maxCapacity) {
            const excess = total - maxCapacity;

            if (field === 'adults_count') {
              // If user increased adults, reduce children first, then infants
              if (children >= excess) {
                children = children - excess;
              } else {
                const remaining = excess - children;
                children = 0;
                infants = Math.max(0, infants - remaining);
              }
            } else if (field === 'children_count') {
              // If user increased children, reduce adults first, then infants
              if (adults >= excess) {
                adults = adults - excess;
              } else {
                const remaining = excess - adults;
                adults = 0;
                infants = Math.max(0, infants - remaining);
              }
            } else if (field === 'infants_count') {
              // If user increased infants, reduce adults first, then children
              if (adults >= excess) {
                adults = adults - excess;
              } else {
                const remaining = excess - adults;
                adults = 0;
                children = Math.max(0, children - remaining);
              }
            }
          }

          newData.adults_count = adults;
          newData.children_count = children;
          newData.infants_count = infants;
        } else {
          // No config selected, just update the field normally
          newData[field] = parseInt(value, 10) || 0;
        }
      }

      return newData;
    });

    // Clear field-specific errors when user starts typing/selecting
    if (hasAttemptedSubmit && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBedConfigChange = (configId) => {
    setSelectedBedConfigId(configId);
    const config = allBedConfigs.find(c => c.id === configId);
    if (config) {
      setFormData(prev => ({
        ...prev,
        bed_configuration: config.name, // Store the name for the booking
        adults_count: config.max_occupancy,
        children_count: 0,
        infants_count: 0,
        room_id: '' // Reset room selection when bed config changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        bed_configuration: '',
        adults_count: 2, // Default to 2 if no config selected
        children_count: 0,
        infants_count: 0,
        room_id: '' // Reset room selection
      }));
    }
  };

  const handleCheckinChange = (date) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      setFormData(prev => {
        // When check-in changes, always update check-out based on the current number of nights
        const checkoutDate = addDays(date, nights);
        return {
          ...prev,
          date_checkin: dateStr,
          date_checkout: format(checkoutDate, 'yyyy-MM-dd')
        };
      });
      setCheckinPopoverOpen(false);
    }
  };

  const handleNightsChange = (nightsValue) => {
    const nightsNum = parseInt(nightsValue, 10);
    if (isNaN(nightsNum) || nightsNum < 1) {
      setNights(1);
    } else {
      setNights(nightsNum);
    }

    if (formData.date_checkin) {
      const checkinDate = new Date(formData.date_checkin + 'T00:00:00');
      const checkoutDate = addDays(checkinDate, nightsNum);
      setFormData(prev => ({
        ...prev,
        date_checkout: format(checkoutDate, 'yyyy-MM-dd')
      }));
    }
  };

  const handleCheckoutChange = (date) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Simply update the checkout date. The useEffect will handle updating the nights.
      setFormData(prev => ({ ...prev, date_checkout: dateStr }));
      setCheckoutPopoverOpen(false);
    }
  };

  // Client autocomplete functions
  const handleClientSearchChange = (value) => {
    setClientSearchText(value);
    setShowClientSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);

    const exactMatch = clients.find(c => c.name.toLowerCase() === value.toLowerCase());
    if (exactMatch) {
      setSelectedClient(exactMatch);
      setIsNewClient(false);
      setFormData(prev => ({ ...prev, client_id: exactMatch.id }));
      setEditingClientNumber(exactMatch.client_number || '');
      setIsEditingClientNumber(false);
    } else {
      setSelectedClient(null);
      const isCreatingNewClient = value.trim().length > 0;
      setIsNewClient(isCreatingNewClient);
      setFormData(prev => ({ ...prev, client_id: '' }));

      // Generate client number immediately for new client with XXX suffix
      if (isCreatingNewClient) {
        const defaultClientNumber = generateNextClientNumber(null); // null = no agency = XXX
        setNewClientData(prev => ({
          ...prev,
          name: value,
          client_number: defaultClientNumber,
          agency_id: null,
          agency_contact_id: null
        }));
      } else {
        setNewClientData({
          name: '',
          client_number: '',
          agency_id: null,
          agency_contact_id: null,
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          notes: ''
        });
      }

      setEditingClientNumber('');
      setIsEditingClientNumber(false);
    }
  };

  const handleClientKeyDown = (e) => {
    if (!showClientSuggestions) return;

    const filteredClientsList = clients.filter(client =>
      client.name.toLowerCase().includes(clientSearchText.toLowerCase())
    ).slice(0, 5);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < filteredClientsList.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && filteredClientsList[selectedSuggestionIndex]) {
          selectClient(filteredClientsList[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowClientSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      default:
        // Do nothing for other keys
        break;
    }
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setClientSearchText(client.name);
    setShowClientSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsNewClient(false);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setEditingClientNumber(client.client_number || '');
    setIsEditingClientNumber(false); // Reset edit mode when selecting a client
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchText.toLowerCase())
  ).slice(0, 5);

  const handleNewClientChange = (field, value) => {
    // The Select component will pass "null-string" for our null value item
    const finalValue = value === "null-string" ? null : value;

    setNewClientData(prev => {
      let newState = { ...prev, [field]: finalValue };

      if (field === 'agency_id') {
        setSelectedAgencyContactId(null);
        newState.agency_contact_id = null;
        // Generate client number for both agency selection and "No Agency" (null)
        newState.client_number = generateNextClientNumber(finalValue);
      }
      // If the user manually changes the client_number field
      if (field === 'client_number') {
        newState.client_number = value;
      }

      return newState;
    });
  };

  const handleAgencyContactSelect = (contactIndex) => {
    const finalValue = contactIndex === "null-string" ? null : contactIndex;
    setSelectedAgencyContactId(finalValue);
    setNewClientData(prev => ({...prev, agency_contact_id: finalValue}));
    // Agency contact selection no longer autofills client contact details.
    // The fields remain manual.
  };

  const handleAddContactToAgency = async () => {
    if (!newContactForAgencyData.name || !selectedAgency) return;

    try {
        const updatedContacts = [...(selectedAgency.contacts || []), newContactForAgencyData];

        // Optimistically update local state for immediate feedback
        const updatedAgencies = agencies.map(a =>
            a.id === selectedAgency.id
            ? { ...a, contacts: updatedContacts }
            : a
        );
        setAgencies(updatedAgencies);

        // Select the newly added contact by its index
        const newContactIndex = updatedContacts.length - 1;

        // Use the handler to update the form with the new contact's data
        setSelectedAgencyContactId(newContactIndex.toString());
        setNewClientData(prev => ({...prev, agency_contact_id: newContactIndex.toString()}));


        // Close modal and reset form
        setIsNewContactModalOpen(false);
        setNewContactForAgencyData({ name: '', email: '', phone: '' });

        // Persist the change to the database in the background
        await Agency.update(selectedAgency.id, { contacts: updatedContacts });

    } catch (error) {
        console.error("Error adding contact to agency:", error);
        // TODO: Handle error, maybe revert optimistic update
    }
  };

  const createClientIfNeeded = async () => {
    if (!clientSearchText.trim()) {
      // If no text, and isNewClient, it's an invalid state, or user cleared it.
      // We assume they decided not to create.
      setErrors(prev => ({ ...prev, client_id: "Client name is required for new client." }));
      return null;
    }

    // Uniqueness check for client_number - only check numeric part
    if (newClientData.client_number) {
      const numericMatch = newClientData.client_number.match(/^(\d{4})/);
      if (!numericMatch) {
        alert('Client number must start with 4 digits (e.g., 0001ABC)');
        return null;
      }

      const numericPart = numericMatch[1];
      const isDuplicate = clients.some(c => {
        if (c.client_number) {
          const otherNumericMatch = c.client_number.match(/^(\d{4})/);
          return otherNumericMatch && otherNumericMatch[1] === numericPart;
        }
        return false;
      });

      if (isDuplicate) {
        alert(`Error: The numeric part "${numericPart}" is already used. Please choose a different number.`);
        return null;
      }
    }

    try {
      const clientData = {
        ...newClientData,
        name: clientSearchText.trim(),
        client_number: newClientData.client_number || null,
        agency_id: newClientData.agency_id,
        agency_contact_id: newClientData.agency_contact_id,
        color_hex: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
      };
      const newClient = await Client.create(clientData);

      // Update local state
      setClients(prev => [...prev, newClient]);
      setSelectedClient(newClient);
      setClientSearchText(newClient.name);
      setIsNewClient(false);
      setEditingClientNumber(newClient.client_number || '');
      setIsEditingClientNumber(false);
      setNewClientData({
        name: '',
        client_number: '',
        agency_id: null,
        agency_contact_id: null,
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: ''
      });

      return newClient.id;
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client. Please try again.');
      return null;
    }
  };

  // Modified handler for saving updated client number
  const handleSaveClientNumber = async () => {
    if (!selectedClient) return;

    // Extract numeric part from the editing client number
    const numericMatch = editingClientNumber.match(/^(\d{4})/);
    if (!numericMatch) {
      alert('Client number must start with 4 digits (e.g., 0001ABC)');
      return;
    }

    const numericPart = numericMatch[1];

    // Check if this numeric part is already used by another client
    const isDuplicate = clients.some(c => {
      if (c.id === selectedClient.id) return false; // Skip current client
      if (!c.client_number) return false;

      const otherNumericMatch = c.client_number.match(/^(\d{4})/);
      return otherNumericMatch && otherNumericMatch[1] === numericPart;
    });

    if (isDuplicate) {
      alert(`Error: The numeric part "${numericPart}" is already used by another client. Please choose a different number.`);
      return;
    }

    try {
      const updatedClient = await Client.update(selectedClient.id, {
        client_number: editingClientNumber
      });
      setSelectedClient(updatedClient);
      setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
      setIsEditingClientNumber(false); // Exit edit mode after save
    } catch (error) {
      console.error("Error updating client number:", error);
      alert("Failed to update client number. Please try again.");
    }
  };

  // NEW: Handler for canceling edit
  const handleCancelEditClientNumber = () => {
    setEditingClientNumber(selectedClient?.client_number || '');
    setIsEditingClientNumber(false);
  };

  // Handlers for inline editing
  const handleSaveClientInModal = async (clientData) => {
    if (!selectedClient) return;
    try {
      const updatedClient = await Client.update(selectedClient.id, clientData);
      setSelectedClient(updatedClient);

      // Also update the main clients list
      setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
      setEditingClientNumber(updatedClient.client_number || ''); // Update client number if changed in modal
      setIsEditingClientNumber(false); // Also ensure edit mode is off

      setIsClientEditOpen(false);
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  // This handler is now for updating the selected client's agency and agency contact
  const handleSaveAgencyInModal = async (clientWithNewAgency) => {
    if (!selectedClient) return;
    try {
      const updatedClient = await Client.update(selectedClient.id, clientWithNewAgency);
      setSelectedClient(updatedClient);
      setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
      setIsAgencyEditOpen(false);
    } catch (error) {
      console.error("Error updating client's agency:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    let finalClientId = formData.client_id;

    if (isNewClient) {
      const newClientId = await createClientIfNeeded();
      if (!newClientId) {
        // Client creation failed or was cancelled due to validation (e.g. empty name)
        // Set an error for client_id if not already set by createClientIfNeeded
        setErrors(prev => ({ ...prev, client_id: prev.client_id || "Client creation failed or client name is empty." }));
        return;
      }
      finalClientId = newClientId;
    }

    // Use a temporary data object to validate, ensuring client_id is updated if a new client was just created
    const dataToValidate = { ...formData, client_id: finalClientId };

    const validation = validateForm(dataToValidate); // Pass dataToValidate to validateForm
    setErrors(validation.errors);
    setWarnings(validation.warnings);

    if (!validation.isValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Ensure the onSave callback receives the final client_id
    onSave({ ...dataToValidate, notifications: notificationOptions });
  };

  const handleDelete = () => {
    if (onDelete && existingBooking) {
      onDelete(existingBooking.id);
    }
  };

  // Helper functions
  const getAgencyName = (agencyId) => {
    return agencies.find(a => a.id === agencyId)?.name || '';
  };

  const getSiteName = (siteId) => {
    return sites.find(s => s.id === siteId)?.name || '';
  };

  const getMaxExpiryDate = () => {
    if (!formData.date_checkin) return null;
    return addDays(new Date(formData.date_checkin + 'T00:00:00'), 15);
  };

  // Helper function to get booked dates for a room
  const getBookedDatesForRoom = (roomId) => {
    if (!roomId) return [];

    const roomReservations = reservations.filter(res =>
      res.room_id === roomId &&
      res.status !== 'ANNULE' &&
      res.id !== existingBooking?.id
    );

    const bookedDates = [];
    roomReservations.forEach(reservation => {
      try {
        const checkin = new Date(reservation.date_checkin + 'T00:00:00');
        const checkout = new Date(reservation.date_checkout + 'T00:00:00');
        const endDateForInterval = addDays(checkout, -1);
        if (checkin <= endDateForInterval) {
          const dateRange = eachDayOfInterval({ start: checkin, end: endDateForInterval });
          bookedDates.push(...dateRange);
        } else if (isSameDay(checkin, checkout)) {
          bookedDates.push(checkin);
        }
      } catch (error) {
        console.warn('Invalid date in reservation:', reservation);
      }
    });

    return bookedDates;
  };

  const bookedDates = getBookedDatesForRoom(formData.room_id);

  const isDateBooked = (date) => {
    return bookedDates.some(bookedDate => isSameDay(bookedDate, date));
  };

  const isRoomAvailable = useCallback((roomId, checkinStr, checkoutStr) => {
    if (!roomId || !checkinStr || !checkoutStr) {
      return false;
    }

    const checkinDate = new Date(checkinStr + 'T00:00:00');
    const checkoutDate = new Date(checkoutStr + 'T00:00:00');

    const conflicts = reservations.filter(reservation => {
      if (existingBooking && reservation.id === existingBooking.id) return false;
      if (reservation.status === 'ANNULE') return false;
      if (reservation.room_id !== roomId) return false;

      const resCheckin = new Date(reservation.date_checkin + 'T00:00:00');
      const resCheckout = new Date(reservation.date_checkout + 'T00:00:00');

      return checkinDate < resCheckout && checkoutDate > resCheckin;
    });

    return conflicts.length === 0;
  }, [reservations, existingBooking]);

  const filteredAvailableRooms = useMemo(() => {
    let available = [...rooms];

    // Filter by selected bed configuration
    if (selectedBedConfigId) {
      available = available.filter(room =>
        room.bed_configuration_ids?.includes(selectedBedConfigId)
      );
    }

    // Filter by date availability
    if (formData.date_checkin && formData.date_checkout) {
      available = available.filter(room =>
        isRoomAvailable(room.id, formData.date_checkin, formData.date_checkout)
      );
    } else {
      return [];
    }

    // Filter by selected site from Dashboard
    if (selectedSiteName !== "all") {
      available = available.filter(room => {
        const roomSite = sites.find(s => s.id === room.site_id);
        return roomSite?.name === selectedSiteName;
      });
    }

    // Sort by site name, then by room number
    available.sort((a, b) => {
      const siteA = getSiteName(a.site_id);
      const siteB = getSiteName(b.site_id);
      
      if (siteA !== siteB) {
        return siteA.localeCompare(siteB);
      }
      
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });

    return available;
  }, [rooms, selectedBedConfigId, formData.date_checkin, formData.date_checkout, isRoomAvailable, selectedSiteName, sites, getSiteName]);

  const isDateDisabledForCheckin = (date) => {
    if (date < new Date(new Date().setHours(0,0,0,0))) return true;
    // Check-in date disabling is independent of room now (it's done via filteredAvailableRooms).
    // So we only check for past dates.
    return false;
  };

  const isDateDisabledForCheckout = (date) => {
    if (!formData.date_checkin) return true;

    const checkinDate = new Date(formData.date_checkin + 'T00:00:00');

    if (date <= checkinDate) return true;

    // Check for booked dates between check-in and desired check-out.
    // This is problematic because we can't tell which specific room is intended here.
    // However, the Room selection combobox already filters rooms by date availability.
    // For now, let's keep it as is, but it primarily affects visual style, not blocking selection if a room IS available.

    // Only disable if the *current* selected room would be booked in that interval
    if (formData.room_id) {
      const intervalStart = addDays(checkinDate, 1);
      const intervalEnd = addDays(date, -1);

      if (intervalStart > intervalEnd) {
        return false;
      }

      const dateRangeBetween = eachDayOfInterval({ start: intervalStart, end: intervalEnd });
      const currentRoomBookedDates = getBookedDatesForRoom(formData.room_id);
      return dateRangeBetween.some(d => currentRoomBookedDates.some(bookedD => isSameDay(bookedD, d)));
    }

    return false;
  };

  const submitButtonText = existingBooking ? "Save Booking" : "Create Booking";

  return (
    // Add px-2 for general padding fix, as requested in the outline.
    <div className="py-0 px-2 relative">
      {/* Show validation errors only after submit attempt */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-600 space-y-1">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}

      {hasAttemptedSubmit && Object.keys(warnings).length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">Warnings:</h4>
          <ul className="text-sm text-amber-600 space-y-1">
            {Object.entries(warnings).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client Field - Name and Number on Same Line */}
        <div className="space-y-2">
          <Label className={`text-sm font-medium ${errors.client_id ? 'text-red-600' : ''}`}>
            Client {errors.client_id && <span className="text-red-500">*</span>}
          </Label>

          <div className="grid grid-cols-[60%_40%] gap-3">
            {/* Client Name - 60% */}
            <div className="relative">
              <Input
                id="client_search"
                value={clientSearchText}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                onKeyDown={handleClientKeyDown}
                onFocus={() => setShowClientSuggestions(clientSearchText.length > 0)}
                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                placeholder="Search or create client..."
                className={`h-10 ${errors.client_id ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                required
                autoComplete="off"
              />

              {/* Client suggestions dropdown */}
              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto mt-1">
                  {filteredClients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`p-3 cursor-pointer border-b border-slate-100 last:border-b-0 ${
                        index === selectedSuggestionIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onMouseDown={() => selectClient(client)}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: client.color_hex || '#3b82f6' }}
                        ></div>
                        <span className="font-medium">{client.name}</span>
                        {client.agency_id && (
                          <span className="text-xs text-slate-500">
                            ({getAgencyName(client.agency_id)})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Number - 40% */}
            {selectedClient && !isNewClient && (
              <div className="flex items-center gap-2">
                <Input
                  id="edit_client_number"
                  value={editingClientNumber}
                  onChange={(e) => setEditingClientNumber(e.target.value)}
                  placeholder="Client #"
                  className="flex-1 h-10"
                  readOnly={!isEditingClientNumber}
                />
                {!isEditingClientNumber ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditingClientNumber(true)}
                    className="h-10 w-10 flex-shrink-0"
                    title="Edit client number"
                  >
                    <Lock className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCancelEditClientNumber}
                      className="h-10 w-10 flex-shrink-0"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      onClick={handleSaveClientNumber}
                      disabled={editingClientNumber === (selectedClient.client_number || '')}
                      className="h-10 w-10 flex-shrink-0 bg-yellow-700 hover:bg-yellow-800"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact info display for existing client (new or existing booking) */}
        {selectedClient && !isNewClient && (
          <div className="space-y-4 p-4 px-6 border rounded-lg bg-slate-50/70 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agency Details - Now First */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-slate-800">Agency</h4>
                  {/* Improve Client Cards: Add Edit button for Agency */}
                  <Button type="button" variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setIsAgencyEditOpen(true)}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </div>
                {agencyForSelectedClient ? (
                  <div className="space-y-2 text-slate-700">
                    <p className="font-semibold">{agencyForSelectedClient.name}</p>
                    {agencyContactDisplay && (
                      <div className="space-y-1 pt-1">
                        {agencyContactDisplay.type === 'Specific Contact' && agencyContactDisplay.name && (
                           <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <span>{agencyContactDisplay.name}</span>
                          </div>
                        )}
                        {agencyContactDisplay.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <a href={`mailto:${agencyContactDisplay.email}`} className="text-yellow-700 hover:underline">{agencyContactDisplay.email}</a>
                          </div>
                        )}
                        {agencyContactDisplay.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <span>{agencyContactDisplay.phone}</span>
                          </div>
                        )}
                         {!agencyContactDisplay.name && !agencyContactDisplay.email && !agencyContactDisplay.phone && (
                            <p className="text-slate-500 italic text-xs">No contact info for this agency.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 italic mt-2">No agency associated.</p>
                )}
              </div>

              {/* Client Contact Details - Now Second with Edit Button */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-slate-800">Client Contact</h4>
                  <Button type="button" variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => setIsClientEditOpen(true)}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </div>
                {selectedClient.contact_name || selectedClient.contact_email || selectedClient.contact_phone ? (
                  <div className="space-y-2 text-slate-700">
                    {selectedClient.contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span>{selectedClient.contact_name}</span>
                      </div>
                    )}
                    {selectedClient.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <a href={`mailto:${selectedClient.contact_email}`} className="text-yellow-700 hover:underline">{selectedClient.contact_email}</a>
                      </div>
                    )}
                    {selectedClient.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>{selectedClient.contact_phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 italic mt-2">No direct contact provided.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related reservations - edit mode only */}
         <RelatedReservations
           existingBooking={existingBooking}
           selectedClient={selectedClient}
           reservations={reservations}
           allRooms={allRooms}
           allSites={allSites}
           onBookingEdit={onBookingEdit}
           allClients={allClients}
           allAgencies={allAgencies}
           allBedConfigs={allBedConfigs}
           selectedSiteName={selectedSiteName}
           onReservationsUpdated={onReservationsUpdated}
         />

        {/* New client fields */}
        {isNewClient && (
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <h4 className="font-medium text-sm">Creating new client: "{clientSearchText}"</h4>

            {/* Agency, Agency Contact, Client Number on one line */}
            <div className="grid grid-cols-3 gap-3">
              {/* Agency Selection */}
              <div className="space-y-1">
                <Label htmlFor="new_client_agency" className="text-xs">Agency</Label>
                <Select value={newClientData.agency_id || ""} onValueChange={(value) => handleNewClientChange('agency_id', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"null-string"}>No Agency</SelectItem>
                    {agencies.map(agency => (
                      <SelectItem key={agency.id} value={agency.id} className="cursor-pointer">{agency.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agency Contact Selection */}
              {selectedAgency ? (
                <div className="space-y-1">
                  <Label htmlFor="agency_contact" className="text-xs">Agency Contact</Label>
                  <div className="flex items-center gap-2">
                    <Select value={selectedAgencyContactId || ""} onValueChange={handleAgencyContactSelect}>
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="General / Choose..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={"null-string"}>General Contact ({selectedAgency.email || 'N/A'})</SelectItem>
                        {selectedAgency.contacts && selectedAgency.contacts.map((contact, index) => (
                          <SelectItem key={index} value={index.toString()} className="cursor-pointer">
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => setIsNewContactModalOpen(true)}
                      title="Add new contact to agency"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // This div ensures the grid column structure is maintained even when no agency is selected
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Agency Contact</Label>
                  <Input className="h-9 text-slate-400" placeholder="Select agency first" disabled />
                </div>
              )}

              {/* Client Number field */}
              <div className="space-y-1">
                <Label htmlFor="new_client_number" className="text-xs">Client #</Label>
                <Input
                  id="new_client_number"
                  className="h-9"
                  value={newClientData.client_number}
                  onChange={(e) => handleNewClientChange('client_number', e.target.value)}
                  placeholder="Auto / custom"
                  readOnly={false} // Allow manual editing regardless of agency selection
                />
              </div>
            </div>

            <div className="pt-2">
                <Label className="text-xs font-medium text-slate-600">Client Contact (optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                    <div className="space-y-1">
                        <Label htmlFor="new_client_contact_name" className="text-xs">Contact Name</Label>
                        <Input
                          id="new_client_contact_name"
                          className="h-9"
                          value={newClientData.contact_name}
                          onChange={(e) => handleNewClientChange('contact_name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new_client_contact_email" className="text-xs">Contact Email</Label>
                        <Input
                          id="new_client_contact_email"
                          className="h-9"
                          type="email"
                          value={newClientData.contact_email}
                          onChange={(e) => handleNewClientChange('contact_email', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new_client_contact_phone" className="text-xs">Contact Phone</Label>
                        <Input
                          id="new_client_contact_phone"
                          className="h-9"
                          value={newClientData.contact_phone}
                          onChange={(e) => handleNewClientChange('contact_phone', e.target.value)}
                        />
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Dates Row - 3 columns */}
         {!existingBooking && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
             <Label className={errors.date_checkin ? 'text-red-600' : ''}>
               Check-in {errors.date_checkin && <span className="text-red-500">*</span>}
             </Label>
            <Popover open={checkinPopoverOpen} onOpenChange={setCheckinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${errors.date_checkin ? 'border-red-300 focus-visible:ring-red-300' : ''}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_checkin ? format(new Date(formData.date_checkin + 'T12:00:00'), 'dd/MM/yyyy') : 'Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_checkin ? new Date(formData.date_checkin + 'T12:00:00') : undefined}
                  onSelect={handleCheckinChange}
                  disabled={isDateDisabledForCheckin}
                  // Calendar Contrast: Changed bg-red-100 to bg-red-400 for better contrast
                  modifiers={{ booked: bookedDates }}
                  modifiersClassNames={{ booked: "bg-red-400 text-red-900 line-through" }}
                />
                {formData.room_id && (
                  <div className="p-2 border-t bg-slate-50">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-red-400 rounded"></div>
                      <span className="text-slate-600">Current room booked for these dates.</span>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nights">Nights</Label>
            <Select value={nights.toString()} onValueChange={handleNightsChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(night => (
                  <SelectItem key={night} value={night.toString()} className="cursor-pointer">
                    {night} {night === 1 ? 'night' : 'nights'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={errors.date_checkout ? 'text-red-600' : ''}>
              Check-out {errors.date_checkout && <span className="text-red-500">*</span>}
            </Label>
            <Popover open={checkoutPopoverOpen} onOpenChange={setCheckoutPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-full justify-start text-left font-normal h-9 ${errors.date_checkout ? 'border-red-300 focus-visible:ring-red-300' : ''}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_checkout ? format(new Date(formData.date_checkout + 'T12:00:00'), 'dd/MM/yyyy') : 'Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_checkout ? new Date(formData.date_checkout + 'T12:00:00') : undefined}
                  onSelect={handleCheckoutChange}
                  disabled={isDateDisabledForCheckout}
                  // Calendar Contrast: Changed bg-red-100 to bg-red-400 for better contrast
                  modifiers={{ booked: bookedDates }}
                  modifiersClassNames={{ booked: "bg-red-400 text-red-900 line-through" }}
                />
              </PopoverContent>
            </Popover>
          </div>
          </div>
        )}

          {/* NEW: Bed Configuration and Room Selection on same row */}
          {!existingBooking && (
          <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="bed_configuration">
              Bed Setup (optional)
            </Label>
            <Select
              value={selectedBedConfigId}
              onValueChange={handleBedConfigChange}
              disabled={allBedConfigs.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose bed setup" />
              </SelectTrigger>
              <SelectContent>
                {allBedConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id} className="cursor-pointer">
                    {config.name} ({config.max_occupancy} max)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room Selection - Always editable */}
          <div className="space-y-2">
            <Label htmlFor="room_id" className={errors.room_id ? 'text-red-600' : ''}>
              Room {errors.room_id && <span className="text-red-500">*</span>}
            </Label>
            <Popover open={roomComboboxOpen} onOpenChange={setRoomComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={roomComboboxOpen}
                  className={`w-full justify-between font-normal h-9 ${errors.room_id ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                  disabled={filteredAvailableRooms.length === 0 || !formData.date_checkin || !selectedBedConfigId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setRoomComboboxOpen(!roomComboboxOpen);
                    }
                  }}
                >
                  {formData.room_id && selectedRoom
                    ? `${getSiteName(selectedRoom.site_id)} – ${selectedRoom.number} – ${selectedRoom.name}`
                    : (filteredAvailableRooms.length > 0 && formData.date_checkin && selectedBedConfigId) ? "Choose an available room..." : "Select dates and bed setup first"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={true}>
                  <CommandInput placeholder="Search room..." className="h-9" />
                  <CommandEmpty>No room found for selected criteria.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {filteredAvailableRooms.map((room) => (
                      <CommandItem
                        key={room.id}
                        value={`${getSiteName(room.site_id)} - ${room.number} - ${room.name}`}
                        onSelect={() => {
                          handleChange('room_id', room.id);
                          setRoomComboboxOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${formData.room_id === room.id ? "opacity-100" : "opacity-0"}`}
                        />
                        {getSiteName(room.site_id)} – {room.number} – {room.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          </div>
          )}

          {/* Guests Row - 3 input columns + 1 badge column */}
          {!existingBooking && (
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="adults_count" className={errors.occupancy ? 'text-red-600' : ''}>
              Adults (+16)
            </Label>
            <Input
              id="adults_count"
              className={`h-9 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
              type="number"
              min="0"
              max={maxOccupancyForConfig || 999}
              value={formData.adults_count}
              onChange={(e) => handleChange('adults_count', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="children_count" className={errors.occupancy ? 'text-red-600' : ''}>
              Children (5-16)
            </Label>
            <Input
              id="children_count"
              className={`h-9 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
              type="number"
              min="0"
              max={maxOccupancyForConfig || 999}
              value={formData.children_count}
              onChange={(e) => handleChange('children_count', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="infants_count" className={errors.occupancy ? 'text-red-600' : ''}>
              Infants (-5)
            </Label>
            <Input
              id="infants_count"
              className={`h-9 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
              type="number"
              min="0"
              max={maxOccupancyForConfig || 999}
              value={formData.infants_count}
              onChange={(e) => handleChange('infants_count', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {/* Occupancy Badge - Aligned with inputs */}
          <div className="flex items-end h-[62px]">
            {selectedConfig ? (
              <Badge
                variant={currentOccupancy > maxOccupancyForConfig ? "destructive" : "secondary"}
                className="text-base px-4 py-2 whitespace-nowrap h-9 flex items-center"
              >
                {currentOccupancy} / {maxOccupancyForConfig} people
              </Badge>
            ) : (
              <Badge variant="outline" className="text-base px-4 py-2 whitespace-nowrap text-slate-400 h-9 flex items-center">
                Select bed setup
              </Badge>
            )}
          </div>
          </div>
          )}

          {/* Comments and Notifications on same row */}
          <div className="grid grid-cols-2 gap-4">
          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comments</Label>
            <Textarea
              id="comment"
              className="h-20"
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="Special requests, notes..."
            />
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <Label className="font-medium">Notifications</Label>
            <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 border h-20 justify-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toAdmin"
                  checked={notificationOptions.toAdmin}
                  onCheckedChange={(checked) => setNotificationOptions(p => ({...p, toAdmin: checked}))}
                />
                <Label htmlFor="toAdmin" className="font-normal cursor-pointer text-sm">To admin</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toAgency"
                  checked={notificationOptions.toAgency}
                  onCheckedChange={(checked) => setNotificationOptions(p => ({...p, toAgency: checked}))}
                  disabled={!agencyForSelectedClient?.email}
                />
                <Label
                  htmlFor="toAgency"
                  className={`font-normal cursor-pointer text-sm ${!agencyForSelectedClient?.email ? 'text-slate-400' : ''}`}
                >
                  To agency
                </Label>
              </div>
              {selectedClient?.contact_email && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toClient"
                    checked={notificationOptions.toClient}
                    onCheckedChange={(checked) => setNotificationOptions(p => ({...p, toClient: checked}))}
                  />
                  <Label htmlFor="toClient" className="font-normal cursor-pointer text-sm">To client</Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        {!existingBooking && (
          <div className="flex items-end justify-between gap-4 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center gap-2">
                  {[
                    { value: 'OPTION', label: 'Option', color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' },
                    { value: 'RESERVE', label: 'Reserved', color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' },
                    { value: 'CONFIRME', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' },
                    { value: 'PAYE', label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleChange('status', status.value)}
                      className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                        formData.status === status.value
                          ? `${status.color} ring-2 ring-offset-1 ring-current`
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.status === 'OPTION' && (
                <div className="space-y-2">
                  <Label>Hold Expires</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.hold_expires_at ? format(new Date(formData.hold_expires_at), 'dd/MM/yyyy') : 'Expires'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.hold_expires_at ? new Date(formData.hold_expires_at) : undefined}
                        onSelect={(date) => handleChange('hold_expires_at', date?.toISOString())}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const maxDate = getMaxExpiryDate();
                          return date < today || (maxDate && date > maxDate);
                        }}
                        footer={
                          formData.date_checkin && (
                            <div className="p-3 border-t bg-slate-50">
                              <p className="text-xs text-slate-600">
                                Maximum: {format(getMaxExpiryDate() || new Date(), 'dd/MM/yyyy')}
                                <span className="text-slate-500"> (check-in + 15 days)</span>
                              </p>
                            </div>
                          )
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Button type="submit" className="bg-yellow-700 hover:bg-yellow-800">
                {submitButtonText}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Inline Client Edit Modal */}
      <Dialog open={isClientEditOpen} onOpenChange={setIsClientEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update the details for "{selectedClient?.name}". Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            client={selectedClient}
            agencies={agencies}
            onSave={handleSaveClientInModal}
            onCancel={() => setIsClientEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Inline Client Agency/Contact Edit Modal */}
      <Dialog open={isAgencyEditOpen} onOpenChange={setIsAgencyEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client's Agency</DialogTitle>
            <DialogDescription>
               Change the agency associated with "{selectedClient?.name}".
            </DialogDescription>
          </DialogHeader>
          <EditClientAgencyForm
            client={selectedClient}
            agencies={agencies}
            onSave={handleSaveAgencyInModal}
            onCancel={() => setIsAgencyEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Add New Contact to {selectedAgency?.name}</DialogTitle>
                <DialogDescription>
                    This contact will be permanently added to the agency.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new_contact_name_modal" className="text-right">
                        Name *
                    </Label>
                    <Input
                        id="new_contact_name_modal"
                        value={newContactForAgencyData.name}
                        onChange={(e) => setNewContactForAgencyData(p => ({...p, name: e.target.value}))}
                        className="col-span-3"
                        required
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new_contact_email_modal" className="text-right">
                        Email
                    </Label>
                    <Input
                        id="new_contact_email_modal"
                        type="email"
                        value={newContactForAgencyData.email}
                        onChange={(e) => setNewContactForAgencyData(p => ({...p, email: e.target.value}))}
                        className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new_contact_phone_modal" className="text-right">
                        Phone
                    </Label>
                    <Input
                        id="new_contact_phone_modal"
                        value={newContactForAgencyData.phone}
                        onChange={(e) => setNewContactForAgencyData(p => ({...p, phone: e.target.value}))}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewContactModalOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleAddContactToAgency} disabled={!newContactForAgencyData.name}>Save Contact</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}