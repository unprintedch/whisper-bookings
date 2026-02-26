import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { Reservation, Room, Client, Agency } from "@/components/lib/entitiesWrapper";
import { format } from "date-fns";

export default function DataHealthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [clients, setClients] = useState([]);
  const [agencies, setAgencies] = useState([]);
  
  const [invalidReservations, setInvalidReservations] = useState([]);
  const [orphanedReservations, setOrphanedReservations] = useState([]);
  const [orphanedClients, setOrphanedClients] = useState([]);
  
  const [isFixing, setIsFixing] = useState(false);

  const analyzeData = useCallback((reservationsData, roomsData, clientsData, agenciesData) => {
    // Find reservations with missing or invalid dates
    const invalid = reservationsData.filter(r => 
      !r.date_checkin || 
      !r.date_checkout || 
      r.date_checkin === '' || 
      r.date_checkout === '' ||
      !r.room_id ||
      !r.client_id
    );
    setInvalidReservations(invalid);
    
    // Find reservations pointing to non-existent rooms
    const orphaned = reservationsData.filter(r => {
      if (!r.room_id) return false;
      return !roomsData.find(room => room.id === r.room_id);
    });
    setOrphanedReservations(orphaned);
    
    // Find clients pointing to non-existent agencies
    const orphanedClientsList = clientsData.filter(c => {
      if (!c.agency_id) return false;
      return !agenciesData.find(a => a.id === c.agency_id);
    });
    setOrphanedClients(orphanedClientsList);
  }, []); // analyzeData has no external dependencies

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reservationsData, roomsData, clientsData, agenciesData] = await Promise.all([
        Reservation.list(),
        Room.list(),
        Client.list(),
        Agency.list()
      ]);
      
      setReservations(reservationsData);
      setRooms(roomsData);
      setClients(clientsData);
      setAgencies(agenciesData);
      
      analyzeData(reservationsData, roomsData, clientsData, agenciesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  }, [analyzeData]); // loadData depends on analyzeData

  useEffect(() => {
    loadData();
  }, [loadData]); // useEffect depends on loadData

  const handleDeleteInvalidReservation = async (reservationId) => {
    try {
      await Reservation.delete(reservationId);
      await loadData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const handleDeleteAllInvalid = async () => {
    setIsFixing(true);
    try {
      for (const reservation of invalidReservations) {
        await Reservation.delete(reservation.id);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting invalid reservations:', error);
    }
    setIsFixing(false);
  };

  const handleFixOrphanedClient = async (clientId) => {
    try {
      await Client.update(clientId, { agency_id: null });
      await loadData();
    } catch (error) {
      console.error('Error fixing client:', error);
    }
  };

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
  };

  const getRoomName = (roomId) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const totalIssues = invalidReservations.length + orphanedReservations.length + orphanedClients.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full space-y-6">
        <header>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Data Health Check</h1>
              <p className="text-slate-600 mt-1">Identify and fix data inconsistencies</p>
            </div>
            <Button onClick={loadData} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Summary Card */}
        <Card className={`border-2 ${totalIssues > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-emerald-300 bg-emerald-50/50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {totalIssues > 0 ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-amber-600" />
                  <div>
                    <h3 className="text-2xl font-bold text-amber-900">{totalIssues} Issue{totalIssues > 1 ? 's' : ''} Found</h3>
                    <p className="text-amber-700">Your data needs attention</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-900">All Clear!</h3>
                    <p className="text-emerald-700">No data issues detected</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invalid Reservations */}
        {invalidReservations.length > 0 && (
          <Card className="border border-red-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-5 h-5" />
                    Invalid Reservations
                  </CardTitle>
                  <CardDescription>
                    Reservations with missing dates or required fields
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="text-lg">
                    {invalidReservations.length}
                  </Badge>
                  <Button 
                    onClick={handleDeleteAllInvalid} 
                    variant="destructive"
                    disabled={isFixing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invalidReservations.map((reservation) => (
                  <div 
                    key={reservation.id} 
                    className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        Reservation ID: {reservation.id.substring(0, 12)}...
                      </p>
                      <div className="text-sm text-slate-600 space-y-1 mt-2">
                        {!reservation.date_checkin || reservation.date_checkin === '' ? (
                          <p className="text-red-600">✗ Missing check-in date</p>
                        ) : (
                          <p>✓ Check-in: {reservation.date_checkin}</p>
                        )}
                        {!reservation.date_checkout || reservation.date_checkout === '' ? (
                          <p className="text-red-600">✗ Missing check-out date</p>
                        ) : (
                          <p>✓ Check-out: {reservation.date_checkout}</p>
                        )}
                        {!reservation.room_id ? (
                          <p className="text-red-600">✗ Missing room</p>
                        ) : (
                          <p>✓ Room: {getRoomName(reservation.room_id)}</p>
                        )}
                        {!reservation.client_id ? (
                          <p className="text-red-600">✗ Missing client</p>
                        ) : (
                          <p>✓ Client: {getClientName(reservation.client_id)}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Created: {format(new Date(reservation.created_date), 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleDeleteInvalidReservation(reservation.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orphaned Reservations */}
        {orphanedReservations.length > 0 && (
          <Card className="border border-amber-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    Orphaned Reservations
                  </CardTitle>
                  <CardDescription>
                    Reservations pointing to deleted rooms
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg border-amber-300 text-amber-800">
                  {orphanedReservations.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orphanedReservations.map((reservation) => (
                  <div 
                    key={reservation.id} 
                    className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {getClientName(reservation.client_id)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Room ID: {reservation.room_id} (deleted)
                      </p>
                      <p className="text-sm text-slate-500">
                        {reservation.date_checkin} to {reservation.date_checkout}
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleDeleteInvalidReservation(reservation.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orphaned Clients */}
        {orphanedClients.length > 0 && (
          <Card className="border border-amber-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    Orphaned Clients
                  </CardTitle>
                  <CardDescription>
                    Clients pointing to deleted agencies
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg border-amber-300 text-amber-800">
                  {orphanedClients.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orphanedClients.map((client) => (
                  <div 
                    key={client.id} 
                    className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{client.name}</p>
                      <p className="text-sm text-slate-600">
                        Agency ID: {client.agency_id} (deleted)
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleFixOrphanedClient(client.id)}
                      variant="outline"
                      size="sm"
                    >
                      Remove Agency Link
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}