import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "AI analysis is handled by Puter on the frontend."
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});