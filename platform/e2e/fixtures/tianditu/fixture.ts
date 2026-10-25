import type { Page } from '@playwright/test';
import { fulfillOk, installCloudflareHomeFixture } from '../../support/cloudflare-home-fixture.js';

export const fixtureBrowserKey = 'a'.repeat(32);
export const nextFixtureBrowserKey = 'b'.repeat(32);

const tilePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKZsAAAAASUVORK5CYII=',
  'base64',
);

export interface MapFixtureConfiguration {
  configured: boolean;
  browserKey: string | null;
}

interface Gate {
  wait: Promise<void>;
  release: () => void;
}

function gate(): Gate {
  let release = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}

/** Actual application and Leaflet; only network responses are synthetic and isolated. */
export async function installTiandituFixture(
  page: Page,
  options: {
    permissions?: string[];
    langCode?: 'en-US' | 'zh-CN';
    configuration?: MapFixtureConfiguration;
  } = {},
) {
  const home = await installCloudflareHomeFixture(page, {
    permissions: options.permissions ?? [],
    langCode: options.langCode,
  });
  const configGate = gate();
  const baseGate = gate();
  const annotationGate = gate();
  const state = {
    home,
    configuration: options.configuration ?? {
      configured: true,
      browserKey: fixtureBrowserKey,
    },
    configurationByRequest: [] as MapFixtureConfiguration[],
    configFailure: null as 'http' | 'business' | null,
    delayConfig: false,
    delayBase: false,
    delayAnnotation: false,
    tileFailure: false,
    configRequests: [] as { method: string; body: unknown; authenticated: boolean }[],
    tileRequests: [] as { layer: string; key: string | null; https: boolean; zoom: number }[],
    events: [] as ('config' | 'tile')[],
    releaseConfig: configGate.release,
    releaseBase: baseGate.release,
    releaseAnnotation: annotationGate.release,
    releaseAll: () => {
      configGate.release();
      baseGate.release();
      annotationGate.release();
    },
  };

  // Production builds use remote hosts with /remoteEntry.js at the origin root.
  // The shared legacy fixture only covers its former same-origin /enterprise path.
  await page.route(/\/remoteEntry\.js(?:\?.*)?$/u, async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (
      ![
        '127.0.0.1',
        'localhost',
        'gate-enterprise.this-time.com',
        'gate-personal.this-time.com',
      ].includes(host)
    ) {
      await route.abort('blockedbyclient');
      return;
    }
    await route.fulfill({
      contentType: 'application/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body: 'export const init = () => {}; export const get = async () => () => ({ default: () => null });',
    });
  });

  await page.route('**/api/v1/admin/base/map/config', async (route) => {
    state.events.push('config');
    state.configRequests.push({
      method: route.request().method(),
      body: route.request().postDataJSON(),
      authenticated: route.request().headers().authorization === 'Bearer fixture-token',
    });
    const configuration =
      state.configurationByRequest[state.configRequests.length - 1] ?? state.configuration;
    if (state.delayConfig) await configGate.wait;
    if (state.configFailure !== null) {
      await route
        .fulfill({
          status: state.configFailure === 'http' ? 500 : 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            code: 'MAP_FIXTURE_FAILURE',
            data: {},
            message: 'Fixture configuration failure',
          }),
        })
        .catch(() => {});
      return;
    }
    await route.fulfill(fulfillOk(configuration)).catch(() => {});
  });
  await page.route(/^https:\/\/t[0-7]\.tianditu\.gov\.cn\//u, async (route) => {
    const url = new URL(route.request().url());
    const layer = url.searchParams.get('LAYER') ?? '';
    state.events.push('tile');
    state.tileRequests.push({
      layer,
      key: url.searchParams.get('tk'),
      https: url.protocol === 'https:',
      zoom: Number(url.searchParams.get('TILEMATRIX')),
    });
    if (state.delayBase && (layer === 'vec' || layer === 'img')) await baseGate.wait;
    if (state.delayAnnotation && (layer === 'cva' || layer === 'cia')) await annotationGate.wait;
    await route
      .fulfill({
        status: state.tileFailure ? 503 : 200,
        contentType: state.tileFailure ? 'text/plain' : 'image/png',
        body: state.tileFailure ? 'Isolated tile failure' : tilePng,
      })
      .catch(() => {});
  });
  return state;
}
