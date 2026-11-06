import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
/** Only the four already published supporting-character portraits may be served. */
const portraits: Record<string, string> = {
  "il-dottore": "support/il-dottore/3ce371a5-dc7d-44b2-babb-992f6afc0934.png",
  "il-gatto": "support/il-gatto/ec93f550-0d0e-4859-8322-b6fd6226d6ea.png",
  "la-volpe": "support/la-volpe/95edd375-a08e-49a0-b12b-9aed2414ff00.png",
  "tolkien": "support/tolkien/37b911d4-bb1b-48fb-a1b0-0a0daecf006f.png"
};
Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const slug = new URL(req.url).searchParams.get("personaggio") || "";
  const path = Object.prototype.hasOwnProperty.call(portraits, slug) ? portraits[slug] : null;
  if (!path) return new Response("Not found", { status: 404 });
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return new Response("Storage unavailable", { status: 503 });
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.storage.from("comic-drafts").download(path);
  if (error || !data) return new Response("Image unavailable", { status: 404 });
  const bytes = await data.arrayBuffer();
  return new Response(req.method === "HEAD" ? null : bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" } });
});