import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

export interface QrPayload {
  attendee_id: string;
  event_id: string;
  hmac: string;
}

function getSecret(): string {
  const secret = Bun.env.HMAC_SECRET;

  if (!secret) {
    throw new Error("HMAC_SECRET is not set");
  }

  return secret;
}

export function signToken(attendeeId: string, eventId: string): string {
  return createHmac("sha256", getSecret()).update(`${attendeeId}${eventId}`).digest("hex");
}

export function verifyToken(attendeeId: string, eventId: string, hmac: string): boolean {
  const expected = signToken(attendeeId, eventId);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(hmac, "hex");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function buildQrPayload(attendeeId: string, eventId: string): QrPayload {
  return {
    attendee_id: attendeeId,
    event_id: eventId,
    hmac: signToken(attendeeId, eventId),
  };
}

export async function generateQRImage(payload: QrPayload): Promise<string> {
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "H",
    margin: 4,
    type: "image/png",
    width: 512,
  });

  const [, base64] = dataUrl.split(",");

  if (!base64) {
    throw new Error("Failed to generate QR image");
  }

  return base64;
}
