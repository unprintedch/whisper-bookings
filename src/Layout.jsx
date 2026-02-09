import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  Calendar as CalendarIcon, // Renamed to avoid conflict with the component
  Building2, 
  Users, 
  Settings, 
  BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  Plus,
  CircleUser, // Added for dropdown
  LogOut, // Added for dropdown
  Briefcase, // Added for Agencies
  Bed, // Added for Bed Configurations
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Added for client search
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar"; // Calendar component for date picker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { BedConfiguration } from "@/entities/BedConfiguration"; // Add BedConfiguration import
import { Badge } from "@/components/ui/badge"; // Added for agency user badge

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: CalendarIcon,
    description: "All sites overview",
    pageName: "Dashboard"
  },
  {
    title: "Rooms",
    url: createPageUrl("Rooms"),
    icon: Building2,
    description: "Manage inventory",
    pageName: "Rooms"
  },
  {
    title: "Bed Configurations",
    url: createPageUrl("BedConfigurations"),
    icon: Bed,
    description: "Manage bed configurations",
    pageName: "BedConfigurations"
  },
  {
    title: "Bookings",
    url: createPageUrl("Clients"),
    icon: Users,
    description: "Manage bookings and clients",
    pageName: "Clients"
  },
  {
    title: "Agencies",
    url: createPageUrl("Agencies"),
    icon: Briefcase,
    description: "Manage partner agencies",
    pageName: "Agencies"
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
    description: "Statistics and exports",
    pageName: "Reports"
  }
];

