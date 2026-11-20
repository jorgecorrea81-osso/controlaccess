<script>
  import { onDestroy, onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  let {
    devices = [],
    geofences = [],
    drawEnabled = true,
    onCreateGeofence,
    onMapReady,
    onUserLocation,
  } = $props();

  let mapEl;
  let map;
  let devicesLayer;
  let geofencesLayer;
  let draftLayer;
  let userMarker;
  let userAccuracyCircle;
  let markerById = new Map();
  let fenceById = new Map();
  let geoStatus = $state('buscando');
  let geoWatchId = null;
  let drawMode = $state(null); // 'polygon' | 'rectangle' | 'circle' | null
  let draftPoints = [];
  let drawHint = $state('');

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  function deviceIcon(online) {
    return L.divIcon({
      className: 'device-marker',
      html: `<span class="dot ${online ? 'on' : 'off'}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function clearDraft() {
    draftPoints = [];
    if (draftLayer && map) {
      map.removeLayer(draftLayer);
      draftLayer = null;
    }
  }

  function cancelDraw() {
    clearDraft();
    drawMode = null;
    drawHint = '';
    map?.dragging.enable();
  }

  function startDraw(mode) {
    clearDraft();
    drawMode = mode;
    if (mode === 'polygon') {
      drawHint = 'Clic para vértices. Doble clic o “Cerrar polígono” para terminar (mín. 3).';
    } else if (mode === 'rectangle') {
      drawHint = 'Clic en una esquina y luego en la esquina opuesta.';
    } else if (mode === 'circle') {
      drawHint = 'Clic en el centro y luego en el borde del círculo.';
    }
  }

  function redrawDraft() {
    if (!map) return;
    if (draftLayer) {
      map.removeLayer(draftLayer);
      draftLayer = null;
    }
    if (!draftPoints.length) return;

    if (drawMode === 'polygon') {
      if (draftPoints.length === 1) {
        draftLayer = L.circleMarker(draftPoints[0], {
          radius: 5,
          color: '#38bdf8',
          fillOpacity: 1,
        }).addTo(map);
      } else if (draftPoints.length === 2) {
        draftLayer = L.polyline(draftPoints, { color: '#38bdf8', weight: 2 }).addTo(map);
      } else {
        draftLayer = L.polygon(draftPoints, {
          color: '#38bdf8',
          weight: 2,
          fillOpacity: 0.2,
        }).addTo(map);
      }
      return;
    }

    if (drawMode === 'rectangle' && draftPoints.length === 1) {
      draftLayer = L.circleMarker(draftPoints[0], {
        radius: 5,
        color: '#2dd4bf',
        fillOpacity: 1,
      }).addTo(map);
      return;
    }

    if (drawMode === 'rectangle' && draftPoints.length >= 2) {
      const bounds = L.latLngBounds(draftPoints[0], draftPoints[1]);
      draftLayer = L.rectangle(bounds, {
        color: '#2dd4bf',
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);
      return;
    }

    if (drawMode === 'circle' && draftPoints.length === 1) {
      draftLayer = L.circleMarker(draftPoints[0], {
        radius: 5,
        color: '#fbbf24',
        fillOpacity: 1,
      }).addTo(map);
      return;
    }

    if (drawMode === 'circle' && draftPoints.length >= 2) {
      const radius = map.distance(draftPoints[0], draftPoints[1]);
      draftLayer = L.circle(draftPoints[0], {
        radius: Math.max(1, radius),
        color: '#fbbf24',
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);
    }
  }

  function commitPayload(payload) {
    clearDraft();
    drawMode = null;
    drawHint = '';
    // Diferir el prompt para no bloquear el mapa a mitad del gesto
    setTimeout(() => onCreateGeofence?.(payload), 0);
  }

  function finishPolygon() {
    if (draftPoints.length < 3) {
      drawHint = 'Necesitas al menos 3 puntos para el polígono.';
      return;
    }
    const coordinates = draftPoints.map((p) => [p.lng, p.lat]);
    commitPayload({ type: 'polygon', coordinates });
  }

  function onMapClick(e) {
    if (!drawMode) return;
    const point = e.latlng;

    if (drawMode === 'polygon') {
      draftPoints = [...draftPoints, point];
      redrawDraft();
      drawHint = `Vértices: ${draftPoints.length}. Doble clic o “Cerrar polígono” para terminar.`;
      return;
    }

    if (drawMode === 'rectangle') {
      if (draftPoints.length === 0) {
        draftPoints = [point];
        redrawDraft();
        drawHint = 'Ahora haz clic en la esquina opuesta.';
        return;
      }
      draftPoints = [draftPoints[0], point];
      redrawDraft();
      const bounds = L.latLngBounds(draftPoints[0], draftPoints[1]);
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const nw = L.latLng(ne.lat, sw.lng);
      const se = L.latLng(sw.lat, ne.lng);
      // Anillo cerrado del rectángulo
      const coordinates = [
        [sw.lng, sw.lat],
        [se.lng, se.lat],
        [ne.lng, ne.lat],
        [nw.lng, nw.lat],
      ];
      commitPayload({ type: 'polygon', coordinates });
      return;
    }

    if (drawMode === 'circle') {
      if (draftPoints.length === 0) {
        draftPoints = [point];
        redrawDraft();
        drawHint = 'Ahora haz clic en el borde para definir el radio.';
        return;
      }
      const center = draftPoints[0];
      const radiusMeters = Math.max(1, Math.round(map.distance(center, point)));
      commitPayload({
        type: 'circle',
        coordinates: [[center.lng, center.lat]],
        radiusMeters,
      });
    }
  }

  function onMapDblClick(e) {
    if (drawMode !== 'polygon') return;
    L.DomEvent.stop(e);
    // Evitar que el doble clic añada un punto extra: quitamos el último si es duplicado cercano
    if (draftPoints.length >= 2) {
      const last = draftPoints[draftPoints.length - 1];
      if (map.distance(last, e.latlng) < 5) {
        draftPoints = draftPoints.slice(0, -1);
      }
    }
    finishPolygon();
  }

  function syncDevices(list) {
    if (!devicesLayer) return;
    const seen = new Set();

    for (const device of list) {
      if (device.lat == null || device.lng == null) continue;
      seen.add(device.id);
      const latLng = [device.lat, device.lng];
      let marker = markerById.get(device.id);

      if (!marker) {
        marker = L.marker(latLng, { icon: deviceIcon(device.online) })
          .bindPopup('')
          .addTo(devicesLayer);
        markerById.set(device.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(deviceIcon(device.online));
      }

      const inside = (device.insideGeofences || [])
        .map((g) => (typeof g === 'object' ? g.name : g))
        .join(', ');

      marker.setPopupContent(`
        <strong>${device.name}</strong><br/>
        ${device.label || device.deviceKey}<br/>
        <small>${device.online ? 'En línea' : 'Fuera de línea'}</small>
        ${inside ? `<br/><small>Dentro: ${inside}</small>` : ''}
      `);
    }

    for (const [id, marker] of markerById) {
      if (!seen.has(id)) {
        devicesLayer.removeLayer(marker);
        markerById.delete(id);
      }
    }
  }

  function syncGeofences(list) {
    if (!geofencesLayer) return;
    const seen = new Set();

    for (const fence of list) {
      seen.add(fence.id);
      let layer = fenceById.get(fence.id);

      if (layer) {
        geofencesLayer.removeLayer(layer);
        fenceById.delete(fence.id);
      }

      const color = fence.color || '#2dd4bf';
      const style = {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.18,
      };

      if (fence.type === 'circle') {
        const [lng, lat] = fence.coordinates[0];
        layer = L.circle([lat, lng], { ...style, radius: fence.radiusMeters || 0 });
      } else {
        const latlngs = fence.coordinates.map(([lng, lat]) => [lat, lng]);
        layer = L.polygon(latlngs, style);
      }

      layer.bindTooltip(fence.name, { sticky: true });
      layer.addTo(geofencesLayer);
      fenceById.set(fence.id, layer);
    }

    for (const [id, layer] of fenceById) {
      if (!seen.has(id)) {
        geofencesLayer.removeLayer(layer);
        fenceById.delete(id);
      }
    }
  }

  function userIcon() {
    return L.divIcon({
      className: 'user-marker',
      html: '<span class="you"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function applyUserLocation(position, { centerMap = false } = {}) {
    if (!map) return;
    // No mover el mapa mientras se dibuja una geocerca
    if (drawMode) return;

    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const latLng = [lat, lng];

    if (!userMarker) {
      userMarker = L.marker(latLng, { icon: userIcon(), zIndexOffset: 1000 })
        .bindPopup('<strong>Tu ubicación</strong>')
        .addTo(map);
    } else {
      userMarker.setLatLng(latLng);
    }

    if (!userAccuracyCircle) {
      userAccuracyCircle = L.circle(latLng, {
        radius: accuracy || 40,
        color: '#60a5fa',
        weight: 1,
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      userAccuracyCircle.setLatLng(latLng);
      userAccuracyCircle.setRadius(accuracy || 40);
    }

    if (centerMap) {
      map.setView(latLng, 16);
      userMarker.openPopup();
    }

    geoStatus = 'ok';
    onUserLocation?.({ lat, lng, accuracy });
  }

  function locateBrowser({ centerMap = true } = {}) {
    if (!navigator.geolocation) {
      geoStatus = 'no-soportado';
      return;
    }

    geoStatus = 'buscando';
    navigator.geolocation.getCurrentPosition(
      (pos) => applyUserLocation(pos, { centerMap }),
      (err) => {
        console.warn('[geo]', err.message);
        geoStatus = err.code === err.PERMISSION_DENIED ? 'permiso-denegado' : 'error';
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    if (geoWatchId == null) {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => applyUserLocation(pos, { centerMap: false }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }

  onMount(() => {
    map = L.map(mapEl, {
      zoomControl: true,
      doubleClickZoom: false, // lo usamos para cerrar polígonos
    }).setView([19.4326, -99.1332], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    geofencesLayer = L.featureGroup().addTo(map);
    devicesLayer = L.layerGroup().addTo(map);

    map.on('click', onMapClick);
    map.on('dblclick', onMapDblClick);

    syncGeofences(geofences);
    syncDevices(devices);
    onMapReady?.(map);
    locateBrowser({ centerMap: true });

    // Ajuste de tamaño tras montar (layouts flex/grid)
    setTimeout(() => map?.invalidateSize(), 80);

    return () => {
      if (geoWatchId != null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
      }
      map?.off('click', onMapClick);
      map?.off('dblclick', onMapDblClick);
      map?.remove();
      map = null;
    };
  });

  $effect(() => {
    syncDevices(devices);
  });

  $effect(() => {
    syncGeofences(geofences);
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<div class="map-shell">
  <div class="map" bind:this={mapEl}></div>

  {#if drawEnabled}
    <div class="draw-bar">
      <button
        type="button"
        class:active={drawMode === 'polygon'}
        onclick={() => (drawMode === 'polygon' ? cancelDraw() : startDraw('polygon'))}
      >
        Polígono
      </button>
      <button
        type="button"
        class:active={drawMode === 'rectangle'}
        onclick={() => (drawMode === 'rectangle' ? cancelDraw() : startDraw('rectangle'))}
      >
        Cuadrado
      </button>
      <button
        type="button"
        class:active={drawMode === 'circle'}
        onclick={() => (drawMode === 'circle' ? cancelDraw() : startDraw('circle'))}
      >
        Círculo
      </button>
      {#if drawMode === 'polygon' && draftPoints.length >= 3}
        <button type="button" class="accent" onclick={finishPolygon}>Cerrar polígono</button>
      {/if}
      {#if drawMode}
        <button type="button" class="ghost" onclick={cancelDraw}>Cancelar</button>
      {/if}
    </div>
  {/if}

  {#if drawHint}
    <div class="draw-hint">{drawHint}</div>
  {/if}

  <div class="geo-bar">
    {#if geoStatus === 'buscando'}
      <span>Obteniendo tu ubicación…</span>
    {:else if geoStatus === 'ok'}
      <span>Centrado en tu ubicación</span>
    {:else if geoStatus === 'permiso-denegado'}
      <span>Activa el permiso de ubicación del navegador</span>
    {:else if geoStatus === 'no-soportado'}
      <span>Este navegador no soporta geolocalización</span>
    {:else}
      <span>No se pudo obtener tu ubicación</span>
    {/if}
    <button type="button" onclick={() => locateBrowser({ centerMap: true })}>Reubicar</button>
  </div>
</div>

<style>
  .map-shell {
    height: 100%;
    min-height: 420px;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    position: relative;
  }

  .map {
    height: 100%;
    min-height: 420px;
    background: #0b1220;
  }

  .draw-bar {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 1100;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: calc(100% - 24px);
  }

  .draw-bar button {
    border: 1px solid var(--border);
    background: rgba(15, 20, 25, 0.92);
    color: var(--text);
    border-radius: 999px;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .draw-bar button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .draw-bar button.accent {
    background: var(--accent);
    color: #042f2e;
    border-color: transparent;
  }

  .draw-bar button.ghost {
    color: var(--text-muted);
  }

  .draw-hint {
    position: absolute;
    top: 52px;
    left: 12px;
    z-index: 1100;
    max-width: min(420px, calc(100% - 24px));
    padding: 0.45rem 0.7rem;
    border-radius: 10px;
    background: rgba(15, 20, 25, 0.92);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  .geo-bar {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.65rem;
    border-radius: 999px;
    background: rgba(15, 20, 25, 0.88);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .geo-bar button {
    border: none;
    border-radius: 999px;
    padding: 0.25rem 0.65rem;
    background: var(--accent);
    color: #042f2e;
    font-weight: 700;
    font-size: 0.75rem;
  }

  :global(.device-marker),
  :global(.user-marker) {
    background: transparent;
    border: none;
  }

  :global(.device-marker .dot) {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.25);
  }

  :global(.device-marker .dot.on) {
    background: #2dd4bf;
  }

  :global(.device-marker .dot.off) {
    background: #64748b;
    box-shadow: none;
  }

  :global(.user-marker .you) {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    border: 3px solid #fff;
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.28);
  }

  :global(.leaflet-container) {
    font-family: var(--font);
  }
</style>
