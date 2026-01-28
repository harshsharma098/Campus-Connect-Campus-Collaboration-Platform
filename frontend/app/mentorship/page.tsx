'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Mentor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  skills: string[];
  experience_years: number;
  availability_status: string;
  bio: string;
  current_mentees: number;
}

export default function MentorshipPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMentors();
  }, [search]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mentorship/mentors', {
        params: { search },
      });
      setMentors(response.data.mentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-dark-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Find a Mentor</h1>
          <p className="text-discord-secondary">Connect with experienced mentors in your field</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search mentors by name or skills..."
            className="discord-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Mentors Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-discord-muted">Loading mentors...</div>
          </div>
        ) : mentors.length === 0 ? (
          <div className="discord-card text-center py-12">
            <div className="text-discord-muted">No mentors found</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="discord-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="discord-avatar w-12 h-12">
                    {mentor.first_name[0]}{mentor.last_name[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {mentor.first_name} {mentor.last_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        mentor.availability_status === 'available' ? 'bg-discord-green' :
                        mentor.availability_status === 'busy' ? 'bg-discord-yellow' : 'bg-discord-red'
                      }`}></div>
                      <span className="text-xs text-discord-muted capitalize">{mentor.availability_status}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-discord-secondary text-sm mb-4 line-clamp-3">{mentor.bio}</p>
                
                {/* Skills */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-discord-secondary mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-discord-dark-3 text-blurple text-xs font-medium rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {mentor.skills.length > 4 && (
                      <span className="px-2 py-1 bg-discord-dark-3 text-discord-muted text-xs font-medium rounded">
                        +{mentor.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center mb-4 text-xs text-discord-muted">
                  <span>{mentor.experience_years} years exp.</span>
                  <span>{mentor.current_mentees} mentees</span>
                </div>

                {user?.role === 'student' && (
                  <Link
                    href={`/mentorship/request/${mentor.user_id}`}
                    className="block w-full text-center discord-button py-2 text-sm"
                  >
                    Request Mentorship
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
