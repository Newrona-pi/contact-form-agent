import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  accountEmail: string | null;
  setAuthenticated: (email: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accountEmail: null,

      setAuthenticated: (email: string) => {
        set({
          isAuthenticated: true,
          accountEmail: email,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          accountEmail: null,
        });
      },

      checkAuth: () => {
        return get().isAuthenticated;
      },
    }),
    {
      name: 'contact-agent-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accountEmail: state.accountEmail,
      }),
    }
  )
);
