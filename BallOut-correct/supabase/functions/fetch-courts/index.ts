/**
 * fetch-courts — shared Overpass cache for BallOut map discovery.
 *
 * - Validates bbox from the client
 * - Returns court_bbox_cache rows fresher than 12 hours
 * - On miss/expiry, queries public Overpass endpoints and caches successes only
 * - Uses SUPABASE_SERVICE_ROLE_KEY only inside this function (never returned)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
/** Match client MAX_SEARCH_LATITUDE_DELTA. */
const MAX_LAT_SPAN = 0.8;
/** Allow slightly wider longitude for typical phone aspect ratios. */
const MAX_LON_SPAN = 1.2;
const OVERPASS_TIMEOUT_MS = 20_000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
] as const;

type BBox = { south: number; west: number; north: number; east: number };

type Court = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  activeGameIds: string[];
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type CacheRow = {
  bounds_key: string;
  courts: Court[];
  fetched_at: string;
};

/** Shared result payload so concurrent waiters each get a fresh Response body. */
type JsonResult = { status: number; body: Record<string, unknown> };

/** Single-flight map so concurrent identical misses share one Overpass round-trip in this isolate. */
const inflight = new Map<string, Promise<JsonResult>>();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (request.method !== "POST") {
    return cors(json({ ok: false, error: "method_not_allowed" }, 405));
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return cors(json({ ok: false, error: "fetch_courts_not_configured" }, 503));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return cors(json({ ok: false, error: "invalid_json" }, 400));
  }

  // Temporary Dev-only probe: skip cache/court fetch when explicitly flagged.
  if (wantsOverpassTinyDiag(body)) {
    const result = await runOverpassTinyDiag();
    return cors(json(result.body, result.status));
  }

  const bbox = parseBBox(body);
  if (!bbox) {
    return cors(json({ ok: false, error: "invalid_bbox" }, 400));
  }

  const boundsKey = getBoundsCacheKey(bbox);
  let work = inflight.get(boundsKey);
  if (!work) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    work = handleRequest(supabase, bbox, boundsKey).finally(() => {
      inflight.delete(boundsKey);
    });
    inflight.set(boundsKey, work);
  }

  // Build a new Response per caller — never share one one-shot body stream.
  const result = await work;
  return cors(json(result.body, result.status));
});

async function handleRequest(
  supabase: SupabaseClient,
  bbox: BBox,
  boundsKey: string,
): Promise<JsonResult> {
  const cached = await readFreshCache(supabase, boundsKey);
  if (cached) {
    return {
      status: 200,
      body: {
        ok: true,
        courts: cached.courts,
        fromCache: true,
        boundsKey,
        fetchedAt: cached.fetched_at,
      },
    };
  }

  const upstream = await fetchFromOverpass(bbox);
  if (!upstream.ok) {
    // Do not cache failures (including empty lists produced by errors).
    return {
      status: upstream.status,
      body: {
        ok: false,
        error: upstream.error,
        boundsKey,
        // Safe per-endpoint diagnostics only (status/category + short host label).
        overpassAttempts: upstream.attempts,
      },
    };
  }

  const fetchedAt = new Date().toISOString();
  const { error: writeError } = await supabase.from("court_bbox_cache").upsert(
    {
      bounds_key: boundsKey,
      south: bbox.south,
      west: bbox.west,
      north: bbox.north,
      east: bbox.east,
      courts: upstream.courts,
      fetched_at: fetchedAt,
    },
    { onConflict: "bounds_key" },
  );

  if (writeError) {
    console.error(`court_cache_write_failed:${writeError.code ?? "unknown"}`);
    // Still return successful Overpass data; cache write failure is non-fatal.
    return {
      status: 200,
      body: {
        ok: true,
        courts: upstream.courts,
        fromCache: false,
        boundsKey,
        fetchedAt,
        cacheWriteFailed: true,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      courts: upstream.courts,
      fromCache: false,
      boundsKey,
      fetchedAt,
    },
  };
}

async function readFreshCache(
  supabase: SupabaseClient,
  boundsKey: string,
): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from("court_bbox_cache")
    .select("bounds_key, courts, fetched_at")
    .eq("bounds_key", boundsKey)
    .maybeSingle();

  if (error) {
    console.error(`court_cache_read_failed:${error.code ?? "unknown"}`);
    return null;
  }
  if (!data || !Array.isArray(data.courts) || !data.fetched_at) {
    return null;
  }

  const age = Date.now() - new Date(data.fetched_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age > CACHE_TTL_MS) {
    return null;
  }

  return {
    bounds_key: data.bounds_key,
    courts: data.courts as Court[],
    fetched_at: data.fetched_at,
  };
}

