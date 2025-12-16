
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Mail, AlertTriangle, Save } from "lucide-react";
import { NotificationSettings } from "@/entities/NotificationSettings";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const defaultNewBookingTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">New Booking Confirmation</h1>
  </div>
  <div style="padding: 25px;">
    <p>A new booking has been created with the following details:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Client:</strong> [CLIENT_NAME]</p>
      <p><strong>Room:</strong> [ROOM_NAME]</p>
      <p><strong>Check-in:</strong> [CHECKIN_DATE]</p>
      <p><strong>Check-out:</strong> [CHECKOUT_DATE]</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #2563eb;">[STATUS]</span></p>
    </div>
    <p style="text-align: center;">
      <a href="[BOOKING_LINK]" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Booking Details</a>
    </p>
    <p>Thank you for using Whisper Bookings.</p>
  </div>
  <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
    <p>This is an automated notification.</p>
  </div>
</div>
`;

const defaultUpdateBookingTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Booking Update</h1>
  </div>
  <div style="padding: 25px;">
    <p>A booking has been updated. Here are the new details:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Client:</strong> [CLIENT_NAME]</p>
      <p><strong>Room:</strong> [ROOM_NAME]</p>
      <p><strong>Check-in:</strong> [CHECKIN_DATE]</p>
      <p><strong>Check-out:</strong> [CHECKOUT_DATE]</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #2563eb;">[STATUS]</span></p>
    </div>
    <p style="text-align: center;">
      <a href="[BOOKING_LINK]" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Booking Details</a>
    </p>
    <p>Thank you for using Whisper Bookings.</p>
  </div>
  <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
    <p>This is an automated notification.</p>
  </div>
</div>
`;

const defaultCancellationTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #d94f4f; font-size: 24px; margin: 0;">Booking Cancellation</h1>
  </div>
  <div style="padding: 25px;">
    <p>A booking has been cancelled. Details of the cancelled booking:</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Client:</strong> [CLIENT_NAME]</p>
      <p><strong>Room:</strong> [ROOM_NAME]</p>
      <p><strong>Check-in:</strong> [CHECKIN_DATE]</p>
      <p><strong>Check-out:</strong> [CHECKOUT_DATE]</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #991b1b;">CANCELLED</span></p>
    </div>
     <p style="text-align: center;">
      <a href="[BOOKING_LINK]" style="background-color: #991b1b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Booking in App</a>
    </p>
    <p>This action has been recorded in the system.</p>
  </div>
  <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
    <p>This is an automated notification.</p>
  </div>
