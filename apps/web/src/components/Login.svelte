<script>
  import { auth } from '../lib/auth.svelte.js';

  let email = $state('admin@controlaccesos.local');
  let password = $state('admin123');
  let submitting = $state(false);
  let localError = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    localError = '';
    submitting = true;
    try {
      await auth.login(email, password);
    } catch (err) {
      localError = err.message;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login-shell">
  <form class="login-panel" onsubmit={handleSubmit}>
    <p class="brand">Control Accesos</p>
    <h1>Monitoreo en vivo</h1>
    <p class="subtitle">Mapa Leaflet, geocercas y movimiento móvil en tiempo real</p>

    <label>
      Email
      <input type="email" bind:value={email} required autocomplete="username" />
    </label>

    <label>
      Contraseña
      <input type="password" bind:value={password} required autocomplete="current-password" />
    </label>

    {#if localError}
      <p class="error">{localError}</p>
    {/if}

    <button type="submit" disabled={submitting}>
      {submitting ? 'Entrando…' : 'Entrar al mapa'}
    </button>

    <p class="hint">Demo: admin@controlaccesos.local / admin123</p>
  </form>
</div>

<style>
  .login-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }

  .login-panel {
    width: min(420px, 100%);
    background: linear-gradient(160deg, rgba(36, 48, 65, 0.95), rgba(26, 34, 45, 0.98));
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2rem;
    display: grid;
    gap: 0.9rem;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }

  .brand {
    margin: 0;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.8rem;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .subtitle,
  .hint {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.7rem 0.85rem;
    color: var(--text);
  }

  input:focus {
    outline: 2px solid rgba(45, 212, 191, 0.35);
    border-color: var(--accent);
  }

  button {
    margin-top: 0.4rem;
    border: none;
    border-radius: 10px;
    padding: 0.8rem 1rem;
    background: linear-gradient(135deg, var(--accent), var(--accent-dim));
    color: #042f2e;
    font-weight: 700;
  }

  button:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
</style>
