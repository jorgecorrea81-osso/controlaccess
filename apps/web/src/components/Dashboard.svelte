<script>
  import { onMount } from 'svelte';
  import { auth } from '../lib/auth.svelte.js';
  import { devicesApi, geofencesApi } from '../lib/api.js';
  import { roleLabel } from '../lib/format.js';
  import LiveMap from './LiveMap.svelte';
  import EventFeed from './EventFeed.svelte';
  import Simulator from './Simulator.svelte';

  let devices = $state([]);
  let geofences = $state([]);
  let events = $state([]);
  let syncStatus = $state('idle');
  let loadError = $state('');
  let createError = $state('');
  let map;
  let pollTimer;

  function upsertDevice(device) {
    if (!device?.id) return;
    const idx = devices.findIndex((d) => d.id === device.id);
    if (idx === -1) devices = [...devices, device];
    else devices = devices.map((d, i) => (i === idx ? device : d));
  }

  function prependEvents(list = []) {
    if (!list.length) return;
    const ids = new Set(list.map((e) => e.id));
    events = [...list, ...events.filter((e) => !ids.has(e.id))].slice(0, 60);
  }

  async function refreshLive() {
    try {
      syncStatus = 'sync';
      const [devicesRes, eventsRes] = await Promise.all([
        devicesApi.list(),
        geofencesApi.events(40),
      ]);
      devices = devicesRes.devices;
      events = eventsRes.events;
      syncStatus = 'ok';
    } catch (err) {
      syncStatus = 'error';
      console.warn('[poll]', err.message);
    }
  }

  async function loadInitial() {
    const [devicesRes, fencesRes, eventsRes] = await Promise.all([
      devicesApi.list(),
      geofencesApi.list(),
      geofencesApi.events(40),
    ]);
    devices = devicesRes.devices;
    geofences = fencesRes.geofences;
    events = eventsRes.events;
    syncStatus = 'ok';
  }

  async function handleCreateGeofence(draft) {
    createError = '';
    const name = window.prompt('Nombre de la geocerca', `Geocerca ${geofences.length + 1}`);
    if (!name) return;

    try {
      const { geofence } = await geofencesApi.create({
        name,
        ...draft,
        color: draft.type === 'circle' ? '#fbbf24' : '#38bdf8',
      });
      geofences = [...geofences, geofence];
    } catch (err) {
      createError = err.message;
    }
  }

  async function handleDeleteGeofence(fence) {
    createError = '';
    const ok = window.confirm(`¿Eliminar la geocerca "${fence.name}"?`);
    if (!ok) return;
    try {
      await geofencesApi.remove(fence.id);
      geofences = geofences.filter((g) => g.id !== fence.id);
    } catch (err) {
      createError = err.message;
    }
  }

  function handleSimResult(result) {
    if (result?.device) upsertDevice(result.device);
    if (result?.events?.length) prependEvents(result.events);
  }

  onMount(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadInitial();
      } catch (err) {
        if (!cancelled) loadError = err.message;
      }
    })();

    // Polling HTTP cada 2s (reemplaza Socket.IO en Vercel)
    pollTimer = setInterval(() => {
      if (!cancelled) refreshLive();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  });
</script>

