'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Answer {
  id: number;
  content: string;
  is_accepted: boolean;
  votes: number;
  created_at: string;
  user_id: number;
  first_name: string;
  last_name: string;
}

interface Question {
  id: number;
  title: string;
  content: string;
  views: number;
  votes: number;
  created_at: string;
  user_id: number;
  first_name: string;
  last_name: string;
  tags: Array<{ id: number; name: string }>;
  answers: Answer[];
}

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [params.id]);

  const fetchQuestion = async () => {
    try {
      const response = await api.get(`/questions/${params.id}`);
      setQuestion(response.data);
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (votableType: 'question' | 'answer', votableId: number, voteType: 'upvote' | 'downvote') => {
    if (!isAuthenticated) {
      alert('Please login to vote');
      return;
    }

    try {
      await api.post(`/questions/${votableId}/vote`, { votableType, voteType });
      fetchQuestion();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please login to answer');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/questions/${params.id}/answers`, { content: answerContent });
      setAnswerContent('');
      fetchQuestion();
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: number) => {
    try {
      await api.patch(`/questions/answers/${answerId}/accept`);
      fetchQuestion();
    } catch (error) {
      console.error('Error accepting answer:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-dark-1 flex items-center justify-center">
        <div className="text-discord-muted">Loading question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-discord-dark-1 flex items-center justify-center">
        <div className="text-white">Question not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-dark-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Question */}
        <div className="discord-card mb-4">
          <div className="flex gap-4">
            {/* Vote Section */}
            <div className="flex flex-col items-center gap-2 min-w-[60px]">
              <button
                onClick={() => handleVote('question', question.id, 'upvote')}
                className="text-2xl hover:text-blurple transition-colors"
              >
                ▲
              </button>
              <div className="text-lg font-semibold text-white">{question.votes}</div>
              <button
                onClick={() => handleVote('question', question.id, 'downvote')}
                className="text-2xl hover:text-discord-red transition-colors"
              >
                ▼
              </button>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-3">{question.title}</h1>
              
              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
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

              {/* Question Content */}
              <div className="text-discord-secondary mb-4 whitespace-pre-wrap leading-relaxed">
                {question.content}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-discord-muted">
                <div className="flex items-center gap-2">
                  <div className="discord-avatar w-6 h-6 text-xs">
                    {question.first_name[0]}
                  </div>
                  <span>{question.first_name} {question.last_name}</span>
                </div>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                <span>•</span>
                <span>{question.views} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-3">
            {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-3">
            {question.answers.map((answer) => (
              <div
                key={answer.id}
                className={`discord-card ${answer.is_accepted ? 'border-l-4 border-discord-green' : ''}`}
              >
                <div className="flex gap-4">
                  {/* Vote Section */}
                  <div className="flex flex-col items-center gap-2 min-w-[60px]">
                    <button
                      onClick={() => handleVote('answer', answer.id, 'upvote')}
                      className="text-xl hover:text-blurple transition-colors"
                    >
                      ▲
                    </button>
                    <div className="text-base font-semibold text-white">{answer.votes}</div>
                    <button
                      onClick={() => handleVote('answer', answer.id, 'downvote')}
                      className="text-xl hover:text-discord-red transition-colors"
                    >
                      ▼
                    </button>
                    {answer.is_accepted && (
                      <div className="text-discord-green text-xl mt-1" title="Accepted answer">✓</div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-discord-secondary mb-3 whitespace-pre-wrap leading-relaxed">
                      {answer.content}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-discord-muted">
                        <div className="discord-avatar w-6 h-6 text-xs">
                          {answer.first_name[0]}
                        </div>
                        <span>{answer.first_name} {answer.last_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                      </div>
                      {user?.id === question.user_id && !answer.is_accepted && (
                        <button
                          onClick={() => handleAcceptAnswer(answer.id)}
                          className="discord-button-secondary text-xs px-3 py-1"
                        >
                          Accept Answer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer Form */}
        {isAuthenticated ? (
          <div className="discord-card">
            <h2 className="text-lg font-semibold text-white mb-4">Your Answer</h2>
            <form onSubmit={handleSubmitAnswer}>
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                className="discord-input mb-4 min-h-[120px] resize-none"
                placeholder="Write your answer here..."
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="discord-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Post Answer'}
              </button>
            </form>
          </div>
        ) : (
          <div className="discord-card text-center py-8">
            <p className="text-discord-secondary mb-4">Login to post an answer</p>
            <Link
              href="/auth/login"
              className="discord-button inline-block"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
