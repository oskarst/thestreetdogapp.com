import { NextRequest, NextResponse } from "next/server";
import type { TableSchema } from "@google-cloud/bigquery";
import { bigQueryConfigured, loadTable } from "@/lib/bigquery";
import {
  fetchAnalyticsDogs,
  fetchAnalyticsSightings,
} from "@/lib/analytics-export";

// Load jobs can take a while on a large dataset.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DOGS_SCHEMA: TableSchema = {
  fields: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "ear_tag_id", type: "STRING" },
    { name: "is_tagged", type: "BOOL" },
    { name: "city_slug", type: "STRING" },
    { name: "character", type: "STRING" },
    { name: "size", type: "INT64" },
    { name: "gender", type: "STRING" },
    { name: "age", type: "STRING" },
    { name: "last_latitude", type: "FLOAT64" },
    { name: "last_longitude", type: "FLOAT64" },
    { name: "first_seen", type: "TIMESTAMP" },
    { name: "last_sighting_date", type: "TIMESTAMP" },
    { name: "contributor_hash", type: "STRING" },
  ],
};

const SIGHTINGS_SCHEMA: TableSchema = {
  fields: [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "dog_id", type: "STRING" },
    { name: "city_slug", type: "STRING" },
    { name: "latitude", type: "FLOAT64" },
    { name: "longitude", type: "FLOAT64" },
    { name: "timestamp", type: "TIMESTAMP" },
    { name: "character", type: "STRING" },
    { name: "size", type: "INT64" },
    { name: "gender", type: "STRING" },
    { name: "age", type: "STRING" },
    { name: "health_flag", type: "BOOL" },
    { name: "contributor_hash", type: "STRING" },
  ],
};

/**
 * Nightly public-dataset export to BigQuery. Triggered by Vercel Cron (see
 * vercel.json). Protected by CRON_SECRET: Vercel sends it as a Bearer token.
 * Inert (200 "skipped") until the BigQuery env vars are set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!bigQueryConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: "BigQuery env not configured",
    });
  }

  try {
    const [dogs, sightings] = await Promise.all([
      fetchAnalyticsDogs(),
      fetchAnalyticsSightings(),
    ]);

    const [dogCount, sightingCount] = await Promise.all([
      loadTable({ table: "dogs", schema: DOGS_SCHEMA, rows: dogs }),
      loadTable({
        table: "sightings",
        schema: SIGHTINGS_SCHEMA,
        rows: sightings,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      loaded: { dogs: dogCount, sightings: sightingCount },
    });
  } catch (err) {
    console.error("[cron/export-bigquery]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
