'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    eventDate: '',
    registrationDeadline: '',
    maxParticipants: '',
    categoryId: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/events/categories/all');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/events', {
        ...formData,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        categoryId: formData.categoryId || null,
      });
      router.push('/events');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Create Event</h1>

          {error && (
            <div className="discord-card mb-4 border-l-4 border-discord-red">
              <p className="text-discord-secondary">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="discord-card space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-discord-secondary mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="discord-input"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-discord-secondary mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="discord-input min-h-[150px] resize-none"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventDate" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Event Date & Time
                </label>
                <input
                  id="eventDate"
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="discord-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="discord-input"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="registrationDeadline" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Registration Deadline
                </label>
                <input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  className="discord-input"
                />
              </div>

              <div>
                <label htmlFor="maxParticipants" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Max Participants
                </label>
                <input
                  id="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="discord-input"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-semibold text-discord-secondary mb-2">
                Category
              </label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="discord-input"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="discord-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="discord-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
