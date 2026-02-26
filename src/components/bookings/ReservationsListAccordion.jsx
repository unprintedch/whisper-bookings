import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function ReservationsListAccordion({
  reservations = [],
  selectedClient,
  allRooms = [],
  allSites = [],
  agencies = [],
  allClients = [],
  allBedConfigs = [],
  selectedSiteName = "all",
  onBookingEdit,
  onBookingDelete
}) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  if (!selectedClient) return null;

  const clientReservations = reservations.filter(r => r.client_id === selectedClient.id);

  const startEditing = (reservation) => {
    setEditingId(reservation.id);
    setEditData({
      status: reservation.status,
      comment: reservation.comment || ""
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEditing = (reservationId) => {
    onBookingEdit?.(reservationId, editData);
    setEditingId(null);
    setEditData({});
  };

  if (clientReservations.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500">
        No reservations for this client.
      </div>
    );
  }

  const statusColors = {
    REQUEST: "bg-gray-100 text-gray-800",
    OPTION: "bg-amber-100 text-amber-800",
    RESERVE: "bg-blue-100 text-blue-800",
    CONFIRME: "bg-emerald-100 text-emerald-800",
    PAYE: "bg-green-100 text-green-800",
    ANNULE: "bg-red-100 text-red-800"
  };

  const getRoom = (roomId) => allRooms.find(r => r.id === roomId);
  const getSite = (siteId) => allSites.find(s => s.id === siteId);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">
        Reservations ({clientReservations.length})
      </h3>
      
      <Accordion type="single" collapsible className="border rounded-lg">
        {clientReservations.map((reservation) => {
          const room = getRoom(reservation.room_id);
          const site = getSite(room?.site_id);

          return (
            <AccordionItem key={reservation.id} value={reservation.id} className="border-b last:border-b-0">
              <AccordionTrigger className="hover:bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3 text-left flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {site?.name && `${site.name} – `}{room?.number} – {room?.name}
                      </span>
                      <Badge className={statusColors[reservation.status] || "bg-gray-100"}>
                        {reservation.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(reservation.date_checkin), 'dd MMM')} → {format(new Date(reservation.date_checkout), 'dd MMM')}
                      {reservation.bed_configuration && ` • ${reservation.bed_configuration}`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="bg-slate-50 px-4 py-4">
                <div className="space-y-4">
                  {editingId === reservation.id ? (
                    <div className="space-y-4">
                      {/* View Only Fields */}
                      <div className="grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded border">
                        <div>
                          <p className="text-slate-500 text-xs">Check-in</p>
                          <p className="font-medium">{format(new Date(reservation.date_checkin), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Check-out</p>
                          <p className="font-medium">{format(new Date(reservation.date_checkout), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Bed Setup</p>
                          <p className="font-medium">{reservation.bed_configuration || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Occupancy</p>
                          <p className="font-medium">
                            {reservation.adults_count + reservation.children_count + reservation.infants_count} people
                          </p>
                        </div>
                      </div>

                      {/* Editable Status */}
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-xs">Status</Label>
                        <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({...prev, status: value}))}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REQUEST">Request</SelectItem>
                            <SelectItem value="OPTION">Option</SelectItem>
                            <SelectItem value="RESERVE">Reserved</SelectItem>
                            <SelectItem value="CONFIRME">Confirmed</SelectItem>
                            <SelectItem value="PAYE">Paid</SelectItem>
                            <SelectItem value="ANNULE">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Editable Comment */}
                      <div className="space-y-2">
                        <Label htmlFor="comment" className="text-xs">Comments</Label>
                        <Textarea
                          value={editData.comment}
                          onChange={(e) => setEditData(prev => ({...prev, comment: e.target.value}))}
                          placeholder="Add comments..."
                          className="h-20 text-sm"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2 bg-yellow-700 hover:bg-yellow-800"
                          onClick={() => saveEditing(reservation.id)}
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onBookingDelete?.(reservation.id)}
                          className="gap-2 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Check-in</p>
                          <p className="font-medium">{format(new Date(reservation.date_checkin), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Check-out</p>
                          <p className="font-medium">{format(new Date(reservation.date_checkout), 'dd/MM/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Bed Setup</p>
                          <p className="font-medium">{reservation.bed_configuration || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Occupancy</p>
                          <p className="font-medium">
                            {reservation.adults_count + reservation.children_count + reservation.infants_count} people
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-slate-500 text-xs">Status</p>
                        <Badge className={statusColors[reservation.status] || "bg-gray-100"}>
                          {reservation.status}
                        </Badge>
                      </div>

                      {reservation.comment && (
                        <div>
                          <p className="text-slate-500 text-xs">Comments</p>
                          <p className="text-sm">{reservation.comment}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(reservation)}
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onBookingDelete?.(reservation.id)}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}