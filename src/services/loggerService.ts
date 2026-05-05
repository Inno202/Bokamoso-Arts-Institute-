const isProd = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => {
    if (!isProd) console.log(...args);
  },
  error: (...args: any[]) => {
    // In prod, you'd send this to Sentry or similar
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (!isProd) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (!isProd) console.info(...args);
  }
};
