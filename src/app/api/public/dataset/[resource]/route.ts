import { NextRequest, NextResponse } from "next/server";
import {
  fetchAnalyticsDogs,
  fetchAnalyticsSightings,
} from "@/lib/analytics-export";

// Public, anonymized open-dataset download. Same PII-free views as the
// BigQuery export (migration 039); no auth, CDN-cached.
//   /api/public/dataset/dogs           -> GeoJSON (default)
//   /api/public/dataset/dogs?format=csv
//   /api/public/dataset/sightings?format=json
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LICENSE = "CC-BY-4.0";
const CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvEscape(r[c])).join(","));
  return lines.join("\n");
}

function toGeoJSON(
  rows: Record<string, unknown>[],
  lngKey: string,
  latKey: string
) {
  const features = rows
    .filter((r) => r[lngKey] != null && r[latKey] != null)
    .map((r) => {
      const properties = { ...r };
      delete properties[lngKey];
      delete properties[latKey];
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(r[lngKey]), Number(r[latKey])],
        },
        properties,
      };
    });
  return { type: "FeatureCollection" as const, license: LICENSE, features };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const format = (
    request.nextUrl.searchParams.get("format") ?? "geojson"
  ).toLowerCase();

  let rows: Record<string, unknown>[];
  let lngKey: string;
  let latKey: string;
  try {
    if (resource === "dogs") {
      rows = await fetchAnalyticsDogs();
      lngKey = "last_longitude";
      latKey = "last_latitude";
    } else if (resource === "sightings") {
      rows = await fetchAnalyticsSightings();
      lngKey = "longitude";
      latKey = "latitude";
    } else {
      return NextResponse.json(
        { error: "Unknown resource. Use 'dogs' or 'sightings'." },
        { status: 404 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }

  if (format === "csv") {
    return new NextResponse(toCSV(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="streetdog_${resource}.csv"`,
        "cache-control": CACHE,
      },
    });
  }

  if (format === "json") {
    return NextResponse.json(
      { license: LICENSE, count: rows.length, data: rows },
      { headers: { "cache-control": CACHE } }
    );
  }

  // GeoJSON (default)
  return new NextResponse(JSON.stringify(toGeoJSON(rows, lngKey, latKey)), {
    headers: {
      "content-type": "application/geo+json; charset=utf-8",
      "content-disposition": `inline; filename="streetdog_${resource}.geojson"`,
      "cache-control": CACHE,
    },
  });
}
