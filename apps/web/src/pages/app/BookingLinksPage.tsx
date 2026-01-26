import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '@daypilot/ui';
import {
  useBookingLinks,
  useDeleteBookingLink,
} from '@daypilot/lib';
import type { BookingLink } from '@daypilot/types';

export function BookingLinksPage() {
  const { data: bookingLinks = [], isLoading, error } = useBookingLinks();
  const deleteBookingLink = useDeleteBookingLink();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (bookingLink: BookingLink): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${bookingLink.title || bookingLink.slug}"?`)) {
      return;
    }

    setDeletingId(bookingLink.id);
    try {
      await deleteBookingLink.mutateAsync({
        id: bookingLink.id,
        organizationId: bookingLink.organization_id || null,
      });
    } catch (error: any) {
      alert('Failed to delete booking link: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (slug: string) => {
    const bookingUrl = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(bookingUrl);
    alert('Booking link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Booking Links</h1>
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Failed to load booking links. Please check your connection and try again.';
    
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Booking Links</h1>
        <Card>
          <div className="p-6">
            <p className="text-red-600 font-semibold mb-2">Error loading booking links</p>
            <p className="text-red-500 text-sm">{errorMessage}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Booking Links</h1>
        <Link to="/app/booking-links/new">
          <Button>Create Booking Link</Button>
        </Link>
      </div>

      {bookingLinks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              You don't have any booking links yet.
            </p>
            <Link to="/app/booking-links/new">
              <Button>Create Your First Booking Link</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookingLinks.map((bookingLink) => (
            <Card key={bookingLink.id} className="hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">
                    {bookingLink.title || 'Untitled Booking Link'}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={bookingLink.is_active ? 'success' : 'default'}>
                      {bookingLink.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="default">
                      {bookingLink.type === 'one-on-one' ? 'One-on-One' : 'Group'}
                    </Badge>
                  </div>
                </div>
              </div>

              {bookingLink.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {bookingLink.description}
                </p>
              )}

              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{bookingLink.duration} minutes</span>
                </div>
                {(bookingLink.buffer_before > 0 || bookingLink.buffer_after > 0) && (
                  <div className="flex justify-between">
                    <span>Buffers:</span>
                    <span className="font-medium">
                      {bookingLink.buffer_before}min before, {bookingLink.buffer_after}min after
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Min Notice:</span>
                  <span className="font-medium">
                    {bookingLink.min_notice >= 60
                      ? `${Math.floor(bookingLink.min_notice / 60)} hours`
                      : `${bookingLink.min_notice} minutes`}
                  </span>
                </div>
                {bookingLink.max_per_day && (
                  <div className="flex justify-between">
                    <span>Max per Day:</span>
                    <span className="font-medium">{bookingLink.max_per_day}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(bookingLink.slug)}
                    className="flex-1"
                  >
                    Copy Link
                  </Button>
                  <Link
                    to={`/app/booking-links/${bookingLink.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                </div>
                <Link to={`/book/${bookingLink.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="w-full">
                    View Public Page
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(bookingLink)}
                  disabled={deletingId === bookingLink.id}
                  className="w-full text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  {deletingId === bookingLink.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

