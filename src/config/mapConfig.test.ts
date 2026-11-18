import { describe, expect, it } from 'vitest';

import { parseMapEnv, SYNTHETIC_ORIGIN } from './mapConfig';

const FAKE_KEY = 'TEST_ONLY_not_a_real_maps_key_0000000000';

describe('parseMapEnv', () => {
  it('defaults to offline with the synthetic origin', () => {
    const c = parseMapEnv({});
    expect(c.tilesKey).toBeNull();
    expect(c.keyProblem).toBeNull();
    expect(c.origin).toEqual(SYNTHETIC_ORIGIN);
    expect(c.customOrigin).toBe(false);
  });

  it('accepts a well-formed key and trims it', () => {
    expect(parseMapEnv({ VITE_GOOGLE_MAPS_API_KEY: `  ${FAKE_KEY} ` }).tilesKey).toBe(FAKE_KEY);
  });

  it('ignores a malformed key instead of failing', () => {
    const c = parseMapEnv({ VITE_GOOGLE_MAPS_API_KEY: 'not a key' });
    expect(c.tilesKey).toBeNull();
    expect(c.keyProblem).not.toBeNull();
  });

  it('uses a custom origin only when both coordinates are valid', () => {
    expect(parseMapEnv({ VITE_MAP_ORIGIN_LAT: '10', VITE_MAP_ORIGIN_LNG: '20' }).origin).toEqual({
      lat: 10,
      lng: 20,
    });
    expect(parseMapEnv({ VITE_MAP_ORIGIN_LAT: '10' }).customOrigin).toBe(false);
    expect(parseMapEnv({ VITE_MAP_ORIGIN_LAT: '99', VITE_MAP_ORIGIN_LNG: '20' }).customOrigin).toBe(
      false,
    );
  });
});