<div class="layout">
  <aside>
    <div class="brand-block">
      <p class="brand">Control Accesos</p>
      <h1>Mapa en vivo</h1>
      <p class="user">
        {auth.user?.name}<br />
        <span>{roleLabel(auth.user?.role)}</span>
      </p>
    </div>

    <div class="side-stats">
      <div>
        <span>Devices</span>
        <strong>{devices.length}</strong>
      </div>
      <div>
        <span>Geocercas</span>
        <strong>{geofences.length}</strong>
      </div>
      <div>
        <span>Online</span>
        <strong>{devices.filter((d) => d.online).length}</strong>
      </div>
    </div>

    <section class="device-list">
      <h2>Dispositivos</h2>
      <ul>
        {#each devices as device}
          <li>
            <button
              type="button"
              onclick={() => {
                if (map && device.lat != null) map.setView([device.lat, device.lng], 16);
              }}
            >
              <strong>{device.name}</strong>
              <span class:on={device.online}>{device.online ? 'online' : 'offline'}</span>
              <small>{device.deviceKey}</small>
            </button>
          </li>
        {/each}
      </ul>
    </section>

    <div class="aside-footer">
      <p class="socket" data-status={syncStatus}>HTTP sync: {syncStatus}</p>
      <button class="logout" type="button" onclick={() => auth.logout()}>Cerrar sesión</button>
    </div>
  </aside>

  <main>
    {#if loadError}
      <p class="banner error">{loadError}</p>
    {/if}
    {#if createError}
      <p class="banner error">{createError}</p>
    {/if}

    <div class="workspace">
      <div class="map-pane">
        <LiveMap
          {devices}
          {geofences}
          onCreateGeofence={handleCreateGeofence}
          onMapReady={(m) => (map = m)}
        />
        <p class="hint">
          Dibuja con los botones Polígono / Cuadrado / Círculo. En polígono: varios clics y
          “Cerrar polígono” (o doble clic). El mapa se actualiza por HTTP cada 2s.
        </p>
      </div>

      <div class="side-pane">
        <section class="fence-panel">
          <header>
            <h2>Geocercas</h2>
            <p>Elimina y vuelve a dibujar en el mapa</p>
          </header>
          <ul>
            {#each geofences as fence (fence.id)}
              <li>
                <div>
                  <strong>{fence.name}</strong>
                  <span>{fence.type}{fence.radiusMeters ? ` · ${fence.radiusMeters}m` : ''}</span>
                </div>
                <button type="button" class="danger" onclick={() => handleDeleteGeofence(fence)}>
                  Borrar
                </button>
              </li>
            {:else}
              <li class="empty">No hay geocercas. Dibújalas en el mapa.</li>
            {/each}
          </ul>
        </section>
        <Simulator {devices} onMoved={handleSimResult} />
        <EventFeed {events} />
      </div>
    </div>
  </main>
</div>

<style>
  .layout {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 260px 1fr;
  }

  aside {
    border-right: 1px solid var(--border);
    background: rgba(26, 34, 45, 0.9);
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    min-height: 100vh;
  }

  .brand {
    margin: 0;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0.3rem 0 0.6rem;
    font-size: 1.35rem;
  }

  .user {
    margin: 0;
    font-size: 0.92rem;
  }

  .user span {
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  .side-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }

  .side-stats div {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.55rem;
    text-align: center;
  }

  .side-stats span {
    display: block;
    color: var(--text-muted);
    font-size: 0.7rem;
  }

  .side-stats strong {
    font-size: 1.05rem;
  }

  .device-list {
    min-height: 0;
    flex: 1;
    overflow: auto;
  }

  .device-list h2 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .device-list ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }

  .device-list button {
    width: 100%;
    text-align: left;
    display: grid;
    gap: 0.1rem;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    border-radius: 10px;
    padding: 0.55rem 0.65rem;
  }

  .device-list span {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .device-list span.on {
    color: var(--success);
  }

  .device-list small {
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 0.7rem;
  }

  .aside-footer {
    margin-top: auto;
    display: grid;
    gap: 0.5rem;
  }

  .socket {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .socket[data-status='ok'] {
    color: var(--success);
  }

  .socket[data-status='error'] {
    color: var(--danger);
  }

  .logout {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    border-radius: 10px;
    padding: 0.65rem 0.8rem;
    text-align: left;
  }

  main {
    padding: 1rem;
    display: grid;
    gap: 0.75rem;
    align-content: start;
    min-width: 0;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 0.9rem;
    min-height: calc(100vh - 2rem);
  }

  .map-pane {
    display: grid;
    grid-template-rows: 1fr auto;
    gap: 0.45rem;
    min-height: 520px;
  }

  .hint {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  .side-pane {
    display: grid;
    gap: 0.9rem;
    align-content: start;
  }

  .fence-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
  }

  .fence-panel header h2 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
  }

  .fence-panel header p {
    margin: 0 0 0.75rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .fence-panel ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
    max-height: 180px;
    overflow: auto;
  }

  .fence-panel li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
  }

  .fence-panel li div {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .fence-panel span {
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  .fence-panel .danger {
    border: 1px solid rgba(248, 113, 113, 0.4);
    background: transparent;
    color: var(--danger);
    border-radius: 8px;
    padding: 0.35rem 0.55rem;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .fence-panel .empty {
    color: var(--text-muted);
    justify-content: center;
    border-style: dashed;
  }

  .banner.error {
    margin: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 10px;
    background: rgba(248, 113, 113, 0.12);
    border: 1px solid rgba(248, 113, 113, 0.35);
    color: var(--danger);
  }

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 1fr;
    }

    aside {
      min-height: auto;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }

    .workspace {
      grid-template-columns: 1fr;
      min-height: auto;
    }
  }
</style>
