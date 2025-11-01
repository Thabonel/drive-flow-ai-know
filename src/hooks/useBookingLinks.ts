import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AvailabilityWindow {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface AvailabilityHours {
  monday: AvailabilityWindow[];
  tuesday: AvailabilityWindow[];
  wednesday: AvailabilityWindow[];
  thursday: AvailabilityWindow[];
  friday: AvailabilityWindow[];
  saturday: AvailabilityWindow[];
  sunday: AvailabilityWindow[];
}

export interface CustomQuestion {
  question: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'textarea';
}

export interface BookingLink {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  availability_hours: AvailabilityHours;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  max_days_advance: number;
  custom_questions: CustomQuestion[];
  location_type: 'zoom' | 'google_meet' | 'phone' | 'in_person' | 'custom';
  location_details: string | null;
  is_active: boolean;
  require_confirmation: boolean;
  send_reminders: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_link_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  booker_name: string;
  booker_email: string;
  booker_phone: string | null;
  booker_timezone: string;
  custom_responses: Record<string, string>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelled_at: string | null;
  cancellation_reason: string | null;
  timeline_item_id: string | null;
  google_calendar_event_id: string | null;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export const useBookingLinks = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's booking links
  const fetchBookingLinks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookingLinks(data || []);
    } catch (err) {
      console.error('Error fetching booking links:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch booking links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings for user
  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  // Create booking link
  const createBookingLink = async (
    linkData: Partial<BookingLink>
  ): Promise<BookingLink | null> => {
    if (!user) return null;

    try {
      // Generate slug from title if not provided
      const slug = linkData.slug || linkData.title!
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('booking_links')
        .insert({
          user_id: user.id,
          slug,
          title: linkData.title,
          description: linkData.description,
          duration_minutes: linkData.duration_minutes || 30,
          availability_hours: linkData.availability_hours,
          buffer_before_minutes: linkData.buffer_before_minutes || 0,
          buffer_after_minutes: linkData.buffer_after_minutes || 0,
          min_notice_hours: linkData.min_notice_hours || 24,
          max_days_advance: linkData.max_days_advance || 60,
          custom_questions: linkData.custom_questions || [],
          location_type: linkData.location_type || 'zoom',
          location_details: linkData.location_details,
          color: linkData.color || '#3b82f6',
          is_active: linkData.is_active !== undefined ? linkData.is_active : true,
          require_confirmation: linkData.require_confirmation || false,
          send_reminders: linkData.send_reminders !== undefined ? linkData.send_reminders : true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          throw new Error('This URL slug is already taken. Please choose a different one.');
        }
        throw error;
      }

      await fetchBookingLinks();
      toast({
        title: 'Success',
        description: 'Booking link created successfully',
      });

      return data;
    } catch (err) {
      console.error('Error creating booking link:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create booking link',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update booking link
  const updateBookingLink = async (
    id: string,
    updates: Partial<BookingLink>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('booking_links')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchBookingLinks();
      toast({
        title: 'Success',
        description: 'Booking link updated successfully',
      });

      return true;
    } catch (err) {
      console.error('Error updating booking link:', err);
      toast({
        title: 'Error',
        description: 'Failed to update booking link',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete booking link
  const deleteBookingLink = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('booking_links')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchBookingLinks();
      toast({
        title: 'Success',
        description: 'Booking link deleted successfully',
      });

      return true;
    } catch (err) {
      console.error('Error deleting booking link:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete booking link',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get booking link by slug (public)
  const getBookingLinkBySlug = async (slug: string): Promise<BookingLink | null> => {
    try {
      const { data, error } = await supabase
        .from('booking_links')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching booking link by slug:', err);
      return null;
    }
  };

  // Get available slots for a booking link on a specific date
  const getAvailableSlots = async (
    bookingLinkId: string,
    date: string, // YYYY-MM-DD
    timezone: string = 'UTC'
  ): Promise<TimeSlot[]> => {
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_booking_link_id: bookingLinkId,
        p_date: date,
        p_timezone: timezone,
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching available slots:', err);
      return [];
    }
  };

  // Create a booking (public function)
  const createBooking = async (
    bookingLinkId: string,
    startTime: string,
    bookerInfo: {
      name: string;
      email: string;
      phone?: string;
      timezone: string;
      customResponses?: Record<string, string>;
    }
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('create_booking_with_calendar_event', {
        p_booking_link_id: bookingLinkId,
        p_start_time: startTime,
        p_booker_name: bookerInfo.name,
        p_booker_email: bookerInfo.email,
        p_booker_timezone: bookerInfo.timezone,
        p_custom_responses: bookerInfo.customResponses || {},
      });

      if (error) throw error;

      toast({
        title: 'Booking confirmed!',
        description: 'A confirmation email has been sent.',
      });

      return data;
    } catch (err) {
      console.error('Error creating booking:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create booking',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Cancel booking
  const cancelBooking = async (
    bookingId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        })
        .eq('id', bookingId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchBookings();
      toast({
        title: 'Booking cancelled',
        description: 'The booking has been cancelled successfully',
      });

      return true;
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Track analytics
  const trackAnalytics = async (
    bookingLinkId: string,
    eventType: 'view' | 'booking_started' | 'booking_completed' | 'booking_cancelled',
    metadata?: {
      referrerUrl?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    }
  ): Promise<void> => {
    try {
      await supabase.from('booking_analytics').insert({
        booking_link_id: bookingLinkId,
        event_type: eventType,
        referrer_url: metadata?.referrerUrl,
        utm_source: metadata?.utmSource,
        utm_medium: metadata?.utmMedium,
        utm_campaign: metadata?.utmCampaign,
      });
    } catch (err) {
      // Silently fail analytics
      console.error('Error tracking analytics:', err);
    }
  };

  // Generate booking page URL
  const getBookingPageUrl = (slug: string): string => {
    return `${window.location.origin}/book/${slug}`;
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchBookingLinks();
      fetchBookings();
    }
  }, [user?.id]);

  return {
    bookingLinks,
    bookings,
    loading,
    createBookingLink,
    updateBookingLink,
    deleteBookingLink,
    getBookingLinkBySlug,
    getAvailableSlots,
    createBooking,
    cancelBooking,
    trackAnalytics,
    getBookingPageUrl,
    refetch: () => {
      fetchBookingLinks();
      fetchBookings();
    },
  };
};
