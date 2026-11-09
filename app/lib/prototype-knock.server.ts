// PROTOTYPE — throwaway Knock spike for "Does Knock hold up against Cadence?" (#51).
// Lives on the prototype/knock-spike branch only. Never merge.
import tls from "node:tls";
import Knock, { signUserToken } from "@knocklabs/node";

// This machine sits behind TLS inspection; trust the Windows store too.
tls.setDefaultCACertificates([
  ...tls.getCACertificates("default"),
  ...tls.getCACertificates("system"),
]);

// Vite doesn't put .env into process.env for server code; load it ourselves.
try {
  process.loadEnvFile?.(".env");
} catch {
  // no .env — the page will show the missing keys
}

export const env = {
  publicKey: process.env.KNOCK_PUBLIC_API_KEY ?? "",
  secretKey: process.env.KNOCK_SECRET_API_KEY ?? "",
  signingKey: process.env.KNOCK_SIGNING_KEY ?? "",
  feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID ?? "",
};

export const knock = new Knock({ apiKey: env.secretKey });

export function knockUserId(cadenceUserId: number) {
  return String(cadenceUserId);
}

export function signTokenFor(cadenceUserId: number) {
  return signUserToken(knockUserId(cadenceUserId), {
    signingKey: env.signingKey,
    expiresInSeconds: 3600,
  });
}
