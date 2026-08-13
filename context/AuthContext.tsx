import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User } from '../types';
import { logUserActivity } from '../lib/auditLogger';

/**
 * Identidade do painel admin — sessão opaca httpOnly validada no servidor.
 *
 * O React NUNCA é a autoridade: `user` é só um CACHE do que o servidor
 * devolveu em GET /api/staff/me (que por sua vez valida o cookie httpOnly
 * contra a RPC `site_staff_session_validar`). Não existe mais localStorage
 * `wtech_user` nem header `x-wtech-user-id` — cada chamada ao servidor manda
 * o cookie sozinha (fetch same-origin já inclui cookies por padrão) e cada
 * rota revalida a sessão antes de fazer qualquer coisa.
 */

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (value: boolean) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Normaliza o DTO seguro do servidor (GET /me, POST /login) para o tipo User do app. */
function mapDtoToUser(dto: any): User {
  const roleObj = dto?.role && typeof dto.role === 'object' ? dto.role : null;
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role ?? 'User',
    avatar_url: dto.avatar_url ?? undefined,
    phone: dto.phone ?? undefined,
    permissions: dto.permissions || roleObj?.permissions || {},
    status: dto.status,
    role_id: dto.role_id ?? undefined,
    theme: dto.theme ?? undefined,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data?.user ? mapDtoToUser(data.user) : null);
    } catch (err) {
      console.error('Refresh User Error:', err);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.user) {
        return { success: false, error: data?.error || 'Credenciais inválidas.' };
      }

      const loggedUser = mapDtoToUser(data.user);

      await logUserActivity({
        action_type: 'ACCESS',
        screen: 'login',
        details: `Usuário efetuou login no sistema`,
      }, { id: loggedUser.id, name: loggedUser.name });

      setUser(loggedUser);
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
    const current = user;
    setUser(null);
    // Revoga a sessão no servidor e apaga o cookie — o redirect abaixo acontece
    // de qualquer forma (nenhum estado sensível fica no browser). Se o servidor
    // não conseguir revogar (503 logout_incomplete), só loga: o cookie deste
    // browser já foi limpo, mas uma cópia roubada pode continuar válida.
    fetch('/api/staff/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
      .then(res => { if (!res.ok) console.warn('Logout no servidor pode não ter revogado a sessão (HTTP', res.status, ')'); })
      .catch(() => {});
    if (current) {
      logUserActivity({
        action_type: 'ACCESS',
        screen: 'logout',
        details: `Usuário efetuou logout do sistema`,
      }, { id: current.id, name: current.name }).catch(err => console.error('Error logging logout:', err));
    }
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showLoginModal, setShowLoginModal, refreshUser }}>
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
