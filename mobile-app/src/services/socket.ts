import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';

const LAST_WORKING_SOCKET_BASE_URL_KEY = 'tradepost.lastWorkingSocketBaseUrl';

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

function getInitialSocketBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (fromEnv && fromEnv.trim()) return normalizeUrl(fromEnv);

  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  if (!isDevice && Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  const devHost = inferDevHostFromExpo();
  if (devHost) return `http://${devHost}:${port}`;

  return `http://localhost:${port}`;
}

async function getSocketBaseUrlCandidates(): Promise<string[]> {
  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  const candidates: Array<string | null | undefined> = [];

  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (fromEnv && fromEnv.trim()) candidates.push(normalizeUrl(fromEnv));

  // Prefer the current Expo dev host (when available) over any stored value.
  const devHost = inferDevHostFromExpo();
  if (devHost) candidates.push(`http://${devHost}:${port}`);

  const lastWorking = await AsyncStorage.getItem(LAST_WORKING_SOCKET_BASE_URL_KEY);
  if (lastWorking && lastWorking.trim()) candidates.push(normalizeUrl(lastWorking));

  if (!isDevice && Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:${port}`);
  }

  candidates.push(`http://localhost:${port}`);

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

let socketSingleton: Socket | null = null;

export async function getAuthedSocket(): Promise<Socket> {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;

  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No auth token available for socket connection');
  }
  let baseUrl = getInitialSocketBaseUrl();

  // Prefer last-known-good / inferred host when available.
  const candidates = await getSocketBaseUrlCandidates();
  if (candidates.length) baseUrl = candidates[0];

  socketSingleton = io(baseUrl, {
    transports: ['websocket'],
    auth: { token: token || '' },
    autoConnect: true,
    reconnection: true,
  });

  await AsyncStorage.setItem(LAST_WORKING_SOCKET_BASE_URL_KEY, normalizeUrl(baseUrl));

  return socketSingleton;
}

export function disconnectSocket() {
  if (!socketSingleton) return;
  socketSingleton.disconnect();
  socketSingleton = null;
}
