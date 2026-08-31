import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Mail, AlertTriangle, Save, Plus, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const SITE_NAMES = ['Serengeti', 'Tarangire'];

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const defaultNewBookingTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">New Booking Confirmation – [HOTEL_NAME]</h1>
  </div>
  <div style="padding: 25px;">
    <p>A new booking has been created with the following details:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Hotel:</strong> [HOTEL_NAME]</p>
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
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Booking Update – [HOTEL_NAME]</h1>
  </div>
  <div style="padding: 25px;">
    <p>A booking has been updated. Here are the new details:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Hotel:</strong> [HOTEL_NAME]</p>
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

const defaultRatesRequestTemplate = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Rate Request</h1>
  </div>
  <div style="padding: 25px;">
    <p>A visitor has requested rates information from the online booking system:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Name:</strong> [CONTACT_NAME]</p>
      <p><strong>Email:</strong> <a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a></p>
    </div>
    <p>Please reply to them directly at <a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>.</p>
  </div>
  <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
    <p>This is an automated notification from Whisper Bookings.</p>
  </div>
</div>`;

const defaultClientRequestTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Booking Request Received – [HOTEL_NAME]</h1>
  </div>
  <div style="padding: 25px;">
    <p>Dear [CLIENT_NAME],</p>
    <p>Thank you for your booking request. We have received the following details and will get back to you shortly to confirm availability:</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Hotel:</strong> [HOTEL_NAME]</p>
      <p><strong>Room:</strong> [ROOM_NAME]</p>
      <p><strong>Check-in:</strong> [CHECKIN_DATE]</p>
      <p><strong>Check-out:</strong> [CHECKOUT_DATE]</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #2563eb;">[STATUS]</span></p>
    </div>
    <p>This is a request and is not yet confirmed. Our team will contact you to finalise your reservation.</p>
    <p>Kind regards,<br/>The [HOTEL_NAME] Team</p>
  </div>
  <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
    <p>This is an automated message from Whisper Bookings.</p>
  </div>
</div>
`;

const defaultCancellationTemplate = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #f8f8f8; padding: 20px; text-align: center;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" alt="Whisper B. Logo" style="width: 60px; height: 60px; margin-bottom: 10px;">
    <h1 style="color: #d94f4f; font-size: 24px; margin: 0;">Booking Cancellation – [HOTEL_NAME]</h1>
  </div>
  <div style="padding: 25px;">
    <p>A booking has been cancelled. Details of the cancelled booking:</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p><strong>Hotel:</strong> [HOTEL_NAME]</p>
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

