'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      href: '/questions',
      icon: '❓',
      title: 'Q&A Forum',
      description: 'Ask questions and get answers from your peers and mentors',
      color: 'bg-blurple'
    },
    {
      href: '/mentorship',
      icon: '👥',
      title: 'Find Mentors',
      description: 'Connect with experienced mentors in your field',
      color: 'bg-discord-green'
    },
    {
      href: '/events',
      icon: '📅',
      title: 'Campus Events',
      description: 'Discover and register for upcoming campus activities',
      color: 'bg-discord-yellow'
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-discord-dark-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className={`mb-12 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
              Welcome to Campus Connect
            </h1>
            <p className="text-xl text-discord-secondary mb-2">
              Connect, collaborate, and grow with your campus community
            </p>
            {user && (
              <p className="text-lg text-discord-secondary">
                Hello, {user.firstName}! 👋
              </p>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {features.map((feature, index) => (
              <Link
                key={feature.href}
                href={feature.href}
                className={`discord-card animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h2>
                <p className="text-discord-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Users', value: '10K+' },
              { label: 'Questions', value: '5K+' },
              { label: 'Mentors', value: '500+' },
              { label: 'Events', value: '200+' },
            ].map((stat, i) => (
              <div
                key={i}
                className="discord-card text-center animate-fade-in"
                style={{ animationDelay: `${(i + 3) * 0.1}s` }}
              >
                <div className="text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-discord-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
