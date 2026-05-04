import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';

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

    try {
      const url = new URL(value.includes('://') ? value : `http://${value}`);
      if (url.hostname) return url.hostname;
    } catch {
      // ignore
    }
  }

  return null;
}

function getSocketBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const port = Number(process.env.EXPO_PUBLIC_API_PORT) || 5000;
  const isDevice = Boolean((Constants as any)?.isDevice);

  if (!isDevice && Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  const devHost = inferDevHostFromExpo();
  if (devHost) return `http://${devHost}:${port}`;

  return `http://localhost:${port}`;
}

let socketSingleton: Socket | null = null;

export async function getAuthedSocket(): Promise<Socket> {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;

  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('No auth token available for socket connection');
  }
  const baseUrl = getSocketBaseUrl();

  socketSingleton = io(baseUrl, {
    transports: ['websocket'],
    auth: { token: token || '' },
    autoConnect: true,
    reconnection: true,
  });

  return socketSingleton;
}

export function disconnectSocket() {
  if (!socketSingleton) return;
  socketSingleton.disconnect();
  socketSingleton = null;
}
