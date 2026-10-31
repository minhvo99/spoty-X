import * as Crypto from 'expo-crypto';
import { SpotifyClient } from './core';
import { storage } from './storage';
export const client = new SpotifyClient(storage, {
  random: () => Array.from(Crypto.getRandomBytes(32), x => x.toString(16).padStart(2, '0')).join(''),
  challenge: async value => (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, { encoding: Crypto.CryptoEncoding.BASE64 })).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''),
});