const adminNavItems = [
  {
    title: "Users",
    url: createPageUrl("Users"),
    icon: Users,
    description: "Manage user roles",
    pageName: "Users"
  },
  {
    title: "Data Health",
    url: createPageUrl("DataHealth"),
    icon: Database,
    description: "Fix data inconsistencies",
    pageName: "DataHealth"
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
    description: "Manage application settings",
    pageName: "Settings"
  }
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add user state
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // All dashboard state is now managed here
  const [selectedSiteName, setSelectedSiteName] = useState("all");
  const [dateRange] = useState(30); // Locked to 30 days
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [filters, setFilters] = useState({
    bedConfigId: "all" // Changed from capacity to bedConfigId
  });
  
  // New state for bed configurations
  const [bedConfigurations, setBedConfigurations] = useState([]);

  // Client Management specific state is now moved to ClientsPage.js

  // State for the booking form modal
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    loadUser();
  }, []);

  // Redirect non-authenticated users to Home
  useEffect(() => {
    if (isCheckingAuth) return;
    
    const isHomePage = location.pathname === '/' || location.pathname === '/Home';
    
    if (!currentUser && !isHomePage) {
      navigate('/Home');
    }
  }, [isCheckingAuth, currentUser, location.pathname, navigate]);

  // Load bed configurations on mount
  useEffect(() => {
    const loadBedConfigs = async () => {
      try {
        const configs = await BedConfiguration.list('sort_order');
        setBedConfigurations(configs);
      } catch (error) {
        console.error('Error loading bed configurations:', error);
      }
    };
    loadBedConfigs();
  }, []);

  const navigateDate = (direction) => {
    const days = direction === 'prev' ? -7 : 7; // Changed from -dateRange to -7 for weekly navigation
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  // Handle date picker selection
  const handleDateSelect = (date) => {
    if (date) {
      setCurrentDate(date);
      setIsDatePopoverOpen(false); // Close popover on select
    }
  };

  const handleOpenNewBooking = () => {
    setSelectedRoomForBooking(null);
    setSelectedDateForBooking(null);
    setEditingBooking(null);
    setShowBookingForm(true);
  };

  // Helper to check if user can access a page
  const canAccessPage = (pageName) => {
    if (!currentUser) return true; // Allow access if user data is not loaded yet (e.g., initial render)
    if (currentUser.role === 'admin') return true; // Admins have full access
    
    // If not an admin, check for 'agency' custom role
    if (currentUser.custom_role === 'agency') {
      // Agency users can only access Dashboard and Clients
      return ['Dashboard', 'Clients'].includes(pageName);
    }
    
    // For all other roles/custom_roles (non-admin, non-agency), allow full access
    return true; 
  };

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => {
    return canAccessPage(item.pageName);
  });

  // Updated logic to detect dashboard pages and client management page
  const isDashboardPage = location.pathname.includes('Dashboard') || 
                         location.pathname === '/Dashboard';

  const isClientManagementPage = location.pathname.includes('Clients');
  const isAgencyManagementPage = location.pathname.includes('Agencies');
  const isRoomsPage = location.pathname.includes('Rooms');
  const isBedConfigurationsPage = location.pathname.includes('BedConfigurations');
  const isSettingsPage = location.pathname.includes('Settings');
  const isUsersPage = location.pathname.includes('Users');


  const dashboardPageProps = {
    selectedSiteName, setSelectedSiteName,
    dateRange,
    currentDate, setCurrentDate,
    isDatePopoverOpen, setIsDatePopoverOpen,
    filters, setFilters,
    navigateDate,
    showBookingForm, setShowBookingForm,
    selectedRoomForBooking, setSelectedRoomForBooking,
    selectedDateForBooking, setSelectedDateForBooking,
    editingBooking, setEditingBooking,
  };

  // No specific props for Client Management page in this layout anymore.
  
  // No specific props for Agency Management page in this layout, but good to have the pattern
  const agencyManagementPageProps = {
    // Add any agency-specific props here if needed in the future
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Home page - no layout
  const isHomePage = location.pathname === '/' || location.pathname === '/Home' || location.pathname === '/index';

  if (isHomePage) {
    return children;
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-slate-50">
      <style>{`
        :root {
          --primary-blue: #1e40af;
          --secondary-blue: #3b82f6;
          --accent-gold: #f59e0b;
          --text-dark: #1e293b;
          --text-light: #64748b;
          --background-light: #f8fafc;
        }
      `}</style>
      
      {/* Independent Topbar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
                alt="Whisper B. Logo" 
                className="w-10 h-10" 
                loading="lazy"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-800">Whisper B.</h1>
              </div>
            </Link>
          </div>

          {isDashboardPage && (
            <div className="flex items-center gap-4 flex-grow justify-start ml-6">
              {/* Sites Filter */}
              {currentUser?.custom_role === 'agency' ? (
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-white text-slate-800"
                    disabled
                  >
                    All Sites
                  </Button>
                </div>
              ) : (
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
              )}

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate('prev')}
                  className="hover:bg-yellow-50 h-9 w-9"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="hover:bg-yellow-50 h-9"
                >
                  Today
                </Button>
                
                {/* Date Picker - Moved between Today and right arrow */}
                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40 justify-start text-left font-normal h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(currentDate, 'dd MMM')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate('next')}
                  className="hover:bg-yellow-50 h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Bed Configuration Filter - Replacing Capacity Filter */}
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
          )}

          {isClientManagementPage && (
            <div className="flex items-center gap-4 flex-grow justify-start ml-6">
                {/* Client Management controls are now inside ClientsPage.js */}
            </div>
          )}

          {isAgencyManagementPage && (
             <div className="flex-grow">
             </div>
          )}

          {isRoomsPage && (
             <div className="flex-grow">
             </div>
          )}

          {isBedConfigurationsPage && (
             <div className="flex-grow">
             </div>
          )}

          {isSettingsPage && (
             <div className="flex-grow">
             </div>
          )}

          {isUsersPage && (
             <div className="flex-grow">
             </div>
          )}
          
          <div className="flex items-center gap-4">
            {isDashboardPage && (
              <>
                <Button asChild variant="outline" className="!border-yellow-700 text-yellow-700 hover:bg-yellow-50">
                  <Link to={createPageUrl("Clients")}>
                    <Users className="w-4 h-4 mr-2" />
                    All bookings
                  </Link>
                </Button>
                <Button onClick={handleOpenNewBooking} className="!bg-yellow-700 hover:!bg-yellow-800">
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </>
            )}

            {(isClientManagementPage || isAgencyManagementPage || isRoomsPage || isBedConfigurationsPage || isSettingsPage || isUsersPage) && (
              <>
                <Button asChild variant="outline" className="!border-yellow-700 text-yellow-700 hover:bg-yellow-50">
                  <Link to={createPageUrl("Dashboard")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Calendar
                  </Link>
                </Button>
              </>
            )}

            {/* Account Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <CircleUser className="h-6 w-6 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser?.email || 'Loading...'}
                    </p>
                    {currentUser?.custom_role === 'agency' && currentUser?.agency_id && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Agency User
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")} className="flex items-center gap-2 cursor-pointer">
                      <CircleUser className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Navigation</DropdownMenuLabel>
                  {filteredNavigationItems.map((item) => (
                    <DropdownMenuItem key={item.title} asChild>
                      <Link to={item.url} className="flex items-center gap-2 cursor-pointer">
                        <item.icon className="w-4 h-4 text-slate-500" />
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {currentUser?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Administration</DropdownMenuLabel>
                      {adminNavItems.map((item) => (
                        <DropdownMenuItem key={item.title} asChild>
                          <Link to={item.url} className="flex items-center gap-2 cursor-pointer">
                            <item.icon className="w-4 h-4 text-slate-500" />
                            <span>{item.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={async () => {
                    if (confirm('Are you sure you want to log out?')) {
                      try {
                        await base44.auth.logout();
                      } catch (error) {
                        console.error('Error logging out:', error);
                      }
                    }
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        {isDashboardPage 
          ? React.cloneElement(children, dashboardPageProps)
          : isClientManagementPage 
          ? children
          : isAgencyManagementPage
          ? React.cloneElement(children, agencyManagementPageProps)
          : isRoomsPage
          ? children
          : isBedConfigurationsPage
          ? children 
          : children}
      </main>
    </div>
  );
}