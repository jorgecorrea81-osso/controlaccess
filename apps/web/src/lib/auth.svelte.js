import { authApi } from './api.js';

function createAuthStore() {
  let user = $state(null);
  let token = $state(localStorage.getItem('ca_token'));
  let loading = $state(!!localStorage.getItem('ca_token'));
  let error = $state('');

  async function bootstrap() {
    if (!token) {
      loading = false;
      return;
    }
    try {
      const data = await authApi.me();
      user = data.user;
    } catch {
      logout();
    } finally {
      loading = false;
    }
  }

  async function login(email, password) {
    error = '';
    loading = true;
    try {
      const data = await authApi.login(email, password);
      token = data.token;
      user = data.user;
      localStorage.setItem('ca_token', data.token);
      return data;
    } catch (err) {
      error = err.message;
      throw err;
    } finally {
      loading = false;
    }
  }

  function logout() {
    user = null;
    token = null;
    localStorage.removeItem('ca_token');
  }

  return {
    get user() {
      return user;
    },
    get token() {
      return token;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get isAuthenticated() {
      return !!user;
    },
    bootstrap,
    login,
    logout,
  };
}

export const auth = createAuthStore();
