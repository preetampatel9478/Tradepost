import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LAST_WORKING_API_BASE_URL_KEY = 'tradepost.lastWorkingApiBaseUrl';

function inferDevHostFromExpo(): string | null {
  const anyConstants = Constants as any;

  const candidates: Array<unknown> = [
    anyConstants?.manifest?.debuggerHost,
    anyConstants?.expoGoConfig?.debuggerHost,
    anyConstants?.expoConfig?.hostUri,
    anyConstants?.expoConfig?.extra?.hostUri,
    anyConstants?.hostUri,
    anyConstants?.manifest2?.extra?.expoClient?.hostUri,
    anyConstants?.manifest2?.extra?.hostUri,
    anyConstants?.manifest?.hostUri,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const value = candidate.trim();
    if (!value) continue;

    // Common formats:
    // - "192.168.1.102:19000"
    // - "exp://192.168.1.102:8081"
    try {
      const url = new URL(value.includes('://') ? value : `http://${value}`);
      if (url.hostname) return url.hostname;
    } catch {
      // ignore
    }
  }

  return null;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function getInitialApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return normalizeUrl(fromEnv);

  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  if (!isDevice && Platform.OS === 'android') {
    return `http://10.0.2.2:${port}/api`;
  }

  const devHost = inferDevHostFromExpo();
  if (devHost) return `http://${devHost}:${port}/api`;

  return `http://localhost:${port}/api`;
}

async function getApiBaseUrlCandidates(): Promise<string[]> {
  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  const candidates: Array<string | null | undefined> = [];

  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) candidates.push(normalizeUrl(fromEnv));

  // Prefer the current Expo dev host (when available) over any stored value.
  const devHost = inferDevHostFromExpo();
  if (devHost) candidates.push(`http://${devHost}:${port}/api`);

  const lastWorking = await AsyncStorage.getItem(LAST_WORKING_API_BASE_URL_KEY);
  if (lastWorking && lastWorking.trim()) candidates.push(normalizeUrl(lastWorking));

  if (!isDevice && Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:${port}/api`);
  }

  candidates.push(`http://localhost:${port}/api`);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c) continue;
    const normalized = normalizeUrl(c);
    if (!normalized) continue;
    if (!isAbsoluteHttpUrl(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function hasExplicitApiUrlOverride(): boolean {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  return Boolean(fromEnv && fromEnv.trim());
}
const API_TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000;

class APIClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: getInitialApiBaseUrl(),
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add request interceptor for token
    this.api.interceptors.request.use(
      async (config) => {
        // If your LAN IP changed since the last run, dynamically prefer the
        // latest inferred host / last-known-good host.
        // IMPORTANT: axios will copy instance.defaults.baseURL into config.baseURL,
        // so we must override even when config.baseURL is already present.
        if (!hasExplicitApiUrlOverride()) {
          const candidates = await getApiBaseUrlCandidates();
          const preferred = candidates[0];
          if (preferred) {
            const current = normalizeUrl(String(config.baseURL || ''));
            if (normalizeUrl(preferred) !== current) {
              if (typeof __DEV__ !== 'undefined' && __DEV__) {
                // eslint-disable-next-line no-console
                console.log('[TradePost] API baseURL ->', preferred);
              }
              config.baseURL = preferred;
              this.api.defaults.baseURL = preferred;
            }
          }
        }

        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      async (response) => {
        const usedBaseUrl = response.config.baseURL || this.api.defaults.baseURL;
        if (usedBaseUrl && typeof usedBaseUrl === 'string') {
          await AsyncStorage.setItem(LAST_WORKING_API_BASE_URL_KEY, normalizeUrl(usedBaseUrl));
        }
        return response;
      },
      async (error) => {
        // Network error (no response): try one alternate baseURL automatically.
        const originalConfig = error?.config as any;
        const shouldRetry = Boolean(originalConfig) && !error.response;
        const retryCount = Number(originalConfig?.__tradepostNetworkRetryCount || 0);

        if (shouldRetry && retryCount < 2) {
          originalConfig.__tradepostNetworkRetryCount = retryCount + 1;

          const candidates = await getApiBaseUrlCandidates();
          const current = normalizeUrl(originalConfig.baseURL || this.api.defaults.baseURL || '');

          const next = candidates.find((c) => normalizeUrl(c) !== current);
          if (next) {
            originalConfig.baseURL = next;
            this.api.defaults.baseURL = next;
            return this.api.request(originalConfig);
          }
        }

        if (error.response?.status === 401) {
          // Handle token expiry
          await AsyncStorage.removeItem('authToken');
          // Trigger logout action
        }
        return Promise.reject(error);
      }
    );
  }

  getInstance() {
    return this.api;
  }
}

export const apiClient = new APIClient();
export default apiClient.getInstance();
