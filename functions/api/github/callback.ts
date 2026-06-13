// Completes the GitHub OAuth flow: exchanges the code for an access token using
// the client secret (server-side), then redirects back to the app with the token
// in the URL fragment (#gh=...), which is never sent to any server.

interface Env {
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const redirect = (frag: string) =>
    Response.redirect(`${url.origin}/app/repository#${frag}`, 302);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!code) return redirect("gh_error=missing_code");
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) {
    return redirect("gh_error=not_configured");
  }

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/github/callback`,
      }),
    });
    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) return redirect(`gh_error=${data.error ?? "exchange_failed"}`);
    return redirect(`gh=${encodeURIComponent(data.access_token)}&state=${encodeURIComponent(state)}`);
  } catch {
    return redirect("gh_error=network");
  }
};
