/**
 * Lightweight verification for court address presentation logic.
 * Does not touch CourtService / Overpass court loading.
 *
 * Run: node scripts/verify-court-address.js
 */

const COORD_ADDRESS_PATTERN = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

function isReadableAddress(address) {
  if (!address || !address.trim()) {
    return false;
  }
  return !COORD_ADDRESS_PATTERN.test(address.trim());
}

function formatGeocodedAddress(result) {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(isReadableAddress(undefined) === false, 'undefined not readable');
assert(isReadableAddress('') === false, 'empty not readable');
assert(isReadableAddress('40.71280, -74.00600') === false, 'coords not readable');
assert(
  isReadableAddress('1358 Chews Landing Rd, Sicklerville, NJ') === true,
  'street address readable'
);

const formatted = formatGeocodedAddress({
  streetNumber: '1358',
  street: 'Chews Landing Rd',
  city: 'Sicklerville',
  region: 'NJ',
});
assert(
  formatted === '1358 Chews Landing Rd, Sicklerville, NJ',
  `unexpected format: ${formatted}`
);

assert(
  formatGeocodedAddress({}) === null,
  'empty geocode should be null → Address unavailable'
);

// Concurrency queue smoke check (mirrors CourtAddressService pump)
let active = 0;
let maxActive = 0;
const MAX = 2;
const queue = [];
const results = [];

function pump() {
  while (active < MAX && queue.length > 0) {
    const next = queue.shift();
    next();
  }
}

function enqueue(task) {
  return new Promise((resolve) => {
    const run = () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      task().then((value) => {
        active -= 1;
        resolve(value);
        pump();
      });
    };
    queue.push(run);
    pump();
  });
}

Promise.all(
  [1, 2, 3, 4].map((id) =>
    enqueue(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            results.push(id);
            resolve(id);
          }, 20);
        })
    )
  )
).then(() => {
  assert(maxActive <= 2, `concurrency exceeded: ${maxActive}`);
  assert(results.length === 4, 'all queued jobs should finish');
  console.log('verify-court-address: all checks passed');
});
