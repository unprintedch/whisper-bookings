import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell } from
"@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator } from
"@/components/ui/dropdown-menu";
import { ListFilter, ChevronUp, ChevronDown, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const columnsConfig = [
{ id: 'clientName', label: 'Client', defaultVisible: true, sortable: true },
{ id: 'clientNumber', label: 'Client #', defaultVisible: true, sortable: true },
{ id: 'siteName', label: 'Site', defaultVisible: true, sortable: true },
{ id: 'roomName', label: 'Room', defaultVisible: true, sortable: true },
{ id: 'date_checkin', label: 'Check-in', defaultVisible: true, sortable: true },
{ id: 'date_checkout', label: 'Check-out', defaultVisible: true, sortable: true },
{ id: 'status', label: 'Status', defaultVisible: true, sortable: true },
{ id: 'adults_count', label: 'Adults', defaultVisible: true, sortable: true },
{ id: 'children_count', label: 'Children', defaultVisible: true, sortable: true },
{ id: 'infants_count', label: 'Infants', defaultVisible: true, sortable: true },
{ id: 'bed_configuration', label: 'Bed Config', defaultVisible: false, sortable: false },
{ id: 'contactName', label: 'Contact', defaultVisible: false, sortable: true },
{ id: 'contactEmail', label: 'Contact Email', defaultVisible: false, sortable: true },
{ id: 'contactPhone', label: 'Contact Phone', defaultVisible: false, sortable: true },
{ id: 'agencyName', label: 'Agency', defaultVisible: false, sortable: true },
{ id: 'comment', label: 'Comment', defaultVisible: false, sortable: false }];


const getStatusColor = (status) => {
  const colors = {
    OPTION: "bg-amber-100 text-amber-800",
    RESERVE: "bg-blue-100 text-blue-800",
    CONFIRME: "bg-emerald-100 text-emerald-800",
    PAYE: "bg-green-100 text-green-800",
    ANNULE: "bg-gray-100 text-gray-600"
  };
  return colors[status] || "bg-gray-100 text-gray-600";
};

export default function ReservationsTable({
  reservations,
  isLoading,
  onEditReservation,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange
}) {
  const [columnVisibility, setColumnVisibility] = useState(
    columnsConfig.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {})
  );
  const [sortConfig, setSortConfig] = useState({ key: 'date_checkin', direction: 'asc' });

  // Load external column visibility when it becomes available
  useEffect(() => {
    if (externalColumnVisibility) {
      setColumnVisibility(externalColumnVisibility);
    }
  }, [externalColumnVisibility]);

  // Handle column visibility changes
  const handleColumnVisibilityChange = (columnId, isVisible) => {
    const newVisibility = { ...columnVisibility, [columnId]: isVisible };
    setColumnVisibility(newVisibility);

    // Save to parent (which will save to user preferences)
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newVisibility);
    }
  };

  const handleSort = (columnId) => {
    const column = columnsConfig.find((c) => c.id === columnId);
    if (!column?.sortable) return;

    setSortConfig((prev) => ({
      key: columnId,
      direction: prev.key === columnId && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedReservations = useMemo(() => {
    let sorted = [...reservations];

    // Sort
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'date_checkin' || sortConfig.key === 'date_checkout') {
          // Parse dates safely
          try {
            const dateA = aVal ? new Date(aVal + 'T00:00:00') : null;
            const dateB = bVal ? new Date(bVal + 'T00:00:00') : null;

            if (!dateA || isNaN(dateA.getTime())) return sortConfig.direction === 'asc' ? 1 : -1;
            if (!dateB || isNaN(dateB.getTime())) return sortConfig.direction === 'asc' ? -1 : 1;

            return sortConfig.direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          } catch (error) {
            console.warn('Error sorting by date:', error);
            return 0;
          }
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const comparison = String(aVal || '').localeCompare(String(bVal || ''));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return sorted;
  }, [reservations, sortConfig]);

  const visibleColumns = columnsConfig.filter((c) => columnVisibility[c.id]);

  const renderSortIcon = (columnId) => {
    const column = columnsConfig.find((c) => c.id === columnId);
    if (!column?.sortable) return null;

    if (sortConfig.key !== columnId) {
      return <ChevronUp className="w-4 h-4 opacity-30" />;
    }

    return sortConfig.direction === 'asc' ?
    <ChevronUp className="w-4 h-4" /> :
    <ChevronDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array(8).fill(0).map((_, i) =>
            <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-16"></div>
            )}
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            All Reservations
            <Badge variant="secondary" className="ml-2">
              {sortedReservations.length} reservations
            </Badge>
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnsConfig.map((column) =>
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={columnVisibility[column.id]}
                onCheckedChange={(value) =>
                handleColumnVisibilityChange(column.id, !!value)
                }>

                  {column.label}
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) =>
                <TableHead
                  key={column.id}
                  className={`p-3 ${column.sortable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => handleSort(column.id)}>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{column.label}</span>
                      {renderSortIcon(column.id)}
                    </div>
                  </TableHead>
                )}
                <TableHead className="p-3">
                  <span className="font-semibold">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReservations.length > 0 ?
              sortedReservations.map((reservation) => {
                // Safely format dates for display
                const formatDate = (dateStr) => {
                  try {
                    if (!dateStr) return '-';
                    const date = new Date(dateStr + 'T00:00:00');
                    return isNaN(date.getTime()) ? '-' : format(date, 'dd/MM/yyyy');
                  } catch (error) {
                    return '-';
                  }
                };

                return (
                  <TableRow key={reservation.id} className="hover:bg-slate-50">
                      {visibleColumns.map((col) =>
                    <TableCell key={col.id} className="p-3">
                          {col.id === 'clientName' &&
                      <div className="flex items-center gap-2">
                              <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: reservation.clientColor || '#3b82f6' }} />

                              <span className="font-medium">{reservation.clientName}</span>
                            </div>
                      }
                          {col.id === 'clientNumber' &&
                      <span className="text-slate-600">{reservation.clientNumber || '-'}</span>
                      }
                          {col.id === 'status' &&
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status}
                            </Badge>
                      }
                          {col.id === 'date_checkin' && formatDate(reservation.date_checkin)}
                          {col.id === 'date_checkout' && formatDate(reservation.date_checkout)}
                          
                          {col.id === 'contactEmail' && reservation.contactEmail ?
                      <a href={`mailto:${reservation.contactEmail}`} className="text-blue-600 hover:underline">
                              {reservation.contactEmail}
                            </a> :
                      !['clientName', 'clientNumber', 'status', 'date_checkin', 'date_checkout', 'contactEmail'].includes(col.id) && (
                      reservation[col.id] || '-')}

                        </TableCell>
                    )}
                      <TableCell className="p-3">
                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditReservation(reservation)}
                        className="hover:bg-blue-50">

                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>);

              }) :

              <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    No reservations found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-slate-600">
          Showing {sortedReservations.length} reservations
        </div>
      </CardContent>
    </Card>);

}