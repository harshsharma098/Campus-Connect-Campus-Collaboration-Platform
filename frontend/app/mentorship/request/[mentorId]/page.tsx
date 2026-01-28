'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function RequestMentorshipPage() {
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/mentorship/requests', {
        mentorId: params.mentorId,
        message,
      });
      router.push('/mentorship/requests');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Request Mentorship</h1>

          {error && (
            <div className="discord-card mb-4 border-l-4 border-discord-red">
              <p className="text-discord-secondary">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="discord-card">
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-semibold text-discord-secondary mb-2">
                Message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="discord-input min-h-[150px] resize-none"
                placeholder="Tell the mentor why you'd like to connect..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="discord-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Request'}
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
