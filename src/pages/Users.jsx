import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Agency } from "@/entities/Agency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users as UsersIcon, Shield, Mail, Building2, Search, Edit, Save, X, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentUserData, usersData, agenciesData] = await Promise.all([
        User.me(),
        User.list('-created_date'),
        Agency.list()
      ]);
      setCurrentUser(currentUserData);
      setUsers(usersData);
      setAgencies(agenciesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setEditData({
      custom_role: user.custom_role || 'full_access',
      agency_id: user.agency_id || ''
    });
  };

  const handleSave = async (userId) => {
    try {
      await User.update(userId, editData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setEditingUserId(null);
      await loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditData({});
  };

  const getAgencyName = (agencyId) => {
    const agency = agencies.find(a => a.id === agencyId);
    return agency ? agency.name : 'N/A';
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  // Check if current user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
        <Alert className="max-w-2xl mx-auto bg-red-50 border-red-200">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {users.length} users
          </Badge>
        </div>

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              User updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Base Role</TableHead>
                  <TableHead>Custom Role</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Unnamed User'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <Select
                            value={editData.custom_role}
                            onValueChange={(value) => setEditData(prev => ({ ...prev, custom_role: value }))}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_access">Full Access</SelectItem>
                              <SelectItem value="agency">Agency</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {user.custom_role === 'agency' ? 'Agency' : 'Full Access'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          editData.custom_role === 'agency' ? (
                            <Select
                              value={editData.agency_id}
                              onValueChange={(value) => setEditData(prev => ({ ...prev, agency_id: value }))}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select agency" />
                              </SelectTrigger>
                              <SelectContent>
                                {agencies.map(agency => (
                                  <SelectItem key={agency.id} value={agency.id}>
                                    {agency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-slate-400 text-sm">N/A</span>
                          )
                        ) : (
                          user.agency_id ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              {getAgencyName(user.agency_id)}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(user.created_date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingUserId === user.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(user.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Full Access</h4>
              <p className="text-sm text-slate-600">
                Can view and manage all bookings, rooms, clients, and agencies across all sites.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Agency</h4>
              <p className="text-sm text-slate-600">
                Can only view and manage bookings for clients associated with their specific agency. 
                Cannot access rooms, settings, or other agencies' data.
              </p>
            </div>
          </CardContent>
        </Card>

        <Alert className="bg-amber-50 border-amber-200">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Note:</strong> To invite new users, use Dashboard → Users → Invite User. 
            After they join, you can assign them a role and agency here.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}