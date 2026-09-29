import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { fetchRecentMessages } from "@/lib/google";
import { fetchICloudEvents } from "@/lib/caldav";
import { EMAIL_FEATURE_ENABLED } from "@/lib/features";

export const maxDuration = 60; // seconds — Vercel Hobby plan cap; adjust if you're on Pro

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const summary = { emailsChecked: 0, emailsAdded: 0, eventsChecked: 0, eventsAdded: 0, errors: [] as string[] };

  const { data: settings } = await supabase
    .from("app_settings")
    .select("lookback_days")
    .eq("id", 1)
    .single();
  const lookbackDays = settings?.lookback_days ?? 14;

  const { data: ignoredRows } = await supabase.from("ignored_senders").select("email_address");
  const ignoredSet = new Set((ignoredRows ?? []).map((r) => r.email_address.toLowerCase()));

  // ---- Gmail ---- (skipped while EMAIL_FEATURE_ENABLED is false — see /lib/features.ts)
  if (EMAIL_FEATURE_ENABLED) {
    const { data: accounts } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("status", "active");

    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    for (const account of accounts ?? []) {
      try {
        const refreshToken = decrypt(account.refresh_token_encrypted);
        const messages = await fetchRecentMessages(refreshToken, sinceDate);
        summary.emailsChecked += messages.length;

        for (const msg of messages) {
          if (ignoredSet.has(msg.senderEmail)) continue;

          if (msg.messageId) {
            const { data: dupe } = await supabase
              .from("triage_items")
              .select("id")
              .eq("message_id", msg.messageId)
              .maybeSingle();
            if (dupe) continue;
          }

          const { error: insertError } = await supabase.from("triage_items").insert({
            source: "email",
            source_ref: msg.gmailId,
            message_id: msg.messageId,
            source_account_id: account.id,
            sender_email: msg.senderEmail,
            title: msg.subject,
            preview: msg.from,
            raw_date: msg.date.toISOString(),
            suggested_list_id: account.default_list_id,
            state: "pending",
          });
          if (insertError) {
            // A unique-constraint hit here just means another sync run beat us
            // to it (message_id collision) — not a real error.
            if (!insertError.message.includes("duplicate key")) {
              summary.errors.push(`Gmail insert (${account.email_address}): ${insertError.message}`);
            }
          } else {
            summary.emailsAdded += 1;
          }
        }
      } catch (err: any) {
        summary.errors.push(`Gmail (${account.email_address}): ${err.message ?? "unknown error"}`);
        await supabase
          .from("connected_accounts")
          .update({ status: "needs_reauth" })
          .eq("id", account.id);
      }
    }
  }

  // ---- iCloud Calendar ----
  const { data: calConnection } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  if (calConnection) {
    try {
      const appPassword = decrypt(calConnection.icloud_app_password_encrypted);
      const windowStart = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // include yesterday, in case of stragglers
      const windowEnd = new Date(Date.now() + lookbackDays * 24 * 60 * 60 * 1000); // forward-looking, since upcoming events are what's actionable
      const events = await fetchICloudEvents(
        calConnection.icloud_username,
        appPassword,
        windowStart,
        windowEnd
      );
      summary.eventsChecked += events.length;

      for (const event of events) {
        const { data: dupe } = await supabase
          .from("triage_items")
          .select("id")
          .eq("source", "calendar")
          .eq("source_ref", event.uid)
          .maybeSingle();
        if (dupe) continue;

        const { error: insertError } = await supabase.from("triage_items").insert({
          source: "calendar",
          source_ref: event.uid,
          calendar_connection_id: calConnection.id,
          title: event.title,
          raw_date: event.start.toISOString(),
          suggested_list_id: calConnection.default_list_id,
          state: "pending",
        });
        if (insertError) {
          summary.errors.push(`Calendar insert: ${insertError.message}`);
        } else {
          summary.eventsAdded += 1;
        }
      }
    } catch (err: any) {
      summary.errors.push(`iCloud Calendar: ${err.message ?? "unknown error"}`);
      await supabase
        .from("calendar_connections")
        .update({ status: "needs_reauth" })
        .eq("id", calConnection.id);
    }
  }

  return NextResponse.json(summary);
}
