<script>
  import { eventTypeLabel, formatDate } from '../lib/format.js';

  let { events = [] } = $props();
</script>

<section class="panel">
  <header>
    <h2>Entradas / salidas</h2>
    <p>Geocercas en tiempo real</p>
  </header>

  <ul>
    {#each events as event (event.id)}
      <li data-type={event.type}>
        <div class="top">
          <strong>{eventTypeLabel(event.type)}</strong>
          <span>{formatDate(event.createdAt)}</span>
        </div>
        <p>
          <b>{event.device?.name || 'Dispositivo'}</b>
          {event.type === 'enter' ? 'entró a' : 'salió de'}
          <b>{event.geofence?.name || 'geocerca'}</b>
        </p>
      </li>
    {:else}
      <li class="empty">Aún no hay cruces de geocerca</li>
    {/each}
  </ul>
</section>

<style>
  .panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  header h2 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
  }

  header p {
    margin: 0 0 0.85rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: auto;
    display: grid;
    gap: 0.55rem;
    max-height: 360px;
  }

  li {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.7rem 0.75rem;
    background: var(--bg);
  }

  li[data-type='enter'] {
    border-color: rgba(74, 222, 128, 0.35);
  }

  li[data-type='exit'] {
    border-color: rgba(248, 113, 113, 0.35);
  }

  .top {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.82rem;
  }

  .top span {
    color: var(--text-muted);
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    border-style: dashed;
  }
</style>