function SiteEmailConfig({ siteName, config, onChange }) {
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');

  const emails = config.admin_emails || [];
  const hotelName = config.hotel_name || '';

  const handleAddEmail = () => {
    setError('');
    if (!isValidEmail(newEmail)) { setError('Invalid email address.'); return; }
    if (emails.includes(newEmail)) { setError('Email already in list.'); return; }
    onChange({ ...config, admin_emails: [...emails, newEmail] });
    setNewEmail('');
  };

  const handleRemoveEmail = (email) => {
    onChange({ ...config, admin_emails: emails.filter(e => e !== email) });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-slate-50/60">
      <h3 className="font-semibold text-slate-800 text-sm">{siteName}</h3>
      <div className="space-y-1">
        <Label className="text-xs">Hotel Display Name (used in emails as [HOTEL_NAME])</Label>
        <Input
          value={hotelName}
          onChange={e => onChange({ ...config, hotel_name: e.target.value })}
          placeholder={`e.g. Whisper ${siteName}`}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Admin Emails for {siteName}</Label>
        <div className="space-y-1.5">
          {emails.length > 0 ? emails.map(email => (
            <div key={email} className="flex items-center justify-between px-3 py-1.5 bg-white border rounded text-sm">
              <span className="text-slate-700">{email}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveEmail(email)}>
                <X className="w-3 h-3 text-slate-400" />
              </Button>
            </div>
          )) : (
            <p className="text-xs text-slate-400 italic">No emails configured — fallback list will be used.</p>
          )}
        </div>
        <div className="flex items-start gap-2 mt-2">
          <div className="flex-grow space-y-1">
            <Input
              type="email"
              placeholder="add@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddEmail(); }}
              className="h-8 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <Button size="sm" onClick={handleAddEmail} className="h-8"><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);
  const [siteConfigs, setSiteConfigs] = useState({});
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEmails, setIsSavingEmails] = useState(false);
  const [emailProvider, setEmailProvider] = useState('native');

  const [newBookingTemplate, setNewBookingTemplate] = useState('');
  const [updateBookingTemplate, setUpdateBookingTemplate] = useState('');
  const [cancellationTemplate, setCancellationTemplate] = useState('');
  const [ratesRequestTemplate, setRatesRequestTemplate] = useState('');
  const [clientRequestTemplate, setClientRequestTemplate] = useState('');
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Request received');
  const [confirmMessage, setConfirmMessage] = useState('We will get back to you shortly.');
  const [isSavingConfirmText, setIsSavingConfirmText] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settingsList = await base44.entities.NotificationSettings.list();
      if (settingsList.length > 0) {
        const current = settingsList[0];
        setSettings(current);
        setEmailProvider(current.email_provider || 'native');
        setAdminEmails(current.admin_emails || []);
        setNewBookingTemplate(current.template_new_booking || defaultNewBookingTemplate);
        setUpdateBookingTemplate(current.template_update_booking || defaultUpdateBookingTemplate);
        setCancellationTemplate(current.template_cancellation || defaultCancellationTemplate);
        setRatesRequestTemplate(current.template_rates_request || defaultRatesRequestTemplate);
        setClientRequestTemplate(current.template_client_booking_request || defaultClientRequestTemplate);
        setConfirmTitle(current.booking_request_confirm_title || 'Request received');
        setConfirmMessage(current.booking_request_confirm_message || 'We will get back to you shortly.');

        // Build siteConfigs map
        const configMap = {};
        (current.site_configs || []).forEach(sc => { configMap[sc.site_name] = sc; });
        SITE_NAMES.forEach(name => { if (!configMap[name]) configMap[name] = { site_name: name, hotel_name: '', admin_emails: [] }; });
        setSiteConfigs(configMap);
      } else {
        const initialSiteConfigs = SITE_NAMES.map(name => ({ site_name: name, hotel_name: '', admin_emails: [] }));
        const newSettings = await base44.entities.NotificationSettings.create({
          admin_emails: [],
          email_provider: 'native',
          site_configs: initialSiteConfigs,
          template_new_booking: defaultNewBookingTemplate,
          template_update_booking: defaultUpdateBookingTemplate,
          template_cancellation: defaultCancellationTemplate,
          template_client_booking_request: defaultClientRequestTemplate,
          booking_request_confirm_title: 'Request received',
          booking_request_confirm_message: 'We will get back to you shortly.',
        });
        setSettings(newSettings);
        setEmailProvider('native');
        setAdminEmails([]);
        const configMap = {};
        SITE_NAMES.forEach(name => { configMap[name] = { site_name: name, hotel_name: '', admin_emails: [] }; });
        setSiteConfigs(configMap);
        setNewBookingTemplate(defaultNewBookingTemplate);
        setUpdateBookingTemplate(defaultUpdateBookingTemplate);
        setCancellationTemplate(defaultCancellationTemplate);
        setRatesRequestTemplate(defaultRatesRequestTemplate);
        setClientRequestTemplate(defaultClientRequestTemplate);
        setConfirmTitle('Request received');
        setConfirmMessage('We will get back to you shortly.');
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
      setError("Could not load settings. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFallbackEmail = async () => {
    setError('');
    if (!isValidEmail(newEmail)) { setError("Please enter a valid email address."); return; }
    if (adminEmails.includes(newEmail)) { setError("This email is already in the list."); return; }
    const updated = [...adminEmails, newEmail];
    await base44.entities.NotificationSettings.update(settings.id, { admin_emails: updated });
    setAdminEmails(updated);
    setNewEmail('');
  };

  const handleRemoveFallbackEmail = async (email) => {
    const updated = adminEmails.filter(e => e !== email);
    await base44.entities.NotificationSettings.update(settings.id, { admin_emails: updated });
    setAdminEmails(updated);
  };

  const handleSaveSiteConfigs = async () => {
    if (!settings) return;
    setIsSavingEmails(true);
    const site_configs = Object.values(siteConfigs);
    await base44.entities.NotificationSettings.update(settings.id, { site_configs });
    setIsSavingEmails(false);
  };

  const handleSaveTemplates = async () => {
    if (!settings) return;
    setIsSavingTemplates(true);
    await base44.entities.NotificationSettings.update(settings.id, {
      template_new_booking: newBookingTemplate,
      template_update_booking: updateBookingTemplate,
      template_cancellation: cancellationTemplate,
      template_rates_request: ratesRequestTemplate,
      template_client_booking_request: clientRequestTemplate,
    });
    setIsSavingTemplates(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">

        {/* Test Mode Toggle */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className={`w-5 h-5 ${settings?.test_mode ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-800">Test Mode</p>
                  <p className="text-sm text-slate-500">Les emails sont <strong>loggés mais pas envoyés</strong> en mode test.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {settings?.test_mode && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">TEST MODE ACTIVE</span>
                )}
                <Switch
                  checked={!!settings?.test_mode}
                  disabled={isLoading || !settings}
                  onCheckedChange={async (checked) => {
                    if (!settings) return;
                    setSettings(prev => ({ ...prev, test_mode: checked }));
                    await base44.entities.NotificationSettings.update(settings.id, { test_mode: checked });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Notification Toggle */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${settings?.notify_client_on_request ? 'text-green-600' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-800">Client Notification on Booking Request</p>
                  <p className="text-sm text-slate-500">Envoie automatiquement un email de confirmation au client quand une demande de réservation (status REQUEST) est créée.</p>
                </div>
              </div>
              <Switch
                checked={!!settings?.notify_client_on_request}
                disabled={isLoading || !settings}
                onCheckedChange={async (checked) => {
                  if (!settings) return;
                  setSettings(prev => ({ ...prev, notify_client_on_request: checked }));
                  await base44.entities.NotificationSettings.update(settings.id, { notify_client_on_request: checked });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Request Confirmation Text */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Booking Request Confirmation Text
            </CardTitle>
            <CardDescription>
              Texte affiché sur la page publique juste après qu'un client soumet une demande de réservation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p className="text-slate-500">Loading...</p> : (
              <>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={confirmTitle}
                    onChange={e => setConfirmTitle(e.target.value)}
                    placeholder="Request received"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Message</Label>
                  <Input
                    value={confirmMessage}
                    onChange={e => setConfirmMessage(e.target.value)}
                    placeholder="We will get back to you shortly."
                    className="h-9"
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={async () => {
                if (!settings) return;
                setIsSavingConfirmText(true);
                await base44.entities.NotificationSettings.update(settings.id, {
                  booking_request_confirm_title: confirmTitle,
                  booking_request_confirm_message: confirmMessage,
                });
                setIsSavingConfirmText(false);
              }}
              disabled={isSavingConfirmText || isLoading || !settings}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSavingConfirmText ? 'Saving...' : 'Save Confirmation Text'}
            </Button>
          </CardFooter>
        </Card>

        {/* Email Provider Toggle */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Provider
            </CardTitle>
            <CardDescription>
              <strong>Native</strong> atteint les utilisateurs enregistrés de l'app (gratuit).
              <strong> Resend</strong> atteint toute adresse externe (demandes de devis public).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
              <Button
                size="sm"
                variant="ghost"
                disabled={isLoading || !settings}
                onClick={async () => {
                  if (!settings) return;
                  setEmailProvider('native');
                  await base44.entities.NotificationSettings.update(settings.id, { email_provider: 'native' });
                }}
                className={`transition-all ${
                  emailProvider === 'native'
                    ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Native (Base44)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isLoading || !settings}
                onClick={async () => {
                  if (!settings) return;
                  setEmailProvider('resend');
                  await base44.entities.NotificationSettings.update(settings.id, { email_provider: 'resend' });
                }}
                className={`transition-all ${
                  emailProvider === 'resend'
                    ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Resend (external)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Per-site email config */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Hotel Notification Emails
            </CardTitle>
            <CardDescription>
              Configure the admin email recipients and hotel display name per site. Notifications are sent to the relevant site's emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p className="text-slate-500">Loading settings...</p> : (
              <>
                {SITE_NAMES.map(siteName => (
                  <SiteEmailConfig
                    key={siteName}
                    siteName={siteName}
                    config={siteConfigs[siteName] || { site_name: siteName, hotel_name: '', admin_emails: [] }}
                    onChange={updated => setSiteConfigs(prev => ({ ...prev, [siteName]: updated }))}
                  />
                ))}

                {/* Fallback / global */}
                <div className="border rounded-lg p-4 space-y-3 bg-slate-50/60">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Fallback (all sites)</h3>
                    <p className="text-xs text-slate-400">Used if no site-specific emails are set.</p>
                  </div>
                  <div className="space-y-1.5">
                    {adminEmails.length > 0 ? adminEmails.map(email => (
                      <div key={email} className="flex items-center justify-between px-3 py-1.5 bg-white border rounded text-sm">
                        <span className="text-slate-700">{email}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFallbackEmail(email)}>
                          <X className="w-3 h-3 text-slate-400" />
                        </Button>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 italic">No fallback emails configured.</p>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-grow space-y-1">
                      <Input
                        type="email"
                        placeholder="fallback@email.com"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddFallbackEmail(); }}
                        className="h-8 text-sm"
                      />
                      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
                    </div>
                    <Button size="sm" onClick={handleAddFallbackEmail} className="h-8"><Plus className="w-3 h-3 mr-1" />Add</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveSiteConfigs} disabled={isSavingEmails || isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingEmails ? 'Saving...' : 'Save Email Settings'}
            </Button>
          </CardFooter>
        </Card>

        {/* Email Templates */}
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>Customize the content of transactional emails. Use the provided placeholders for dynamic data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? <p className="text-slate-500">Loading templates...</p> : (
              <>
                <div className="space-y-2">
                  <Label>New Booking Template</Label>
                  <ReactQuill theme="snow" value={newBookingTemplate} onChange={setNewBookingTemplate} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Updated Booking Template</Label>
                  <ReactQuill theme="snow" value={updateBookingTemplate} onChange={setUpdateBookingTemplate} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Template</Label>
                  <ReactQuill theme="snow" value={cancellationTemplate} onChange={setCancellationTemplate} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Rate Request Template</Label>
                  <p className="text-xs text-slate-500">Sent to admins when a visitor clicks "Request Rates". Placeholders: [CONTACT_NAME], [CONTACT_EMAIL]</p>
                  <ReactQuill theme="snow" value={ratesRequestTemplate} onChange={setRatesRequestTemplate} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Client Booking Request Template</Label>
                  <p className="text-xs text-slate-500">Sent to the client when a booking request (status REQUEST) is created, if the toggle above is enabled.</p>
                  <ReactQuill theme="snow" value={clientRequestTemplate} onChange={setClientRequestTemplate} className="bg-white" />
                </div>
                <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                  <strong>Available Placeholders:</strong>
                  <ul className="list-disc list-inside mt-2 grid grid-cols-2 gap-1">
                    <li>[HOTEL_NAME]</li>
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