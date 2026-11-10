const isProd = import.meta.env.PROD;

/** Quiet in production (nothing about users or data reaches the console), verbose in dev. */
export const logger = {
  log: (...args: unknown[]) => {
    if (!isProd) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (isProd) {
      // Only the error's code or message: never whole objects, which can carry user data.
      const err = args.find(a => a instanceof Error) as (Error & { code?: string }) | undefined;
      console.error(typeof args[0] === 'string' ? args[0] : 'Error', err?.code || err?.message || '');
    } else {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (!isProd) console.info(...args);
  },
};
