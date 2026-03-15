const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "PhillySprout/1.0",
};

// Bounding box for Philadelphia (rough)
const PHILLY_VIEWBOX = "-75.28,39.87,-74.95,40.14";

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Forward geocode: street address → lat/lng.
 * Biased toward Philadelphia results.
 */
export async function forwardGeocode(
  address: string,
): Promise<GeocodedLocation | null> {
  const query = address.match(/\bphiladelphia\b/i)
    ? address
    : `${address}, Philadelphia, PA`;

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    viewbox: PHILLY_VIEWBOX,
    bounded: "1",
    countrycodes: "us",
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: HEADERS,
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

/**
 * Reverse geocode: lat/lng → street address.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: "jsonv2",
    zoom: "18",
  });

  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: HEADERS,
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.address) return null;

  const { house_number, road, city, state, postcode } = data.address;
  const parts = [
    [house_number, road].filter(Boolean).join(" "),
    city,
    state,
    postcode,
  ].filter(Boolean);

  return parts.join(", ");
}
