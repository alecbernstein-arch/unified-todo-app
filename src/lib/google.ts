import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must be set"
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Builds the URL that starts the OAuth flow for connecting a Gmail account.
 * `state` round-trips through Google and back to our callback route — we use
 * it to carry a CSRF nonce (see /api/google/connect).
 *
 * Includes 'openid' + 'email' alongside Gmail access so Google's token
 * response includes an id_token with the account's email address already in
 * it — see exchangeCodeForTokens below. (An earlier version of this code
 * tried to fetch the email via a separate userinfo API call, but never asked
 * for the scope that call needs, which is why it failed with an
 * authentication error.)
 */
export function getGoogleAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // forces a refresh_token on every connect, even for accounts connected before
    scope: [GMAIL_SCOPE, "openid", "email"],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. This usually means the account " +
        "already granted access without 'prompt=consent', or Testing-mode " +
        "consent hasn't been re-granted. Try disconnecting and reconnecting."
    );
  }
  return tokens;
}

/**
 * Pulls the email address straight out of the id_token Google returns
 * alongside the access/refresh tokens (present because we requested the
 * 'openid' and 'email' scopes) — verified against Google's signing keys, so
 * this is safe to trust without an extra network call.
 */
export async function getEmailFromIdToken(idToken: string): Promise<string> {
  const client = getOAuthClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google's sign-in response didn't include an email address");
  }
  return payload.email;
}

export type FetchedMessage = {
  gmailId: string;
  messageId: string | null; // RFC 5322 Message-ID header
  from: string; // raw "From" header, e.g. `Some Name <person@example.com>`
  senderEmail: string; // just the email address
  subject: string;
  date: Date;
};

/** Extracts just the email address out of a "From" header value. */
function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  return fromHeader.trim().toLowerCase();
}

/**
 * Fetches recent messages for a connected account, since `sinceDate`.
 * Uses format:'metadata' so we only pull headers, not full message bodies —
 * we don't need the content, and it keeps this well within gmail.readonly's
 * spirit of minimal access.
 */
export async function fetchRecentMessages(
  refreshToken: string,
  sinceDate: Date
): Promise<FetchedMessage[]> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth: client });

  const afterQuery = `after:${Math.floor(sinceDate.getTime() / 1000)}`;
  const list = await gmail.users.messages.list({
    userId: "me",
    q: afterQuery,
    maxResults: 100,
  });

  const messages = list.data.messages ?? [];
  const results: FetchedMessage[] = [];

  for (const m of messages) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Message-ID", "Date"],
    });
    const headers = full.data.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    const from = get("From");
    const dateHeader = get("Date");
    results.push({
      gmailId: m.id,
      messageId: get("Message-ID") || null,
      from,
      senderEmail: extractEmailAddress(from),
      subject: get("Subject") || "(no subject)",
      date: dateHeader ? new Date(dateHeader) : new Date(),
    });
  }

  return results;
}