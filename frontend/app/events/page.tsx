'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function EventsPage() {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchEvents();
  }, [search, categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/events/categories/all');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events', {
        params: {
          search,
          categoryId: categoryId || undefined,
          approvedOnly: true,
        },
      });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: number) => {
    if (!isAuthenticated) {
      alert('Please login to register for events');
      return;
    }

    try {
      await api.post(`/events/${eventId}/register`);
      fetchEvents();
      alert('Successfully registered for event!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen bg-discord-dark-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Category List Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="discord-card sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
              <div className="space-y-1">
                <button
                  onClick={() => setCategoryId(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                    categoryId === null
                      ? 'bg-blurple text-white'
                      : 'text-discord-secondary hover:bg-discord-dark-3 hover:text-white'
                  }`}
                >
                  All Events
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                      categoryId === category.id
                        ? 'bg-blurple text-white'
                        : 'text-discord-secondary hover:bg-discord-dark-3 hover:text-white'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Campus Events</h1>
              <p className="text-discord-secondary">Discover and join exciting campus activities</p>
            </div>

            {/* Search and Category Dropdown */}
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <input
                type="text"
                placeholder="Search events..."
                className="discord-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                className="discord-input"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories - Horizontal Scrollable (for mobile/tablet) */}
            <div className="mb-6 lg:hidden">
              <div className="flex gap-2 overflow-x-auto category-scroll pb-2">
                <button
                  onClick={() => setCategoryId(null)}
                  className={`px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-colors ${
                    categoryId === null
                      ? 'bg-blurple text-white'
                      : 'bg-discord-dark-3 text-discord-secondary hover:bg-discord-dark-4 hover:text-white'
                  }`}
                >
                  All Events
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className={`px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-colors ${
                      categoryId === category.id
                        ? 'bg-blurple text-white'
                        : 'bg-discord-dark-3 text-discord-secondary hover:bg-discord-dark-4 hover:text-white'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-discord-muted">Loading events...</div>
              </div>
            ) : events.length === 0 ? (
              <div className="discord-card text-center py-12">
                <div className="text-discord-muted">No events found</div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="discord-card">
                    <div className="mb-4">
                      <span className="px-3 py-1 bg-discord-dark-3 text-blurple text-xs font-medium rounded">
                        {event.category_name || 'Uncategorized'}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">{event.title}</h2>
                    <p className="text-discord-secondary text-sm mb-4 line-clamp-3">{event.description}</p>
                    
                    <div className="space-y-2 mb-4 text-sm text-discord-muted">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(new Date(event.event_date), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {event.registered_count}
                        {event.max_participants && ` / ${event.max_participants}`}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="flex-1 text-center discord-button-secondary py-2 text-sm"
                      >
                        View Details
                      </Link>
                      {isAuthenticated && (
                        <button
                          onClick={() => handleRegister(event.id)}
                          className="flex-1 discord-button py-2 text-sm"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
