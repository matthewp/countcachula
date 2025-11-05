import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: any;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      } else {
        // Token is invalid
        localStorage.removeItem('auth_token');
        setToken(null);
        return false;
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return false;
    }
  };

  const login = async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    await fetchUserInfo(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check URL for token (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');

      if (urlToken) {
        // Remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        await login(urlToken);
      } else {
        // Check localStorage for existing token
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          const isValid = await fetchUserInfo(storedToken);
          if (isValid) {
            setToken(storedToken);
          }
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}