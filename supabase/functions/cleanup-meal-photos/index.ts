// cleanup-meal-photos - Deletes expired meal photos per retention policy
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Find meals with image_path and retention_until < now()
  const { data: expired, error } = await supabase.from("meals").select("id,image_path").lt("image_retention_until", new Date().toISOString()).not("image_path","is",null);
  if(error){ console.error(error); return new Response(JSON.stringify({error:error.message}), {status:500}); }

  let deleted=0;
  for(const row of expired||[]){
    if(row.image_path){
      await supabase.storage.from("meal-photos").remove([row.image_path]);
      await supabase.from("meals").update({image_path:null, image_retention_until:null}).eq("id", row.id);
      deleted++;
    }
  }
  return new Response(JSON.stringify({deleted}), {headers:{"Content-Type":"application/json"}});
});
