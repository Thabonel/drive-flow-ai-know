import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDayTemplates, TemplateBlock } from '@/hooks/useDayTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2, Save, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const BLOCK_TYPES = [
  { value: 'work', label: 'Work', defaultColor: '#3b82f6' },
  { value: 'meeting', label: 'Meeting', defaultColor: '#8b5cf6' },
  { value: 'break', label: 'Break', defaultColor: '#f59e0b' },
  { value: 'personal', label: 'Personal', defaultColor: '#10b981' },
] as const;

export function TemplateBuilder({ open, onClose, onSaved }: TemplateBuilderProps) {
  const { createTemplate } = useDayTemplates();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New block form state
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockType, setNewBlockType] = useState<'work' | 'meeting' | 'break' | 'personal'>('work');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockStartTime, setNewBlockStartTime] = useState('08:00');
  const [newBlockDuration, setNewBlockDuration] = useState(60);
  const [newBlockColor, setNewBlockColor] = useState('#3b82f6');
  const [newBlockFlexible, setNewBlockFlexible] = useState(true);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((_, idx) => idx.toString() === active.id);
        const newIndex = items.findIndex((_, idx) => idx.toString() === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Add block
  const handleAddBlock = () => {
    if (!newBlockTitle.trim()) {
      setError('Please enter a title for the block');
      return;
    }

    const newBlock: TemplateBlock = {
      start_time: newBlockStartTime,
      duration_minutes: newBlockDuration,
      title: newBlockTitle,
      type: newBlockType,
      color: newBlockColor,
      is_flexible: newBlockFlexible,
    };

    setBlocks((prev) => [...prev, newBlock]);

    // Reset form
    setNewBlockTitle('');
    setNewBlockDuration(60);
    setShowAddBlock(false);
    setError(null);
  };

  // Delete block
  const handleDeleteBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Please enter a template name');
      return;
    }

    if (blocks.length === 0) {
      setError('Please add at least one block to the template');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await createTemplate(
        templateName,
        templateDescription || null,
        blocks,
        false
      );

      if (result) {
        // Reset form
        setTemplateName('');
        setTemplateDescription('');
        setBlocks([]);
        onSaved?.();
        onClose();
      } else {
        setError('Failed to create template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate total duration
  const totalDuration = blocks.reduce((sum, block) => sum + block.duration_minutes, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Template</DialogTitle>
          <DialogDescription>
            Build your own day template by adding time blocks. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., My Productive Day"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe when to use this template..."
                rows={2}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Total: {formatDuration(totalDuration)}
            </Badge>
            <Badge variant="outline">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Blocks List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time Blocks</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBlock(!showAddBlock)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Block
              </Button>
            </div>

            {/* Add Block Form */}
            {showAddBlock && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="block-type">Type</Label>
                      <Select
                        value={newBlockType}
                        onValueChange={(value: any) => {
                          setNewBlockType(value);
                          const typeConfig = BLOCK_TYPES.find((t) => t.value === value);
                          if (typeConfig) {
                            setNewBlockColor(typeConfig.defaultColor);
                          }
                        }}
                      >
                        <SelectTrigger id="block-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOCK_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-title">Title</Label>
                      <Input
                        id="block-title"
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        placeholder="e.g., Morning Focus"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-start-time">Start Time</Label>
                      <Input
                        id="block-start-time"
                        type="time"
                        value={newBlockStartTime}
                        onChange={(e) => setNewBlockStartTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-duration">Duration (minutes)</Label>
                      <Input
                        id="block-duration"
                        type="number"
                        min={5}
                        step={5}
                        value={newBlockDuration}
                        onChange={(e) => setNewBlockDuration(parseInt(e.target.value) || 60)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-color">Color</Label>
                      <Input
                        id="block-color"
                        type="color"
                        value={newBlockColor}
                        onChange={(e) => setNewBlockColor(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-flexible">Flexible</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch
                          id="block-flexible"
                          checked={newBlockFlexible}
                          onCheckedChange={setNewBlockFlexible}
                        />
                        <span className="text-sm text-muted-foreground">
                          {newBlockFlexible ? 'Can be moved' : 'Fixed time'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddBlock(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddBlock}>Add Block</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Blocks */}
            {blocks.length > 0 ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={blocks.map((_, idx) => idx.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {blocks.map((block, idx) => (
                      <SortableBlockItem
                        key={idx}
                        id={idx.toString()}
                        block={block}
                        onDelete={() => handleDeleteBlock(idx)}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No blocks added yet. Click "Add Block" to get started.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sortable Block Item Component
interface SortableBlockItemProps {
  id: string;
  block: TemplateBlock;
  onDelete: () => void;
  formatDuration: (minutes: number) => string;
}

function SortableBlockItem({ id, block, onDelete, formatDuration }: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeConfig = BLOCK_TYPES.find((t) => t.value === block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div
        className="w-1 h-12 rounded"
        style={{ backgroundColor: block.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{block.title}</span>
          {!block.is_flexible && (
            <Badge variant="secondary" className="text-xs">Fixed</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="font-mono">{block.start_time}</span>
          <span>·</span>
          <span>{formatDuration(block.duration_minutes)}</span>
          <span>·</span>
          <span className="capitalize">{block.type}</span>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
