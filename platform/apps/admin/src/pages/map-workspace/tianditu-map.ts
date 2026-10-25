import { control, DomEvent, latLngBounds, map as createMap, tileLayer, Util } from 'leaflet';
import type { Map as LeafletMap, TileLayer } from 'leaflet';

export type Basemap = 'vector' | 'satellite';
export type TilePhase = 'tiles-loading' | 'ready' | 'tile-error' | 'tile-timeout';

export interface TiandituMapController {
  setBasemap: (basemap: Basemap) => void;
  resetView: () => void;
  dispose: () => void;
}

interface MapLabels {
  zoomIn: string;
  zoomOut: string;
}

const INITIAL_BOUNDS = latLngBounds([3.85, 73.5], [53.6, 135.1]);
const TILE_TIMEOUT_MS = 15_000;
const ATTRIBUTION =
  '&copy; <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noopener noreferrer">天地图</a>';

function createLayer(layer: 'vec' | 'cva' | 'img' | 'cia', browserKey: string): TileLayer {
  const address =
    `https://t0.tianditu.gov.cn/${layer}_w/wmts` +
    '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    `&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles` +
    '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}' +
    `&tk=${encodeURIComponent(browserKey)}`;
  return tileLayer(address, {
    minZoom: 2,
    maxZoom: 18,
    attribution: ATTRIBUTION,
    referrerPolicy: 'strict-origin-when-cross-origin',
    updateWhenIdle: true,
    keepBuffer: 1,
  });
}

function disposeLayer(layer: TileLayer): void {
  layer.off();
  layer
    .getContainer()
    ?.querySelectorAll('img')
    .forEach((image) => {
      DomEvent.off(image);
      image.onload = null;
      image.onerror = null;
      image.src = Util.emptyImageUrl;
    });
  layer.remove();
}

/** One mounted workspace owns its layers, credentials, listeners and timeouts. */
export function createTiandituMap(
  container: HTMLElement,
  browserKey: string,
  basemap: Basemap,
  labels: MapLabels,
  onPhase: (phase: TilePhase) => void,
): TiandituMapController {
  let instance: LeafletMap | undefined;
  let layers: TileLayer[] = [];
  let observer: ResizeObserver | undefined;
  let timeoutId: number | undefined;
  let disposed = false;
  let layerGeneration = 0;
  let initialViewPending = true;

  const clearTimeout = () => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    timeoutId = undefined;
  };
  const resetView = () => {
    if (!disposed && instance) {
      const size = container.getBoundingClientRect();
      if (size.width === 0 || size.height === 0) return;
      instance.invalidateSize({ animate: false });
      instance.fitBounds(INITIAL_BOUNDS, { padding: [12, 12], animate: false });
      initialViewPending = false;
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    layerGeneration += 1;
    clearTimeout();
    observer?.disconnect();
    layers.forEach(disposeLayer);
    layers = [];
    instance?.off();
    instance?.remove();
    instance = undefined;
  };

  const setBasemap = (nextBasemap: Basemap) => {
    if (disposed || !instance) return;
    const currentMap = instance;
    const generation = ++layerGeneration;
    clearTimeout();
    layers.forEach(disposeLayer);
    layers = [];
    let terminalError = false;
    let baseLoaded = false;
    let annotationsLoaded = false;
    const current = () => !disposed && generation === layerGeneration;
    const fail = (phase: 'tile-error' | 'tile-timeout') => {
      if (!current() || terminalError) return;
      terminalError = true;
      clearTimeout();
      onPhase(phase);
    };
    const startTimeout = () => {
      if (!current() || terminalError) return;
      clearTimeout();
      timeoutId = window.setTimeout(() => fail('tile-timeout'), TILE_TIMEOUT_MS);
    };
    const waiting = () => {
      if (!current() || terminalError) return;
      baseLoaded = false;
      onPhase('tiles-loading');
      startTimeout();
    };
    const base = createLayer(nextBasemap === 'vector' ? 'vec' : 'img', browserKey);
    const annotations = createLayer(nextBasemap === 'vector' ? 'cva' : 'cia', browserKey);
    layers = [base, annotations];
    base.on('loading', waiting);
    base.on('tileload', () => {
      if (!current() || terminalError) return;
      baseLoaded = true;
      if (annotationsLoaded) clearTimeout();
      onPhase('ready');
    });
    annotations.on('tileload', () => {
      if (!current() || terminalError) return;
      annotationsLoaded = true;
      if (baseLoaded) clearTimeout();
    });
    annotations.on('loading', () => {
      if (!current() || terminalError) return;
      annotationsLoaded = false;
      startTimeout();
    });
    layers.forEach((layer) => layer.on('tileerror', () => fail('tile-error')));
    waiting();
    layers.forEach((layer) => layer.addTo(currentMap));
  };

  try {
    instance = createMap(container, {
      zoomControl: false,
      keyboard: true,
      minZoom: 2,
      maxZoom: 18,
      fadeAnimation: false,
    });
    control.zoom({ zoomInTitle: labels.zoomIn, zoomOutTitle: labels.zoomOut }).addTo(instance);
    control.scale({ metric: true, imperial: false }).addTo(instance);
    resetView();
    setBasemap(basemap);
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (disposed) return;
        if (initialViewPending) resetView();
        else instance?.invalidateSize({ animate: false });
      });
      observer.observe(container);
    }
    return { setBasemap, resetView, dispose };
  } catch {
    dispose();
    throw new Error('MAP_INITIALIZATION_FAILED');
  }
}
