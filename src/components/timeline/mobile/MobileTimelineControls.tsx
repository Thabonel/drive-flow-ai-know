import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTimelineItemGestures } from '@/hooks/useGestures';
import { TimelineItem } from '@/lib/timelineUtils';
import { ATTENTION_TYPE_DESCRIPTIONS } from '@/lib/attentionTypes';
import { Vibrate } from '@/lib/haptics';
import { MobileDelegationPanel, type DelegationInfo } from './MobileDelegationPanel';
import {
  Clock,
  Check,
  Pause,
  Users,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Target,
  Calendar,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileTimelineControlsProps {
  items: TimelineItem[];
  selectedDate: Date;
  onItemUpdate?: (item: TimelineItem) => void;
  onItemComplete?: (item: TimelineItem) => void;
  onItemPark?: (item: TimelineItem) => void;
  onItemDelegate?: (item: TimelineItem, delegateInfo: DelegationInfo) => void;
  onItemEdit?: (item: TimelineItem) => void;
  onItemDelete?: (item: TimelineItem) => void;
  className?: string;
}

export function MobileTimelineControls({
  items,
  selectedDate,
  onItemUpdate,
  onItemComplete,
  onItemPark,
  onItemDelegate,
  onItemEdit,
  onItemDelete,
  className
}: MobileTimelineControlsProps) {
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [quickActionItem, setQuickActionItem] = useState<TimelineItem | null>(null);

  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items for selected date
  const dayItems = items.filter(item => {
    const itemDate = new Date(item.start_time).toISOString().split('T')[0];
    const targetDate = selectedDate.toISOString().split('T')[0];
    return itemDate === targetDate;
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Handle gestures for timeline navigation
  const { isGesturing } = useTimelineItemGestures(
    () => {
      // Complete item
      if (selectedItem && onItemComplete) {
        onItemComplete(selectedItem);
        setSelectedItem(null);
        Vibrate.success();
        toast.success(`"${selectedItem.title}" completed`);
      }
    },
    () => {
      // Park item
      if (selectedItem && onItemPark) {
        onItemPark(selectedItem);
        setSelectedItem(null);
        Vibrate.light();
        toast.info(`"${selectedItem.title}" parked`);
      }
    },
    () => {
      // Show delegation panel
      if (selectedItem) {
        setQuickActionItem(selectedItem);
        Vibrate.heavy();
      }
    },
    () => {
      // Edit item
      if (selectedItem && onItemEdit) {
        onItemEdit(selectedItem);
        setSelectedItem(null);
        Vibrate.selection();
      }
    }
  );

  const handleItemTap = (item: TimelineItem) => {
    setSelectedItem(item);

    // Toggle expansion
    const itemId = item.id?.toString() || item.title;
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });

    Vibrate.light();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAttentionTypeColor = (attentionType: string) => {
    switch (attentionType) {
      case 'create': return 'border-l-blue-500 bg-blue-50';
      case 'review': return 'border-l-green-500 bg-green-50';
      case 'admin': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  const getPriorityIndicator = (priority?: number) => {
    if (!priority || priority < 3) return null;

    if (priority >= 5) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <Target className="h-4 w-4 text-yellow-500" />;
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <div ref={containerRef} className={`space-y-3 ${className}`}>
        {dayItems.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tasks scheduled for {selectedDate.toLocaleDateString()}
            </p>
          </Card>
        ) : (
          dayItems.map((item) => {
            const itemId = item.id?.toString() || item.title;
            const isExpanded = expandedItems.has(itemId);
            const isSelected = selectedItem?.id === item.id;
            const attentionTypeDesc = item.attention_type
              ? ATTENTION_TYPE_DESCRIPTIONS[item.attention_type]
              : null;

            return (
              <ContextMenu key={itemId}>
                <ContextMenuTrigger asChild>
                  <Card
                    className={`
                      border-l-4 cursor-pointer transition-all duration-200
                      ${getAttentionTypeColor(item.attention_type || '')}
                      ${isSelected ? 'shadow-neu-pressed scale-[0.98]' : 'shadow-neu-flat hover:shadow-neu-raised'}
                      ${isGesturing && isSelected ? 'scale-95' : ''}
                    `}
                    onClick={() => handleItemTap(item)}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatTime(item.start_time)}
                            </span>
                            {attentionTypeDesc && (
                              <Badge variant="outline" className="text-xs">
                                {attentionTypeDesc.icon} {attentionTypeDesc.label}
                              </Badge>
                            )}
                            {getPriorityIndicator(item.priority)}
                          </div>
                          <h3 className="font-medium text-sm leading-tight truncate">
                            {item.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.duration_minutes}m
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="space-y-3 pt-2 border-t">
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}

                          {item.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{item.location}</span>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onItemComplete?.(item);
                                Vibrate.success();
                                toast.success(`"${item.title}" completed`);
                              }}
                              className="flex-1 gap-2 h-8 text-xs rounded-xl"
                            >
                              <Check className="h-3 w-3" />
                              Complete
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onItemPark?.(item);
                                Vibrate.light();
                                toast.info(`"${item.title}" parked`);
                              }}
                              className="flex-1 gap-2 h-8 text-xs rounded-xl"
                            >
                              <Pause className="h-3 w-3" />
                              Park
                            </Button>

                            {item.attention_type && ['create', 'review'].includes(item.attention_type) && (
                              <MobileDelegationPanel
                                item={item}
                                onDelegate={onItemDelegate}
                                trigger={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 h-8 text-xs rounded-xl px-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Users className="h-3 w-3" />
                                    Delegate
                                  </Button>
                                }
                              />
                            )}
                          </div>

                          {/* Gesture Instructions */}
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            <p>Swipe: →Complete ↓Park ↑Edit | Long press: Delegate</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => {
                      onItemComplete?.(item);
                      Vibrate.success();
                      toast.success(`"${item.title}" completed`);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Complete
                  </ContextMenuItem>

                  <ContextMenuItem
                    onClick={() => {
                      onItemPark?.(item);
                      Vibrate.light();
                      toast.info(`"${item.title}" parked`);
                    }}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Park for Later
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    onClick={() => {
                      onItemEdit?.(item);
                      Vibrate.selection();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Task
                  </ContextMenuItem>

                  <ContextMenuItem
                    onClick={() => setQuickActionItem(item)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Delegate
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    onClick={() => {
                      onItemDelete?.(item);
                      Vibrate.error();
                      toast.success(`"${item.title}" deleted`);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}

        {/* Gesture Help Card */}
        {dayItems.length > 0 && (
          <Card className="p-4 bg-muted/30 border-dashed">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Mobile Gestures Enabled
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Tap: Expand details</div>
                <div>Long press: Context menu</div>
                <div>Swipe right: Complete</div>
                <div>Swipe down: Park</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Action Delegation Sheet */}
      {quickActionItem && (
        <MobileDelegationPanel
          item={quickActionItem}
          onDelegate={(item, info) => {
            onItemDelegate?.(item, info);
            setQuickActionItem(null);
          }}
          trigger={null}
        />
      )}
    </>
  );
}