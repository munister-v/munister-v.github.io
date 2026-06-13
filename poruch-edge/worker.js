const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'sha256-z7PMPsgj05H5bUm9Swig+gVXeWzJEVuhjtJtQRE7Ewk='",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://app.munister.com.ua",
    "upgrade-insecure-requests",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    let assetPath = requestUrl.pathname.replace(/^\/poruch/, "");

    if (!assetPath || assetPath.endsWith("/")) {
      assetPath += "index.html";
    }

    const assetUrl = new URL(requestUrl);
    assetUrl.pathname = assetPath;

    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
    const response = new Response(assetResponse.body, assetResponse);

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }

    return response;
  },
};
