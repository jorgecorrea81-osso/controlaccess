<script>
  import { devicesApi } from '../lib/api.js';

  let { devices = [], onMoved } = $props();

  let deviceKey = $state('');
  let lat = $state(19.4326);
  let lng = $state(-99.1332);
  let step = $state(0.001);
  let busy = $state(false);
  let message = $state('');

  $effect(() => {
    if (!deviceKey && devices.length) {
      deviceKey = devices[0].deviceKey;
      if (devices[0].lat != null) lat = devices[0].lat;
      if (devices[0].lng != null) lng = devices[0].lng;
    }
  });

  function nudge(dLat, dLng) {
    lat = Number((lat + dLat).toFixed(6));
    lng = Number((lng + dLng).toFixed(6));
  }

  async function send() {
    if (!deviceKey) return;
    busy = true;
    message = '';
    try {
      const result = await devicesApi.pushLocation({
        deviceKey,
        lat,
        lng,
        source: 'simulator',
      });

      onMoved?.(result);
      const crosses = result.events?.length
        ? ` · ${result.events.length} evento(s) geocerca`
        : '';
      message = `OK ${deviceKey}${crosses}`;
    } catch (err) {
      message = err.message;
    } finally {
      busy = false;
    }
  }
</script>

<section class="panel">
  <header>
    <h2>Simulador móvil</h2>
    <p>Envía ubicación por HTTP (igual que Flutter en Vercel)</p>
  </header>

  <label>
    Dispositivo
    <select bind:value={deviceKey}>
      {#each devices as d}
        <option value={d.deviceKey}>{d.name} ({d.deviceKey})</option>
      {/each}
    </select>
  </label>

  <div class="coords">
    <label>
      Lat
      <input type="number" step="0.0001" bind:value={lat} />
    </label>
    <label>
      Lng
      <input type="number" step="0.0001" bind:value={lng} />
    </label>
  </div>

  <label>
    Paso
    <input type="number" step="0.0001" min="0.0001" bind:value={step} />
  </label>

  <div class="pad">
    <button type="button" onclick={() => nudge(step, 0)}>N</button>
    <div class="mid">
      <button type="button" onclick={() => nudge(0, -step)}>O</button>
      <button type="button" onclick={() => nudge(0, step)}>E</button>
    </div>
    <button type="button" onclick={() => nudge(-step, 0)}>S</button>
  </div>

  <button class="send" type="button" disabled={busy || !deviceKey} onclick={send}>
    {busy ? 'Enviando…' : 'Enviar ubicación HTTP'}
  </button>

  {#if message}
    <p class="msg">{message}</p>
  {/if}
</section>

<style>
  .panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    display: grid;
    gap: 0.7rem;
  }

  header h2 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
  }

  header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  label {
    display: grid;
    gap: 0.25rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  input,
  select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.55rem 0.65rem;
    color: var(--text);
  }

  .coords {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .pad {
    display: grid;
    justify-items: center;
    gap: 0.35rem;
  }

  .mid {
    display: flex;
    gap: 1.2rem;
  }

  .pad button {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-soft);
    color: var(--text);
    font-weight: 700;
  }

  .send {
    border: none;
    border-radius: 10px;
    padding: 0.7rem;
    background: var(--accent);
    color: #042f2e;
    font-weight: 700;
  }

  .send:disabled {
    opacity: 0.6;
  }

  .msg {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
