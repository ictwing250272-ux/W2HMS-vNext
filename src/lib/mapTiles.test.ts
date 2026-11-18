import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAttribution,
  getTileSession,
  MapTilesError,
  parseSessionResponse,
  resetTileSessions,
  tileUrlTemplate,
  TILES_ORIGIN,
} from './mapTiles';

const KEY = 'TEST_ONLY_not_a_real_maps_key_0000000000';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Google Map Tiles client', () => {
  beforeEach(() => {
    resetTileSessions();
  });

  it('only talks to tile.googleapis.com', () => {
    expect(TILES_ORIGIN).toBe('https://tile.googleapis.com');
    const url = tileUrlTemplate(KEY, {
      mapType: 'satellite',
      session: 'abc',
      expiresAt: 0,
      tileWidth: 256,
    });
    expect(url.startsWith('https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=abc&key=')).toBe(
      true,
    );
  });

  it('validates the session response', () => {
    expect(() => parseSessionResponse('roadmap', {})).toThrow(MapTilesError);
    const s = parseSessionResponse('roadmap', { session: 's1', expiry: '1700000000', tileWidth: 512 });
    expect(s).toEqual({ mapType: 'roadmap', session: 's1', expiresAt: 1_700_000_000_000, tileWidth: 512 });
  });

  it('creates a session once and reuses it until expiry', async () => {
    const expiry = String(Math.floor(Date.now() / 1000) + 3600);
    const fetchMock = vi.fn(() => Promise.resolve(json({ session: 's1', expiry, tileWidth: 256 })));
    const a = await getTileSession(KEY, 'satellite', fetchMock);
    const b = await getTileSession(KEY, 'satellite', fetchMock);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${TILES_ORIGIN}/v1/createSession?key=${KEY}`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ mapType: 'satellite' });
  });

  it('rejects when createSession fails (caller falls back to offline)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ error: 'denied' }, 403)));
    await expect(getTileSession(KEY, 'roadmap', fetchMock)).rejects.toThrow(MapTilesError);
  });

  it('returns the viewport copyright, or "Google" when unavailable', async () => {
    const session = { mapType: 'satellite' as const, session: 's', expiresAt: 0, tileWidth: 256 };
    const bounds = { north: 1, south: 0, east: 1, west: 0 };
    const ok = vi.fn(() => Promise.resolve(json({ copyright: 'Imagery ©2026 Test' })));
    expect(await fetchAttribution(KEY, session, 18, bounds, ok)).toBe('Imagery ©2026 Test');
    const bad = vi.fn(() => Promise.resolve(json({}, 500)));
    expect(await fetchAttribution(KEY, session, 18, bounds, bad)).toBe('Google');
  });
});
