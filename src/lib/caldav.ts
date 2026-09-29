import { DAVClient } from "tsdav";
import ical from "node-ical";

export type FetchedEvent = {
  uid: string;
  title: string;
  start: Date;
  isRecurring: boolean;
};

/**
 * Verifies iCloud credentials work at all, by attempting a login + calendar
 * fetch. Used when the end user first pastes in their app-specific password,
 * so a typo gets caught immediately instead of surfacing as a silent sync
 * failure 15 minutes later.
 */
export async function testICloudCredentials(
  username: string,
  appPassword: string
): Promise<void> {
  const client = new DAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  await client.login();
  await client.fetchCalendars();
}

/**
 * Fetches events across every calendar in the account, within
 * [windowStart, windowEnd].
 *
 * Note on recurring events: this returns only the *next occurrence* within
 * the window for a recurring series, not one row per occurrence. Recurring
 * tasks are explicitly out of scope for v1 (see PRD), so treating a whole
 * recurring series as a single triage-able unit avoids flooding triage with
 * (for example) a daily standup every single day.
 */
export async function fetchICloudEvents(
  username: string,
  appPassword: string,
  windowStart: Date,
  windowEnd: Date
): Promise<FetchedEvent[]> {
  const client = new DAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  await client.login();
  const calendars = await client.fetchCalendars();

  const events: FetchedEvent[] = [];

  for (const calendar of calendars) {
    const objects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      },
    });

    for (const obj of objects) {
      if (!obj.data) continue;
      let parsed: ical.CalendarResponse;
      try {
        parsed = ical.parseICS(obj.data);
      } catch {
        continue; // skip anything we can't parse rather than fail the whole sync
      }

      for (const component of Object.values(parsed)) {
        if (component.type !== "VEVENT") continue;
        const uid = component.uid;
        const title = component.summary || "(untitled event)";
        if (!uid) continue;

        // node-ical attaches a live `rrule` (from the `rrule` package) when
        // the event recurs.
        const rrule = (component as any).rrule;
        if (rrule && typeof rrule.between === "function") {
          const occurrences: Date[] = rrule.between(windowStart, windowEnd, true);
          if (occurrences.length === 0) continue;
          events.push({
            uid,
            title,
            start: occurrences[0],
            isRecurring: true,
          });
        } else if (component.start) {
          const start = new Date(component.start as unknown as string);
          if (start >= windowStart && start <= windowEnd) {
            events.push({ uid, title, start, isRecurring: false });
          }
        }
      }
    }
  }

  return events;
}
