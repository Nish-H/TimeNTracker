import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaTasks, 
  FaClock, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt,
  FaUser,
  FaUsers
} from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FaTachometerAlt },
    { name: 'Tasks', href: '/tasks', icon: FaTasks },
    { name: 'Time Log', href: '/time-log', icon: FaClock },
    { name: 'Reports', href: '/reports', icon: FaChartLine },
    { name: 'Settings', href: '/settings', icon: FaCog },
  ];

  const adminNavigation = [
    { name: 'User Management', href: '/user-management', icon: FaUsers },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-700">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-glass backdrop-blur-lg shadow-glow border-r border-secondary-300">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-secondary-300 bg-gradient-primary">
            <h1 className="text-xl font-bold text-white text-shadow floating">⚡ Nishen's Task Tracker</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isActive(item.href)
                      ? 'bg-gradient-primary text-white shadow-glow'
                      : 'text-secondary-200 hover:bg-glass hover:text-white hover:shadow-glow'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 transition-all duration-300 ${
                      isActive(item.href) ? 'text-white' : 'text-accent-400 group-hover:text-accent-300'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Admin Navigation */}
            {user?.role === 'ADMIN' && (
              <>
                <div className="border-t border-secondary-300 my-4"></div>
                <div className="px-4 py-2 text-xs font-semibold text-electric-400 uppercase tracking-wider">
                  ⚡ Administration
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        isActive(item.href)
                          ? 'bg-gradient-electric text-white shadow-electric'
                          : 'text-secondary-200 hover:bg-glass hover:text-white hover:shadow-glow'
                      }`}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 transition-all duration-300 ${
                          isActive(item.href) ? 'text-white' : 'text-electric-400 group-hover:text-electric-300'
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Profile */}
          <div className="border-t border-secondary-300 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow neon-glow">
                  <FaUser className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-accent-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-sm text-secondary-200 hover:bg-glass hover:text-white rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <FaSignOutAlt className="mr-3 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-3xl blur-xl"></div>
              <div className="relative">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;