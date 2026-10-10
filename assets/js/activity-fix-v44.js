// activity-fix-v44.js - Patch 004 Activity Analysis Fixes
// Overrides openActivity with abortable fetch and better error handling
(() => {
"use strict";
let activityFetchController = null;
const {$,esc,num,date,duration,sport,icon,label,pace,toast} = window.UI || {};

function set(id,v){let e=document.getElementById(id); if(e) e.textContent=v;}

async function openActivityFixed(a){
  const S = window.APP;
  let activityStreamChart = window.activityStreamChart || null;
  let activityMap = window.activityMap || null;
  // Abort previous
  if(activityFetchController){ try{activityFetchController.abort();}catch{} }
  activityFetchController = new AbortController();
  const signal = activityFetchController.signal;

  window.APP = S;
  let activeActivityIndex = S.activities.findIndex(x=>String(x.id)===String(a.id));
  window.activeActivityIndex = activeActivityIndex;
  if(window.activityStreamChart){ try{window.activityStreamChart.destroy();}catch{} window.activityStreamChart=null; }
  if(window.activityMap){ try{window.activityMap.remove();}catch{} window.activityMap=null; }

  const d=document.getElementById("detail"), dialog=document.getElementById("activityDialog");
  if(!d || !dialog) return;
  const index=activeActivityIndex, previous=index>0?S.activities[index-1]:null, next=index>=0&&index<S.activities.length-1?S.activities[index+1]:null;
  const distanceKm=(Number(a.distance_m)||0)/1000, durationSeconds=Number(a.duration_seconds)||0;
  const avgSpeed=durationSeconds>0&&distanceKm>0?(distanceKm/(durationSeconds/3600)):0;
  const metrics=[
    ["DISTANCE", `${distanceKm.toFixed(2)} km`],
    ["DURATION", (window.UI && window.UI.duration ? window.UI.duration(a.duration_seconds) : `${durationSeconds}s`)],
    [ (sport(a.activity_type)==="ride"?"AVG SPEED":"AVG PACE"), sport(a.activity_type)==="ride" ? (avgSpeed?`${avgSpeed.toFixed(1)} km/h`:"—") : (window.UI && window.UI.pace ? window.UI.pace(a) : "—")],
    ["AVG HEART RATE", a.avg_heart_rate?`${a.avg_heart_rate} bpm`:"—"],
    ["MAX HEART RATE", a.max_heart_rate?`${a.max_heart_rate} bpm`:"—"],
    ["ELEVATION GAIN", a.elevation_gain_m!=null?`${Math.round(Number(a.elevation_gain_m))} m`:"—"],
    ["CALORIES", a.calories!=null?`${Math.round(Number(a.calories))} kcal`:"—"]
  ];
  d.innerHTML = `<div class="detailTopline"><span class="detailKicker">ACTIVITY REPORT</span><span class="detailCounter">${index>=0?index+1:1} / ${S.activities.length}</span></div><header class="activityHero activityHeroV25"><span class="activityHeroIcon">${icon(a.activity_type)}</span><div class="activityHeroCopy"><small>${label(a.activity_type)} · ${date(a.started_at)}</small><h2>${esc(a.activity_name||label(a.activity_type))}</h2><p>Review your effort, heart rate and recorded performance streams.</p></div></header><div class="detailNavV25"><button id="detailPrev" class="detailNavButton" ${previous?"":"disabled"} type="button"><span>←</span><span><small>PREVIOUS</small><b>${previous?esc(previous.activity_name||label(previous.activity_type)):"No previous activity"}</b></span></button><button id="detailNext" class="detailNavButton" ${next?"":"disabled"} type="button"><span><small>NEXT</small><b>${next?esc(next.activity_name||label(next.activity_type)):"No next activity"}</b></span><span>→</span></button></div><section class="detailStats detailStatsV25">${metrics.map(([k,v])=>`<div class="detailMetric"><span>${k}</span><b>${v}</b></div>`).join("")}</section><section class="activityAnalyzer detailDataPanel" id="activityAnalyzer"><div class="activityAnalyzerHead"><div><p class="eyebrow">PERSONAL PERFORMANCE</p><h3>AI Activity Analyzer</h3><p>Get a plain-language summary using recorded metrics and available FIT streams.</p></div><span class="activityAnalyzerIcon">✦</span></div><button type="button" id="analyzeActivityButton" class="btn primary activityAnalyzeButton">✦ Analyze this activity</button><div id="activityAnalysisResult" class="activityAnalysisResult" aria-live="polite"><p class="activityAnalysisHint">Run an analysis to see highlights, pacing and next steps.</p></div></section><div class="detailSectionHeading"><div><p class="eyebrow">ACTIVITY DATA</p><h3>Performance breakdown</h3></div><span class="detailDataBadge">${a.stream_status?esc(String(a.stream_status).replace(/[_-]/g," ")):"ACTIVITY SUMMARY"}</span></div><div id="detailLoading" class="detailLoading"><span class="detailLoadingDot"></span><span>Loading detailed activity streams…</span></div>`;

  if(!dialog.open) dialog.showModal();
  const goTo=target=>{if(target) openActivityFixed(target);};
  const prevBtn=document.getElementById("detailPrev");
  const nextBtn=document.getElementById("detailNext");
  if(prevBtn) prevBtn.onclick=()=>goTo(previous);
  if(nextBtn) nextBtn.onclick=()=>goTo(next);
  const analyzeBtn=document.getElementById("analyzeActivityButton");
  if(analyzeBtn) analyzeBtn.onclick=()=>window.analyzeActivitySession ? window.analyzeActivitySession(a, window.__activeActivityStreams||null) : null;
  window.__activeActivityStreams=null;

  try{
    const {data, error} = await window.db.from("activity_streams").select("*").eq("activity_id", a.id).maybeSingle();
    if(signal.aborted) return;
    if(String(S.activities[window.activeActivityIndex]?.id)!==String(a.id)) return;
    const loading=document.getElementById("detailLoading");
    if(error || !data){
      if(loading) loading.innerHTML='<span class="detailEmptyIcon">↗</span><b>Detailed streams are not available yet</b><span>Run the Activity Intelligence workflow to import FIT streams. The analyzer can still summarize the metrics above.</span>';
      return;
    }
    window.__activeActivityStreams=data;
    const hasStreams=[data.speed_series,data.heart_rate_series,data.cadence_series,data.power_series,data.altitude_series].some(s=>Array.isArray(s)&&s.length);
    if(loading) loading.remove();
    d.insertAdjacentHTML("beforeend", `${data.route?.length?'<section class="detailDataPanel"><div class="detailSectionHeading"><div><p class="eyebrow">ROUTE</p><h3>Where you went</h3></div></div><div id="map" aria-label="Activity route map"></div></section>':''}${hasStreams?'<article class="combinedStreamCard detailDataPanel"><div class="combinedStreamHead"><div><p class="eyebrow">PERFORMANCE STREAMS</p><h3>Effort across the activity</h3></div><span class="chartBadge">VS TIME</span></div><p class="combinedStreamNote">Compare speed, heart rate, cadence, power and elevation on a shared timeline. Normalized for comparison; tooltip shows original units.</p><div class="combinedStreamCanvas"><canvas id="activityCombinedChart"></canvas></div></article>':'<section class="detailDataPanel detailNoStreams"><span class="detailEmptyIcon">⌁</span><h3>No performance streams yet</h3><p>Summary available, but detailed samples not imported.</p></section>'}`);
    if(data.route?.length && window.L){
      const map = L.map("map",{zoomControl:false});
      window.activityMap = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap"}).addTo(map);
      const line=L.polyline(data.route,{color:"#22c7f2",weight:5}).addTo(map);
      map.fitBounds(line.getBounds(),{padding:[15,15]});
    }
    if(hasStreams && window.renderCombinedActivityChart) window.renderCombinedActivityChart(data);
  }catch(err){
    if(err.name==="AbortError") return;
    console.error("Activity streams failed", err);
    const loading=document.getElementById("detailLoading");
    if(loading) loading.innerHTML=`<span class="detailEmptyIcon">⚠</span><b>Could not load streams</b><span>${esc(err.message||"Network error")}. Summary still available.</span>`;
  }
}

// Expose globally to override
window.openActivityFixed = openActivityFixed;
// Try to override existing openActivity if present
const originalOpen = window.openActivity;
window.openActivity = function(a){
  // Use fixed version
  return openActivityFixed(a);
};

// Improved analyzeActivitySession with duplicate guard and malformed response handling
let analyzing = false;
async function analyzeActivitySessionFixed(activity, streams){
  if(analyzing) return;
  const button=document.getElementById("analyzeActivityButton"), result=document.getElementById("activityAnalysisResult");
  if(!button || !result) return;
  analyzing=true;
  const old=button.innerHTML;
  button.disabled=true;
  button.innerHTML='<span class="analyzerSpinner"></span> Analyzing session…';
  result.innerHTML='<p class="activityAnalysisHint">Reviewing distance, duration, heart rate and streams…</p>';
  try{
    const facts = window.buildActivityFacts ? window.buildActivityFacts(activity, streams) : {activity:{name:activity.activity_name, type:activity.activity_type}, streams:{}};
    let report=null, remoteError="";
    try{
      const {data:{session}} = await window.db.auth.getSession();
      const cfg=window.APP_CONFIG||{};
      if(session?.access_token && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY){
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(), 30000);
        let response;
        try{
          response = await fetch(`${cfg.SUPABASE_URL}/functions/v1/analyze-activity`,{
            method:"POST",
            headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`,apikey:cfg.SUPABASE_ANON_KEY},
            body:JSON.stringify({activity:facts.activity, streams:facts.streams}),
            signal:controller.signal
          });
        }finally{clearTimeout(timeout);}
        const raw=await response.text();
        let payload={};
        try{payload=raw?JSON.parse(raw):{};}catch{payload={message:raw};}
        if(response.ok){
          report=payload.analysis||payload.report||payload;
          // Validate report shape
          if(!report || (typeof report!=="object")) throw new Error("Invalid AI response format");
        }else{
          remoteError=payload.error||payload.message||`AI service unavailable (${response.status})`;
        }
      }else{
        remoteError="AI service not configured";
      }
    }catch(e){
      remoteError=e?.name==="AbortError"?"request timed out after 30s":e?.message||"AI service unavailable";
    }
    if(!report || !(report.summary||report.headline||report.key_findings||report.findings)){
      // Local fallback
      if(window.buildLocalActivitySummary){
        report=window.buildLocalActivitySummary(activity, streams);
        report.mode="local";
        report.notice="Quick summary from recorded data. Deploy Edge Function analyze-activity for AI analysis.";
      }else{
        report={headline:"Session summary", summary:"This is a data-based overview from Garmin recorded values.", key_findings:[`Distance: ${(Number(activity.distance_m)/1000).toFixed(2)} km`], recommendations:["Compare with similar activities"], mode:"local"};
      }
    }else{
      report.mode="ai";
    }
    // Ensure stale check
    const S=window.APP;
    if(S && S.activities && window.activeActivityIndex>=0){
      if(String(S.activities[window.activeActivityIndex]?.id)!==String(activity.id)) return;
    }
    if(window.renderActivityAnalysis) window.renderActivityAnalysis(report, remoteError);
    else {
      // Fallback render
      result.innerHTML=`<div><h4>${esc(report.headline||"Insights")}</h4><p>${esc(report.summary||"")}</p></div>`;
    }
  }catch(err){
    console.error("Analyze failed", err);
    result.innerHTML=`<p class="activityAnalysisError">${esc(err.message||"Unable to analyze")}</p>`;
  }finally{
    analyzing=false;
    button.disabled=false;
    button.innerHTML=old;
  }
}
window.analyzeActivitySession = analyzeActivitySessionFixed;
})();
