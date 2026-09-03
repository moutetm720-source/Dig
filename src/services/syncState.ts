const API_URL = '/api/store';

import { getAuthBearer } from './authToken';

export let serverState: Record<string, any> = {};

// Whitelist of shared business keys that sync across users and server DB
// SÉCURITÉ : secrets (clé Stripe secrète, whsec) et PII (commandes, clients, factures,
// leads, paniers abandonnés, logs) ne sont PLUS synchronisés — ils restent en local
// et/ou sont gérés par les écrans modérateur (écritures authentifiées).
export const SYNC_WHITELIST = new Set([
  'dpf_app_v2_products',
  'dpf_app_v2_bundles',
  'dpf_app_v2_contentItems',
  'dpf_app_v2_adCampaigns',
  'dpf_app_v2_emailSequences',
  'dpf_app_v2_opportunities',
  'dpf_app_v2_approvals',
  'dpf_app_v2_recommendations',
  'dpf_app_v2_agentConfig',
  'dpf_app_v2_integrations',
  'dpf_app_v2_promptTemplates',
  'dpf_app_v2_opportunityWeights',
  'dpf_app_v2_onboardingState',
  'dpf_app_v2_systemJobs',
  'df_github_repositories',
  'df_stripe_mode',
  'df_stripe_pk',
  'df_stripe_currency',
  'df_crypto_settings_v1',
  'df_crypto_btc',
  'df_crypto_eth',
  'df_crypto_sol',
  'df_crypto_usdt',
  'df_moderator_passcode',
  'df_affiliate_promo_kits_v1',
  'df_affiliate_promo_transmissions_v1',
  'df_sales_social_proof_real',
  'df_sales_purged',
  'df_sales_reset_real_only',
  'df_global_social_engine_v1',
  'df_traffic_engine_v2_real',
  'df_company_billing_v1',
  'df_profitability_params_v1',
  'df_current_geo_v1',
  'df_token_manager_config',
  'df_token_manager_records',
  'df_strategic_advisor_state_v1',
  'df_storefront_state_v1',
  'df_ad_budget_config_v1',
  'df_ad_budget_campaigns_v1',
  'df_auto_pilot_enabled',
  'df_auto_loop_speed',
  'df_site_engineer_code_v1',
  'df_cross_ai_insights_v1'
]);

export function shouldSyncKey(key: string): boolean {
  if (!key) return false;
  if (SYNC_WHITELIST.has(key)) return true;
  if (key.startsWith('dpf_') || key.startsWith('df_') || key.startsWith('github_') || key.startsWith('token_') || key.startsWith('TOKEN_')) {
    return true;
  }
  return false;
}

let storageAvailable = true;
let originalGetItem: (key: string) => string | null = () => null;
let originalSetItem: (key: string, value: string) => void = () => {};
let originalRemoveItem: (key: string) => void = () => {};

try {
  originalGetItem = localStorage.getItem.bind(localStorage);
  originalSetItem = localStorage.setItem.bind(localStorage);
  originalRemoveItem = localStorage.removeItem.bind(localStorage);
} catch (e) {
  storageAvailable = false;
}

const syncDebounceTimers = new Map<string, any>();
const syncReadyCallbacks: Array<() => void> = [];

export function onSyncReady(cb: () => void) {
  syncReadyCallbacks.push(cb);
}

// String cache to prevent repetitive JSON.stringify calls on large objects
const stringCache = new Map<string, { ref: any, str: string }>();

function getCachedString(key: string, val: any): string {
  if (typeof val === 'string') return val;
  const entry = stringCache.get(key);
  if (entry && entry.ref === val) {
    return entry.str;
  }
  const str = JSON.stringify(val);
  stringCache.set(key, { ref: val, str });
  return str;
}

