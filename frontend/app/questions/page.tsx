'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Question {
  id: number;
  title: string;
  content: string;
  views: number;
  votes: number;
  answer_count: number;
  created_at: string;
  user_id: number;
  first_name: string;
  last_name: string;
  tags: Array<{ id: number; name: string }>;
}

export default function QuestionsPage() {
  const { isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchQuestions();
  }, [page, search]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions', {
        params: { page, limit: 10, search },
      });
      setQuestions(response.data.questions);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-dark-1 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Q&A Forum</h1>
          <p className="text-discord-secondary">Ask questions and get answers from the community</p>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search questions..."
            className="discord-input flex-1"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {isAuthenticated && (
            <Link href="/questions/new" className="discord-button whitespace-nowrap">
              Ask Question
            </Link>
          )}
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-discord-muted">Loading questions...</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="discord-card text-center py-12">
            <div className="text-discord-muted">No questions found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="discord-card block"
              >
                <div className="flex gap-4">
                  {/* Vote Section */}
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="text-lg font-semibold text-white">{question.votes}</div>
                    <div className="text-xs text-discord-muted">votes</div>
                    <div className="text-lg font-semibold text-white mt-2">{question.answer_count}</div>
                    <div className="text-xs text-discord-muted">answers</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white mb-2 hover:text-blurple transition-colors">
                      {question.title}
                    </h2>
                    <p className="text-discord-secondary text-sm mb-3 line-clamp-2">
                      {question.content}
                    </p>
                    
                    {/* Tags */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {question.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 bg-discord-dark-3 text-blurple text-xs font-medium rounded"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-discord-muted">
                      <span>{question.first_name} {question.last_name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{question.views} views</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="discord-button-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="flex items-center px-4 text-discord-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="discord-button-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
