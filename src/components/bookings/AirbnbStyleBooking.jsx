import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Users, Bed, MapPin, Minus, Plus, X } from "lucide-react";

export default function AirbnbStyleBooking({
  rooms = [],
  sites = [],
  bedConfigurations = [],
  reservations = [],
  onSubmit
}) {
  // Search criteria
  const [checkinDate, setCheckinDate] = useState(null);
  const [checkoutDate, setCheckoutDate] = useState(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selectedBedConfigId, setSelectedBedConfigId] = useState('');
  
  // UI state
  const [showGuestsPopover, setShowGuestsPopover] = useState(false);
  const [showBedConfigPopover, setShowBedConfigPopover] = useState(false);
  const [checkinPopoverOpen, setCheckinPopoverOpen] = useState(false);
  const [checkoutPopoverOpen, setCheckoutPopoverOpen] = useState(false);
  
  // Selected room and client modal
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientData, setClientData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    comment: ''
  });
  const [errors, setErrors] = useState({});

  const selectedConfig = bedConfigurations.find(c => c.id === selectedBedConfigId);
  const totalGuests = adults + children + infants;

  useEffect(() => {
    if (checkinDate && !checkoutDate) {
      setCheckoutDate(addDays(checkinDate, 1));
    }
  }, [checkinDate, checkoutDate]);

  const isRoomAvailable = (roomId, checkin, checkout) => {
    if (!roomId || !checkin || !checkout) return false;

    const conflicts = reservations.filter(reservation => {
      if (reservation.status === 'ANNULE') return false;
      if (reservation.room_id !== roomId) return false;

      const resCheckin = new Date(reservation.date_checkin + 'T00:00:00');
      const resCheckout = new Date(reservation.date_checkout + 'T00:00:00');
      const requestCheckin = new Date(checkin);
      const requestCheckout = new Date(checkout);

      return requestCheckin < resCheckout && requestCheckout > resCheckin;
    });

    return conflicts.length === 0;
  };

  const availableRooms = useMemo(() => {
    if (!checkinDate || !checkoutDate || !selectedBedConfigId) return [];

    let filtered = rooms.filter(room => {
      if (!room.is_active) return false;
      if (!room.bed_configuration_ids?.includes(selectedBedConfigId)) return false;
      return isRoomAvailable(room.id, checkinDate, checkoutDate);
    });

    filtered.sort((a, b) => {
      const siteA = sites.find(s => s.id === a.site_id)?.name || '';
      const siteB = sites.find(s => s.id === b.site_id)?.name || '';
      if (siteA !== siteB) return siteA.localeCompare(siteB);
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });

    return filtered;
  }, [rooms, checkinDate, checkoutDate, selectedBedConfigId, sites, reservations]);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setShowClientModal(true);
  };

  const validateClientData = () => {
    const newErrors = {};
    if (!clientData.contact_name?.trim()) newErrors.contact_name = "Name required";
    if (!clientData.contact_email?.trim()) {
      newErrors.contact_email = "Email required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.contact_email)) {
      newErrors.contact_email = "Invalid email";
    }
    return newErrors;
  };

  const handleFinalSubmit = () => {
    const validationErrors = validateClientData();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const config = bedConfigurations.find(c => c.id === selectedBedConfigId);
    
    onSubmit({
      ...clientData,
      room_id: selectedRoom.id,
      bed_configuration: config?.name || '',
      date_checkin: format(checkinDate, 'yyyy-MM-dd'),
      date_checkout: format(checkoutDate, 'yyyy-MM-dd'),
      adults_count: adults,
      children_count: children,
      infants_count: infants
    });

    setShowClientModal(false);
    setSelectedRoom(null);
  };

  const nights = checkinDate && checkoutDate 
    ? Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24))
    : 0;

  const getSiteName = (siteId) => sites.find(s => s.id === siteId)?.name || '';

  const canSearch = checkinDate && checkoutDate && selectedBedConfigId;

  return (
    <div className="space-y-8">
      {/* Search Bar - Airbnb Style */}
      <Card className="border-2 border-slate-300 shadow-xl">
        <CardContent className="p-2">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
            {/* Check-in */}
            <Popover open={checkinPopoverOpen} onOpenChange={setCheckinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex-1 min-w-[140px] h-14 flex flex-col items-start justify-center hover:bg-slate-100 rounded-xl"
                >
                  <span className="text-xs font-semibold text-slate-900">Check-in</span>
                  <span className="text-sm text-slate-600">
                    {checkinDate ? format(checkinDate, 'dd MMM yyyy') : 'Add date'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={checkinDate}
                  onSelect={(date) => {
                    setCheckinDate(date);
                    setCheckinPopoverOpen(false);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
              </PopoverContent>
            </Popover>

            <div className="hidden md:block w-px h-8 bg-slate-300" />

            {/* Check-out */}
            <Popover open={checkoutPopoverOpen} onOpenChange={setCheckoutPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex-1 min-w-[140px] h-14 flex flex-col items-start justify-center hover:bg-slate-100 rounded-xl"
                  disabled={!checkinDate}
                >
                  <span className="text-xs font-semibold text-slate-900">Check-out</span>
                  <span className="text-sm text-slate-600">
                    {checkoutDate ? format(checkoutDate, 'dd MMM yyyy') : 'Add date'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={checkoutDate}
                  onSelect={(date) => {
                    setCheckoutDate(date);
                    setCheckoutPopoverOpen(false);
                  }}
                  disabled={(date) => !checkinDate || date <= checkinDate}
                />
              </PopoverContent>
            </Popover>

            <div className="hidden md:block w-px h-8 bg-slate-300" />

            {/* Guests */}
            <Popover open={showGuestsPopover} onOpenChange={setShowGuestsPopover}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex-1 min-w-[140px] h-14 flex flex-col items-start justify-center hover:bg-slate-100 rounded-xl"
                >
                  <span className="text-xs font-semibold text-slate-900">Guests</span>
                  <span className="text-sm text-slate-600">
                    {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Adults</div>
                      <div className="text-sm text-slate-500">Ages 16+</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setAdults(Math.max(0, adults - 1))}
                        disabled={adults === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{adults}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setAdults(adults + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Children</div>
                      <div className="text-sm text-slate-500">Ages 5-16</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        disabled={children === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{children}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setChildren(children + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Infants</div>
                      <div className="text-sm text-slate-500">Under 5</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        disabled={infants === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{infants}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setInfants(infants + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="hidden md:block w-px h-8 bg-slate-300" />

            {/* Bed Setup */}
            <Popover open={showBedConfigPopover} onOpenChange={setShowBedConfigPopover}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex-1 min-w-[160px] h-14 flex flex-col items-start justify-center hover:bg-slate-100 rounded-xl"
                >
                  <span className="text-xs font-semibold text-slate-900">Bed setup</span>
                  <span className="text-sm text-slate-600 truncate max-w-[150px]">
                    {selectedConfig ? selectedConfig.name : 'Select setup'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-2">
                  {bedConfigurations.map((config) => (
                    <Button
                      key={config.id}
                      variant={selectedBedConfigId === config.id ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => {
                        setSelectedBedConfigId(config.id);
                        setShowBedConfigPopover(false);
                      }}
                    >
                      <div>
                        <div className="font-semibold">{config.name}</div>
                        <div className="text-xs opacity-80">Max {config.max_occupancy} guests</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Available Rooms */}
      {canSearch && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800">
              {availableRooms.length > 0 
                ? `${availableRooms.length} ${availableRooms.length === 1 ? 'room' : 'rooms'} available`
                : 'No rooms available'
              }
            </h2>
            {checkinDate && checkoutDate && (
              <p className="text-slate-600">
                {format(checkinDate, 'dd MMM')} - {format(checkoutDate, 'dd MMM')} • {nights} {nights === 1 ? 'night' : 'nights'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableRooms.map((room) => (
              <Card 
                key={room.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-400"
                onClick={() => handleRoomSelect(room)}
              >
                {room.photo_url && (
                  <div className="aspect-video w-full overflow-hidden bg-slate-100">
                    <img 
                      src={room.photo_url} 
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-800">{room.name}</h3>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getSiteName(room.site_id)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-3">
                    <Bed className="w-4 h-4" />
                    <span>{selectedConfig?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <Users className="w-4 h-4" />
                    <span>Up to {room.capacity_max} guests</span>
                  </div>

                  <Button className="w-full mt-4 bg-yellow-700 hover:bg-yellow-800">
                    Reserve
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {availableRooms.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-lg text-slate-600">
                No rooms available for your selected dates and bed setup.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Try adjusting your dates or bed configuration.
              </p>
            </Card>
          )}
        </div>
      )}

      {!canSearch && (
        <Card className="p-12 text-center bg-slate-50">
          <CalendarIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            Start your search
          </h3>
          <p className="text-slate-600">
            Select your dates, number of guests, and bed setup to see available rooms.
          </p>
        </Card>
      )}

      {/* Client Info Modal */}
      {showClientModal && selectedRoom && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowClientModal(false);
            setSelectedRoom(null);
            setErrors({});
          }}
        >
          <Card 
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-slate-800">Complete your booking</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowClientModal(false);
                  setSelectedRoom(null);
                  setErrors({});
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Booking Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Booking details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Room:</strong> {selectedRoom.name} ({getSiteName(selectedRoom.site_id)})</p>
                  <p><strong>Dates:</strong> {format(checkinDate, 'dd MMM yyyy')} - {format(checkoutDate, 'dd MMM yyyy')}</p>
                  <p><strong>Guests:</strong> {adults} adults, {children} children, {infants} infants</p>
                  <p><strong>Bed setup:</strong> {selectedConfig?.name}</p>
                </div>
              </div>

              {/* Client Form */}
              <div className="space-y-4">
                <h3 className="font-semibold">Your information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name" className={errors.contact_name ? 'text-red-600' : ''}>
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={clientData.contact_name}
                    onChange={(e) => {
                      setClientData(prev => ({ ...prev, contact_name: e.target.value }));
                      if (errors.contact_name) {
                        setErrors(prev => ({ ...prev, contact_name: undefined }));
                      }
                    }}
                    placeholder="John Doe"
                    className={errors.contact_name ? 'border-red-300' : ''}
                  />
                  {errors.contact_name && (
                    <p className="text-sm text-red-600">{errors.contact_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={errors.contact_email ? 'text-red-600' : ''}>
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientData.contact_email}
                    onChange={(e) => {
                      setClientData(prev => ({ ...prev, contact_email: e.target.value }));
                      if (errors.contact_email) {
                        setErrors(prev => ({ ...prev, contact_email: undefined }));
                      }
                    }}
                    placeholder="john@example.com"
                    className={errors.contact_email ? 'border-red-300' : ''}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600">{errors.contact_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={clientData.contact_phone}
                    onChange={(e) => setClientData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Special requests (optional)</Label>
                  <Input
                    id="comment"
                    value={clientData.comment}
                    onChange={(e) => setClientData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Any special requests..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowClientModal(false);
                    setSelectedRoom(null);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-yellow-700 hover:bg-yellow-800"
                  onClick={handleFinalSubmit}
                >
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}