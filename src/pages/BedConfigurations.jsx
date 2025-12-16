
import React, { useState, useEffect } from "react";
import { BedConfiguration } from "@/entities/BedConfiguration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Bed, Users, GripVertical } from "lucide-react";
import BedConfigurationForm from "../components/bed-configurations/BedConfigurationForm";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function BedConfigurationsPage() {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data sorted by sort_order for drag-and-drop
      const data = await BedConfiguration.list('sort_order');
      setConfigs(data);
    } catch (error) {
      console.error('Error loading bed configurations:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async (formData) => {
    try {
      if (editingConfig) {
        await BedConfiguration.update(editingConfig.id, formData);
      } else {
        // Assign a sort_order for new items, typically at the end
        const newSortOrder = configs.length;
        await BedConfiguration.create({ ...formData, sort_order: newSortOrder });
      }
      setIsFormOpen(false);
      setEditingConfig(null);
      loadData(); // Reload data to get the updated list with correct sort orders
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  };

  const handleDelete = async (configId) => {
    try {
      await BedConfiguration.delete(configId);
      setIsFormOpen(false);
      setEditingConfig(null);
      loadData(); // Reload data after deletion to re-index sort_order if necessary or just update the list
    } catch (error) {
      console.error("Error deleting configuration:", error);
    }
  };

  const handleEditClick = (config) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const handleNewClick = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const onDragEnd = async (result) => {
    const { destination, source } = result;

    // If item is dropped outside a droppable area or in the same position
    if (!destination || destination.index === source.index) {
      return;
    }

    const reorderedConfigs = Array.from(configs);
    const [removed] = reorderedConfigs.splice(source.index, 1); // Remove item from source
    reorderedConfigs.splice(destination.index, 0, removed); // Insert item at destination

    // Optimistically update UI
    setConfigs(reorderedConfigs);

    // Update sort_order in the database
    const updatePromises = reorderedConfigs.map((config, index) =>
      // Only update if the sort_order has actually changed for a specific item
      config.sort_order !== index ? BedConfiguration.update(config.id, { sort_order: index }) : Promise.resolve()
    );

    try {
      await Promise.all(updatePromises);
      // Data is already updated optimistically; no need to reload unless an error occurs
    } catch (error) {
      console.error("Failed to update sort order:", error);
      // If failed, revert to original order by reloading data from the server
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 px-6 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Bed className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-bold text-slate-800">Bed Configurations</span>
              </CardTitle>
              <Button onClick={handleNewClick} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Configuration
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DragDropContext onDragEnd={onDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead> {/* Drag handle column */}
                    <TableHead>Configuration Name</TableHead>
                    <TableHead className="text-center">Max Occupancy</TableHead>
                    <TableHead className="w-[100px]"></TableHead> {/* Actions column */}
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="bed-configs">
                  {(provided) => (
                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24">Loading...</TableCell>
                        </TableRow>
                      ) : configs.length > 0 ? (
                        configs.map((config, index) => (
                          <Draggable key={config.id} draggableId={config.id} index={index}>
                            {(provided) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <TableCell {...provided.dragHandleProps} className="cursor-grab text-slate-400 hover:text-slate-600">
                                  <GripVertical className="w-5 h-5" />
                                </TableCell>
                                <TableCell className="font-medium">{config.name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="flex items-center gap-1.5 w-fit mx-auto">
                                    <Users className="w-3 h-3" />
                                    {config.max_occupancy}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm" onClick={() => handleEditClick(config)}>
                                    Edit
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24 text-slate-500">
                            No bed configurations found.
                          </TableCell>
                        </TableRow>
                      )}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingConfig ? "Edit Configuration" : "New Bed Configuration"}</DialogTitle>
              <DialogDescription>
                Define a reusable bed configuration for your rooms.
              </DialogDescription>
            </DialogHeader>
            <BedConfigurationForm
              config={editingConfig}
              onSave={handleSave}
              onCancel={() => setIsFormOpen(false)}
              onDelete={handleDelete}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
