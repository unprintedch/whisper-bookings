
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { BedConfiguration } from "@/entities/BedConfiguration"; // Added BedConfiguration import
import { UploadFile } from "@/integrations/Core";
import { X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RoomForm({ room, sites = [], onSave, onCancel, onDelete }) {
  // Refactored state from a single formData object to individual state variables
  const [name, setName] = useState('');
  const [number, setNumber] = useState(''); // NEW STATE: for room number
  const [siteId, setSiteId] = useState('');
  const [capacityMax, setCapacityMax] = useState(2);
  const [typeLabel, setTypeLabel] = useState('Double'); // Now an editable state
  const [bedConfigIds, setBedConfigIds] = useState([]); // Changed from bedConfigs to bedConfigIds
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [allBedConfigs, setAllBedConfigs] = useState([]); // New state for all available bed configurations
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Deduplicate sites by name
  const uniqueSites = useMemo(() =>
    Array.from(
      new Map(sites.map(site => [site.name, site])).values()
    )
  , [sites]);

  const getSiteIdByName = useCallback((siteName) => {
    const site = uniqueSites.find(s => s.name === siteName);
    return site ? site.id : '';
  }, [uniqueSites]);

  const getSiteNameById = useCallback((siteIdToFind) => {
    const site = sites.find(s => s.id === siteIdToFind);
    return site ? site.name : '';
  }, [sites]);
  
  // Removed getRoomTypeFromCapacity as typeLabel is now editable
  // Removed getDefaultBedConfigs as bed configurations are now selected from a predefined list

  // Effect to initialize all state variables when 'room' prop or 'sites' change
  useEffect(() => {
    const loadBedConfigs = async () => {
      try {
        const configs = await BedConfiguration.list('sort_order');
        setAllBedConfigs(configs);
      } catch (error) {
        console.error("Failed to load bed configurations:", error);
        // Optionally handle error, e.g., show a toast notification
      }
    };
    loadBedConfigs();

    if (room) {
      const roomSiteName = getSiteNameById(room.site_id);
      const matchingSiteId = getSiteIdByName(roomSiteName);
      
      setName(room.name || '');
      setNumber(room.number || ''); // Initialize new 'number' state
      setSiteId(matchingSiteId || (uniqueSites.length > 0 ? uniqueSites[0].id : ''));
      setCapacityMax(room.capacity_max || 2);
      setTypeLabel(room.type_label || 'Double'); // Initialize typeLabel from room prop
      setBedConfigIds(room.bed_configuration_ids || []); // Initialize bedConfigIds from room prop
      setNotes(room.notes || '');
      setPhotoUrl(room.photo_url || '');
      setIsActive(room.is_active !== undefined ? room.is_active : true);
    } else {
      const initialCapacity = 2;
      setName('');
      setNumber(''); // Initialize new 'number' state for a new room
      setSiteId(uniqueSites.length > 0 ? uniqueSites[0].id : '');
      setCapacityMax(initialCapacity);
      setTypeLabel('Double'); // Default for new room
      setBedConfigIds([]); // Default for new room
      setNotes('');
      setPhotoUrl('');
      setIsActive(true);
    }
  }, [room, sites, getSiteIdByName, getSiteNameById, uniqueSites]);

  // Removed effect to automatically set type label based on capacityMax state

  const handleCapacityChange = (e) => {
    const newCapacity = parseInt(e.target.value, 10);
    // Ensure newCapacity is a valid number and within bounds
    if (isNaN(newCapacity) || newCapacity < 1) {
      setCapacityMax(1);
    } else if (newCapacity > 8) { // Assuming max is 8 based on existing input field limit
      setCapacityMax(8);
    } else {
      setCapacityMax(newCapacity);
    }
    // Bed configurations are no longer automatically reset here
  };

  const handleBedConfigChange = (configId) => {
    setBedConfigIds((prev) =>
      prev.includes(configId)
        ? prev.filter((id) => id !== configId)
        : [...prev, configId]
    );
  };

  // Removed handleBedConfigurationChange, addBedConfiguration, removeBedConfiguration

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPhotoUrl(file_url); // Update photoUrl state directly
    } catch (error) {
      console.error("Upload error:", error);
    }
    setIsUploading(false);
  };

  // Renamed handleSubmit to handleSave as per outline suggestion
  const handleSave = (e) => {
    e.preventDefault(); // Prevent default form submission
    onSave({
      name,
      number, // Include new 'number' field in the saved data
      site_id: siteId,
      capacity_max: Number(capacityMax),
      type_label: typeLabel, // Use directly from state
      bed_configuration_ids: bedConfigIds, // Use bedConfigIds
      photo_url: photoUrl,
      notes,
      is_active: isActive
    });
  };

  const handleDeleteConfirm = () => {
    if (room && room.id) {
      onDelete(room.id);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    // Form element encapsulates the content for submission, classname updated as per outline
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Updated gap-8 to gap-6 as per outline */}
        {/* ----- Column 1 ----- */}
        <div className="space-y-4"> {/* Updated space-y-6 to space-y-4 as per outline */}
          <div className="space-y-2">
            <Label htmlFor="site_id" className="font-semibold">Site</Label> {/* Added font-semibold as per outline */}
            <Select value={siteId} onValueChange={setSiteId} required>
              <SelectTrigger id="site_id" className="mt-1"> {/* Added mt-1 as per outline */}
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
              <Label htmlFor="room-number" className="font-semibold">Room Number</Label> {/* NEW FIELD: Room Number */}
              <Input
                id="room-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g., 101"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="name" className="font-semibold">Room Name</Label> {/* Added font-semibold, id changed to 'name' */}
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Simba"
                required
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity_max">Max Capacity</Label>
              <Input 
                id="capacity_max" 
                type="number" 
                min="1"
                max="8"
                value={capacityMax} 
                onChange={handleCapacityChange} // Use dedicated handler
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type_label">Room Type</Label>
              <Select value={typeLabel} onValueChange={setTypeLabel} required>
                <SelectTrigger id="type_label">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Triple">Triple</SelectItem>
                  <SelectItem value="Quadruple">Quadruple</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Room Photo</Label>
            <div className="space-y-3">
              {photoUrl && (
                <div className="relative">
                  <img 
                    src={photoUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 bg-white"
                    onClick={() => setPhotoUrl('')} // Clear photoUrl state
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <label htmlFor="photo-upload" className="cursor-pointer">
                 <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {isUploading ? 'Uploading...' : 'Choose Image'}
                  </span>
                </Button>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* ----- Column 2 ----- */}
        <div className="space-y-6">
           <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-800">Bed Configurations</h3>
              {/* Removed Add button for bed configurations */}
            </div>
            <div className="space-y-3">
              {allBedConfigs.length > 0 ? (
                allBedConfigs.map((config) => (
                  <div key={config.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`config-${config.id}`}
                      checked={bedConfigIds.includes(config.id)}
                      onCheckedChange={() => handleBedConfigChange(config.id)}
                    />
                    <Label htmlFor={`config-${config.id}`} className="font-normal cursor-pointer flex-grow">
                      {config.name} (max {config.max_occupancy})
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No bed configurations defined. Please add them in the 'Bed Configurations' section.</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is_active">Room is active</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 pt-6 border-t">
        <div>
          {room && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this room?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the room "{room.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                    Yes, delete room
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save</Button>
        </div>
      </div>
    </form>
  );
}
