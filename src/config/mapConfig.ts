/**
 * Map configuration from build-time environment variables.
 *
 * - VITE_GOOGLE_MAPS_API_KEY (optional): browser key for the Google Map Tiles API. It is
 *   embedded in the public bundle, so it must be restricted in Google Cloud Console
 *   (HTTP referrers + Map Tiles API only). Keep it in `.env.local` (git-ignored), never in source.
 * - VITE_MAP_ORIGIN_LAT / VITE_MAP_ORIGIN_LNG (optional): where the SYNTHETIC site plan is
 *   drawn. The default is an open-ocean point so no real location is implied.
 *
 * Without a key (or if Google tiles fail) the map falls back to the offline plan background.
 */
import type { RawEnv } from './env';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapConfig {
  tilesKey: string | null;
  /** Why a supplied key was ignored (shown in the UI); null when fine or not supplied. */
  keyProblem: string | null;
  origin: LatLng;
  /** True when the origin came from the environment rather than the synthetic default. */
  customOrigin: boolean;
}

/** Synthetic default origin (open ocean, 0.5° from Null Island). Not a real site. */
export const SYNTHETIC_ORIGIN: LatLng = { lat: 0.5, lng: -0.5 };

const KEY_PATTERN = /^[A-Za-z0-9_-]{30,64}$/;

function text(raw: RawEnv, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

function coordinate(raw: RawEnv, key: string, limit: number): number | null {
  const value = text(raw, key);
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export function parseMapEnv(raw: RawEnv): MapConfig {
  const key = text(raw, 'VITE_GOOGLE_MAPS_API_KEY');
  let tilesKey: string | null = null;
  let keyProblem: string | null = null;
  if (key !== '') {
    if (KEY_PATTERN.test(key)) tilesKey = key;
    else keyProblem = 'รูปแบบ VITE_GOOGLE_MAPS_API_KEY ไม่ถูกต้อง — ใช้แผนที่ออฟไลน์แทน';
  }

  const lat = coordinate(raw, 'VITE_MAP_ORIGIN_LAT', 85);
  const lng = coordinate(raw, 'VITE_MAP_ORIGIN_LNG', 180);
  const origin = lat !== null && lng !== null ? { lat, lng } : null;

  return {
    tilesKey,
    keyProblem,
    origin: origin ?? SYNTHETIC_ORIGIN,
    customOrigin: origin !== null,
  };
}

let cached: MapConfig | undefined;

export function getMapConfig(): MapConfig {
  cached ??= parseMapEnv(import.meta.env);
  return cached;
}