type OverpassAttemptDiag = {
  host: "overpass" | "lz4";
  error: string;
  /** Present for HTTP responses; omitted for timeout/network failures. */
  httpStatus?: number;
};

function overpassHostLabel(endpoint: string): "overpass" | "lz4" {
  return endpoint.includes("lz4.") ? "lz4" : "overpass";
}

function classifyOverpassHttpStatus(status: number): string {
  if (status === 429) return "overpass_rate_limited";
  if (status >= 500) return "overpass_busy";
  return "overpass_http_error";
}

/** Explicit boolean only — strings/1 do not enable the probe. */
function wantsOverpassTinyDiag(body: unknown): boolean {
  return (
    !!body &&
    typeof body === "object" &&
    (body as Record<string, unknown>).overpassDiag === true
  );
}

/** Temporary diag targets only — does not alter production OVERPASS_ENDPOINTS. */
const OVERPASS_DIAG_ENDPOINTS = [
  OVERPASS_ENDPOINTS[0],
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

function overpassDiagHostLabel(endpoint: string): string {
  if (endpoint.includes("private.coffee")) return "private_coffee";
  if (endpoint.includes("kumi.systems")) return "kumi";
  return overpassHostLabel(endpoint);
}

type OverpassTinyDiagAttempt = {
  host: string;
  httpStatus?: number;
  error?: string;
};

/**
 * Temporary development probe: tiny Overpass QL against each diag endpoint,
 * using the same headers + `data=` encoding as fetchFromOverpass.
 * Returns label/status/category only — never upstream bodies, secrets, or headers.
 */
async function probeOverpassTiny(
  endpoint: string,
): Promise<OverpassTinyDiagAttempt> {
  const host = overpassDiagHostLabel(endpoint);
  const query = "[out:json][timeout:10];node(1);out;";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
        "User-Agent": "BallOutBasketball/1.0 (fetch-courts edge cache)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    // Drop upstream body without buffering it into the Edge response.
    try {
      await response.body?.cancel();
    } catch {
      // ignore cancel failures
    }

    if (response.ok) {
      return { host, httpStatus: response.status };
    }

    return {
      host,
      httpStatus: response.status,
      error: classifyOverpassHttpStatus(response.status),
    };
  } catch (err) {
    return {
      host,
      error:
        err instanceof Error && err.name === "AbortError"
          ? "overpass_timeout"
          : "overpass_network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runOverpassTinyDiag(): Promise<JsonResult> {
  const attempts: OverpassTinyDiagAttempt[] = [];
  for (const endpoint of OVERPASS_DIAG_ENDPOINTS) {
    attempts.push(await probeOverpassTiny(endpoint));
  }

  const anyOk = attempts.some((a) => a.httpStatus !== undefined && !a.error);
  return {
    status: 200,
    body: {
      ok: anyOk,
      diagnostic: "overpass_tiny",
      attempts,
    },
  };
}

async function fetchFromOverpass(
  bbox: BBox,
): Promise<
  | { ok: true; courts: Court[] }
  | { ok: false; error: string; status: number; attempts: OverpassAttemptDiag[] }
> {
  const query = buildOverpassQuery(bbox);
  let lastError = "overpass_unavailable";
  let lastStatus = 502;
  const attempts: OverpassAttemptDiag[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const host = overpassHostLabel(endpoint);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "BallOutBasketball/1.0 (fetch-courts edge cache)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        lastStatus = response.status >= 400 ? response.status : 502;
        lastError = classifyOverpassHttpStatus(response.status);
        attempts.push({
          host,
          error: lastError,
          httpStatus: response.status,
        });
        continue;
      }

      let payload: { elements?: OverpassElement[] };
      try {
        payload = (await response.json()) as { elements?: OverpassElement[] };
      } catch {
        lastError = "overpass_invalid_json";
        lastStatus = 502;
        attempts.push({ host, error: lastError });
        continue;
      }

      if (!payload || !Array.isArray(payload.elements)) {
        lastError = "overpass_invalid_payload";
        lastStatus = 502;
        attempts.push({ host, error: lastError });
        continue;
      }

      const courts = dedupeCourts(
        payload.elements
          .map(elementToCourt)
          .filter((c): c is Court => c !== null),
      );
      return { ok: true, courts };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        lastError = "overpass_timeout";
        lastStatus = 504;
      } else {
        lastError = "overpass_network_error";
        lastStatus = 502;
      }
      attempts.push({ host, error: lastError });
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, error: lastError, status: lastStatus, attempts };
}

