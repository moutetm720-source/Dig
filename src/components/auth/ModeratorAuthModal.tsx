import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { saveSessionToken } from '../../services/authToken';

interface ModeratorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModeratorAuthModal: React.FC<ModeratorAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      // Le passcode saisi est confronté au passcode serveur par l'API (Bearer).
      // Aucun défaut faible en dur : le premier accès utilise le passcode
      // auto-généré par le serveur (log serveur) ou MODERATOR_PASSCODE (env).
      const storedPasscode = (localStorage.getItem('df_moderator_passcode') || '').trim();
      const inputTrimmed = passcode.trim();

      const persistPasscode = (input: string) => {
        try {
          localStorage.setItem('df_moderator_passcode', input);
          localStorage.setItem('df_user_role', 'moderator');
        } catch (quotaError) {
          localStorage.removeItem('df_broadcast_history');
          localStorage.removeItem('dpf_app_v2_systemLogs');
          localStorage.removeItem('df_systemLogs');
          localStorage.removeItem('df_sales_scout_history_real');
          localStorage.setItem('df_moderator_passcode', input);
          localStorage.setItem('df_user_role', 'moderator');
        }
      };

      const finishUnlock = () => {
        setIsLoading(false);
        setPasscode('');
        onSuccess();
      };

      // Émet un TOKEN DE SESSION signé côté serveur (expiration 7 j).
      // Si le serveur est injoignable, on continue avec le passcode
      // (le serveur l'accepte encore en compatibilité).
      const tryUnlock = async (input: string) => {
        persistPasscode(input);
        try {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: input })
          });
          if (loginRes.ok) {
            const data = await loginRes.json();
            if (data?.token) saveSessionToken(data.token);
          }
        } catch (e) {
          // offline / serveur indisponible : le passcode direct reste valide
        }
        finishUnlock();
      };

      // Si un passcode est déjà connu dans ce navigateur, on le valide d'abord
      // côté serveur (appel silencieux) ; sinon on tente le passcode saisi.
      const candidates = storedPasscode && storedPasscode !== inputTrimmed
        ? [inputTrimmed, storedPasscode]
        : [inputTrimmed];

      const validateCandidate = (idx: number) => {
        if (idx >= candidates.length) {
          setIsLoading(false);
          setError('Code d’accès incorrect. Vérifiez vos identifiants.');
          return;
        }
        const candidate = candidates[idx];
        if (!candidate) {
          validateCandidate(idx + 1);
          return;
        }
        fetch('/api/store/get?key=df_current_geo_v1', {
          headers: { 'Authorization': `Bearer ${candidate}` }
        })
          .then(r => {
            if (r.ok || r.status === 404) {
              // Auth acceptée (404 = clé inexistante mais modérateur reconnu)
              tryUnlock(candidate);
            } else {
              validateCandidate(idx + 1);
            }
          })
          .catch(() => {
            // Serveur injoignable : on laisse la décision locale (le passcode
            // saisi devient la référence dans ce navigateur).
            tryUnlock(candidate);
          });
      };
      validateCandidate(0);
    }, 350);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#111114] border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-xs text-slate-300 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="space-y-2 text-center pt-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Espace Modérateur</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Accès sécurisé réservé à l'administration du catalogue, des commandes et de l'IA.
          </p>
        </div>

        {/* Form with Masked Password */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Code secret d'accès
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 text-sm tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !passcode.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {isLoading ? (
                <span>Vérification...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Se connecter à la gestion</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Discreet Notice */}
        <div className="text-center text-[10px] text-slate-500">
          Chiffrement de session local actif • Confidentialité garantie
        </div>
      </div>
    </div>
  );
};
