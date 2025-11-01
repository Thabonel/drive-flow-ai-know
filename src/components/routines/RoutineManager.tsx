import { useState } from 'react';
import { useRoutines, RoutineItem, RoutineType } from '@/hooks/useRoutines';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Edit, Clock, Calendar, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ROUTINE_TYPES: { value: RoutineType; label: string; icon: string; defaultColor: string }[] = [
  { value: 'lunch', label: 'Lunch', icon: '🍽️', defaultColor: '#f59e0b' },
  { value: 'exercise', label: 'Exercise', icon: '💪', defaultColor: '#ef4444' },
  { value: 'commute', label: 'Commute', icon: '🚗', defaultColor: '#6b7280' },
  { value: 'break', label: 'Break', icon: '☕', defaultColor: '#f59e0b' },
  { value: 'personal', label: 'Personal', icon: '🏠', defaultColor: '#10b981' },
  { value: 'morning_routine', label: 'Morning Routine', icon: '🌅', defaultColor: '#10b981' },
  { value: 'evening_routine', label: 'Evening Routine', icon: '🌙', defaultColor: '#10b981' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', shortLabel: 'S' },
  { value: 1, label: 'Mon', shortLabel: 'M' },
  { value: 2, label: 'Tue', shortLabel: 'T' },
  { value: 3, label: 'Wed', shortLabel: 'W' },
  { value: 4, label: 'Thu', shortLabel: 'T' },
  { value: 5, label: 'Fri', shortLabel: 'F' },
  { value: 6, label: 'Sat', shortLabel: 'S' },
];

interface RoutineManagerProps {
  onClose?: () => void;
}

export function RoutineManager({ onClose }: RoutineManagerProps) {
  const {
    routines,
    loading,
    error,
    createDefaultRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    toggleAutoAdd,
  } = useRoutines();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<RoutineType>('personal');
  const [formTime, setFormTime] = useState('12:00');
  const [formDuration, setFormDuration] = useState(60);
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [formFlexible, setFormFlexible] = useState(true);
  const [formAutoAdd, setFormAutoAdd] = useState(true);
  const [formPriority, setFormPriority] = useState(5);

  // Handle create default routines
  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    await createDefaultRoutines();
    setCreatingDefaults(false);
  };

  // Handle open create dialog
  const handleOpenCreate = () => {
    setEditingRoutine(null);
    setFormTitle('');
    setFormType('personal');
    setFormTime('12:00');
    setFormDuration(60);
    setFormDays([1, 2, 3, 4, 5]);
    setFormFlexible(true);
    setFormAutoAdd(true);
    setFormPriority(5);
    setShowCreateDialog(true);
  };

  // Handle open edit dialog
  const handleOpenEdit = (routine: RoutineItem) => {
    setEditingRoutine(routine);
    setFormTitle(routine.title);
    setFormType(routine.type);
    setFormTime(routine.default_time);
    setFormDuration(routine.duration_minutes);
    setFormDays(routine.days_of_week);
    setFormFlexible(routine.is_flexible);
    setFormAutoAdd(routine.auto_add);
    setFormPriority(routine.priority);
    setShowCreateDialog(true);
  };

  // Handle save routine
  const handleSave = async () => {
    if (!formTitle.trim()) return;

    const typeConfig = ROUTINE_TYPES.find((t) => t.value === formType);

    const routineData = {
      title: formTitle,
      type: formType,
      default_time: formTime,
      duration_minutes: formDuration,
      days_of_week: formDays,
      is_flexible: formFlexible,
      auto_add: formAutoAdd,
      color: typeConfig?.defaultColor || '#10b981',
      priority: formPriority,
    };

    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, routineData);
    } else {
      await createRoutine(routineData);
    }

    setShowCreateDialog(false);
  };

  // Handle delete
  const handleDelete = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this routine?')) return;
    await deleteRoutine(routineId);
  };

  // Toggle day selection
  const toggleDay = (day: number) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get type config
  const getTypeConfig = (type: RoutineType) => {
    return ROUTINE_TYPES.find((t) => t.value === type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Routine Manager</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily routines and auto-populate them on your timeline
          </p>
        </div>
        <div className="flex gap-2">
          {routines.length === 0 && (
            <Button
              onClick={handleCreateDefaults}
              disabled={creatingDefaults}
              variant="outline"
              className="gap-2"
            >
              {creatingDefaults ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Default Routines
                </>
              )}
            </Button>
          )}
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Routine
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Routines List */}
      {routines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No routines yet. Create your first routine to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routines.map((routine) => {
            const typeConfig = getTypeConfig(routine.type);
            return (
              <Card key={routine.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeConfig?.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{routine.title}</CardTitle>
                        <CardDescription className="capitalize">
                          {typeConfig?.label}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={routine.auto_add}
                        onCheckedChange={() => toggleAutoAdd(routine.id)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {routine.auto_add ? 'Auto-add' : 'Manual'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Time and Duration */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{routine.default_time}</span>
                    </div>
                    <span>•</span>
                    <span>{formatDuration(routine.duration_minutes)}</span>
                    <span>•</span>
                    <Badge variant={routine.is_flexible ? 'secondary' : 'default'} className="text-xs">
                      {routine.is_flexible ? 'Flexible' : 'Fixed'}
                    </Badge>
                    {routine.priority > 7 && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          High Priority
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Days of Week */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day) => (
                        <Badge
                          key={day.value}
                          variant={routine.days_of_week.includes(day.value) ? 'default' : 'outline'}
                          className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                        >
                          {day.shortLabel}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(routine)}
                      className="gap-2"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(routine.id)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoutine ? 'Edit Routine' : 'Create Routine'}</DialogTitle>
            <DialogDescription>
              {editingRoutine
                ? 'Update your routine settings'
                : 'Create a new routine that will auto-populate on your timeline'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Lunch Break"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formType} onValueChange={(value: RoutineType) => setFormType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  step={5}
                  value={formDuration}
                  onChange={(e) => setFormDuration(parseInt(e.target.value) || 60)}
                />
              </div>
            </div>

            {/* Days of Week */}
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="flex-1"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="flexible">Flexible Timing</Label>
                  <p className="text-xs text-muted-foreground">
                    Can be automatically moved to accommodate meetings
                  </p>
                </div>
                <Switch
                  id="flexible"
                  checked={formFlexible}
                  onCheckedChange={setFormFlexible}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-add">Auto-add to Timeline</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically add this routine to your timeline
                  </p>
                </div>
                <Switch
                  id="auto-add"
                  checked={formAutoAdd}
                  onCheckedChange={setFormAutoAdd}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (0-10)</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                max={10}
                value={formPriority}
                onChange={(e) => setFormPriority(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Higher priority routines are less likely to be moved
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formTitle.trim()}>
              {editingRoutine ? 'Save Changes' : 'Create Routine'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
