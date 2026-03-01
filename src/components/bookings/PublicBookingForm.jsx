import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function PublicBookingForm({
  rooms = [],
  sites = [],
  bedConfigurations = [],
  reservations = [],
  agencies = [],
  onSubmit,
  initialRoom = null,
  initialDate = null,
  initialRanges = []
}) {
  const isMultiMode = initialRanges.length > 0;
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    agency_id: '',
    room_id: initialRoom?.id || '',
    bed_configuration: '',
    date_checkin: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
    date_checkout: initialDate ? format(addDays(initialDate, 1), 'yyyy-MM-dd') : '',
    adults_count: 2,
    children_count: 0,
    infants_count: 0,
    comment: '',
    notes: ''
  });

  const [existingClient, setExistingClient] = useState(null);

  const [selectedBedConfigId, setSelectedBedConfigId] = useState('');
  const [nights, setNights] = useState(1);

  // Pre-select bed configuration if initial room is provided
  useEffect(() => {
    if (initialRoom && initialRoom.bed_configuration_ids && initialRoom.bed_configuration_ids.length > 0) {
      const firstConfigId = initialRoom.bed_configuration_ids[0];
      const config = bedConfigurations.find(c => c.id === firstConfigId);
      if (config) {
        setSelectedBedConfigId(firstConfigId);
        setFormData(prev => ({
          ...prev,
          bed_configuration: config.name,
          adults_count: config.max_occupancy
        }));
      }
    }
  }, [initialRoom, bedConfigurations]);
  const [errors, setErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [checkinPopoverOpen, setCheckinPopoverOpen] = useState(false);
  const [checkoutPopoverOpen, setCheckoutPopoverOpen] = useState(false);

  const selectedConfig = selectedBedConfigId ? bedConfigurations.find(c => c.id === selectedBedConfigId) : null;
  const maxOccupancyForConfig = selectedConfig?.max_occupancy || 0;
  const currentOccupancy = formData.adults_count + formData.children_count + formData.infants_count;

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

  const handleChange = (field, value) => {
    setFormData(prev => {
      let newData = { ...prev, [field]: value };

      if (field === 'adults_count' || field === 'children_count' || field === 'infants_count') {
        if (selectedConfig) {
          const maxCapacity = selectedConfig.max_occupancy;
          const newValue = parseInt(value, 10) || 0;

          let adults = field === 'adults_count' ? newValue : prev.adults_count;
          let children = field === 'children_count' ? newValue : prev.children_count;
          let infants = field === 'infants_count' ? newValue : prev.infants_count;

          const total = adults + children + infants;

          if (total > maxCapacity) {
            const excess = total - maxCapacity;

            if (field === 'adults_count') {
              if (children >= excess) {
                children = children - excess;
              } else {
                const remaining = excess - children;
                children = 0;
                infants = Math.max(0, infants - remaining);
              }
            } else if (field === 'children_count') {
              if (adults >= excess) {
                adults = adults - excess;
              } else {
                const remaining = excess - adults;
                adults = 0;
                infants = Math.max(0, infants - remaining);
              }
            } else if (field === 'infants_count') {
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
          newData[field] = parseInt(value, 10) || 0;
        }
      }

      return newData;
    });

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
    const config = bedConfigurations.find(c => c.id === configId);
    if (config) {
      setFormData(prev => ({
        ...prev,
        bed_configuration: config.name,
        adults_count: config.max_occupancy,
        children_count: 0,
        infants_count: 0,
        room_id: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        bed_configuration: '',
        adults_count: 2,
        children_count: 0,
        infants_count: 0,
        room_id: ''
      }));
    }
  };

  const handleCheckinChange = (date) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      setFormData(prev => {
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
      setFormData(prev => ({ ...prev, date_checkout: dateStr }));
      setCheckoutPopoverOpen(false);
    }
  };

  const isRoomAvailable = useCallback((roomId, checkinStr, checkoutStr) => {
    if (!roomId || !checkinStr || !checkoutStr) {
      return false;
    }

    const checkinDate = new Date(checkinStr + 'T00:00:00');
    const checkoutDate = new Date(checkoutStr + 'T00:00:00');

    const conflicts = reservations.filter(reservation => {
      if (reservation.status === 'ANNULE') return false;
      if (reservation.room_id !== roomId) return false;

      const resCheckin = new Date(reservation.date_checkin + 'T00:00:00');
      const resCheckout = new Date(reservation.date_checkout + 'T00:00:00');

      return checkinDate < resCheckout && checkoutDate > resCheckin;
    });

    return conflicts.length === 0;
  }, [reservations]);

  const filteredAvailableRooms = useMemo(() => {
    let available = [...rooms];

    if (selectedBedConfigId) {
      available = available.filter(room =>
        room.bed_configuration_ids?.includes(selectedBedConfigId)
      );
    }

    if (formData.date_checkin && formData.date_checkout) {
      available = available.filter(room =>
        isRoomAvailable(room.id, formData.date_checkin, formData.date_checkout)
      );
    } else {
      return [];
    }

    available.sort((a, b) => {
      const siteA = sites.find(s => s.id === a.site_id)?.name || '';
      const siteB = sites.find(s => s.id === b.site_id)?.name || '';
      
      if (siteA !== siteB) {
        return siteA.localeCompare(siteB);
      }
      
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });

    return available;
  }, [rooms, selectedBedConfigId, formData.date_checkin, formData.date_checkout, isRoomAvailable, sites]);

  const handleEmailBlur = async () => {
    const email = formData.contact_email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = urlParams.get('base44_data_env') === 'dev';
      const dbClient = isTestMode ? base44.asDataEnv('dev') : base44;
      const clients = await dbClient.entities.Client.list();
      const found = clients.find(c => c.contact_email?.toLowerCase() === email.toLowerCase());
      setExistingClient(found || null);
    } catch (e) {
      setExistingClient(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contact_name?.trim()) newErrors.contact_name = "Name is required";
    if (!formData.contact_email?.trim()) {
      newErrors.contact_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Invalid email format";
    }
    if (!selectedBedConfigId) newErrors.bed_configuration = "Bed setup is required";
    if (!formData.room_id) newErrors.room_id = "Room is required";
    if (!formData.date_checkin) newErrors.date_checkin = "Check-in date is required";
    if (!formData.date_checkout) newErrors.date_checkout = "Check-out date is required";

    if (formData.date_checkin && formData.date_checkout) {
      const checkin = new Date(formData.date_checkin + 'T00:00:00');
      const checkout = new Date(formData.date_checkout + 'T00:00:00');

      if (checkout <= checkin) {
        newErrors.date_checkout = "Check-out must be after check-in";
      }
    }

    if (selectedConfig && currentOccupancy > maxOccupancyForConfig) {
      newErrors.occupancy = `Too many guests (${currentOccupancy} total) for selected bed configuration (max ${maxOccupancyForConfig})`;
    }

    if (currentOccupancy === 0) {
      newErrors.occupancy = "At least one guest is required";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    onSubmit({ ...formData, existingClientId: existingClient?.id || null });
  };

  const getSiteName = (siteId) => {
    return sites.find(s => s.id === siteId)?.name || '';
  };

  const isDateDisabledForCheckin = (date) => {
    if (date < new Date(new Date().setHours(0,0,0,0))) return true;
    return false;
  };

  const isDateDisabledForCheckout = (date) => {
    if (!formData.date_checkin) return true;

    const checkinDate = new Date(formData.date_checkin + 'T00:00:00');

    if (date <= checkinDate) return true;

    return false;
  };

  return (
    <div className="py-4">
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-600 space-y-1">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information */}
        <Card className="p-6 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name" className={errors.contact_name ? 'text-red-600' : ''}>
                Full Name {errors.contact_name && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="John Doe"
                className={errors.contact_name ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email" className={errors.contact_email ? 'text-red-600' : ''}>
                Email {errors.contact_email && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="john@example.com"
                className={errors.contact_email ? 'border-red-300 focus-visible:ring-red-300' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone (Optional)</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          
          {agencies.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="agency_id">Agency (Optional)</Label>
              <Select
                value={formData.agency_id}
                onValueChange={(value) => handleChange('agency_id', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select an agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No agency</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className={errors.date_checkin ? 'text-red-600' : ''}>
              Check-in {errors.date_checkin && <span className="text-red-500">*</span>}
            </Label>
            <Popover open={checkinPopoverOpen} onOpenChange={setCheckinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`w-full justify-start text-left font-normal h-11 ${errors.date_checkin ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_checkin ? format(new Date(formData.date_checkin + 'T12:00:00'), 'dd/MM/yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_checkin ? new Date(formData.date_checkin + 'T12:00:00') : undefined}
                  onSelect={handleCheckinChange}
                  disabled={isDateDisabledForCheckin}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nights">Nights</Label>
            <Select value={nights.toString()} onValueChange={handleNightsChange}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(night => (
                  <SelectItem key={night} value={night.toString()}>
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
                <Button 
                  variant="outline" 
                  className={`w-full justify-start text-left font-normal h-11 ${errors.date_checkout ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_checkout ? format(new Date(formData.date_checkout + 'T12:00:00'), 'dd/MM/yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date_checkout ? new Date(formData.date_checkout + 'T12:00:00') : undefined}
                  onSelect={handleCheckoutChange}
                  disabled={isDateDisabledForCheckout}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Bed Setup and Room */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bed_configuration" className={errors.bed_configuration ? 'text-red-600' : ''}>
              Bed Setup {errors.bed_configuration && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={selectedBedConfigId}
              onValueChange={handleBedConfigChange}
            >
              <SelectTrigger className={`h-11 ${errors.bed_configuration ? 'border-red-300 focus-visible:ring-red-300' : ''}`}>
                <SelectValue placeholder="Choose bed setup" />
              </SelectTrigger>
              <SelectContent>
                {bedConfigurations.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name} ({config.max_occupancy} guests max)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_id" className={errors.room_id ? 'text-red-600' : ''}>
              Room {errors.room_id && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={formData.room_id}
              onValueChange={(value) => handleChange('room_id', value)}
              disabled={filteredAvailableRooms.length === 0 || !formData.date_checkin || !selectedBedConfigId}
            >
              <SelectTrigger className={`h-11 ${errors.room_id ? 'border-red-300 focus-visible:ring-red-300' : ''}`}>
                <SelectValue 
                  placeholder={
                    filteredAvailableRooms.length > 0 && formData.date_checkin && selectedBedConfigId 
                      ? "Choose an available room" 
                      : "Select dates and bed setup first"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {filteredAvailableRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {getSiteName(room.site_id)} – {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredAvailableRooms.length === 0 && formData.date_checkin && selectedBedConfigId && (
              <p className="text-sm text-amber-600">No rooms available for selected dates and bed setup.</p>
            )}
          </div>
        </div>

        {/* Guests */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="adults_count" className={errors.occupancy ? 'text-red-600' : ''}>
              Adults (+16)
            </Label>
            <Input
              id="adults_count"
              className={`h-11 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
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
              className={`h-11 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
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
              className={`h-11 ${errors.occupancy ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
              type="number"
              min="0"
              max={maxOccupancyForConfig || 999}
              value={formData.infants_count}
              onChange={(e) => handleChange('infants_count', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="flex items-end h-[78px]">
            {selectedConfig ? (
              <Badge
                variant={currentOccupancy > maxOccupancyForConfig ? "destructive" : "secondary"}
                className="text-base px-4 py-2 whitespace-nowrap h-11 flex items-center"
              >
                {currentOccupancy} / {maxOccupancyForConfig} guests
              </Badge>
            ) : (
              <Badge variant="outline" className="text-base px-4 py-2 whitespace-nowrap text-slate-400 h-11 flex items-center">
                Select bed setup
              </Badge>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="comment">Special Requests or Comments (Optional)</Label>
          <Textarea
            id="comment"
            className="h-24"
            value={formData.comment}
            onChange={(e) => handleChange('comment', e.target.value)}
            placeholder="Any special requests, dietary requirements, or additional information..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="bg-yellow-700 hover:bg-yellow-800 px-8">
            Request Booking
          </Button>
        </div>
      </form>
    </div>
  );
}