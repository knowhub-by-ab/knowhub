// Begins the GitHub OAuth flow: redirects to GitHub's authorize page.
// Requires GITHUB_OAUTH_CLIENT_ID (and _SECRET for the callback) as Pages secrets.

interface Env {
  GITHUB_OAUTH_CLIENT_ID?: string;
}

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => {
  const url = new URL(request.url);
  if (!env.GITHUB_OAUTH_CLIENT_ID) {
    return new Response("GitHub OAuth not configured (set GITHUB_OAUTH_CLIENT_ID).", {
      status: 503,
    });
  }
  const state = url.searchParams.get("state") ?? "";
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/github/callback`);
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);
  return Response.redirect(authorize.toString(), 302);
};
