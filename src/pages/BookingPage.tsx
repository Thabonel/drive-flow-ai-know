import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBookingLinks, BookingLink, TimeSlot } from '@/hooks/useBookingLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Video,
} from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    getBookingLinkBySlug,
    getAvailableSlots,
    createBooking,
    trackAnalytics,
  } = useBookingLinks();

  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form state
  const [step, setStep] = useState<'select-time' | 'enter-details' | 'confirmed'>('select-time');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Detect timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load booking link
  useEffect(() => {
    loadBookingLink();
  }, [slug]);

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate && bookingLink) {
      loadAvailableSlots();
    }
  }, [selectedDate, bookingLink]);

  const loadBookingLink = async () => {
    if (!slug) return;

    setLoading(true);
    const link = await getBookingLinkBySlug(slug);
    setBookingLink(link);
    setLoading(false);

    if (link) {
      // Track page view
      trackAnalytics(link.id, 'view');

      // Set default selected date to tomorrow
      setSelectedDate(addDays(startOfDay(new Date()), 1));
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !bookingLink) return;

    setLoadingSlots(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const slots = await getAvailableSlots(bookingLink.id, dateStr, userTimezone);
    setAvailableSlots(slots);
    setLoadingSlots(false);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.is_available) return;

    setSelectedSlot(slot);
    setStep('enter-details');

    if (bookingLink) {
      trackAnalytics(bookingLink.id, 'booking_started');
    }
  };

  const handleSubmitBooking = async () => {
    if (!bookingLink || !selectedSlot || !name || !email) return;

    setSubmitting(true);

    const bookingId = await createBooking(bookingLink.id, selectedSlot.start_time, {
      name,
      email,
      phone,
      timezone: userTimezone,
      customResponses,
    });

    setSubmitting(false);

    if (bookingId) {
      trackAnalytics(bookingLink.id, 'booking_completed');
      setStep('confirmed');
    }
  };

  const handleBack = () => {
    setSelectedSlot(null);
    setStep('select-time');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking link not found</h2>
            <p className="text-muted-foreground">
              This booking link may have been removed or is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">You're all set!</h2>
              <p className="text-muted-foreground">
                Your meeting with {bookingLink.title} has been confirmed
              </p>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-semibold">
                      {selectedSlot && format(new Date(selectedSlot.start_time), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSlot && format(new Date(selectedSlot.start_time), 'h:mm a')} ({userTimezone})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p>{bookingLink.duration_minutes} minutes</p>
                </div>

                {bookingLink.location_type !== 'custom' && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <p className="capitalize">{bookingLink.location_type.replace('_', ' ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                A confirmation email with meeting details has been sent to <strong>{email}</strong>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {step === 'enter-details' && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{bookingLink.title}</CardTitle>
                  {bookingLink.description && (
                    <CardDescription className="mt-2">{bookingLink.description}</CardDescription>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{bookingLink.duration_minutes} min</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{bookingLink.location_type.replace('_', ' ')}</span>
                </div>

                <Badge variant="outline">{userTimezone}</Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left side - Calendar and time slots */}
          {step === 'select-time' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Select a Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      const maxDate = addDays(today, bookingLink.max_days_advance);
                      return date < addDays(today, 1) || date > maxDate;
                    }}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Times</CardTitle>
                  <CardDescription>
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <p className="text-center text-muted-foreground py-8">
                      Select a date to see available times
                    </p>
                  ) : loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : availableSlots.filter(s => s.is_available).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No available times on this date
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {availableSlots
                        .filter(slot => slot.is_available)
                        .map((slot, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            onClick={() => handleSelectSlot(slot)}
                            className="justify-center"
                          >
                            {format(new Date(slot.start_time), 'h:mm a')}
                          </Button>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Right side - Booking form */}
          {step === 'enter-details' && selectedSlot && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Enter Your Details</CardTitle>
                <CardDescription>
                  Booking for {format(new Date(selectedSlot.start_time), 'EEEE, MMMM d')} at{' '}
                  {format(new Date(selectedSlot.start_time), 'h:mm a')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                {/* Custom Questions */}
                {bookingLink.custom_questions.map((question, idx) => (
                  <div key={idx} className="space-y-2">
                    <Label htmlFor={`question-${idx}`}>
                      {question.question}
                      {question.required && ' *'}
                    </Label>
                    {question.type === 'textarea' ? (
                      <Textarea
                        id={`question-${idx}`}
                        value={customResponses[question.question] || ''}
                        onChange={(e) =>
                          setCustomResponses({ ...customResponses, [question.question]: e.target.value })
                        }
                        required={question.required}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={`question-${idx}`}
                        type={question.type}
                        value={customResponses[question.question] || ''}
                        onChange={(e) =>
                          setCustomResponses({ ...customResponses, [question.question]: e.target.value })
                        }
                        required={question.required}
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitBooking}
                    disabled={!name || !email || submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
