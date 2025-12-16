import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, Image, Bed } from "lucide-react";

export default function AvailableRooms({ 
  rooms, 
  reservations, 
  dateRange, 
  onRoomSelect,
  sites 
}) {
  const [selectedSite, setSelectedSite] = useState("all");

  const isRoomAvailable = (roomId) => {
    return !reservations.some(reservation => {
      if (reservation.room_id !== roomId) return false;
      if (reservation.status === 'ANNULE') return false;
      
      const checkin = new Date(reservation.date_checkin);
      const checkout = new Date(reservation.date_checkout);
      
      return checkin <= dateRange.endDate && checkout >= dateRange.startDate;
    });
  };

  const getSiteInfo = (siteId) => {
    return sites.find(site => site.id === siteId);
  };

  const availableRooms = rooms
    .filter(room => isRoomAvailable(room.id))
    .filter(room => selectedSite === "all" || room.site_id === selectedSite)
    .sort((a, b) => {
      const siteA = getSiteInfo(a.site_id)?.name || "";
      const siteB = getSiteInfo(b.site_id)?.name || "";
      
      if (siteA !== siteB) return siteA.localeCompare(siteB);
      if (a.capacity_max !== b.capacity_max) return b.capacity_max - a.capacity_max;
      return a.name.localeCompare(b.name);
    });

  const groupedRooms = availableRooms.reduce((groups, room) => {
    const siteName = getSiteInfo(room.site_id)?.name || "Unknown";
    if (!groups[siteName]) {
      groups[siteName] = [];
    }
    groups[siteName].push(room);
    return groups;
  }, {});

  return (
    <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Available Rooms
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            {availableRooms.length} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {Object.entries(groupedRooms).length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No available rooms</p>
            <p className="text-sm">All rooms are booked for this period</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRooms).map(([siteName, siteRooms]) => (
              <div key={siteName}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  {siteName}
                  <Badge variant="outline">{siteRooms.length}</Badge>
                </h3>
                
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
                                <Image className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                          </div>

                          {/* Room Info */}
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{room.name}</h4>
                            <p className="text-slate-600 text-sm mb-2">{room.type_label}</p>
                            
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1 text-slate-600">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">{room.capacity_max} max</span>
                              </div>
                              {room.bed_configurations && room.bed_configurations.length > 0 && (
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Bed className="w-4 h-4" />
                                  <span className="text-sm">{room.bed_configurations.length} config{room.bed_configurations.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>

                            {/* Bed Configurations */}
                            {room.bed_configurations && room.bed_configurations.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {room.bed_configurations.slice(0, 2).map((config, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                    <span className="text-slate-700 truncate">{config.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {config.max_occupancy} ppl
                                    </Badge>
                                  </div>
                                ))}
                                {room.bed_configurations.length > 2 && (
                                  <p className="text-xs text-slate-500 text-center">
                                    +{room.bed_configurations.length - 2} more
                                  </p>
                                )}
                              </div>
                            )}

                            {room.notes && (
                              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                {room.notes}
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          <Button 
                            onClick={() => onRoomSelect(room)}
                            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign to Group
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}