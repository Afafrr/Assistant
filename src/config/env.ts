import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  TELNYX_API_KEY: requireEnv('TELNYX_API_KEY'),
  TELNYX_PUBLIC_KEY: requireEnv('TELNYX_PUBLIC_KEY'),
  VAPI_SIP_URI: requireEnv('VAPI_SIP_URI'),

  DATABASE_URL_DEV: requireEnv('DATABASE_URL_DEV'),
};
