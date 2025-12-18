import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showLoginModal: boolean;
  impersonateUser: (user: User) => void;
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
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
        avatar: userData.avatar,
        permissions: userData.permissions || (roleData?.permissions) || {},
        status: userData.status,
        role_id: userData.role_id, // Ensure ID is preserved
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
    <AuthContext.Provider value={{ user, loading, login, logout, showLoginModal, setShowLoginModal, impersonateUser }}>
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