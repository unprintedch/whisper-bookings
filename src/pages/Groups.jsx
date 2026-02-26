import React, { useState, useEffect } from "react";
import { Group, Agency, Reservation, Room, Site } from "@/components/lib/entitiesWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail, Phone, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import GroupForm from "../components/groups/GroupForm";
import BookingForm from "../components/bookings/BookingForm";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]); // Added state for sites
  const [isLoading, setIsLoading] = useState(true);
  
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [groupsData, agenciesData, reservationsData, roomsData, sitesData] = await Promise.all([ // Added sitesData
        Group.list('-created_date'),
        Agency.list(),
        Reservation.list(),
        Room.list(),
        Site.list() // Fetch sites data
      ]);
      setGroups(groupsData);
      setAgencies(agenciesData);
      setReservations(reservationsData);
      setRooms(roomsData);
      setSites(sitesData); // Set sites data
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };
  
  const handleNewGroup = () => {
    setEditingGroup(null);
    setIsGroupFormOpen(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setIsGroupFormOpen(true);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      if (editingGroup) {
        await Group.update(editingGroup.id, groupData);
      } else {
        const dataWithColor = {
          ...groupData,
          color_hex: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
        };
        await Group.create(dataWithColor);
      }
      setIsGroupFormOpen(false);
      setEditingGroup(null);
      loadData();
    } catch (error) {
      console.error('Error saving group:', error);
    }
  };

  const handleEditReservation = (reservation) => {
    setEditingReservation(reservation);
    setIsBookingFormOpen(true);
  };

  const handleSaveReservation = async (reservationData) => {
    if (!editingReservation) return;
    try {
      await Reservation.update(editingReservation.id, reservationData);
      setIsBookingFormOpen(false);
      setEditingReservation(null);
      loadData();
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  const getAgencyInfo = (agencyId) => {
    return agencies.find(agency => agency.id === agencyId);
  };

  const getGroupReservations = (groupId) => {
    return reservations.filter(reservation => reservation.group_id === groupId);
  };
  
  const getRoomInfo = (roomId) => {
    return rooms.find(room => room.id === roomId);
  };

  const getStatusColor = (status) => {
    const colors = {
      OPTION: "bg-amber-100 text-amber-800",
      RESERVE: "bg-blue-100 text-blue-800",
      CONFIRME: "bg-emerald-100 text-emerald-800",
      PAYE: "bg-green-100 text-green-800",
      ANNULE: "bg-gray-100 text-gray-600"
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Group Management</h1>
            <p className="text-slate-600">
              All your booking groups • {groups.length} active groups
            </p>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleNewGroup}>
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>

        {/* Group List */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-blue-600" />
              Booking Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24"></div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No groups created yet</p>
                <p className="text-sm">Create your first group to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => {
                  const agency = getAgencyInfo(group.agency_id);
                  const groupReservations = getGroupReservations(group.id);
                  const activeReservations = groupReservations.filter(r => r.status !== 'ANNULE');
                  
                  return (
                    <Card key={group.id} className="group transition-all duration-300 border border-slate-200 hover:border-blue-300">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div 
                              className="w-4 h-16 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: group.color_hex || '#3b82f6' }}
                            ></div>
                            
                            <div className="space-y-3 flex-1">
                              <div>
                                <h3 className="text-xl font-bold text-slate-800">{group.name}</h3>
                                {agency && (
                                  <p className="text-slate-600 font-medium">{agency.name}</p>
                                )}
                              </div>

                              {group.contact_name && (
                                <div className="space-y-1">
                                  <p className="font-medium text-slate-700">{group.contact_name}</p>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                    {group.contact_email && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        <span>{group.contact_email}</span>
                                      </div>
                                    )}
                                    {group.contact_phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        <span>{group.contact_phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {group.notes && (
                                <div className="bg-slate-50 p-3 rounded-lg max-w-md">
                                  <p className="text-sm text-slate-600">{group.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-full md:w-auto text-right space-y-3 flex-shrink-0 md:max-w-xs">
                            <div className="flex flex-wrap gap-1 justify-end">
                              {Object.entries(
                                groupReservations.reduce((acc, reservation) => {
                                  const status = reservation.status;
                                  acc[status] = (acc[status] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([status, count]) => (
                                <Badge 
                                  key={status}
                                  className={`${getStatusColor(status)} text-xs`}
                                >
                                  {status} ({count})
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="text-sm text-slate-600">
                              <p className="font-medium">{activeReservations.length} active reservations</p>
                              {group.created_date && (
                                <p>Created on {format(new Date(group.created_date), 'd MMM yyyy', { locale: enUS })}</p>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" className="hover:bg-amber-50" onClick={() => handleEditGroup(group)}>
                                <Edit className="w-4 h-4 mr-1"/>
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                        {groupReservations.length > 0 && (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <h4 className="font-medium text-slate-700 mb-2">Reservations in this group</h4>
                            <div className="space-y-2">
                              {groupReservations.map(res => {
                                const room = getRoomInfo(res.room_id);
                                return (
                                  <div 
                                    key={res.id} 
                                    className="bg-slate-50/70 p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer hover:bg-slate-100 hover:shadow-sm transition-all"
                                    onClick={() => handleEditReservation(res)}
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-800">{room?.name || `Room ID: ${res.room_id}`}</p>
                                      {res.date_checkin && res.date_checkout && (
                                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                          {format(new Date(res.date_checkin + 'T12:00:00'), 'd MMM yyyy')} - {format(new Date(res.date_checkout + 'T12:00:00'), 'd MMM yyyy')}
                                        </span>
                                      </div>
                                      )}
                                    </div>
                                    <Badge className={`${getStatusColor(res.status)} text-xs self-start sm:self-center`}>{res.status}</Badge>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Update the details for this group." : "Fill in the details for the new group."}
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            group={editingGroup}
            agencies={agencies}
            onSave={handleSaveGroup}
            onCancel={() => setIsGroupFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>
              Update the details for this booking. Changes will be reflected everywhere.
            </DialogDescription>
          </DialogHeader>
          <BookingForm
            existingBooking={editingReservation}
            onSave={handleSaveReservation}
            onCancel={() => setIsBookingFormOpen(false)}
            rooms={rooms}
            groups={groups}
            sites={sites}
            agencies={agencies}
            reservations={reservations}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}