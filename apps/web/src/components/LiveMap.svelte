<script>
  import { onDestroy, onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import 'leaflet-draw';
  import 'leaflet-draw/dist/leaflet.draw.css';

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
  let drawControl;
  let userMarker;
  let userAccuracyCircle;
  let markerById = new Map();
  let fenceById = new Map();
  let geoStatus = $state('buscando');
  let geoWatchId = null;

  // Fix iconos por defecto de Leaflet en Vite
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

  function extractRing(layer) {
    let latlngs = layer.getLatLngs();
    // Leaflet anida anillos: LatLng[] | LatLng[][] | LatLng[][][]
    while (Array.isArray(latlngs?.[0]) && typeof latlngs[0].lat !== 'number') {
      latlngs = latlngs[0];
    }
    return (latlngs || [])
      .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lng, p.lat]);
  }

  function handleCreated(e) {
    const layer = e.layer;
    const layerType = e.layerType;
    let payload = null;

    if (layerType === 'circle') {
      const c = layer.getLatLng();
      const radiusMeters = Math.max(1, Math.round(layer.getRadius() || 0));
      payload = {
        type: 'circle',
        coordinates: [[c.lng, c.lat]],
        radiusMeters,
      };
    } else if (layerType === 'polygon' || layerType === 'rectangle') {
      const coordinates = extractRing(layer);
      if (coordinates.length >= 3) {
        payload = {
          type: 'polygon',
          coordinates,
        };
      }
    }

    // Quitar el dibujo temporal; la geocerca real llega desde el servidor
    if (map) map.removeLayer(layer);

    if (payload) onCreateGeofence?.(payload);
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
        geoStatus =
          err.code === err.PERMISSION_DENIED ? 'permiso-denegado' : 'error';
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
    // Fallback mientras llega la geolocalización del navegador
    map = L.map(mapEl, { zoomControl: true }).setView([19.4326, -99.1332], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    geofencesLayer = L.featureGroup().addTo(map);
    devicesLayer = L.layerGroup().addTo(map);

    if (drawEnabled) {
      drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          marker: false,
          circlemarker: false,
          polyline: false,
          rectangle: {
            shapeOptions: { color: '#2dd4bf' },
          },
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: '#38bdf8' },
          },
          circle: {
            shapeOptions: { color: '#fbbf24' },
          },
        },
        edit: {
          featureGroup: geofencesLayer,
          edit: false,
          remove: false,
        },
      });
      map.addControl(drawControl);
      map.on(L.Draw.Event.CREATED, handleCreated);
    }

    syncGeofences(geofences);
    syncDevices(devices);
    onMapReady?.(map);
    locateBrowser({ centerMap: true });

    return () => {
      if (geoWatchId != null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
      }
      map?.off(L.Draw.Event.CREATED, handleCreated);
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

  :global(.device-marker) {
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

  :global(.user-marker) {
    background: transparent;
    border: none;
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
