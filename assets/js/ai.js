async function requestAiAnalysis(){
 const button=document.getElementById("generateAiButton");
 setBusy(button,true,"Analyzing signals...");
 try{
  const{data:{session}}=await supabaseClient.auth.getSession();
  if(!session)throw new Error("Session expired. Please sign in again.");
  const response=await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/${APP_CONFIG.AI_FUNCTION_NAME}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`,apikey:APP_CONFIG.SUPABASE_ANON_KEY},body:JSON.stringify({report_date:new Date().toISOString().slice(0,10),force_refresh:true})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||payload.message||`Analysis failed (${response.status})`);
  const report=payload.report||payload.data||payload;
  renderAiReport(report);
  await refreshLatestAiReport(report);
  showToast("AI report updated");
 }catch(error){console.error("AI analysis failed",error);showToast(error.message||"Unable to update AI report","error")}
 finally{setBusy(button,false)}
}
async function refreshLatestAiReport(fallback){
 if(!window.currentUser&&!currentUser)return fallback;
 const user=window.currentUser||currentUser;
 const{data,error}=await supabaseClient.from("ai_reports").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(error){console.warn("Could not reload ai_reports",error);return fallback}
 if(data){renderAiReport(data);if(window.dashboardDataset)window.dashboardDataset.reports=[data]}
 return data||fallback;
}
function renderAiReport(report){
 if(!report)return;
 const detail=typeof report.report_json==="string"?safeJson(report.report_json):report.report_json||report.analysis||{};
 text("aiReadiness",report.readiness_score!=null?`${Math.round(+report.readiness_score)}%`:"-");
 text("aiRisk",detail.risk_level?`${capitalize(detail.risk_level)} attention`:"WELLNESS");
 text("aiHeadline",detail.headline||report.headline||"Your wellness summary");
 text("aiSummary",report.summary||detail.summary||"");
 text("aiGeneratedAt",report.created_at?`Updated ${formatDateTime(report.created_at)}`:"Updated just now");
 renderInsights("aiRecommendations",[detail.training_recommendation,detail.recovery_recommendation,detail.weight_management_note,...asArray(detail.recommendations)].filter(Boolean));
 renderInsights("aiFindings",asArray(detail.key_findings||detail.findings));
 if(report.readiness_score!=null)applyReadiness(Math.round(+report.readiness_score),report.summary||detail.summary||"");
}
function asArray(value){return Array.isArray(value)?value:value?[value]:[]}
function safeJson(value){try{return JSON.parse(value)}catch{return{}}}
function renderInsights(id,items){const el=document.getElementById(id);if(!el)return;const unique=[...new Set(asArray(items).filter(Boolean).map(String))];el.innerHTML=unique.length?unique.map((item,i)=>`<div class="insight"><span>${i+1}</span><p>${escapeHtml(item)}</p></div>`).join(""):'<div class="empty-state">No insights yet.</div>'}
