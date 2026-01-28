'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function MentorProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    skills: [] as string[],
    skillInput: '',
    experienceYears: '',
    maxMentees: '5',
    bio: '',
    availabilityStatus: 'available',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'mentor') {
      router.push('/dashboard');
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/mentorship/mentors/${user?.id}`);
      setFormData({
        skills: response.data.skills || [],
        skillInput: '',
        experienceYears: response.data.experience_years?.toString() || '',
        maxMentees: response.data.max_mentees?.toString() || '5',
        bio: response.data.bio || '',
        availabilityStatus: response.data.availability_status || 'available',
      });
    } catch (error) {
      // Profile doesn't exist yet, that's okay
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (formData.skillInput.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: '',
      });
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.post('/mentorship/mentors', {
        skills: formData.skills,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        maxMentees: parseInt(formData.maxMentees),
        bio: formData.bio,
        availabilityStatus: formData.availabilityStatus,
      });
      router.push('/mentorship');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-dark-1 flex items-center justify-center">
        <div className="text-discord-muted">Loading...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="mentor">
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Mentor Profile</h1>

          {error && (
            <div className="discord-card mb-4 border-l-4 border-discord-red">
              <p className="text-discord-secondary">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="discord-card space-y-4">
            <div>
              <label htmlFor="bio" className="block text-sm font-semibold text-discord-secondary mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="discord-input min-h-[120px] resize-none"
                placeholder="Tell students about your background and expertise..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-discord-secondary mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formData.skillInput}
                  onChange={(e) => setFormData({ ...formData, skillInput: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="discord-input flex-1"
                  placeholder="Add a skill and press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="discord-button-secondary px-4"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-discord-dark-3 text-white text-sm font-medium rounded flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="text-discord-muted hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="experienceYears" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Years of Experience
                </label>
                <input
                  id="experienceYears"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="discord-input"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="maxMentees" className="block text-sm font-semibold text-discord-secondary mb-2">
                  Max Mentees
                </label>
                <input
                  id="maxMentees"
                  type="number"
                  value={formData.maxMentees}
                  onChange={(e) => setFormData({ ...formData, maxMentees: e.target.value })}
                  className="discord-input"
                  min="1"
                  max="20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="availabilityStatus" className="block text-sm font-semibold text-discord-secondary mb-2">
                Availability Status
              </label>
              <select
                id="availabilityStatus"
                value={formData.availabilityStatus}
                onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                className="discord-input"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || formData.skills.length === 0}
                className="discord-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Profile'}
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
