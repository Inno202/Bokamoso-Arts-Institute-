/// <reference types="vite/client" />

/** The git commit this build was made from (set in vite.config.ts). */
declare const __RELEASE__: string;

interface ImportMetaEnv {
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_ALLOW_FRAMING?: string;
}
