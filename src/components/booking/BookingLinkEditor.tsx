import { useState, useEffect } from 'react';
import { useBookingLinks, BookingLink, AvailabilityHours, CustomQuestion } from '@/hooks/useBookingLinks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash, Clock, Settings as SettingsIcon, Link as LinkIcon, HelpCircle } from 'lucide-react';

interface BookingLinkEditorProps {
  open: boolean;
  onClose: () => void;
  existingLink?: BookingLink | null;
}

const DEFAULT_AVAILABILITY: AvailabilityHours = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
};

export function BookingLinkEditor({ open, onClose, existingLink }: BookingLinkEditorProps) {
  const { createBookingLink, updateBookingLink } = useBookingLinks();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [availability, setAvailability] = useState<AvailabilityHours>(DEFAULT_AVAILABILITY);
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [maxDaysAdvance, setMaxDaysAdvance] = useState(60);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [locationType, setLocationType] = useState<'zoom' | 'google_meet' | 'phone' | 'in_person' | 'custom'>('zoom');
  const [locationDetails, setLocationDetails] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);
  const [sendReminders, setSendReminders] = useState(true);
  const [color, setColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existingLink) {
      setTitle(existingLink.title);
      setSlug(existingLink.slug);
      setDescription(existingLink.description || '');
      setDurationMinutes(existingLink.duration_minutes);
      setAvailability(existingLink.availability_hours);
      setBufferBefore(existingLink.buffer_before_minutes);
      setBufferAfter(existingLink.buffer_after_minutes);
      setMinNoticeHours(existingLink.min_notice_hours);
      setMaxDaysAdvance(existingLink.max_days_advance);
      setCustomQuestions(existingLink.custom_questions);
      setLocationType(existingLink.location_type);
      setLocationDetails(existingLink.location_details || '');
      setIsActive(existingLink.is_active);
      setRequireConfirmation(existingLink.require_confirmation);
      setSendReminders(existingLink.send_reminders);
      setColor(existingLink.color);
    } else {
      resetForm();
    }
  }, [existingLink, open]);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setDurationMinutes(30);
    setAvailability(DEFAULT_AVAILABILITY);
    setBufferBefore(0);
    setBufferAfter(0);
    setMinNoticeHours(24);
    setMaxDaysAdvance(60);
    setCustomQuestions([]);
    setLocationType('zoom');
    setLocationDetails('');
    setIsActive(true);
    setRequireConfirmation(false);
    setSendReminders(true);
    setColor('#3b82f6');
  };

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!existingLink) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddQuestion = () => {
    setCustomQuestions([
      ...customQuestions,
      { question: '', required: false, type: 'text' },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, updates: Partial<CustomQuestion>) => {
    const updated = [...customQuestions];
    updated[index] = { ...updated[index], ...updates };
    setCustomQuestions(updated);
  };

  const handleSave = async () => {
    if (!title || !slug) {
      return;
    }

    setSaving(true);

    const linkData: Partial<BookingLink> = {
      title,
      slug,
      description,
      duration_minutes: durationMinutes,
      availability_hours: availability,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      min_notice_hours: minNoticeHours,
      max_days_advance: maxDaysAdvance,
      custom_questions: customQuestions,
      location_type: locationType,
      location_details: locationDetails,
      is_active: isActive,
      require_confirmation: requireConfirmation,
      send_reminders: sendReminders,
      color,
    };

    let success = false;
    if (existingLink) {
      success = await updateBookingLink(existingLink.id, linkData);
    } else {
      const result = await createBookingLink(linkData);
      success = result !== null;
    }

    setSaving(false);

    if (success) {
      onClose();
    }
  };

  const updateAvailability = (day: keyof AvailabilityHours, windows: { start: string; end: string }[]) => {
    setAvailability({ ...availability, [day]: windows });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingLink ? 'Edit Booking Link' : 'Create Booking Link'}
          </DialogTitle>
          <DialogDescription>
            Configure your scheduling link with availability and custom questions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Basic Settings */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="30 Minute Meeting"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/book/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="30-minute-meeting"
                  required
                  disabled={!!existingLink}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quick intro call to discuss your project"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={durationMinutes.toString()} onValueChange={(v) => setDurationMinutes(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-type">Location Type</Label>
              <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {locationType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="location-details">Location Details</Label>
                <Input
                  id="location-details"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Meeting link or address"
                />
              </div>
            )}
          </TabsContent>

          {/* Availability Settings */}
          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Hours</CardTitle>
                <CardDescription>Set when you're available for bookings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(availability).map(([day, windows]) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-24 capitalize text-sm font-medium">{day}</div>
                    {windows.length === 0 ? (
                      <div className="flex-1 text-sm text-muted-foreground">Unavailable</div>
                    ) : (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {windows.map((window, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Input
                              type="time"
                              value={window.start}
                              onChange={(e) => {
                                const updated = [...windows];
                                updated[idx] = { ...updated[idx], start: e.target.value };
                                updateAvailability(day as keyof AvailabilityHours, updated);
                              }}
                              className="h-8"
                            />
                            <span>-</span>
                            <Input
                              type="time"
                              value={window.end}
                              onChange={(e) => {
                                const updated = [...windows];
                                updated[idx] = { ...updated[idx], end: e.target.value };
                                updateAvailability(day as keyof AvailabilityHours, updated);
                              }}
                              className="h-8"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <Switch
                      checked={windows.length > 0}
                      onCheckedChange={(checked) => {
                        updateAvailability(
                          day as keyof AvailabilityHours,
                          checked ? [{ start: '09:00', end: '17:00' }] : []
                        );
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buffer Before (minutes)</Label>
                <Input
                  type="number"
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(Number(e.target.value))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Buffer After (minutes)</Label>
                <Input
                  type="number"
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(Number(e.target.value))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Notice (hours)</Label>
                <Input
                  type="number"
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Days in Advance</Label>
                <Input
                  type="number"
                  value={maxDaysAdvance}
                  onChange={(e) => setMaxDaysAdvance(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>
          </TabsContent>

          {/* Custom Questions */}
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Questions</CardTitle>
                <CardDescription>Ask additional information from bookers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customQuestions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <Input
                          value={question.question}
                          onChange={(e) => handleUpdateQuestion(index, { question: e.target.value })}
                          placeholder="What's your company name?"
                        />

                        <div className="flex items-center gap-4">
                          <Select
                            value={question.type}
                            onValueChange={(v: any) => handleUpdateQuestion(index, { type: v })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="textarea">Long Text</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.required}
                              onCheckedChange={(checked) =>
                                handleUpdateQuestion(index, { required: checked })
                              }
                            />
                            <Label className="text-sm">Required</Label>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(index)}
                        className="text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button onClick={handleAddQuestion} variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Enable public bookings</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Confirmation</Label>
                  <p className="text-sm text-muted-foreground">Review bookings before confirming</p>
                </div>
                <Switch checked={requireConfirmation} onCheckedChange={setRequireConfirmation} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Send Reminders</Label>
                  <p className="text-sm text-muted-foreground">Email reminders 24h and 1h before</p>
                </div>
                <Switch checked={sendReminders} onCheckedChange={setSendReminders} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title || !slug}>
            {saving ? 'Saving...' : existingLink ? 'Update Link' : 'Create Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
