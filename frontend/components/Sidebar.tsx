'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠', requiresAuth: true },
    { href: '/questions', label: 'Questions', icon: '❓', requiresAuth: false },
    { href: '/mentorship', label: 'Mentorship', icon: '👥', requiresAuth: false },
    { href: '/events', label: 'Events', icon: '📅', requiresAuth: false },
  ];

  if (isAuthenticated) {
    navItems.push({ href: '/dashboard', label: 'Dashboard', icon: '📊', requiresAuth: true });
  }

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleNavClick = (e: React.MouseEvent, href: string, requiresAuth: boolean) => {
    if (!isAuthenticated && requiresAuth) {
      e.preventDefault();
      router.push('/auth/login');
    }
  };

  return (
    <div className="w-60 bg-discord-dark-2 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo/Header */}
      <div className="h-12 bg-discord-dark-1 flex items-center px-4 border-b border-discord-dark-3 shadow-lg">
        {isAuthenticated ? (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blurple flex items-center justify-center text-white font-bold text-sm">
              CC
            </div>
            <span className="text-white font-semibold text-lg">Campus Connect</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blurple flex items-center justify-center text-white font-bold text-sm">
              CC
            </div>
            <span className="text-white font-semibold text-lg">Campus Connect</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto discord-scrollbar py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          // Don't show Home if not authenticated
          if (item.href === '/' && !isAuthenticated) {
            return null;
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href, item.requiresAuth || false)}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section or Login */}
      {isAuthenticated && user ? (
        <div className="bg-discord-dark-1 border-t border-discord-dark-3">
          <div className="px-2 py-2">
            <div className="flex items-center gap-3 px-2 py-1 rounded hover:bg-discord-dark-3 transition-colors mb-2">
              <div className="discord-avatar">
                {user.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-discord-muted text-xs truncate">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sidebar-item text-discord-red hover:bg-discord-dark-3"
            >
              <span className="text-xl mr-3">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-discord-dark-1 border-t border-discord-dark-3 px-2 py-2">
          <Link
            href="/auth/login"
            className="sidebar-item"
          >
            <span className="text-xl mr-3">🔐</span>
            <span className="font-medium">Login</span>
          </Link>
        </div>
      )}
    </div>
  );
}
