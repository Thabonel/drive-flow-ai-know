import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Loader2, Plus, Clock, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLayers } from '@/hooks/useLayers';
import { useAuth } from '@/hooks/useAuth';
import { getRandomItemColor } from '@/lib/timelineUtils';

interface ExtractedItem {
  title: string;
  suggested_date: string | null;
  duration_minutes: number;
  description: string | null;
  sequence: number;
  selected: boolean;
  editing?: boolean;
}

interface ExtractToTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  content: string;
  sourceType: 'ai-response' | 'document';
  sourceTitle?: string;
}

const DEFAULT_LAYER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export function ExtractToTimelineDialog({
  open,
  onClose,
  content,
  sourceType,
  sourceTitle,
}: ExtractToTimelineDialogProps) {
  const { toast } = useToast();
  const { layers, addLayer, refetch: refetchLayers } = useLayers();
  const { user } = useAuth();

  // Add item directly to Supabase (instead of using TimelineContext which requires provider)
  const addTimelineItem = async (
    layerId: string,
    title: string,
    startTime: string,
    durationMinutes: number,
    color: string
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('timeline_items')
      .insert({
        user_id: user.id,
        layer_id: layerId,
        title,
        start_time: startTime,
        duration_minutes: durationMinutes,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding timeline item:', error);
      throw error;
    }

    return data;
  };

  const [isExtracting, setIsExtracting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [message, setMessage] = useState<string>('');

  // New layer creation state
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState(DEFAULT_LAYER_COLORS[0]);

  // Extract items when dialog opens
  useEffect(() => {
    if (open && content) {
      extractItems();
    }
  }, [open, content]);

  // Set default layer when layers are loaded
  useEffect(() => {
    if (layers.length > 0 && !selectedLayerId) {
      setSelectedLayerId(layers[0].id);
    }
  }, [layers, selectedLayerId]);

  const extractItems = async () => {
    setIsExtracting(true);
    setMessage('');
    setExtractedItems([]);

    try {
      const { data, error } = await supabase.functions.invoke('extract-timeline-items', {
        body: { content }
      });

      if (error) throw error;

      if (data.items && data.items.length > 0) {
        setExtractedItems(
          data.items.map((item: any) => ({
            ...item,
            selected: true,
            editing: false,
          }))
        );
      } else {
        setMessage(data.message || 'No schedulable items found in the content.');
      }
    } catch (error) {
      console.error('Error extracting items:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Failed to extract timeline items. Please try again.',
        variant: 'destructive',
      });
      setMessage('Failed to extract items. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSelectAll = () => {
    setExtractedItems(items => items.map(item => ({ ...item, selected: true })));
  };

  const handleSelectNone = () => {
    setExtractedItems(items => items.map(item => ({ ...item, selected: false })));
  };

  const handleToggleItem = (index: number) => {
    setExtractedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleEditItem = (index: number) => {
    setExtractedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, editing: true } : item
      )
    );
  };

  const handleSaveEdit = (index: number) => {
    setExtractedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, editing: false } : item
      )
    );
  };

  const handleUpdateItem = (index: number, field: keyof ExtractedItem, value: any) => {
    setExtractedItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the layer.',
        variant: 'destructive',
      });
      return;
    }

    const newLayer = await addLayer(newLayerName.trim(), newLayerColor);
    if (newLayer) {
      setSelectedLayerId(newLayer.id);
      setIsCreatingLayer(false);
      setNewLayerName('');
      await refetchLayers();
    }
  };

  const calculateItemDate = (item: ExtractedItem, index: number): string => {
    if (item.suggested_date) {
      return item.suggested_date;
    }
    // If no suggested date, space items weekly from the start date
    const date = new Date(startDate);
    date.setDate(date.getDate() + index * 7);
    return date.toISOString().split('T')[0];
  };

  const handleAddToTimeline = async () => {
    const selectedItems = extractedItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one item to add.',
        variant: 'destructive',
      });
      return;
    }

    // If creating a new layer, create it first
    let layerId = selectedLayerId;
    if (isCreatingLayer || !layerId) {
      if (!newLayerName.trim()) {
        toast({
          title: 'Layer Required',
          description: 'Please create a layer or select an existing one.',
          variant: 'destructive',
        });
        return;
      }
      const newLayer = await addLayer(newLayerName.trim(), newLayerColor);
      if (!newLayer) {
        return;
      }
      layerId = newLayer.id;
    }

    setIsAdding(true);

    try {
      const color = getRandomItemColor();
      let successCount = 0;

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const itemDate = calculateItemDate(item, i);

        // Create start time at 9 AM on the item's date
        const startTime = new Date(itemDate);
        startTime.setHours(9, 0, 0, 0);

        await addTimelineItem(
          layerId,
          item.title,
          startTime.toISOString(),
          item.duration_minutes,
          color
        );
        successCount++;
      }

      toast({
        title: 'Items Added',
        description: `Successfully added ${successCount} item${successCount > 1 ? 's' : ''} to the timeline.`,
      });

      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      toast({
        title: 'Error',
        description: 'Failed to add some items to the timeline.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const selectedCount = extractedItems.filter(item => item.selected).length;
  const hasNoLayers = layers.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add to Timeline
          </DialogTitle>
          <DialogDescription>
            {sourceTitle
              ? `Extracting schedulable items from "${sourceTitle}"`
              : `Extracting schedulable items from ${sourceType === 'ai-response' ? 'AI response' : 'document'}`}
          </DialogDescription>
        </DialogHeader>

        {isExtracting ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Extracting schedulable items...</p>
          </div>
        ) : message ? (
          <div className="py-8 text-center text-muted-foreground">
            {message}
          </div>
        ) : extractedItems.length > 0 ? (
          <div className="space-y-4">
            {/* Layer Selection */}
            <div className="space-y-2">
              <Label>Timeline Layer</Label>
              {hasNoLayers || isCreatingLayer ? (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">
                    {hasNoLayers ? 'Create Your First Timeline Layer' : 'Create New Layer'}
                  </p>
                  <div className="space-y-2">
                    <Input
                      value={newLayerName}
                      onChange={(e) => setNewLayerName(e.target.value)}
                      placeholder="Layer name (e.g., Podcast Episodes)"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Color:</Label>
                      <div className="flex gap-1">
                        {DEFAULT_LAYER_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewLayerColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newLayerColor === color
                                ? 'border-foreground scale-110'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {!hasNoLayers && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreatingLayer(false)}
                    >
                      Cancel - Use Existing Layer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedLayerId} onValueChange={setSelectedLayerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a layer" />
                    </SelectTrigger>
                    <SelectContent>
                      {layers.map((layer) => (
                        <SelectItem key={layer.id} value={layer.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: layer.color || '#3B82F6' }}
                            />
                            {layer.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCreatingLayer(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start From Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Items without specific dates will be spaced weekly starting from this date.
              </p>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {extractedItems.length} item{extractedItems.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectNone}
                >
                  Select None
                </Button>
              </div>
            </div>

            {/* Items List */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {extractedItems.map((item, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 transition-colors ${
                      item.selected ? 'bg-background' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => handleToggleItem(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        {item.editing ? (
                          <div className="space-y-2">
                            <Input
                              value={item.title}
                              onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={item.suggested_date || ''}
                                onChange={(e) => handleUpdateItem(index, 'suggested_date', e.target.value || null)}
                                className="text-sm flex-1"
                              />
                              <Input
                                type="number"
                                value={item.duration_minutes}
                                onChange={(e) => handleUpdateItem(index, 'duration_minutes', parseInt(e.target.value) || 60)}
                                className="text-sm w-20"
                                min={1}
                              />
                              <span className="text-sm text-muted-foreground self-center">min</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEdit(index)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {item.suggested_date
                                  ? new Date(item.suggested_date).toLocaleDateString()
                                  : `Week ${index + 1}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.duration_minutes} min
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => handleEditItem(index)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToTimeline}
            disabled={isExtracting || isAdding || selectedCount === 0}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                {hasNoLayers || isCreatingLayer
                  ? `Create Layer & Add ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`
                  : `Add ${selectedCount} Item${selectedCount !== 1 ? 's' : ''} to Timeline`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
