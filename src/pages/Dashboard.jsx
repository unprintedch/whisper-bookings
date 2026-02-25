import React, { useState, useEffect } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Room } from "@/entities/Room";
import { Reservation } from "@/entities/Reservation";
import { Group } from "@/entities/Group";
import { Site } from "@/entities/Site";
import { Client } from "@/entities/Client";
import GanttChart from "../components/dashboard/GanttChart";

export default function Dashboard({ currentDate }) {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomsData, reservationsData, groupsData, sitesData, clientsData] = await Promise.all([
        Room.list(),
        Reservation.list(),
        Group.list(),
        Site.list(),
        Client.list(),
      ]);

      setRooms(roomsData);
      setReservations(reservationsData);
      setGroups(groupsData);
      setSites(sitesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const getDateColumns = () => {
    const columns = [];
    const dateRange = 30; // 30 days view
    const startDate = startOfDay(currentDate);
    for (let i = 0; i < dateRange; i++) {
      columns.push(addDays(startDate, i));
    }
    return columns;
  };

  const filteredRooms = rooms.filter(room => room.is_active);

  return (
    <div className="px-6 py-6">
      <div className="w-full space-y-6">
        <Card className="border shadow-sm bg-white">
          <CardContent className="p-0">
            <GanttChart
              rooms={filteredRooms}
              reservations={reservations}
              groups={groups}
              clients={clients}
              dateColumns={getDateColumns()}
              highlightDate={currentDate}
              isLoading={isLoading}
              sites={sites}
              isPublicView={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}