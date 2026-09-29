import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getEmailFromIdToken } from "@/lib/google";
import { encrypt } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const appUrl = process.env.APP_URL ?? url.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_no_code`);
  }
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_state_mismatch`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.id_token) {
      throw new Error("Google didn't return an id_token — check the OAuth scopes include 'openid' and 'email'");
    }
    const email = await getEmailFromIdToken(tokens.id_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token as string);

    const supabase = getSupabaseAdmin();
    const defaultNickname = email.split("@")[0];

    const { data: existing } = await supabase
      .from("connected_accounts")
      .select("id")
      .eq("email_address", email)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("connected_accounts")
        .update({ refresh_token_encrypted: encryptedRefreshToken, status: "active" })
        .eq("id", existing.id);
    } else {
      await supabase.from("connected_accounts").insert({
        provider: "gmail",
        email_address: email,
        nickname: defaultNickname,
        refresh_token_encrypted: encryptedRefreshToken,
        status: "active",
      });
    }

    const response = NextResponse.redirect(`${appUrl}/settings?connected=${encodeURIComponent(email)}`);
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err: any) {
    console.error("Google OAuth callback failed:", err);
    const response = NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent(err.message ?? "google_oauth_failed")}`
    );
    response.cookies.delete("google_oauth_state");
    return response;
  }
}