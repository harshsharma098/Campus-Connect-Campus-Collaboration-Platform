'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Request {
  id: number;
  message: string;
  status: string;
  created_at: string;
  student_id?: number;
  mentor_id?: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function MentorshipRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mentorship/requests', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      await api.patch(`/mentorship/requests/${requestId}`, { status });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update request');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">
            {user?.role === 'mentor' ? 'Mentorship Requests' : 'My Mentorship Requests'}
          </h1>

          <div className="mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="discord-input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-discord-muted">Loading requests...</div>
            </div>
          ) : requests.length === 0 ? (
            <div className="discord-card text-center py-12">
              <div className="text-discord-muted">No requests found</div>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="discord-card">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="discord-avatar">
                        {request.first_name[0]}{request.last_name[0]}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {user?.role === 'mentor'
                            ? `${request.first_name} ${request.last_name}`
                            : `Mentor: ${request.first_name} ${request.last_name}`}
                        </h2>
                        <p className="text-discord-muted text-sm">{request.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        request.status === 'accepted'
                          ? 'bg-discord-dark-3 text-discord-green'
                          : request.status === 'rejected'
                          ? 'bg-discord-dark-3 text-discord-red'
                          : 'bg-discord-dark-3 text-discord-yellow'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {request.message && (
                    <p className="text-discord-secondary mb-4 whitespace-pre-wrap text-sm">{request.message}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-discord-muted">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {user?.role === 'mentor' && request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(request.id, 'accepted')}
                          className="discord-button text-sm px-4 py-2"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(request.id, 'rejected')}
                          className="discord-button-secondary text-sm px-4 py-2"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
