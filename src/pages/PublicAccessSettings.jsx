import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { generateSalt, hashPassword } from "@/lib/passwordHash";
import { Shield, Check } from "lucide-react";

export default function PublicAccessSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [allowPublicBooking, setAllowPublicBooking] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { items } = await base44.entities.PublicAccessSettings.filter({}, { sort: '-updated_date', limit: 1 });
      if (items.length > 0) {
        const existingSettings = items[0];
        setSettings(existingSettings);
        setIsPasswordProtected(existingSettings.is_password_protected === true);
        setAllowPublicBooking(existingSettings.is_password_protected === true && existingSettings.allow_public_booking === true);
        // The stored password is only ever a hash: it is never read back into the form.
        setHasExistingPassword(!!(existingSettings.access_password_hash || existingSettings.access_password));
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setPasswordError('');

    try {
      const data = {
        is_password_protected: isPasswordProtected,
        allow_public_booking: isPasswordProtected && allowPublicBooking
      };

      // The password is hashed here, so the clear value is never stored. An empty field
      // keeps the password already in place.
      if (password) {
        if (password !== confirmPassword) {
          setPasswordError('The two passwords do not match.');
          setIsSaving(false);
          return;
        }
        const salt = generateSalt();
        data.access_password_hash = await hashPassword(password, salt);
        data.access_password_salt = salt;
        data.access_password = '';
      } else if (isPasswordProtected && !hasExistingPassword) {
        setPasswordError('Enter a password to protect the public page.');
        setIsSaving(false);
        return;
      }

      if (settings) {
        await base44.entities.PublicAccessSettings.update(settings.id, data);
      } else {
        await base44.entities.PublicAccessSettings.create(data);
      }

      setPassword('');
      setConfirmPassword('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-8 h-8 text-yellow-700" />
          Public Access Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Manage access to the public availability page
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password Protection</CardTitle>
          <CardDescription>
            Restrict access to the public page to authenticated users or users with the password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="password-protection" className="text-base">
                Enable Password Protection
              </Label>
              <p className="text-sm text-slate-500">
                When enabled, visitors must enter a password or be logged in to view the public page
              </p>
            </div>
            <Switch
              id="password-protection"
              checked={isPasswordProtected}
              onCheckedChange={(enabled) => {
                setIsPasswordProtected(enabled);
                if (!enabled) setAllowPublicBooking(false);
              }}
            />
          </div>

          {isPasswordProtected && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="access-password">
                  {hasExistingPassword ? 'Change Access Password' : 'Access Password'}
                </Label>
                <Input
                  id="access-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={hasExistingPassword ? 'Leave empty to keep the current password' : 'Enter password for public access'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access-password-confirm">Confirm Password</Label>
                <Input
                  id="access-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="max-w-md"
                />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              <p className="text-xs text-slate-500">
                {hasExistingPassword
                  ? 'A password is already set. It is stored as a hash and is never displayed.'
                  : 'This password will be required for non-authenticated users to access the public availability page'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="allow-public-booking" className="text-base">
                Allow public booking requests
              </Label>
              <p className="text-sm text-slate-500">
                Password protection is required. Visitors must verify the password before submitting a booking request.
              </p>
            </div>
            <Switch
              id="allow-public-booking"
              checked={isPasswordProtected && allowPublicBooking}
              disabled={!isPasswordProtected}
              onCheckedChange={setAllowPublicBooking}
            />
          </div>

          {saveSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Settings saved successfully!
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || (isPasswordProtected && !hasExistingPassword && !password)}
              className="bg-yellow-700 hover:bg-yellow-800"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}