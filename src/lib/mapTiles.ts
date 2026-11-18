/**
 * Google Map Tiles API (2D tiles) client for Leaflet.
 *
 * Uses only https://tile.googleapis.com (allowed in the production CSP for connect-src and
 * img-src). No Maps JavaScript API, so the CSP needs no 'unsafe-inline' / 'unsafe-eval'.
 * Callers must show the attribution returned by `fetchAttribution` while tiles are visible.
 */

export type BaseMap = 'satellite' | 'roadmap';

export interface TileSession {
  mapType: BaseMap;
  session: string;
  /** Expiry as epoch milliseconds. */
  expiresAt: number;
  tileWidth: number;
}

export const TILES_ORIGIN = 'https://tile.googleapis.com';

export class MapTilesError extends Error {
  override readonly name = 'MapTilesError';
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const sessions = new Map<BaseMap, TileSession>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validate the createSession response instead of trusting its shape. */
export function parseSessionResponse(mapType: BaseMap, body: unknown): TileSession {
  if (!isRecord(body) || typeof body.session !== 'string' || body.session === '') {
    throw new MapTilesError('Map Tiles: invalid session response');
  }
  const expirySeconds = Number(body.expiry);
  const tileWidth = Number(body.tileWidth ?? 256);
  return {
    mapType,
    session: body.session,
    expiresAt: Number.isFinite(expirySeconds) ? expirySeconds * 1000 : Date.now() + 3_600_000,
    tileWidth: Number.isFinite(tileWidth) && tileWidth > 0 ? tileWidth : 256,
  };
}

/** Get (or reuse until one minute before expiry) a tile session for the map type. */
export async function getTileSession(
  key: string,
  mapType: BaseMap,
  fetchImpl: FetchLike = fetch,
): Promise<TileSession> {
  const existing = sessions.get(mapType);
  if (existing !== undefined && existing.expiresAt - 60_000 > Date.now()) return existing;

  const response = await fetchImpl(
    `${TILES_ORIGIN}/v1/createSession?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapType, language: 'th-TH', region: 'TH' }),
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  );
  if (!response.ok) {
    throw new MapTilesError(`Map Tiles: createSession failed (HTTP ${String(response.status)})`);
  }
  const session = parseSessionResponse(mapType, await response.json());
  sessions.set(mapType, session);
  return session;
}

export function tileUrlTemplate(key: string, session: TileSession): string {
  return (
    `${TILES_ORIGIN}/v1/2dtiles/{z}/{x}/{y}` +
    `?session=${encodeURIComponent(session.session)}&key=${encodeURIComponent(key)}`
  );
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Copyright text required by the Map Tiles API policies for the visible viewport. */
export async function fetchAttribution(
  key: string,
  session: TileSession,
  zoom: number,
  bounds: ViewportBounds,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const params = new URLSearchParams({
    session: session.session,
    key,
    zoom: String(Math.round(zoom)),
    north: bounds.north.toFixed(6),
    south: bounds.south.toFixed(6),
    east: bounds.east.toFixed(6),
    west: bounds.west.toFixed(6),
  });
  const response = await fetchImpl(`${TILES_ORIGIN}/tile/v1/viewport?${params.toString()}`, {
    referrerPolicy: 'strict-origin-when-cross-origin',
  });
  if (!response.ok) return 'Google';
  const body: unknown = await response.json();
  return isRecord(body) && typeof body.copyright === 'string' && body.copyright !== ''
    ? body.copyright
    : 'Google';
}

/** Test helper: forget cached sessions. */
export function resetTileSessions(): void {
  sessions.clear();
}
