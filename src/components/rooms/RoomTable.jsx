
import React, { useState, useMemo, useCallback } from 'react';
import {
  // Table, TableHeader, TableRow, TableHead, TableBody, TableCell, // Removed as per new HTML table structure
} from "@/components/ui/table";
// import { Input } from "@/components/ui/input"; // Removed as search input is no longer present
import { Button } from "@/components/ui/button";
import {
  // DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator // Removed as column visibility is no longer present
} from "@/components/ui/dropdown-menu";
import { Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

// Removed columnsConfig as the table headers are now hardcoded
// const columnsConfig = [
//     { id: 'name', label: 'Name', defaultVisible: true, sortable: true },
//     { id: 'site_id', label: 'Site', defaultVisible: true, sortable: true },
//     { id: 'capacity_max', label: 'Capacity', defaultVisible: true, sortable: true },
//     { id: 'type_label', label: 'Type', defaultVisible: true, sortable: true },
//     { id: 'bed_configurations', label: 'Bed Configurations', defaultVisible: false, sortable: false },
//     { id: 'is_active', label: 'Status', defaultVisible: true, sortable: true },
//     { id: 'notes', label: 'Notes', defaultVisible: false, sortable: false },
// ];

/**
 * A reusable component for sortable table headers.
 */
const SortableHeader = ({ label, sortKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig.key === sortKey;
    const isAsc = sortConfig.direction === 'asc';

    return (
        <th
            className="p-4 font-medium cursor-pointer"
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                {isSorted ? (
                    isAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                ) : (
                    // Display a faint up arrow if not sorted to indicate it's sortable
                    <ChevronUp className="w-4 h-4 opacity-30" />
                )}
            </div>
        </th>
    );
};

/**
 * A reusable component for rendering a single room's table row.
 */
const RoomTableRow = ({ room, site, onEditClick, allBedConfigs }) => (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
        <td className="p-4 align-top">
            <Badge variant={room.is_active ? "default" : "secondary"} className={room.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                {room.is_active ? "Active" : "Inactive"}
            </Badge>
        </td>
        <td className="p-4 align-top font-medium text-slate-800">{site?.name || 'N/A'}</td>
        <td className="p-4 align-top font-medium text-slate-800">{room.number}</td> {/* Added room number */}
        <td className="p-4 align-top text-slate-600">{room.name}</td>
        <td className="p-4 align-top text-slate-600">{room.capacity_max}</td>
        <td className="p-4 align-top text-slate-600">
            {room.bed_configuration_ids
                ?.map(id => allBedConfigs.find(bc => bc.id === id)?.name)
                .filter(Boolean)
                .join(', ') || 'N/A'
            }
        </td>
        <td className="p-4 align-top text-right">
            <Button variant="ghost" size="sm" onClick={() => onEditClick(room)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
            </Button>
        </td>
    </tr>
);

export default function RoomTable({ rooms, sites, allBedConfigs, onEditClick }) {
    // Removed columnVisibility state as column visibility dropdown is no longer present
    // Removed searchTerm state as search input is no longer present
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    /**
     * Memoized function to find site information by ID.
     */
    const getSiteInfo = useCallback((siteId) => {
        return sites.find(s => s.id === siteId);
    }, [sites]);

    /**
     * Handles sorting requests from table headers.
     */
    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    /**
     * Memoized list of rooms, sorted according to sortConfig.
     * Search filtering is removed as the UI input for it was removed.
     */
    const sortedRooms = useMemo(() => {
        const sortableRooms = [...rooms];

        sortableRooms.sort((a, b) => {
            const { key, direction } = sortConfig;
            let aVal, bVal;

            switch (key) {
                case 'is_active':
                    aVal = a.is_active ? 1 : 0; // Sort boolean as number
                    bVal = b.is_active ? 1 : 0;
                    break;
                case 'site': // Sort by site name
                    aVal = getSiteInfo(a.site_id)?.name || '';
                    bVal = getSiteInfo(b.site_id)?.name || '';
                    break;
                case 'number': // Sort by room number numerically
                    aVal = parseInt(a.number, 10) || 0;
                    bVal = parseInt(b.number, 10) || 0;
                    break;
                case 'capacity_max': // Sort numeric capacity
                    aVal = a.capacity_max || 0;
                    bVal = b.capacity_max || 0;
                    break;
                default: // Default to sorting by 'name'
                    aVal = a[key] || '';
                    bVal = b[key] || '';
            }

            // Perform numeric comparison if both values are numbers
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // Perform string comparison otherwise
            const comparison = String(aVal).localeCompare(String(bVal));
            return direction === 'asc' ? comparison : -comparison;
        });

        return sortableRooms;
    }, [rooms, sortConfig, getSiteInfo]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                    <tr>
                        {/* Hardcoded headers using SortableHeader for sortable columns */}
                        <SortableHeader label="Status" sortKey="is_active" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader label="Site" sortKey="site" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader label="Number" sortKey="number" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                        <SortableHeader label="Capacity" sortKey="capacity_max" sortConfig={sortConfig} requestSort={requestSort} />
                        <th className="p-4 font-medium">Bed Configurations</th> {/* Not sortable */}
                        <th className="p-4 font-medium text-right">Actions</th> {/* Not sortable */}
                    </tr>
                </thead>
                <tbody>
                    {sortedRooms.length > 0 ? (
                        sortedRooms.map(room => (
                            <RoomTableRow key={room.id} room={room} site={getSiteInfo(room.site_id)} allBedConfigs={allBedConfigs} onEditClick={onEditClick} />
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="h-24 text-center text-slate-500">
                                No rooms found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
