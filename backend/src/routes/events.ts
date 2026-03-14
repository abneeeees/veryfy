import { Hono } from "hono";
import type { QueryResultRow } from "pg";

import { query } from "../db";

interface CreateEventBody {
  name: string;
  date: string;
}

interface EventRow extends QueryResultRow {
  id: string;
  name: string;
  date: string;
}

function isCreateEventBody(value: unknown): value is CreateEventBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeBody = value as Record<string, unknown>;
  return typeof maybeBody.name === "string" && typeof maybeBody.date === "string";
}

function isIsoDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
}

const events = new Hono();

events.post("/", async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);

  if (!isCreateEventBody(body)) {
    return c.json({ error: "Body must include name and date" }, 400);
  }

  const name = body.name.trim();
  const date = body.date.trim();

  if (!name) {
    return c.json({ error: "Event name is required" }, 400);
  }

  if (!isIsoDate(date)) {
    return c.json({ error: "Date must be in YYYY-MM-DD format" }, 400);
  }

  const result = await query<EventRow>(
    `INSERT INTO events (name, date)
     VALUES ($1, $2)
     RETURNING id, name, date::text`,
    [name, date],
  );

  return c.json(result.rows[0], 201);
});

export default events;
