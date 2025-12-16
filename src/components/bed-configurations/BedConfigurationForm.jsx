import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

export default function BedConfigurationForm({ config, onSave, onCancel, onDelete }) {
  const [name, setName] = useState('');
  const [maxOccupancy, setMaxOccupancy] = useState(1);

  useEffect(() => {
    if (config) {
      setName(config.name || '');
      setMaxOccupancy(config.max_occupancy || 1);
    } else {
      setName('');
      setMaxOccupancy(1);
    }
  }, [config]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || maxOccupancy < 1) {
      // Basic validation
      return;
    }
    onSave({ name, max_occupancy: Number(maxOccupancy) });
  };

  const handleDelete = () => {
    if (config && config.id) {
      onDelete(config.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="config-name">Configuration Name</Label>
          <Input
            id="config-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 1 double bed"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="config-occupancy">Max Occupancy</Label>
          <Input
            id="config-occupancy"
            type="number"
            min="1"
            value={maxOccupancy}
            onChange={(e) => setMaxOccupancy(parseInt(e.target.value, 10) || 1)}
            required
          />
        </div>
      </div>
      <div className="flex justify-between items-center gap-2 pt-6 border-t">
        <div>
          {config && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the configuration "{config.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{config ? 'Save Changes' : 'Create Configuration'}</Button>
        </div>
      </div>
    </form>
  );
}