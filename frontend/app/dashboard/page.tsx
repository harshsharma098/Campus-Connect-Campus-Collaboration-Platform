'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = {
    questions: 0,
    mentorships: 0,
    events: 0,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-discord-secondary">Your campus community hub</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="discord-card">
              <h2 className="text-sm font-semibold text-discord-secondary mb-2">My Questions</h2>
              <div className="text-4xl font-bold text-white mb-4">
                {stats.questions}
              </div>
              <Link href="/questions" className="text-blurple hover:underline text-sm font-medium">
                View all →
              </Link>
            </div>

            <div className="discord-card">
              <h2 className="text-sm font-semibold text-discord-secondary mb-2">Mentorships</h2>
              <div className="text-4xl font-bold text-white mb-4">
                {stats.mentorships}
              </div>
              <Link href="/mentorship" className="text-blurple hover:underline text-sm font-medium">
                View all →
              </Link>
            </div>

            <div className="discord-card">
              <h2 className="text-sm font-semibold text-discord-secondary mb-2">Events</h2>
              <div className="text-4xl font-bold text-white mb-4">
                {stats.events}
              </div>
              <Link href="/events" className="text-blurple hover:underline text-sm font-medium">
                View all →
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="discord-card">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <Link
                href="/questions/new"
                className="discord-card flex items-center gap-4 p-4"
              >
                <div className="w-12 h-12 bg-blurple rounded-lg flex items-center justify-center text-white text-xl">
                  ➕
                </div>
                <div>
                  <div className="text-white font-semibold">Ask a Question</div>
                  <div className="text-discord-muted text-sm">Post a new question</div>
                </div>
              </Link>
              
              {user?.role === 'mentor' && (
                <Link
                  href="/mentorship/profile"
                  className="discord-card flex items-center gap-4 p-4"
                >
                  <div className="w-12 h-12 bg-discord-green rounded-lg flex items-center justify-center text-white text-xl">
                    👤
                  </div>
                  <div>
                    <div className="text-white font-semibold">Update Mentor Profile</div>
                    <div className="text-discord-muted text-sm">Edit your profile</div>
                  </div>
                </Link>
              )}
              
              {user?.role === 'student' && (
                <Link
                  href="/mentorship"
                  className="discord-card flex items-center gap-4 p-4"
                >
                  <div className="w-12 h-12 bg-discord-green rounded-lg flex items-center justify-center text-white text-xl">
                    🔍
                  </div>
                  <div>
                    <div className="text-white font-semibold">Find a Mentor</div>
                    <div className="text-discord-muted text-sm">Browse available mentors</div>
                  </div>
                </Link>
              )}
              
              <Link
                href="/events/new"
                className="discord-card flex items-center gap-4 p-4"
              >
                <div className="w-12 h-12 bg-discord-yellow rounded-lg flex items-center justify-center text-white text-xl">
                  📅
                </div>
                <div>
                  <div className="text-white font-semibold">Create Event</div>
                  <div className="text-discord-muted text-sm">Organize a new event</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
