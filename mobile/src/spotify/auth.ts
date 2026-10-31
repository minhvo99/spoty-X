import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { client } from './client';
export const redirectUri = () => AuthSession.makeRedirectUri({ scheme: 'spotyx', path: 'callback' });
export async function finishLogin() { return false; }
export async function login(clientId: string) {
  const redirect = redirectUri();
  const url = await client.loginUrl(clientId, redirect);
  const result = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (result.type === 'success') { await client.acceptCallback(new URL(result.url).searchParams, redirect); return; }
  throw new Error('Đăng nhập đã được đóng. Bạn có thể kết nối Spotify lại.');
}
export const isWeb = false;
