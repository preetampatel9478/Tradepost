import { Platform } from 'react-native';
import api from '../services/api';

export function getValidatedMediaUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url;

  try {
    const apiBase = api.defaults.baseURL || '';
    if (apiBase) {
      const baseApiUrl = new URL(apiBase);
      const parsedMediaUrl = new URL(url);

      // If the backend returned a localhost/127.0.0.1 or an old LAN IP URL but our API is running on a real IP
      // (like 192.168.x.x), we rewrite the media URL to use the current API's hostname.
      const hostname = parsedMediaUrl.hostname;
      const isLocal = 
        ['localhost', '127.0.0.1', '10.0.2.2'].includes(hostname) ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') || 
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
        
      if (isLocal) {
        parsedMediaUrl.hostname = baseApiUrl.hostname;
        parsedMediaUrl.port = baseApiUrl.port; // Usually 5000
        return parsedMediaUrl.toString();
      }
    }
  } catch (e) {
    // URL parsing failed, fallback below
  }

  // Fallback for Android emulator
  if (Platform.OS === 'android' && url.includes('://localhost')) {
    return url.replace('://localhost', '://10.0.2.2');
  }

  return url;
}
