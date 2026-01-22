import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from 'next-themes';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showLoginModal: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('wtech_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // Also refresh from DB to ensure data is live
      refreshUser(parsed.id);
    }
  }, []);

  // Effect to sync theme if user has one
  // Effect to sync theme if user has one
  const { setTheme } = useTheme();
  // Note: AuthProvider is inside ThemeProvider so this works



  const refreshUser = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id) return;

    try {
      const { data: userData } = await supabase
        .from('SITE_Users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (userData) {
        // Fetch Role Separately (Manual Join) as in login
        let roleData = null;
        if (userData.role_id) {
            const { data: rData } = await supabase
                .from('SITE_Roles')
                .select('*')
                .eq('id', userData.role_id)
                .single();
            roleData = rData;
        }

        const updatedUser: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: roleData || userData.role || 'User',
          avatar_url: userData.avatar_url,
          phone: userData.phone,
          permissions: userData.permissions || (roleData?.permissions) || {},
          status: userData.status,
          role_id: userData.role_id,
          theme: userData.theme,
        };

        setUser(updatedUser);
        localStorage.setItem('wtech_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Refresh User Error:", err);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1. Fetch User First (Without Join) to check credentials
      const { data: userData, error: userError } = await supabase
        .from('SITE_Users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .limit(1)
        .maybeSingle();

      if (userError) {
          console.error("Login User Error:", userError);
          setLoading(false);
          return { success: false, error: 'Erro de conexão: ' + userError.message };
      }

      if (!userData) {
        setLoading(false);
        return { success: false, error: 'Credenciais inválidas.' };
      }

      // 2. Fetch Role Separately (Manual Join)
      let roleData = null;
      if (userData.role_id) {
          const { data: rData } = await supabase
              .from('SITE_Roles')
              .select('*')
              .eq('id', userData.role_id)
              .single();
          roleData = rData;
      }

      const loggedUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: roleData || userData.role || 'User', // Fallback to DB role column if role_id is null
        avatar_url: userData.avatar_url,
        phone: userData.phone,
        permissions: userData.permissions || (roleData?.permissions) || {},
        status: userData.status,
        role_id: userData.role_id, // Ensure ID is preserved
        theme: userData.theme,
      };

      setUser(loggedUser);
      localStorage.setItem('wtech_user', JSON.stringify(loggedUser));
      setShowLoginModal(false);
      return { success: true };

    } catch (err) {
      console.error(err);
      return { success: false, error: 'Erro ao conectar.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wtech_user');
    window.location.href = '/';
  };

  const impersonateUser = (newUser: User) => {
      setUser(newUser);
      localStorage.setItem('wtech_user', JSON.stringify(newUser));
      // Force reload to ensure all components pick up the new user context if needed, or just let React handle it.
      // React state update is enough.
      console.log("Impersonating:", newUser.name);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showLoginModal, setShowLoginModal, impersonateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};