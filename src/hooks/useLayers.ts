// Hook for managing timeline layers

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TimelineLayer } from '@/lib/timelineUtils';
import { useToast } from '@/hooks/use-toast';
import { resolveLayerColor } from '@/lib/layerUtils';

export function useLayers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [layers, setLayers] = useState<TimelineLayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch layers
  const fetchLayers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('timeline_layers')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setLayers(data || []);
    } catch (error) {
      console.error('Error fetching layers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timeline layers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a new layer
  const addLayer = async (name: string, color?: string) => {
    if (!user) return;

    try {
      const layerColor = resolveLayerColor(color);
      const maxSortOrder = layers.length > 0
        ? Math.max(...layers.map(l => l.sort_order))
        : -1;

      const { data, error } = await supabase
        .from('timeline_layers')
        .insert({
          user_id: user.id,
          name,
          color: layerColor,
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setLayers([...layers, { ...data, color: data?.color || layerColor }]);
      toast({
        title: 'Layer added',
        description: `Layer "${name}" has been created`,
      });

      return data;
    } catch (error) {
      console.error('Error adding layer:', error);
      toast({
        title: 'Error',
        description: 'Failed to add layer',
        variant: 'destructive',
      });
    }
  };

  // Update a layer
  const updateLayer = async (layerId: string, updates: Partial<TimelineLayer>) => {
    try {
      const { error } = await supabase
        .from('timeline_layers')
        .update(updates)
        .eq('id', layerId);

      if (error) throw error;

      setLayers(layers.map(l => l.id === layerId ? { ...l, ...updates } : l));
    } catch (error) {
      console.error('Error updating layer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update layer',
        variant: 'destructive',
      });
    }
  };

  // Delete a layer
  const deleteLayer = async (layerId: string) => {
    try {
      // Check if layer has items
      const { count, error: countError } = await supabase
        .from('timeline_items')
        .select('*', { count: 'exact', head: true })
        .eq('layer_id', layerId);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({
          title: 'Cannot delete layer',
          description: 'This layer contains items. Please remove or move them first.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('timeline_layers')
        .delete()
        .eq('id', layerId);

      if (error) throw error;

      setLayers(layers.filter(l => l.id !== layerId));
      toast({
        title: 'Layer deleted',
        description: 'Layer has been removed',
      });
    } catch (error) {
      console.error('Error deleting layer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete layer',
        variant: 'destructive',
      });
    }
  };

  // Reorder layers
  const reorderLayers = async (newOrder: TimelineLayer[]) => {
    try {
      // Update sort_order for all layers
      const updates = newOrder.map((layer, index) => ({
        id: layer.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('timeline_layers')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      setLayers(newOrder);
    } catch (error) {
      console.error('Error reordering layers:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder layers',
        variant: 'destructive',
      });
    }
  };

  // Toggle layer visibility
  const toggleLayerVisibility = async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    await updateLayer(layerId, { is_visible: !layer.is_visible });
  };

  useEffect(() => {
    fetchLayers();
  }, [user]);

  return {
    layers,
    loading,
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    toggleLayerVisibility,
    refetch: fetchLayers,
  };
}
