import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User as UserIcon, Mail, Shield, LogOut, Save, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setFullName(currentUser.full_name || '');
    } catch (error) {
      console.error('Error loading user:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await User.updateMyUserData({ full_name: fullName });
      setSaveSuccess(true);
      await loadUser();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await User.logout();
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-700 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <UserIcon className="w-8 h-8 text-yellow-700" />
          <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
        </div>

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-500" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-10"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-10 bg-slate-50"
              />
              <p className="text-xs text-slate-500">
                Your email cannot be changed here. Contact an administrator if needed.
              </p>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                Role
              </Label>
              <div>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="text-sm">
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Your role determines your access level in the application.
              </p>
            </div>

            {/* Account Details */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Account Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Account Created</p>
                  <p className="font-medium text-slate-800">
                    {user?.created_date ? new Date(user.created_date).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Last Updated</p>
                  <p className="font-medium text-slate-800">
                    {user?.updated_date ? new Date(user.updated_date).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isSaving || fullName === (user?.full_name || '')}
                className="bg-yellow-700 hover:bg-yellow-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Default Client View</p>
                  <p className="text-sm text-slate-500">
                    Your preferred view mode: {user?.client_view_mode === 'reservations' ? 'All Reservations' : 'By Client'}
                  </p>
                </div>
                <Badge variant="outline">{user?.client_view_mode || 'clients'}</Badge>
              </div>
              
              <p className="text-xs text-slate-500 pt-2 border-t">
                Your preferences are automatically saved when you use the application.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}