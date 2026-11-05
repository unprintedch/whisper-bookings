import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { removeBookingUser } from '@/functions/removeBookingUser';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function RemoveUserButton({ user, onRemoved }) {
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  const handleRemove = async () => {
    setIsRemoving(true);
    setError('');
    try {
      await removeBookingUser({ user_id: user.id });
      setOpen(false);
      onRemoved(user.email);
    } catch (removeError) {
      const status = removeError.response?.status;
      setError(status === 403
        ? 'Only an administrator can remove a user.'
        : 'This user could not be removed. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4" />
        <span className="sr-only">Remove {user.full_name || user.email}</span>
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!isRemoving) { setOpen(next); setError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this user?</DialogTitle>
            <DialogDescription>
              {user.full_name || user.email} loses access to the app immediately. This cannot be undone from here.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}