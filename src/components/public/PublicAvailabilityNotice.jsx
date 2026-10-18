import React from 'react';
import { Button } from '@/components/ui/button';

export default function PublicAvailabilityNotice({ error, empty }) {
  if (!error && !empty) return null;
  const accessRequired = (error?.response?.status || error?.status) === 403;
  return (
    <div role={error ? 'alert' : 'status'} className="rounded-md border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      <p>{error
        ? accessRequired ? 'Your access has expired. Reload the page to enter the password again.' : 'Unable to load availability. Please reload the page.'
        : 'No active tents are available for this camp.'}</p>
      {error && <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Reload page</Button>}
    </div>
  );
}