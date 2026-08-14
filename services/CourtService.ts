export interface Court {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  rating?: number;
  activeGames?: number;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface CacheEntry {
  courts: Court[];
  timestamp: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const MAX_COURTS = 50;
const BBOX_PRECISION = 2;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OVERPASS_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'User-Agent': 'BallOutBasketball/1.0 (com.runit.basketball)',
};

class CourtService {
  private static instance: CourtService;
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<Court[]>>();

  static getInstance(): CourtService {
    if (!CourtService.instance) {
      CourtService.instance = new CourtService();
    }
    return CourtService.instance;
  }

  /** Human-readable location string compatible with game creation `location` field. */
  getCourtLocationLabel(court: Court): string {
    return court.address ? `${court.name}, ${court.address}` : court.name;
  }

  async fetchCourtsForBounds(bounds: MapBounds): Promise<Court[]> {
    const normalized = this.normalizeBounds(bounds);
    const cacheKey = this.getCacheKey(normalized);

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.courts;
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const request = this.fetchWithRetries(normalized)
      .then((courts) => {
        this.cache.set(cacheKey, { courts, timestamp: Date.now() });
        return courts;
      })
      .finally(() => {
        this.inFlight.delete(cacheKey);
      });

    this.inFlight.set(cacheKey, request);
    return request;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private normalizeBounds(bounds: MapBounds): MapBounds {
    const south = Math.min(bounds.south, bounds.north);
    const north = Math.max(bounds.south, bounds.north);
    const west = Math.min(bounds.west, bounds.east);
    const east = Math.max(bounds.west, bounds.east);

    return {
      south: this.roundCoord(south),
      west: this.roundCoord(west),
      north: this.roundCoord(north),
      east: this.roundCoord(east),
    };
  }

  private roundCoord(value: number): number {
    const factor = 10 ** BBOX_PRECISION;
    return Math.round(value * factor) / factor;
  }

  private getCacheKey(bounds: MapBounds): string {
    return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  }

  private async fetchWithRetries(bounds: MapBounds): Promise<Court[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];

      try {
        const courts = await this.queryOverpass(endpoint, bounds);
        return this.limitCourts(courts, bounds);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Failed to fetch courts');
  }

  private async queryOverpass(endpoint: string, bounds: MapBounds): Promise<Court[]> {
    const { south, west, north, east } = bounds;
    const query = `
      [out:json][timeout:25];
      (
        nwr["leisure"="pitch"]["sport"="basketball"](${south},${west},${north},${east});
        nwr["leisure"="pitch"]["basketball"="yes"](${south},${west},${north},${east});
        nwr["amenity"="basketball_court"](${south},${west},${north},${east});
      );
      out center;
    `.trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: OVERPASS_HEADERS,
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Overpass request failed (${response.status})`);
      }

      const data: OverpassResponse = await response.json();
      return this.parseElements(data.elements);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Court search timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseElements(elements: OverpassElement[]): Court[] {
    const courts: Court[] = [];
    const seen = new Set<string>();

    for (const element of elements) {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;

      if (latitude == null || longitude == null) {
        continue;
      }

      const id = `${element.type}/${element.id}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      courts.push({
        id,
        name: this.getCourtName(element.tags),
        latitude,
        longitude,
        address: this.getCourtAddress(element.tags, latitude, longitude),
      });
    }

    return courts;
  }

  private getCourtName(tags?: Record<string, string>): string {
    if (!tags) {
      return 'Basketball Court';
    }

    return (
      tags.name ??
      tags['addr:street'] ??
      tags.operator ??
      'Basketball Court'
    );
  }

  private getCourtAddress(
    tags: Record<string, string> | undefined,
    latitude: number,
    longitude: number
  ): string {
    if (!tags) {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    const parts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'],
      tags['addr:state'],
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  private limitCourts(courts: Court[], bounds: MapBounds): Court[] {
    if (courts.length <= MAX_COURTS) {
      return courts;
    }

    const centerLat = (bounds.south + bounds.north) / 2;
    const centerLon = (bounds.west + bounds.east) / 2;

    return courts
      .slice()
      .sort(
        (a, b) =>
          this.distanceSquared(a.latitude, a.longitude, centerLat, centerLon) -
          this.distanceSquared(b.latitude, b.longitude, centerLat, centerLon)
      )
      .slice(0, MAX_COURTS);
  }

  private distanceSquared(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = lat1 - lat2;
    const dLon = lon1 - lon2;
    return dLat * dLat + dLon * dLon;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default CourtService.getInstance();