export async function fetchInitialState(): Promise<Record<string, any>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(API_URL, { 
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const keys: { key: string, value: any }[] = await res.json();
      for (const item of keys) {
        if (item.value !== null && item.value !== undefined && item.value !== '') {
          serverState[item.key] = item.value;
        }
      }
    }
    
    // Globally patch localStorage to sync with serverState safely
    try {
      // 1. Sync any existing local values to serverState and database if server was empty
      if (storageAvailable) {
        for (const key of SYNC_WHITELIST) {
          const localVal = originalGetItem(key);
          if (localVal && localVal.trim() !== '' && localVal !== 'null' && localVal !== 'undefined') {
            if (!serverState[key] || serverState[key] === '') {
              try {
                serverState[key] = JSON.parse(localVal);
              } catch {
                serverState[key] = localVal;
              }
              // Persist back to DB so server stays in sync
              debouncedSaveToDB(key, serverState[key]);
            }
          } else if (serverState[key] !== undefined && serverState[key] !== null && serverState[key] !== '') {
            try {
              const strVal = typeof serverState[key] === 'string' ? serverState[key] : JSON.stringify(serverState[key]);
              originalSetItem(key, strVal);
            } catch (e) {}
          }
        }
      }

      localStorage.getItem = function(key: string) {
        if (shouldSyncKey(key)) {
          const sVal = serverState[key];
          if (sVal !== undefined && sVal !== null && sVal !== '') {
            return getCachedString(key, sVal);
          }
          if (storageAvailable) {
            const lVal = originalGetItem(key);
            if (lVal !== null && lVal !== undefined && lVal !== '' && lVal !== 'null') {
              try {
                serverState[key] = JSON.parse(lVal);
              } catch {
                serverState[key] = lVal;
              }
              return lVal;
            }
          }
          return sVal !== undefined && sVal !== null ? getCachedString(key, sVal) : (storageAvailable ? originalGetItem(key) : null);
        }
        return storageAvailable ? originalGetItem(key) : null;
      };
      
      localStorage.setItem = function(key: string, value: string) {
        if (storageAvailable) {
          try {
            originalSetItem(key, value);
          } catch (e) {
            // Local quota exceeded, in-memory state handles it gracefully
          }
        }
        if (shouldSyncKey(key)) {
          try {
            let parsed: any = value;
            try { parsed = JSON.parse(value); } catch (e) {}
            serverState[key] = parsed;
            stringCache.set(key, { ref: parsed, str: value });
            debouncedSaveToDB(key, parsed);
          } catch(e) {}
        }
      };

      localStorage.removeItem = function(key: string) {
        if (storageAvailable) {
          try {
            originalRemoveItem(key);
          } catch (e) {}
        }
        if (shouldSyncKey(key)) {
          delete serverState[key];
          stringCache.delete(key);
          debouncedSaveToDB(key, null);
        }
      };
    } catch (e) {
      console.warn('Failed to patch localStorage. Proceeding with standard storage.', e);
    }

    // Trigger all sync-ready listeners
    syncReadyCallbacks.forEach(cb => {
      try { cb(); } catch (e) {}
    });

    return serverState;
  } catch (e) {
    // Network or server starting up - gracefully fallback to local storage / memory
    syncReadyCallbacks.forEach(cb => {
      try { cb(); } catch (err) {}
    });
    return {};
  }
}

function debouncedSaveToDB(key: string, value: any) {
  if (syncDebounceTimers.has(key)) {
    clearTimeout(syncDebounceTimers.get(key));
  }
  const timer = setTimeout(() => {
    syncDebounceTimers.delete(key);
    saveStateToDB(key, value);
  }, 300);
  syncDebounceTimers.set(key, timer);
}

export async function saveStateToDB(key: string, value: any) {
  if (!shouldSyncKey(key)) return;
  try {
    // SÉCURITÉ : token de session (login validé) d'abord, passcode local sinon.
    // Aucun défaut faible en dur — si aucune credential n'existe, on n'écrit pas.
    const bearer = getAuthBearer();
    if (!bearer) return;

    const headers: HeadersInit = { 
      'Content-Type': 'application/json',
      'Authorization': bearer
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({ key, value })
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      return;
    }
  } catch (e) {
    // Graceful silent fallback to client storage when offline or network drops
  }
}
