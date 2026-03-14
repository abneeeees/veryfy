import { Hono } from "hono";
import type { QueryResultRow } from "pg";

import { query } from "../db";
import { generateQRImage } from "../services/qr";
import { isUuid } from "../utils/uuid";

interface AttendeeQrRow extends QueryResultRow {
  id: string;
  event_id: string;
  qr_token: string;
}

const qr = new Hono();

qr.get("/:attendeeId", async (c) => {
  const attendeeId = c.req.param("attendeeId");

  if (!isUuid(attendeeId)) {
    return c.json({ error: "attendeeId must be a valid UUID" }, 400);
  }

  const result = await query<AttendeeQrRow>(
    `SELECT id, event_id, qr_token
     FROM attendees
     WHERE id = $1`,
    [attendeeId],
  );

  const attendee = result.rows[0];

  if (!attendee) {
    return c.json({ error: "Attendee not found" }, 404);
  }

  const qrBase64 = await generateQRImage({
    attendee_id: attendee.id,
    event_id: attendee.event_id,
    hmac: attendee.qr_token,
  });

  return new Response(Buffer.from(qrBase64, "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
});

export default qr;
