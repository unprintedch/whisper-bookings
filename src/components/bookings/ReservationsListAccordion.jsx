import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import BookingForm from "./BookingForm";

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
  const [editingReservationId, setEditingReservationId] = useState(null);

  if (!selectedClient) return null;

  const clientReservations = reservations.filter(r => r.client_id === selectedClient.id);

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
          const isEditing = editingReservationId === reservation.id;

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
                {isEditing ? (
                  <BookingForm
                    existingBooking={reservation}
                    initialClient={selectedClient}
                    rooms={allRooms}
                    clients={allClients}
                    sites={allSites}
                    agencies={agencies}
                    reservations={reservations}
                    allBedConfigs={allBedConfigs}
                    selectedSiteName={selectedSiteName}
                    onBookingEdit={onBookingEdit}
                    onSave={(data) => {
                      onBookingEdit?.(reservation.id, data);
                      setEditingReservationId(null);
                    }}
                    onCancel={() => setEditingReservationId(null)}
                    onDelete={(id) => {
                      onBookingDelete?.(id);
                      setEditingReservationId(null);
                    }}
                  />
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
                        onClick={() => setEditingReservationId(reservation.id)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}