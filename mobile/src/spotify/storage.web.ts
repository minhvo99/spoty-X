import type { Store } from './core';
// OAuth and tokens intentionally last only for this tab's session.
export const storage: Store = {
  get: async key => sessionStorage.getItem('spotyx.' + key),
  set: async (key, value) => { sessionStorage.setItem('spotyx.' + key, value); },
  remove: async key => { sessionStorage.removeItem('spotyx.' + key); },
};
