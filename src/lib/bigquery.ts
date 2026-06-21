import "server-only";
import { BigQuery, type TableSchema } from "@google-cloud/bigquery";

/**
 * BigQuery export config comes entirely from env so the pipeline is inert
 * until you set it up:
 *   GCP_PROJECT_ID              your GCP project
 *   BIGQUERY_DATASET            target dataset (auto-created if missing)
 *   BIGQUERY_LOCATION           dataset location, default "US"
 *   GOOGLE_SERVICE_ACCOUNT_KEY  base64 of the service-account JSON key
 */
export function bigQueryConfigured(): boolean {
  return !!(
    process.env.GCP_PROJECT_ID &&
    process.env.BIGQUERY_DATASET &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  );
}

function client(): BigQuery {
  const credentials = JSON.parse(
    Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY as string,
      "base64"
    ).toString("utf8")
  );
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    credentials,
  });
}

export interface LoadSpec {
  table: string;
  schema: TableSchema;
  rows: Record<string, unknown>[];
}

/**
 * Full-refresh load of one table from in-memory rows. Writes the rows as
 * newline-delimited JSON through a load job with WRITE_TRUNCATE, so each run
 * replaces the table with a clean snapshot. Returns the row count loaded.
 * Skips (without truncating) when there are zero rows, so a transient fetch
 * miss can't wipe the public dataset.
 */
export async function loadTable(spec: LoadSpec): Promise<number> {
  if (spec.rows.length === 0) return 0;

  const bq = client();
  const location = process.env.BIGQUERY_LOCATION || "US";
  const dataset = bq.dataset(process.env.BIGQUERY_DATASET as string, {
    location,
  });
  await dataset.get({ autoCreate: true });

  const table = dataset.table(spec.table);
  const ndjson = spec.rows.map((r) => JSON.stringify(r)).join("\n");

  await new Promise<void>((resolve, reject) => {
    const stream = table.createWriteStream({
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      schema: spec.schema,
      writeDisposition: "WRITE_TRUNCATE",
      location,
    });
    stream.on("error", reject);
    stream.on("complete", () => resolve());
    stream.end(Buffer.from(ndjson, "utf8"));
  });

  return spec.rows.length;
}
