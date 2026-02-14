import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { startOfDay, addDays, format } from "date-fns";
import GanttChart from "../components/dashboard/GanttChart";

export default function HomePage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [bedConfigurations, setBedConfigurations] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteName, setSelectedSiteName] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({ bedConfigId: 'all' });
  
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);


  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      let shouldLoadData = false;
      
      // Check if password protection is enabled
      const settingsList = await base44.entities.PublicAccessSettings.list();
      if (settingsList.length > 0) {
        const settings = settingsList[0];
        setIsPasswordProtected(settings.is_password_protected || false);
        
        // If authenticated or not protected, grant access
        if (isAuth || !settings.is_password_protected) {
          setHasAccess(true);
          shouldLoadData = true;
        } else {
          // Check if password was previously entered (stored in sessionStorage)
          const storedAccess = sessionStorage.getItem('publicPageAccess');
          if (storedAccess === 'granted') {
            setHasAccess(true);
            shouldLoadData = true;
          } else {
            setIsLoading(false);
          }
        }
      } else {
        // No settings, grant access by default
        setHasAccess(true);
        shouldLoadData = true;
      }
      
      if (shouldLoadData) {
        loadData();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      setHasAccess(true);
      loadData();
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(false);
    
    try {
      const settingsList = await base44.entities.PublicAccessSettings.list();
      if (settingsList.length > 0) {
        const settings = settingsList[0];
        if (passwordInput === settings.access_password) {
          setHasAccess(true);
          sessionStorage.setItem('publicPageAccess', 'granted');
          loadData();
        } else {
          setPasswordError(true);
        }
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setPasswordError(true);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = urlParams.get('base44_data_env') === 'dev';
      const dbClient = isTestMode ? base44.asDataEnv('dev') : base44;
      
      const [roomsData, sitesData, bedConfigsData, reservationsData, clientsData] = await Promise.all([
        dbClient.entities.Room.list('-name'),
        dbClient.entities.Site.list(),
        dbClient.entities.BedConfiguration.list('sort_order'),
        dbClient.entities.Reservation.list('-created_date'),
        dbClient.entities.Client.list()
      ]);
      setRooms(roomsData);
      setSites(sitesData);
      setBedConfigurations(bedConfigsData);
      setReservations(reservationsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };



  const navigateDate = (direction) => {
    const days = direction === 'prev' ? -7 : 7;
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess && isPasswordProtected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
                alt="Whisper B. Logo" 
                className="w-16 h-16 mx-auto mb-3" 
              />
              <h1 className="text-2xl font-bold text-slate-800">Whisper B.</h1>
              <p className="text-slate-600 mt-2">This page is password protected</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  className="mt-1"
                />
                {passwordError && (
                  <p className="text-sm text-red-600 mt-1">Incorrect password</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-yellow-700 hover:bg-yellow-800">
                Access Page
              </Button>
            </form>

            {!isAuthenticated && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Or login as admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
              alt="Whisper B. Logo" 
              className="w-12 h-12" 
            />
            <h1 className="text-4xl font-bold text-slate-800">Whisper B.</h1>
            {isAuthenticated ? (
              <Button
                variant="default"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-yellow-700 hover:bg-yellow-800"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-4 h-4 mr-1" />
                Admin
              </Button>
            )}
          </div>
          <p className="text-xl text-slate-600">Safari Lodge Availability</p>
        </div>

        <Card className="max-w-7xl mx-auto border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Room Availability Calendar</h2>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('all')}
                    className={`transition-all ${
                      selectedSiteName === 'all' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    All Sites
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('Tarangire')}
                    className={`transition-all ${
                      selectedSiteName === 'Tarangire' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    Tarangire
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSiteName('Serengeti')}
                    className={`transition-all ${
                      selectedSiteName === 'Serengeti' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    Serengeti
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateDate('prev')}
                    className="hover:bg-blue-50 h-9 w-9"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="hover:bg-blue-50 h-9"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateDate('next')}
                    className="hover:bg-blue-50 h-9 w-9"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <Select 
                  value={filters.bedConfigId} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, bedConfigId: value }))}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Bed configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bed configurations</SelectItem>
                    {bedConfigurations.map(config => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} ({config.max_occupancy} max)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <GanttChart
              rooms={(() => {
                let filteredRooms = rooms.filter(room => room.is_active);
                
                if (selectedSiteName !== 'all') {
                  const matchingSiteIds = sites
                    .filter(s => s.name === selectedSiteName)
                    .map(s => s.id);
                  
                  if (matchingSiteIds.length > 0) {
                    filteredRooms = filteredRooms.filter(room => 
                      matchingSiteIds.includes(room.site_id)
                    );
                  }
                }
                
                if (filters.bedConfigId !== 'all') {
                  filteredRooms = filteredRooms.filter(room => 
                    room.bed_configuration_ids?.includes(filters.bedConfigId)
                  );
                }
                
                return filteredRooms.sort((a, b) => {
                  const siteA = sites.find(s => s.id === a.site_id)?.name || '';
                  const siteB = sites.find(s => s.id === b.site_id)?.name || '';
                  if (siteA !== siteB) {
                      return siteA.localeCompare(siteB);
                  }
                  return a.number.localeCompare(b.number, undefined, { numeric: true });
                });
              })()}
              reservations={reservations}
              clients={clients}
              groups={[]}
              sites={sites}
              dateColumns={Array.from({ length: 30 }, (_, i) => startOfDay(addDays(currentDate, i)))}
              highlightDate={currentDate}
              isLoading={isLoading}
              onCellClick={() => {}}
              onBookingEdit={null}
              onRoomEdit={null}
              isPublicView={true}
            />
          </CardContent>
        </Card>
      </div>


    </div>
  );
}