import * as Location from 'expo-location';
import type { Court } from '@/services/CourtService';

const UNAVAILABLE = 'Address unavailable';
const MAX_CONCURRENT = 2;
const COORD_ADDRESS_PATTERN = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

type AddressStatus = 'ready' | 'unavailable';

interface CachedAddress {
  status: AddressStatus;
  text: string;
}

/**
 * Non-blocking presentation-layer address resolver.
 * Does not participate in Overpass court fetching, caching, or map loading.
 */
class CourtAddressService {
  private static instance: CourtAddressService;
  private cache = new Map<string, CachedAddress>();
  private inFlight = new Map<string, Promise<string>>();
  private queue: Array<() => void> = [];
  private activeCount = 0;

  static getInstance(): CourtAddressService {
    if (!CourtAddressService.instance) {
      CourtAddressService.instance = new CourtAddressService();
    }
    return CourtAddressService.instance;
  }

  /** True when the court already carries a readable street address (not lat/lng). */
  hasReadableAddress(court: Court): boolean {
    return this.isReadableAddress(court.address);
  }

  getCachedAddress(courtId: string): string | null {
    const cached = this.cache.get(courtId);
    return cached ? cached.text : null;
  }

  /**
   * Resolve a display address for a court that is already loaded.
   * Uses OSM metadata first, then reverse-geocodes lat/lng.
   */
  async resolveAddress(court: Court): Promise<string> {
    const cached = this.cache.get(court.id);
    if (cached) {
      return cached.text;
    }

    if (this.isReadableAddress(court.address)) {
      const formatted = this.formatExistingAddress(court.address!);
      this.cache.set(court.id, { status: 'ready', text: formatted });
      return formatted;
    }

    const existing = this.inFlight.get(court.id);
    if (existing) {
      return existing;
    }

    const promise = this.enqueue(() => this.reverseGeocodeCourt(court))
      .then((text) => {
        this.cache.set(court.id, {
          status: text === UNAVAILABLE ? 'unavailable' : 'ready',
          text,
        });
        return text;
      })
      .catch(() => {
        this.cache.set(court.id, { status: 'unavailable', text: UNAVAILABLE });
        return UNAVAILABLE;
      })
      .finally(() => {
        this.inFlight.delete(court.id);
      });

    this.inFlight.set(court.id, promise);
    return promise;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private isReadableAddress(address?: string): boolean {
    if (!address || !address.trim()) {
      return false;
    }
    return !COORD_ADDRESS_PATTERN.test(address.trim());
  }

  private formatExistingAddress(address: string): string {
    const trimmed = address.trim();
    if (trimmed.includes(',')) {
      return trimmed.replace(/,\s*United States$/i, '').trim();
    }

    // Space-joined OSM parts: "123 Main St City ST" — leave as-is if already readable.
    return trimmed;
  }

  private async reverseGeocodeCourt(court: Court): Promise<string> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: court.latitude,
        longitude: court.longitude,
      });

      if (!results || results.length === 0) {
        return UNAVAILABLE;
      }

      const formatted = this.formatGeocodedAddress(results[0]);
      return formatted || UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  }

  private formatGeocodedAddress(result: Location.LocationGeocodedAddress): string | null {
    const streetLine = [result.streetNumber, result.street]
      .filter(Boolean)
      .join(' ')
      .trim();

    const city = result.city || result.subregion || '';
    const state = result.region || '';

    const locality = [city, state].filter(Boolean).join(', ');

    if (streetLine && locality) {
      return `${streetLine}, ${locality}`;
    }
    if (streetLine) {
      return streetLine;
    }
    if (locality) {
      return locality;
    }

    return null;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.activeCount += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.activeCount -= 1;
            this.pump();
          });
      };

      this.queue.push(run);
      this.pump();
    });
  }

  private pump(): void {
    while (this.activeCount < MAX_CONCURRENT && this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

export const ADDRESS_UNAVAILABLE = UNAVAILABLE;
export default CourtAddressService.getInstance();
