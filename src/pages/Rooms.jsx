
import React, { useState, useEffect } from "react";
import { Room } from "@/entities/Room";
import { Site } from "@/entities/Site";
import { BedConfiguration } from "@/entities/BedConfiguration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Users, MapPin, Grid, List, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RoomForm from "../components/rooms/RoomForm";
import RoomTable from "../components/rooms/RoomTable";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [allBedConfigs, setAllBedConfigs] = useState([]);
  const [selectedSiteName, setSelectedSiteName] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sitesData, roomsData, bedConfigsData] = await Promise.all([
        Site.list(),
        Room.list('-created_date'),
        BedConfiguration.list('sort_order') // Changed to sort by 'sort_order'
      ]);
      
      setRooms(roomsData);
      setSites(sitesData);
      setAllBedConfigs(bedConfigsData);

    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };
  
  const handleSaveRoom = async (roomData) => {
    try {
      if (editingRoom) {
        await Room.update(editingRoom.id, roomData);
      } else {
        await Room.create(roomData);
      }
      setIsFormOpen(false);
      setEditingRoom(null);
      loadData();
    } catch (error) {
      console.error("Error saving room:", error);
    }
  };

  const handleEditClick = (room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };
  
  const handleNewClick = () => {
    setEditingRoom(null);
    setIsFormOpen(true);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!roomId) return;
    try {
      await Room.delete(roomId);
    } catch (error) {
      console.error("Error deleting room:", error);
    } finally {
      setIsFormOpen(false);
      setEditingRoom(null);
      loadData();
    }
  };

  const getSiteInfo = (siteId) => {
    return sites.find(site => site.id === siteId);
  };

  const filteredRooms = rooms.filter(room => {
    if (selectedSiteName === "all") return true;
    const roomSite = getSiteInfo(room.site_id);
    return roomSite && roomSite.name === selectedSiteName;
  });

  const groupedRooms = filteredRooms.reduce((groups, room) => {
    const siteName = getSiteInfo(room.site_id)?.name || "Unknown Site";
    if (!groups[siteName]) {
      groups[siteName] = [];
    }
    groups[siteName].push(room);
    return groups;
  }, {});

  const uniqueSitesByName = Array.from(
    new Map(sites.map(site => [site.name, site])).values()
  );

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
        const dataToExport = filteredRooms.map(room => {
            const site = getSiteInfo(room.site_id);
            
            const bedConfigNames = room.bed_configuration_ids
                ?.map(id => allBedConfigs.find(bc => bc.id === id)?.name)
                .filter(Boolean)
                .join('; ');

            return {
                'Site': site?.name || 'N/A',
                'Room Number': room.number || '',
                'Room Name': room.name || '',
                'Status': room.is_active ? 'Active' : 'Inactive',
                'Max Capacity': room.capacity_max || 0,
                'Type': room.type_label || '',
                'Bed Configurations': bedConfigNames || 'N/A',
                'Notes': room.notes || ''
            };
        });

        if (dataToExport.length === 0) {
            alert("No rooms to export.");
            setIsExporting(false);
            return;
        }

        const headers = Object.keys(dataToExport[0]);
        const escapeCsvValue = (value) => {
            if (value === null || value === undefined) return '';
            let strValue = String(value);
            if (/[",\n;]/.test(strValue)) {
                strValue = '"' + strValue.replace(/"/g, '""') + '"';
            }
            return strValue;
        };
        
        const csvContent = [
            headers.map(escapeCsvValue).join(','),
            ...dataToExport.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `rooms-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert("An error occurred during export.");
    }
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full space-y-6">
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg">
                    <Button 
                        size="sm" 
                        variant={viewMode === 'table' ? 'default' : 'ghost'} 
                        onClick={() => setViewMode('table')}
                        className={`transition-all h-8 ${viewMode === 'table' ? 'bg-white text-slate-800' : 'text-slate-600'}`}
                    >
                        <List className="w-4 h-4 mr-2" />
                        Table
                    </Button>
                    <Button 
                        size="sm" 
                        variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                        onClick={() => setViewMode('grid')}
                        className={`transition-all h-8 ${viewMode === 'grid' ? 'bg-white text-slate-800' : 'text-slate-600'}`}
                    >
                        <Grid className="w-4 h-4 mr-2" />
                        Grid
                    </Button>
                </div>
                <select
                  value={selectedSiteName}
                  onChange={(e) => setSelectedSiteName(e.target.value)}
                  className="px-4 py-1.5 h-9 border border-slate-200 rounded-lg bg-white text-slate-700"
                >
                  <option value="all">All sites</option>
                  {uniqueSitesByName.map(site => (
                    <option key={site.name} value={site.name}>{site.name}</option>
                  ))}
                </select>
                <div className="text-sm text-slate-600 pl-2">
                  {filteredRooms.length} rooms found
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9" onClick={handleExportCsv} disabled={isExporting}>
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 h-9" onClick={handleNewClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Room
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {viewMode === 'grid' ? (
              <div className="space-y-8">
                {Object.entries(groupedRooms).map(([siteName, siteRooms]) => (
                  <Card key={siteName} className="border border-slate-200 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        {siteName}
                        <Badge variant="secondary" className="ml-2">
                          {siteRooms.length} rooms
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {siteRooms.map((room) => (
                          <Card key={room.id} className="group transition-all duration-300 border border-slate-200 hover:border-blue-300">
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                {/* Room Image */}
                                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden">
                                  {room.photo_url ? (
                                    <img 
                                      src={room.photo_url} 
                                      alt={room.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Building2 className="w-8 h-8 text-slate-400" />
                                    </div>
                                  )}
                                </div>
    
                                {/* Room Info */}
                                <div>
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-slate-800 text-lg">{room.number} – {room.name}</h4>
                                    <Badge 
                                      variant={room.is_active ? "default" : "secondary"}
                                      className={room.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}
                                    >
                                      {room.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1 text-slate-600">
                                      <Users className="w-4 h-4" />
                                      <span className="text-sm font-medium">{room.capacity_max} max capacity</span>
                                    </div>
                                  </div>
    
                                  {/* Bed Configurations */}
                                  {room.bed_configurations && room.bed_configurations.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-medium text-slate-700 mb-2">Bed Configurations:</p>
                                      <div className="space-y-1">
                                        {room.bed_configurations.slice(0, 2).map((config, index) => (
                                          <div key={index} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                            <span className="text-slate-700 truncate">{config.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {config.max_occupancy} people
                                            </Badge>
                                          </div>
                                        ))}
                                        {room.bed_configurations.length > 2 && (
                                          <p className="text-xs text-slate-500 text-center">
                                            +{room.bed_configurations.length - 2} more configurations
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
    
                                  {room.notes && (
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                      <p className="text-xs text-slate-600">{room.notes}</p>
                                    </div>
                                  )}
                                </div>
    
                                {/* Actions */}
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    className="w-full hover:bg-blue-50"
                                    onClick={() => handleEditClick(room)}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit / View
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <RoomTable rooms={filteredRooms} sites={sites} allBedConfigs={allBedConfigs} onEditClick={handleEditClick} />
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Room" : "Create New Room"}</DialogTitle>
              <DialogDescription>
                Fill in the details below. Click save to confirm.
              </DialogDescription>
            </DialogHeader>
            <RoomForm
              room={editingRoom}
              sites={sites}
              onSave={handleSaveRoom}
              onCancel={() => setIsFormOpen(false)}
              onDelete={handleDeleteRoom}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
