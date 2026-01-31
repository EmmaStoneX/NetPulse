import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token: string | null;
  expiresAt: number | null;
}

interface AuthContextValue {
  auth: AuthState;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

// Constants
const AUTH_STORAGE_KEY = 'netpulse_auth';
const AUTH_API_BASE = '/api/auth';

// Initial state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  expiresAt: null,
};

// Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Storage helpers
interface StoredAuthData {
  token: string;
  user: GitHubUser;
  expiresAt: number;
}

function getStoredAuth(): StoredAuthData | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredAuthData;
  } catch {
    return null;
  }
}

function setStoredAuth(data: StoredAuthData): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}


// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<AuthState>(initialAuthState);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const restoreAuth = async () => {
      const stored = getStoredAuth();
      
      if (stored && !isTokenExpired(stored.expiresAt)) {
        // Verify token with server
        try {
          const response = await fetch(`${AUTH_API_BASE}/user`, {
            headers: {
              'Authorization': `Bearer ${stored.token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            // API returns { user: {...}, expires_at: ... }
            const userData = data.user || data;
            setAuth({
              isAuthenticated: true,
              user: userData,
              token: stored.token,
              expiresAt: stored.expiresAt,
            });
            // Update stored user data
            setStoredAuth({
              token: stored.token,
              user: userData,
              expiresAt: stored.expiresAt,
            });
          } else {
            // Token invalid, clear storage
            clearStoredAuth();
          }
        } catch {
          // Network error, use stored data optimistically
          setAuth({
            isAuthenticated: true,
            user: stored.user,
            token: stored.token,
            expiresAt: stored.expiresAt,
          });
        }
      } else if (stored) {
        // Token expired, clear storage
        clearStoredAuth();
      }
      
      setIsLoading(false);
    };

    restoreAuth();
  }, []);

  // Handle OAuth callback from URL
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      const authMatch = hash.match(/[#&/]auth\?token=([^&]+)/);
      
      if (authMatch) {
        const token = authMatch[1];
        setIsLoading(true);
        
        try {
          const response = await fetch(`${AUTH_API_BASE}/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            // API returns { user: {...}, expires_at: ... }
            const userData = data.user || data;
            const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            
            setStoredAuth({
              token,
              user: userData,
              expiresAt,
            });
            
            setAuth({
              isAuthenticated: true,
              user: userData,
              token,
              expiresAt,
            });
          }
        } catch (error) {
          console.error('Auth callback error:', error);
        }
        
        // Clear the auth token from URL
        window.location.hash = '';
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  // Login - redirect to GitHub OAuth
  const login = useCallback(() => {
    window.location.href = `${AUTH_API_BASE}/github`;
  }, []);

  // Logout - clear auth state and storage
  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth(initialAuthState);
  }, []);

  const value: AuthContextValue = {
    auth,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
