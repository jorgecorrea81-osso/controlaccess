<script>
  import { onMount } from 'svelte';
  import { auth } from './lib/auth.svelte.js';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';

  onMount(() => {
    auth.bootstrap();
  });
</script>

{#if auth.loading}
  <div class="boot">Cargando Control Accesos…</div>
{:else if auth.isAuthenticated}
  <Dashboard />
{:else}
  <Login />
{/if}

<style>
  .boot {
    min-height: 100vh;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
</style>
