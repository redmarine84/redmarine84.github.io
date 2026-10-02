const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://redmarine84.github.io";
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, {status:204, headers:cors});
    if (origin && origin !== allowedOrigin) return json({error:"Origin not allowed."}, 403, cors);

    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/login") return await handleLogin(request, env, cors);

      const user = await verifyAuthorization(request, env);
      if (!user) return json({error:"Unauthorized."}, 401, cors);

      if (request.method === "POST" && url.pathname === "/recipes") {
        const body = await request.json();
        if (!Array.isArray(body.recipes)) return json({error:"recipes must be an array."}, 400, cors);
        const content = utf8ToBase64(JSON.stringify(body.recipes, null, 2));
        await putGithubFile(env, env.RECIPES_PATH || "data/recipes.json", content, body.message || "Update family cookbook");
        return json({ok:true}, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/image") {
        const body = await request.json();
        const path = normalizePath(body.path || "");
        if (!path.startsWith("images/")) return json({error:"Images must be stored under images/."}, 400, cors);
        if (!/^[A-Za-z0-9+/=]+$/.test(body.content || "")) return json({error:"Invalid image content."}, 400, cors);
        if ((body.content || "").length > 12 * 1024 * 1024) return json({error:"Image is too large."}, 413, cors);
        await putGithubFile(env, path, body.content, body.message || ("Upload recipe image: " + path));
        return json({ok:true, path}, 200, cors);
      }

      return json({error:"Not found."}, 404, cors);
    } catch (error) {
      return json({error:error.message || "Request failed."}, 500, cors);
    }
  }
};

async function handleLogin(request, env, cors) {
  const body = await request.json();
  const usernameOk = safeEqual(String(body.username || ""), String(env.ADMIN_USERNAME || ""));
  const passwordOk = safeEqual(String(body.password || ""), String(env.ADMIN_PASSWORD || ""));
  if (!usernameOk || !passwordOk) return json({error:"Incorrect username or password."}, 401, cors);

  const now = Math.floor(Date.now()/1000);
  const payload = {sub:String(env.ADMIN_USERNAME), iat:now, exp:now + 60*60*12};
  const token = await signToken(payload, env.SESSION_SECRET);
  return json({token, expiresIn:43200}, 200, cors);
}

async function verifyAuthorization(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7), env.SESSION_SECRET);
}

async function signToken(payload, secret) {
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  const body = base64Url(JSON.stringify(payload));
  const sig = await hmac(body, secret);
  return body + "." + sig;
}

async function verifyToken(token, secret) {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = await hmac(body, secret);
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(a, b) {
  const aa = encoder.encode(a), bb = encoder.encode(b);
  const length = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i=0;i<length;i++) diff |= (aa[i % (aa.length || 1)] || 0) ^ (bb[i % (bb.length || 1)] || 0);
  return diff === 0;
}

async function putGithubFile(env, path, content, message) {
  requireEnv(env);
  const owner = env.GITHUB_OWNER || "redmarine84";
  const repo = env.GITHUB_REPO || "redmarine84.github.io";
  const branch = env.GITHUB_BRANCH || "master";
  const cleanPath = normalizePath(path);
  const url = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/contents/" + cleanPath.split("/").map(encodeURIComponent).join("/");
  const headers = {
    "Authorization":"Bearer " + env.GITHUB_TOKEN,
    "Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"McIntyre-Cookbook-Admin",
    "Content-Type":"application/json"
  };

  let sha = "";
  const current = await fetch(url + "?ref=" + encodeURIComponent(branch), {headers});
  if (current.ok) {
    const existing = await current.json();
    sha = existing.sha || "";
  } else if (current.status !== 404) {
    throw new Error("Could not read current GitHub file: " + await githubError(current));
  }

  const body = {message, content, branch};
  if (sha) body.sha = sha;
  const response = await fetch(url, {method:"PUT", headers, body:JSON.stringify(body)});
  if (!response.ok) throw new Error("GitHub publish failed: " + await githubError(response));
  return response.json();
}

function requireEnv(env) {
  for (const key of ["GITHUB_TOKEN","ADMIN_USERNAME","ADMIN_PASSWORD","SESSION_SECRET"]) {
    if (!env[key]) throw new Error(key + " is not configured.");
  }
}
function normalizePath(value) { return String(value || "").replace(/\\/g,"/").replace(/^\/+/, "").replace(/\/+/g,"/").trim(); }
async function githubError(response) {
  try { const data = await response.json(); return data.message || (response.status + " " + response.statusText); }
  catch { return response.status + " " + response.statusText; }
}
function utf8ToBase64(value) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary);
}
function base64Url(value) { return bytesToBase64Url(encoder.encode(value)); }
function base64UrlDecode(value) {
  value = value.replace(/-/g,"+").replace(/_/g,"/");
  while (value.length % 4) value += "=";
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}
function json(data, status, cors) { return new Response(JSON.stringify(data), {status, headers:{...cors,"Content-Type":"application/json; charset=utf-8"}}); }
