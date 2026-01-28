'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function NewQuestionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await api.post('/questions', {
        title,
        content,
        tags: tagArray,
      });
      router.push('/questions');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Ask a Question</h1>

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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="discord-input"
                placeholder="What's your question?"
                required
                minLength={10}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-discord-secondary mb-2">
                Details
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="discord-input min-h-[200px] resize-none"
                placeholder="Provide more details about your question..."
                required
                minLength={20}
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-discord-secondary mb-2">
                Tags (comma-separated)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="discord-input"
                placeholder="e.g., javascript, react, programming"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="discord-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post Question'}
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