</div>
`;

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // State for templates
  const [newBookingTemplate, setNewBookingTemplate] = useState('');
  const [updateBookingTemplate, setUpdateBookingTemplate] = useState('');
  const [cancellationTemplate, setCancellationTemplate] = useState('');
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);


  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settingsList = await NotificationSettings.list();
      if (settingsList.length > 0) {
        const currentSettings = settingsList[0];
        setSettings(currentSettings);
        setAdminEmails(currentSettings.admin_emails || []);
        setNewBookingTemplate(currentSettings.template_new_booking || defaultNewBookingTemplate);
        setUpdateBookingTemplate(currentSettings.template_update_booking || defaultUpdateBookingTemplate);
        setCancellationTemplate(currentSettings.template_cancellation || defaultCancellationTemplate);
      } else {
        // First time setup: create a settings object
        const newSettings = await NotificationSettings.create({ 
          admin_emails: [],
          template_new_booking: defaultNewBookingTemplate,
          template_update_booking: defaultUpdateBookingTemplate,
          template_cancellation: defaultCancellationTemplate,
        });
        setSettings(newSettings);
        setAdminEmails([]);
        setNewBookingTemplate(defaultNewBookingTemplate);
        setUpdateBookingTemplate(defaultUpdateBookingTemplate);
        setCancellationTemplate(defaultCancellationTemplate);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
      setError("Could not load settings. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async () => {
    setError('');
    if (!isValidEmail(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (adminEmails.includes(newEmail)) {
      setError("This email address is already in the list.");
      return;
    }

    const updatedEmails = [...adminEmails, newEmail];
    try {
      await NotificationSettings.update(settings.id, { admin_emails: updatedEmails });
      setAdminEmails(updatedEmails);
      setNewEmail('');
    } catch (e) {
      console.error("Failed to add email:", e);
      setError("Failed to save the new email. Please try again.");
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    const updatedEmails = adminEmails.filter(email => email !== emailToRemove);
    try {
      await NotificationSettings.update(settings.id, { admin_emails: updatedEmails });
      setAdminEmails(updatedEmails);
    } catch (e) {
      console.error("Failed to remove email:", e);
      setError("Failed to remove the email. Please try again.");
    }
  };

  const handleSaveTemplates = async () => {
    if (!settings) return;
    setIsSavingTemplates(true);
    setError(''); // Clear any previous errors

    try {
      await NotificationSettings.update(settings.id, {
        template_new_booking: newBookingTemplate,
        template_update_booking: updateBookingTemplate,
        template_cancellation: cancellationTemplate,
      });
      // Optionally show a success message or clear error state if needed
    } catch (e) {
      console.error("Failed to save templates:", e);
      setError("Failed to save templates. Please try again.");
    } finally {
      setIsSavingTemplates(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Admin Email Notifications
            </CardTitle>
            <CardDescription>
              Manage the list of email addresses that receive administrative notifications, such as new bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-slate-500">Loading settings...</p>
            ) : (
              <>
                <div>
                  <Label className="text-base font-medium">Recipient List</Label>
                  <div className="mt-2 space-y-2">
                    {adminEmails.length > 0 ? (
                      adminEmails.map(email => (
                        <div key={email} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
                          <span className="text-slate-700">{email}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveEmail(email)}>
                            <X className="w-4 h-4 text-slate-500" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg">
                        <p className="text-slate-500">No admin email recipients configured.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="new-email" className="text-base font-medium">Add a New Recipient</Label>
                  <div className="flex items-start gap-2">
                    <div className="flex-grow space-y-1">
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="e.g., manager@whisper.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddEmail(); }}
                      />
                       {error && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {error}
                        </p>
                      )}
                    </div>
                    <Button onClick={handleAddEmail}>Add Email</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>Customize the content of transactional emails. Use the provided placeholders for dynamic data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {isLoading ? (
              <p className="text-slate-500">Loading templates...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-booking-template">New Booking Template</Label>
                  <ReactQuill
                    theme="snow"
                    value={newBookingTemplate}
                    onChange={setNewBookingTemplate}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-booking-template">Updated Booking Template</Label>
                  <ReactQuill
                    theme="snow"
                    value={updateBookingTemplate}
                    onChange={setUpdateBookingTemplate}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation-template">Cancellation Template</Label>
                   <ReactQuill
                    theme="snow"
                    value={cancellationTemplate}
                    onChange={setCancellationTemplate}
                    className="bg-white"
                  />
                </div>
                <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                  <strong>Available Placeholders:</strong>
                  <ul className="list-disc list-inside mt-2 grid grid-cols-2 gap-1">
                    <li>[CLIENT_NAME]</li>
                    <li>[ROOM_NAME]</li>
                    <li>[CHECKIN_DATE]</li>
                    <li>[CHECKOUT_DATE]</li>
                    <li>[STATUS]</li>
                    <li>[AGENCY_NAME]</li>
                    <li>[BOOKING_LINK]</li>
                  </ul>
                </div>
              </>
             )}
          </CardContent>
          <CardFooter className="flex justify-end">
             <Button onClick={handleSaveTemplates} disabled={isSavingTemplates}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingTemplates ? 'Saving...' : 'Save Templates'}
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
