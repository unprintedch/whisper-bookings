import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function HomePage() {
  const navigate = useNavigate();
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
              reservations={reservations.filter(r => r.status !== 'OPTION' && r.status !== 'REQUEST')}
              clients={clients}
              groups={[]}
              sites={sites}
              dateColumns={Array.from({ length: 30 }, (_, i) => startOfDay(addDays(currentDate, i)))}
              highlightDate={currentDate}
              isLoading={isLoading}
              onCellClick={handleCellClick}
              onBookingEdit={null}
              onRoomEdit={null}
              isPublicView={true}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Request a Booking
              {selectedRoomForBooking && selectedDateForBooking && (
                <span className="text-sm font-normal text-slate-600 ml-2">
                  – {selectedRoomForBooking.name} from {format(selectedDateForBooking, 'dd MMM yyyy')}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <PublicBookingForm
            rooms={rooms}
            sites={sites}
            bedConfigurations={bedConfigurations}
            reservations={reservations}
            agencies={agencies}
            onSubmit={handleBookingSubmit}
            initialRoom={selectedRoomForBooking}
            initialDate={selectedDateForBooking}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}