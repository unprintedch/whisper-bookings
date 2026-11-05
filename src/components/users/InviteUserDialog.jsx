import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function InviteUserDialog({ open, onOpenChange, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleClose = (next) => {
    if (!next) {
      setEmail('');
      setRole('user');
      setError('');
    }
    onOpenChange(next);
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setIsSending(true);
    setError('');
    try {
      await base44.users.inviteUser(trimmed, role);
      onInvited(trimmed);
      handleClose(false);
    } catch (inviteError) {
      setError(
        inviteError.response?.status === 403
          ? 'Only an administrator can invite a user with this role.'
          : 'The invitation could not be sent. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They receive an email invitation and join the app with the role you choose.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-700">
              {isSending ? 'Sending...' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}