function parseBBox(body: unknown): BBox | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const raw = (record.bbox && typeof record.bbox === "object"
    ? record.bbox
    : record) as Record<string, unknown>;

  const south = Number(raw.south);
  const west = Number(raw.west);
  const north = Number(raw.north);
  const east = Number(raw.east);

  if (![south, west, north, east].every((n) => Number.isFinite(n))) return null;
  if (south > north || west > east) return null;
  if (south < -90 || north > 90 || west < -180 || east > 180) return null;

  const latSpan = north - south;
  const lonSpan = east - west;
  if (latSpan <= 0 || lonSpan <= 0) return null;
  if (latSpan > MAX_LAT_SPAN || lonSpan > MAX_LON_SPAN) return null;

  return { south, west, north, east };
}

function getBoundsCacheKey(bbox: BBox): string {
  return `${bbox.south.toFixed(2)},${bbox.west.toFixed(2)},${bbox.north.toFixed(2)},${bbox.east.toFixed(2)}`;
}

/** Same Overpass coverage as src/data/overpassCourts.ts buildOverpassQuery. */
function buildOverpassQuery(bbox: BBox): string {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `
[out:json][timeout:25];
(
  node["leisure"="pitch"]["sport"="basketball"](${box});
  way["leisure"="pitch"]["sport"="basketball"](${box});
  node["sport"="basketball"](${box});
);
out center;
`.trim();
}

function elementToCourt(el: OverpassElement): Court | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const tags = el.tags ?? {};
  return {
    id: `osm-${el.type}-${el.id}`,
    name: buildDisplayName(tags),
    latitude: lat,
    longitude: lon,
    address: buildAddress(tags),
    activeGameIds: [],
  };
}

function dedupeCourts(courts: Court[]): Court[] {
  const seen = new Set<string>();
  const out: Court[] = [];
  for (const court of courts) {
    if (seen.has(court.id)) continue;
    const coordKey = `${court.latitude.toFixed(5)},${court.longitude.toFixed(5)}`;
    if (seen.has(coordKey)) continue;
    seen.add(court.id);
    seen.add(coordKey);
    out.push(court);
  }
  return out;
}

/** Mirrored from src/data/overpassCourts.ts — keep name/address mapping identical. */
const GENERIC_COURT_NAMES = new Set([
  "basketball court",
  "basketball",
  "court",
  "basketball pitch",
  "pitch",
  "basketball courts",
]);

const GENERIC_OPERATORS = new Set([
  "nyc parks",
  "new york city department of parks and recreation",
  "department of parks and recreation",
  "parks and recreation",
  "city of new york",
]);

