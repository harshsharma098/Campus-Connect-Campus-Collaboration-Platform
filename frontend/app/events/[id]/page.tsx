'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Link from 'next/link';

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  event_date: string;
  registration_deadline: string;
  max_participants: number;
  registered_count: number;
  category_name: string;
  created_by_id: number;
  first_name: string;
  last_name: string;
  registrations: Array<{
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    registered_at: string;
  }>;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [params.id, user]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${params.id}`);
      setEvent(response.data);
      if (user) {
        setIsRegistered(
          response.data.registrations.some((r: any) => r.user_id === user.id)
        );
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      alert('Please login to register for events');
      return;
    }

    try {
      await api.post(`/events/${params.id}/register`);
      setIsRegistered(true);
      fetchEvent();
      alert('Successfully registered for event!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to register');
    }
  };

  const handleUnregister = async () => {
    try {
      await api.delete(`/events/${params.id}/register`);
      setIsRegistered(false);
      fetchEvent();
      alert('Successfully unregistered from event');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to unregister');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-dark-1 flex items-center justify-center">
        <div className="text-discord-muted">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-discord-dark-1 flex items-center justify-center">
        <div className="text-white">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-dark-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Event Card */}
        <div className="discord-card mb-4">
          <div className="mb-4">
            <span className="px-3 py-1 bg-discord-dark-3 text-blurple text-xs font-medium rounded">
              {event.category_name}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">{event.title}</h1>
          <div className="text-discord-secondary mb-6 whitespace-pre-wrap leading-relaxed">{event.description}</div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-discord-dark-3 rounded p-3">
              <p className="text-xs text-discord-muted mb-1">Date & Time</p>
              <p className="text-white font-medium">{format(new Date(event.event_date), 'MMMM dd, yyyy HH:mm')}</p>
            </div>
            {event.location && (
              <div className="bg-discord-dark-3 rounded p-3">
                <p className="text-xs text-discord-muted mb-1">Location</p>
                <p className="text-white font-medium">{event.location}</p>
              </div>
            )}
            <div className="bg-discord-dark-3 rounded p-3">
              <p className="text-xs text-discord-muted mb-1">Registered</p>
              <p className="text-white font-medium">
                {event.registered_count}
                {event.max_participants && ` / ${event.max_participants}`}
              </p>
            </div>
            {event.registration_deadline && (
              <div className="bg-discord-dark-3 rounded p-3">
                <p className="text-xs text-discord-muted mb-1">Registration Deadline</p>
                <p className="text-white font-medium">
                  {format(new Date(event.registration_deadline), 'MMMM dd, yyyy HH:mm')}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            {isAuthenticated ? (
              isRegistered ? (
                <button
                  onClick={handleUnregister}
                  className="discord-button-secondary"
                >
                  Unregister
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="discord-button"
                >
                  Register for Event
                </button>
              )
            ) : (
              <Link
                href="/auth/login"
                className="discord-button inline-block"
              >
                Login to Register
              </Link>
            )}
            {(user?.id === event.created_by_id || user?.role === 'admin') && (
              <Link
                href={`/events/${event.id}/edit`}
                className="discord-button-secondary"
              >
                Edit Event
              </Link>
            )}
          </div>
        </div>

        {/* Registrations */}
        {event.registrations.length > 0 && (
          <div className="discord-card">
            <h2 className="text-xl font-semibold text-white mb-4">Registered Participants</h2>
            <div className="space-y-2">
              {event.registrations.map((registration) => (
                <div key={registration.id} className="flex justify-between items-center py-2 border-b border-discord-dark-3">
                  <span className="text-white font-medium">
                    {registration.first_name} {registration.last_name}
                  </span>
                  <span className="text-sm text-discord-muted">
                    {format(new Date(registration.registered_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
