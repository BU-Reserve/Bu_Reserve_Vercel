export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSessionSecret(): Uint8Array {
  return new TextEncoder().encode(getRequiredEnv("SESSION_SECRET"));
}
