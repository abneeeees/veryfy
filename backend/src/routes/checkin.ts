import { Hono } from "hono";
import type { QueryResultRow } from "pg";

import { query } from "../db";
import type { QrPayload } from "../services/qr";
import { verifyToken } from "../services/qr";

interface CheckinBody {
  token: string;
}

interface AttendeeLookupRow extends QueryResultRow {
  id: string;
  name: string;
  qr_token: string;
  event_name: string;
}

interface CheckinInsertRow extends QueryResultRow {
  checked_in_at: string | Date;
}

interface ExistingCheckinRow extends QueryResultRow {
  checked_in_at: string | Date;
}

function isCheckinBody(value: unknown): value is CheckinBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeBody = value as Record<string, unknown>;
  return typeof maybeBody.token === "string";
}

function isQrPayload(value: unknown): value is QrPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybePayload = value as Record<string, unknown>;
  return (
    typeof maybePayload.attendee_id === "string" &&
    typeof maybePayload.event_id === "string" &&
    typeof maybePayload.hmac === "string"
  );
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

const checkin = new Hono();

checkin.post("/", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);

  if (!isCheckinBody(body)) {
    return c.json({ error: "Body must include token" }, 400);
  }

  const parsed = (() => {
    try {
      return JSON.parse(body.token) as unknown;
    } catch {
      return null;
    }
  })();

  if (!isQrPayload(parsed)) {
    return c.json({ status: "invalid_token" }, 401);
  }

  if (!verifyToken(parsed.attendee_id, parsed.event_id, parsed.hmac)) {
    return c.json({ status: "invalid_token" }, 401);
  }

  const attendee = await query<AttendeeLookupRow>(
    `SELECT
       a.id,
       a.name,
       a.qr_token,
       e.name AS event_name
     FROM attendees a
     INNER JOIN events e ON e.id = a.event_id
     WHERE a.id = $1 AND a.event_id = $2`,
    [parsed.attendee_id, parsed.event_id],
  );

  const attendeeRow = attendee.rows[0];

  if (!attendeeRow || attendeeRow.qr_token !== parsed.hmac) {
    return c.json({ status: "invalid_token" }, 401);
  }

  const inserted = await query<CheckinInsertRow>(
    `INSERT INTO checkins (attendee_id)
     VALUES ($1)
     ON CONFLICT (attendee_id) DO NOTHING
     RETURNING checked_in_at`,
    [attendeeRow.id],
  );

  if (inserted.rowCount === 0) {
    const existing = await query<ExistingCheckinRow>(
      "SELECT checked_in_at FROM checkins WHERE attendee_id = $1",
      [attendeeRow.id],
    );

    const checkedInAt = existing.rows[0]?.checked_in_at;

    return c.json({
      status: "already_checked_in",
      name: attendeeRow.name,
      checkedInAt: checkedInAt ? toIsoString(checkedInAt) : undefined,
    });
  }

  const insertedRow = inserted.rows[0];

  if (!insertedRow) {
    return c.json({ error: "Failed to persist check-in" }, 500);
  }

  return c.json({
    status: "ok",
    name: attendeeRow.name,
    event: attendeeRow.event_name,
    checkedInAt: toIsoString(insertedRow.checked_in_at),
  });
});

export default checkin;
