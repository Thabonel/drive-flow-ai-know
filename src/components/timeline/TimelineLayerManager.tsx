// Layer management component

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimelineLayer } from '@/lib/timelineUtils';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
} from 'lucide-react';

interface TimelineLayerManagerProps {
  layers: TimelineLayer[];
  onAddLayer: (name: string, color?: string) => Promise<void>;
  onUpdateLayer: (layerId: string, updates: Partial<TimelineLayer>) => Promise<void>;
  onDeleteLayer: (layerId: string) => Promise<void>;
  onToggleVisibility: (layerId: string) => Promise<void>;
}

export function TimelineLayerManager({
  layers,
  onAddLayer,
  onUpdateLayer,
  onDeleteLayer,
  onToggleVisibility,
}: TimelineLayerManagerProps) {
  const [newLayerName, setNewLayerName] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddLayer = async () => {
    if (!newLayerName.trim()) return;

    await onAddLayer(newLayerName.trim());
    setNewLayerName('');
  };

  const startEditing = (layer: TimelineLayer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const saveEdit = async () => {
    if (!editingLayerId || !editingName.trim()) return;

    await onUpdateLayer(editingLayerId, { name: editingName.trim() });
    setEditingLayerId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4 p-1">
        {/* Add new layer */}
        <div className="flex gap-2">
          <Input
            placeholder="New layer name"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddLayer()}
          />
          <Button onClick={handleAddLayer} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Layer list */}
        <div className="space-y-2">
          {layers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No layers yet. Create one to get started!
            </p>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card text-card-foreground"
              >
                {/* Drag handle */}
                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />

                {/* Layer color indicator */}
                {layer.color && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: layer.color }}
                  />
                )}

                {/* Layer name */}
                {editingLayerId === layer.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium">
                    {layer.name}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-1">
                  {editingLayerId === layer.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveEdit}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(layer)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleVisibility(layer.id)}
                      >
                        {layer.is_visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLayer(layer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
}
