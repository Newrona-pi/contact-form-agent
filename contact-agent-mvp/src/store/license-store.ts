import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LicenseState {
  isLicenseValid: boolean;
  licenseKey: string | null;
  setLicenseValid: (key: string) => void;
  clearLicense: () => void;
  checkLicense: () => boolean;
  verifyLicense: (key: string) => Promise<boolean>;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      isLicenseValid: false,
      licenseKey: null,
      
      setLicenseValid: (key: string) => {
        set({
          isLicenseValid: true,
          licenseKey: key,
        });
      },
      
      clearLicense: () => {
        set({
          isLicenseValid: false,
          licenseKey: null,
        });
        // ローカルストレージからも削除
        if (typeof window !== 'undefined') {
          localStorage.removeItem('contact-agent-license');
        }
      },
      
      checkLicense: () => {
        // ローカルストレージからライセンスキーを確認
        if (typeof window !== 'undefined') {
          const storedKey = localStorage.getItem('contact-agent-license');
          if (storedKey) {
            // 保存されたキーがある場合は有効とみなす（詳細な検証は別途実行）
            if (!get().isLicenseValid) {
              set({
                isLicenseValid: true,
                licenseKey: storedKey,
              });
            }
            return true;
          }
        }
        return get().isLicenseValid;
      },

      verifyLicense: async (key: string) => {
        try {
          const response = await fetch('/api/auth/verify-license', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ licenseKey: key }),
          });

          const result = await response.json();
          
          if (result.valid) {
            set({
              isLicenseValid: true,
              licenseKey: key,
            });
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.error('License verification error:', error);
          return false;
        }
      },
    }),
    {
      name: 'contact-agent-license',
      partialize: (state) => ({
        isLicenseValid: state.isLicenseValid,
        licenseKey: state.licenseKey,
      }),
    }
  )
);