function isGenericCourtName(name: string): boolean {
  return GENERIC_COURT_NAMES.has(name.trim().toLowerCase());
}

function isGenericOperator(value: string): boolean {
  const n = value.trim().toLowerCase();
  if (GENERIC_OPERATORS.has(n)) return true;
  return /\bdepartment of parks\b/i.test(n) || /\bparks and recreation\b/i.test(n);
}

function firstTag(tags: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return "";
}

function streetFromTags(tags: Record<string, string>): string {
  const street =
    tags["addr:street"] ||
    tags["addr:road"] ||
    tags["contact:street"] ||
    "";
  const number =
    tags["addr:housenumber"] ||
    tags["contact:housenumber"] ||
    "";
  return [number, street].filter(Boolean).join(" ");
}

function cityFromTags(tags: Record<string, string>): string {
  return firstTag(tags, [
    "addr:city",
    "addr:town",
    "addr:village",
    "addr:hamlet",
    "addr:suburb",
    "addr:neighbourhood",
    "addr:neighborhood",
    "addr:district",
    "addr:quarter",
    "is_in:city",
    "is_in:town",
    "is_in:village",
    "is_in:suburb",
    "is_in:municipality",
    "is_in:neighbourhood",
    "is_in:neighborhood",
  ]);
}

function stateFromTags(tags: Record<string, string>): string {
  return firstTag(tags, [
    "addr:state",
    "addr:province",
    "is_in:state",
    "is_in:province",
  ]);
}

function placeFromTags(tags: Record<string, string>): string {
  const candidates = [
    tags["is_in:park"],
    tags["addr:place"],
    tags["addr:housename"],
    tags.place,
    tags["is_in"],
  ];
  for (const value of candidates) {
    if (value && !isGenericCourtName(value)) return value.trim();
  }
  return "";
}

function locationHintFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || isGenericCourtName(trimmed)) return "";
  const stripped = trimmed
    .replace(/\s+basketball\s+courts?\s*$/i, "")
    .replace(/\s+basketball\s+pitch(es)?\s*$/i, "")
    .replace(/\s+courts?\s*$/i, "")
    .trim();
  return stripped || trimmed;
}

function buildAddress(tags: Record<string, string> | undefined): string {
  if (!tags) return "Address unavailable";
  if (tags["addr:full"]?.trim()) return tags["addr:full"].trim();

  const street = streetFromTags(tags);
  const place = placeFromTags(tags);
  const city = cityFromTags(tags);
  const state = stateFromTags(tags);

  const locality = [city, state].filter(Boolean).join(", ");
  const primary = street || place;
  const parts = [primary, locality].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  const namedCandidates = [
    tags.full_name,
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags.alt_name,
    tags.loc_name,
  ];
  for (const candidate of namedCandidates) {
    const hint = candidate ? locationHintFromName(candidate) : "";
    if (hint) return hint;
  }

  const operator = tags.operator?.trim() || tags["operator:short"]?.trim() || "";
  if (operator && !isGenericOperator(operator) && !isGenericCourtName(operator)) {
    return operator;
  }

  return "Address unavailable";
}

function buildDisplayName(tags: Record<string, string>): string {
  const namedCandidates = [
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags.alt_name,
    tags.loc_name,
    tags.full_name,
  ].filter(Boolean) as string[];

  for (const candidate of namedCandidates) {
    if (!isGenericCourtName(candidate)) return candidate;
  }

  const street = streetFromTags(tags) || tags["addr:street"] || "";
  const place = placeFromTags(tags);
  const city = cityFromTags(tags);

  if (street) return `Basketball Court on ${street}`;
  if (place) return `Basketball Court · ${place}`;
  if (city) return `Basketball Court · ${city}`;
  return "Basketball Court";
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      connection: "keep-alive",
    },
  });
}

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(response.body, { status: response.status, headers });
}
