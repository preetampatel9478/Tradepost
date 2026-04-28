const isDev = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  debug(message: string, data?: any) {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
  }
}

export default new Logger();
