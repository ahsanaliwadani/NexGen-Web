import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  VolunteerApplication,
  Volunteer,
  Program,
  EventItem,
  NewsItem,
  TeamMember,
  GalleryItem,
  ContactMessage,
  WebsiteSettings,
  DashboardStats,
  ActivityLog
} from '../types.ts';

export type ActivePage =
  | 'home'
  | 'about'
  | 'programs'
  | 'events'
  | 'news'
  | 'gallery'
  | 'team'
  | 'volunteer'
  | 'track'
  | 'contact'
  | 'admin-login'
  | 'admin';

export type AdminTab =
  | 'dashboard'
  | 'analytics'
  | 'applications'
  | 'volunteers'
  | 'programs'
  | 'events'
  | 'news'
  | 'team'
  | 'gallery'
  | 'contacts'
  | 'settings'
  | 'users'
  | 'activity'
  | 'database';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Navigation
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  selectedProgramSlug: string | null;
  setSelectedProgramSlug: (slug: string | null) => void;

  // Auth
  currentUser: User | null;
  authToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoadingAuth: boolean;

  // Global Toast
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Public & General Data
  settings: WebsiteSettings | null;
  programs: Program[];
  events: EventItem[];
  news: NewsItem[];
  team: TeamMember[];
  gallery: GalleryItem[];
  refreshData: () => Promise<void>;

  // Real-time State
  isSyncing: boolean;
  lastSyncTime: Date;
  pendingApplicationsCount: number;
  unreadContactsCount: number;
  triggerRealtimeSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedProgramSlug, setSelectedProgramSlug] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('ng_token'));
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Real-time Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState<number>(0);
  const [unreadContactsCount, setUnreadContactsCount] = useState<number>(0);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerRealtimeSync = async () => {
    setIsSyncing(true);
    try {
      await refreshData();
      if (currentUser) {
        const token = localStorage.getItem('ng_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/analytics', { headers, credentials: 'include' });
        if (res.ok) {
          const stats = await res.json();
          if (typeof stats.pendingApplications === 'number') {
            setPendingApplicationsCount(stats.pendingApplications);
          }
          if (typeof stats.unreadInquiries === 'number') {
            setUnreadContactsCount(stats.unreadInquiries);
          }
        }
      }
      setLastSyncTime(new Date());
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };

  // Background Real-Time Poller (every 12 seconds when admin is active)
  useEffect(() => {
    if (!currentUser) return;
    triggerRealtimeSync();

    const interval = setInterval(() => {
      triggerRealtimeSync();
    }, 12000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch Public Data
  const refreshData = async () => {
    try {
      const [settingsRes, programsRes, eventsRes, newsRes, teamRes, galleryRes] = await Promise.all([
        fetch('/api/settings').then(r => r.json()).catch(() => null),
        fetch('/api/programs').then(r => r.json()).catch(() => []),
        fetch('/api/events').then(r => r.json()).catch(() => []),
        fetch('/api/news').then(r => r.json()).catch(() => []),
        fetch('/api/team').then(r => r.json()).catch(() => []),
        fetch('/api/gallery').then(r => r.json()).catch(() => [])
      ]);

      if (settingsRes) setSettings(settingsRes);
      if (Array.isArray(programsRes)) setPrograms(programsRes);
      if (Array.isArray(eventsRes)) setEvents(eventsRes);
      if (Array.isArray(newsRes)) setNews(newsRes);
      if (Array.isArray(teamRes)) setTeam(teamRes);
      if (Array.isArray(galleryRes)) setGallery(galleryRes);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  // Check Auth Session
  const checkSession = async () => {
    setIsLoadingAuth(true);
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('ng_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/session', { headers, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkSession();
    refreshData();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Login failed', 'error');
        return false;
      }
      setAuthToken(data.token);
      localStorage.setItem('ng_token', data.token);
      setCurrentUser(data.user);
      addToast(`Welcome back, ${data.user.name}!`, 'success');
      setActivePage('admin');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Connection error', 'error');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    localStorage.removeItem('ng_token');
    setAuthToken(null);
    setCurrentUser(null);
    addToast('You have been logged out.', 'info');
    setActivePage('home');
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        adminTab,
        setAdminTab,
        selectedProgramSlug,
        setSelectedProgramSlug,
        currentUser,
        authToken,
        login,
        logout,
        isLoadingAuth,
        toasts,
        addToast,
        removeToast,
        settings,
        programs,
        events,
        news,
        team,
        gallery,
        refreshData,
        isSyncing,
        lastSyncTime,
        pendingApplicationsCount,
        unreadContactsCount,
        triggerRealtimeSync
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
