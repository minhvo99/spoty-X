import { client } from './client';
export const redirectUri = () => window.location.origin + window.location.pathname;
export async function finishLogin(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code') && !params.has('error')) return false;
  try { await client.acceptCallback(params, redirectUri()); return true; }
  finally { window.history.replaceState(null, '', window.location.pathname); }
}
export async function login(clientId: string) { window.location.assign(await client.loginUrl(clientId, redirectUri())); }
export const isWeb = true;
