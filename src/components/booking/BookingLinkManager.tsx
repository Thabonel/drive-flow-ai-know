import { useState } from 'react';
import { useBookingLinks, BookingLink, AvailabilityHours, CustomQuestion } from '@/hooks/useBookingLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  Settings,
  Trash,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BookingLinkEditor } from './BookingLinkEditor';

export function BookingLinkManager() {
  const { bookingLinks, bookings, loading, deleteBookingLink, getBookingPageUrl } = useBookingLinks();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null);

  const handleCopyLink = (slug: string) => {
    const url = getBookingPageUrl(slug);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied!',
      description: 'Booking link has been copied to clipboard',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this booking link?')) {
      await deleteBookingLink(id);
    }
  };

  const handleViewBookings = (linkId: string) => {
    // Filter bookings for this link
    const linkBookings = bookings.filter(b => b.booking_link_id === linkId);
    toast({
      title: 'Bookings',
      description: `${linkBookings.length} booking(s) for this link`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Booking Links
          </h2>
          <p className="text-muted-foreground mt-1">
            Create and manage your scheduling links
          </p>
        </div>

        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Booking Link
        </Button>
      </div>

      {/* Booking Links Grid */}
      {bookingLinks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No booking links yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first booking link to start accepting meetings
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookingLinks.map((link) => {
            const linkBookings = bookings.filter(
              b => b.booking_link_id === link.id && b.status === 'confirmed'
            );

            return (
              <Card key={link.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {link.description || 'No description'}
                      </CardDescription>
                    </div>
                    {link.is_active ? (
                      <Badge variant="default" className="ml-2">
                        <Eye className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Link info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{link.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{linkBookings.length} upcoming booking(s)</span>
                    </div>
                  </div>

                  {/* URL Preview */}
                  <div className="p-2 bg-muted rounded-md">
                    <code className="text-xs break-all">
                      /book/{link.slug}
                    </code>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleCopyLink(link.slug)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </Button>

                    <Button
                      onClick={() => window.open(getBookingPageUrl(link.slug), '_blank')}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>

                    <Button
                      onClick={() => setEditingLink(link)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>

                    <Button
                      onClick={() => handleDelete(link.id)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-600 hover:text-red-700"
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <BookingLinkEditor
        open={showCreateDialog || editingLink !== null}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingLink(null);
        }}
        existingLink={editingLink}
      />
    </div>
  );
}
