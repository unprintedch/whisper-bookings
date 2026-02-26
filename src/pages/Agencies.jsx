import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Agency } from "@/components/lib/entitiesWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Briefcase, Mail, Phone, User } from "lucide-react";
import AgencyForm from "../components/agencies/AgencyForm";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function AgenciesPage() {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [searchText, setSearchText] = useState('');

  const generateCode = (name, existingCodes) => {
    if (!name) return 'XXX';
    let baseCode;
    const words = name.replace(/[^a-zA-Z\s]/g, "").toUpperCase().split(' ').filter(Boolean);

    if (words.length >= 3) {
        baseCode = words.slice(0, 3).map(w => w[0]).join('');
    } else if (words.length === 2) {
        baseCode = words[0][0] + words[1].substring(0, 2);
    } else if (words.length === 1 && words[0].length >= 3) {
        baseCode = words[0].substring(0, 3);
    } else if (words.length === 1) {
        baseCode = words[0].padEnd(3, 'X');
    } else {
        baseCode = 'XXX';
    }

    let finalCode = baseCode; // Removed the .substring(0, 3) limit
    let counter = 1;
    const allCodes = new Set(existingCodes);

    while (allCodes.has(finalCode)) {
        if (counter < 10) {
            finalCode = baseCode + counter; // Append counter to the full baseCode
        } else {
            // After 9 attempts with numbers, switch to random 3-letter codes as a fallback
            finalCode = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                      String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                      String.fromCharCode(65 + Math.floor(Math.random() * 26));
            // Reset counter for random attempts to avoid overly long loops, though
            // the `while` condition will still eventually be met.
            // For very high collision rates, a more robust random generation with retries might be needed.
        }
        counter++;
        // Add a safety break to prevent infinite loops in extreme, rare cases
        if (counter > 100) { 
          console.warn(`Failed to generate a unique code for "${name}" after many attempts.`);
          return 'ERR'; // Return an error code or fallback
        }
    }
    return finalCode;
  };

  const migrateAgencyCodes = useCallback(async (currentAgencies) => {
    const agenciesWithoutCode = currentAgencies.filter(agency => !agency.code);
    if (agenciesWithoutCode.length === 0) return true;

    console.log(`Migrating codes for ${agenciesWithoutCode.length} agencies.`);

    const existingCodes = currentAgencies.map(a => a.code).filter(Boolean);
    const updates = [];

    for (const agency of agenciesWithoutCode) {
        const newCode = generateCode(agency.name, existingCodes);
        updates.push(Agency.update(agency.id, { code: newCode }));
        existingCodes.push(newCode); // Add newly generated code to existingCodes for subsequent checks
    }

    try {
        await Promise.all(updates);
        console.log("Agency codes migration complete.");
        return true;
    } catch (error) {
        console.error("Error during agency code migration:", error);
        return false;
    }
  }, []); // generateCode is stable, not a hook dependency

  const loadAgencies = useCallback(async () => {
    setIsLoading(true);
    try {
      let agenciesData = await Agency.list('-name');
      const migrationSuccessful = await migrateAgencyCodes(agenciesData);
      
      // If migration happened and was successful, refetch the data to have the latest codes
      if (migrationSuccessful && agenciesData.some(a => !a.code)) {
          agenciesData = await Agency.list('-name');
      }

      setAgencies(agenciesData);
    } catch (error) {
      console.error("Error loading agencies:", error);
    }
    setIsLoading(false);
  }, [migrateAgencyCodes]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate('/Home');
          return;
        }
        loadAgencies();
      } catch (error) {
        navigate('/Home');
      }
    };
    checkAuth();
  }, [loadAgencies, navigate]);

  const handleOpenForm = (agency = null) => {
    setEditingAgency(agency);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAgency(null);
  };

  const handleSaveAgency = async (formData) => {
    try {
      if (editingAgency) {
        await Agency.update(editingAgency.id, formData);
      } else {
        // When creating a new agency, generate a code if not provided
        if (!formData.code) {
          const allCurrentCodes = agencies.map(a => a.code).filter(Boolean);
          formData.code = generateCode(formData.name, allCurrentCodes);
        }
        await Agency.create(formData);
      }
      handleCloseForm();
      loadAgencies();
    } catch (error) {
      console.error("Error saving agency:", error);
    }
  };

  const handleDeleteAgency = async (agencyId) => {
    if (!agencyId) return;
    try {
      await Agency.delete(agencyId);
      handleCloseForm();
      loadAgencies();
    } catch (error) {
      console.error("Error deleting agency:", error);
    }
  };

  const filteredAgencies = agencies.filter(agency => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    
    const matchesName = agency.name.toLowerCase().includes(lowerSearch);
    const matchesCode = agency.code && agency.code.toLowerCase().includes(lowerSearch);
    const matchesEmail = agency.email && agency.email.toLowerCase().includes(lowerSearch);
    const matchesPhone = agency.phone && agency.phone.includes(searchText);
    
    const matchesContact = agency.contacts?.some(contact => 
        contact.name.toLowerCase().includes(lowerSearch) ||
        (contact.email && contact.email.toLowerCase().includes(lowerSearch))
    );

    return matchesName || matchesCode || matchesEmail || matchesPhone || matchesContact;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full space-y-6">
        <Card className="border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 min-w-[300px]">
                <Input
                  placeholder="Search agencies by name, code, contact, or email..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full h-9"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700 h-9">
                  <Plus className="w-4 h-4 mr-2" />
                  New Agency
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading agencies...</div>
            ) : filteredAgencies.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {searchText ? 'No agencies match your search' : 'No agencies created yet'}
                </p>
                <p className="text-sm">
                  {searchText ? 'Try adjusting your search criteria' : 'Click "New Agency" to add your first one.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAgencies.map(agency => (
                  <Card key={agency.id} className="group transition-all duration-300 border border-slate-200 hover:border-blue-300">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800">{agency.name}</h3>
                            {agency.code && <Badge variant="secondary">{agency.code}</Badge>}
                          </div>
                          
                          {(agency.email || agency.phone) && (
                            <div className="text-sm text-slate-600 space-y-1">
                              {agency.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-slate-500" />
                                  <a href={`mailto:${agency.email}`} className="text-blue-600 hover:underline">{agency.email}</a>
                                </div>
                              )}
                              {agency.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-slate-500" />
                                  <span>{agency.phone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {agency.notes && (
                            <div className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-sm text-slate-600">{agency.notes}</p>
                            </div>
                          )}

                          {agency.contacts && agency.contacts.length > 0 && (
                            <div className="pt-2">
                              <h4 className="font-medium text-slate-700 text-sm mb-2">Contacts ({agency.contacts.length})</h4>
                              <div className="space-y-2">
                                {agency.contacts.slice(0, 2).map((contact, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm bg-slate-100 p-2 rounded-md">
                                    <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    <span className="font-medium truncate">{contact.name}</span>
                                  </div>
                                ))}
                                {agency.contacts.length > 2 && (
                                  <p className="text-xs text-slate-500 text-center pt-1">
                                    + {agency.contacts.length - 2} more contacts
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                        <Button variant="outline" size="sm" className="hover:bg-blue-50" onClick={() => handleOpenForm(agency)}>
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAgency ? "Edit Agency" : "Create New Agency"}</DialogTitle>
              <DialogDescription>
                {editingAgency ? "Update the details for this agency." : "Fill in the details for the new agency."}
              </DialogDescription>
            </DialogHeader>
            <AgencyForm
              agency={editingAgency}
              onSave={handleSaveAgency}
              onCancel={handleCloseForm}
              onDelete={handleDeleteAgency}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}