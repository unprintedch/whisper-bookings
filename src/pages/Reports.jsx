import React, { useState, useEffect } from "react";
import { Reservation, Room, Group, Site } from "@/components/lib/entitiesWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, Calendar, TrendingUp, Users, Building2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { enUS } from "date-fns/locale";

export default function ReportsPage() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reservationsData, roomsData, groupsData, sitesData] = await Promise.all([
        Reservation.list('-created_date'),
        Room.list(),
        Group.list(),
        Site.list()
      ]);
      setReservations(reservationsData);
      setRooms(roomsData);
      setGroups(groupsData);
      setSites(sitesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const calculateOccupancyStats = () => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const stats = {
      totalRooms: rooms.filter(r => r.is_active).length,
      totalCapacity: rooms.reduce((sum, room) => sum + (room.is_active ? room.capacity_max : 0), 0),
      activeReservations: reservations.filter(r => r.status !== 'ANNULE').length,
      confirmedReservations: reservations.filter(r => ['CONFIRME', 'PAYE'].includes(r.status)).length,
      optionReservations: reservations.filter(r => r.status === 'OPTION').length,
      occupancyRate: 0
    };

    const occupiedNights = reservations.filter(r => r.status !== 'ANNULE').reduce((sum, reservation) => {
      const checkin = new Date(reservation.date_checkin);
      const checkout = new Date(reservation.date_checkout);
      const room = rooms.find(r => r.id === reservation.room_id);
      
      if (!room) return sum;
      
      const nights = Math.max(0, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
      return sum + (nights * room.capacity_max);
    }, 0);

    const totalPossibleNights = stats.totalCapacity * daysInMonth.length;
    stats.occupancyRate = totalPossibleNights > 0 ? (occupiedNights / totalPossibleNights) * 100 : 0;

    return stats;
  };

  const getSiteStats = () => {
    return sites.map(site => {
      const siteRooms = rooms.filter(r => r.site_id === site.id && r.is_active);
      const siteReservations = reservations.filter(r => {
        const room = rooms.find(room => room.id === r.room_id);
        return room && room.site_id === site.id && r.status !== 'ANNULE';
      });

      return {
        name: site.name,
        totalRooms: siteRooms.length,
        totalCapacity: siteRooms.reduce((sum, room) => sum + room.capacity_max, 0),
        activeReservations: siteReservations.length,
        revenue: siteReservations.length * 150 // Dummy price for demo
      };
    });
  };

  const exportToCsv = async () => {
    setIsExporting(true);
    try {
      const exportData = reservations.map(reservation => {
        const room = rooms.find(r => r.id === reservation.room_id);
        const group = groups.find(g => g.id === reservation.group_id);
        const site = sites.find(s => s.id === room?.site_id);
        
        return {
          'Group': group?.name || '',
          'Room': room?.name || '',
          'Site': site?.name || '',
          'Check-in': reservation.date_checkin,
          'Check-out': reservation.date_checkout,
          'Status': reservation.status,
          'Adults': reservation.adults_count,
          'Children': reservation.children_count,
          'Comment': reservation.comment || '',
          'Created At': format(new Date(reservation.created_date), 'MM/dd/yyyy')
        };
      });

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `whisper-booking-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
    setIsExporting(false);
  };

  const stats = calculateOccupancyStats();
  const siteStats = getSiteStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Reports & Analytics</h1>
            <p className="text-slate-600">
              Detailed statistics • Month of {format(new Date(), 'MMMM yyyy', { locale: enUS })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="current_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="current_year">This Year</option>
            </select>
            
            <Button 
              onClick={exportToCsv}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-200/50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-blue-600 text-sm font-medium">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.occupancyRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-200/50 rounded-xl">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-emerald-600 text-sm font-medium">Reservations</p>
                  <p className="text-3xl font-bold text-emerald-900">{stats.activeReservations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-200/50 rounded-xl">
                  <Users className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-amber-600 text-sm font-medium">Total Capacity</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.totalCapacity}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-200/50 rounded-xl">
                  <Building2 className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <p className="text-purple-600 text-sm font-medium">Active Rooms</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.totalRooms}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats by status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Breakdown by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="font-medium">Options</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">{stats.optionReservations}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                    <span className="font-medium">Confirmed</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">{stats.confirmedReservations}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium">Total Active</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{stats.activeReservations}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Performance by Site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {siteStats.map((site, index) => (
                  <div key={site.name} className={`p-4 rounded-lg ${
                    index % 2 === 0 ? 'bg-emerald-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800">{site.name}</h4>
                      <Badge variant="outline">{site.activeReservations} reservations</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Rooms</p>
                        <p className="font-semibold">{site.totalRooms}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Capacity</p>
                        <p className="font-semibold">{site.totalCapacity} people</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}