import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function inferDevHostFromExpo(): string | null {
  const anyConstants = Constants as any;

  const candidates: Array<unknown> = [
    anyConstants?.manifest?.debuggerHost,
    anyConstants?.expoGoConfig?.debuggerHost,
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

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  // Android emulator can't reach the host machine via "localhost".
  if (!isDevice && Platform.OS === 'android') {
    return `http://10.0.2.2:${port}/api`;
  }

  // On a physical device (or iOS simulator), try to infer the dev host from Expo.
  const devHost = inferDevHostFromExpo();
  if (devHost) return `http://${devHost}:${port}/api`;

  return `http://localhost:${port}/api`;
}

const API_URL = getApiBaseUrl();
const API_TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000;

class APIClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add request interceptor for token
    this.api.interceptors.request.use(
      async (config) => {
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
      (response) => response,
      async (error) => {
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
