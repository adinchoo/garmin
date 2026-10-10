(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let focus = localStorage.getItem("coach-focus") || "balanced";
  let working = false;

  function set(id, value) { const el=document.getElementById(id); if(el) el.textContent=value; }
  function progress(id, value) { const el=document.getElementById(id); if(el) el.style.width=`${Math.max(4,Math.min(100,value))}%`; }
  function array(value) { return Array.isArray(value) ? value : value ? [value] : []; }
  function reportJson(report) { if(!report)return{};if(typeof report.report_json==="string"){try{return JSON.parse(report.report_json)}catch{return{}}}return report.report_json||report.analysis||report; }
  function formatDate(value) { return value ? new Date(value).toLocaleString([],{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}) : "Just now"; }

  function signals() {
    const state=window.APP||{},daily=state.daily?.[0]||{},sleep=state.sleep?.[0]||{},meals=state.meals||[],activities=state.activities||[];
    const sleepMinutes=n(sleep.duration_minutes),sleepScore=n(sleep.sleep_score)||(sleepMinutes?Math.min(100,Math.round(sleepMinutes/480*100)):0);
    const stress=n(daily.stress_average),battery=n(daily.body_battery_high),rhr=n(daily.resting_heart_rate);
    const recovery=Math.round(Math.max(1,Math.min(100,(sleepScore*.42)+(battery*.35)+(Math.max(0,100-stress)*.23))));
    const recentActivities=activities.filter(a=>(Date.now()-new Date(a.started_at).getTime())/86400000<7);
    const loadMinutes=recentActivities.reduce((sum,a)=>sum+n(a.duration_seconds)/60,0),load=Math.round(Math.min(100,loadMinutes/240*100));
    const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const todayMeals=meals.filter(m=>{const d=new Date(m.meal_time);return d>=start&&d<end});const calories=todayMeals.reduce((sum,m)=>sum+n(m.estimated_calories),0),goal=n(state.profile?.daily_calorie_goal)||2000,fuel=Math.round(Math.min(100,calories/goal*100));
    return {daily,sleep,recovery,load,sleepScore,fuel,calories,goal,loadMinutes,rhr,stress,battery};
  }


  function startOfWeek() { const d=new Date(); d.setHours(0,0,0,0); const day=d.getDay(); d.setDate(d.getDate()-(day===0?6:day-1)); return d; }
  function renderWeeklyGoals() {
    const state=window.APP||{},start=startOfWeek(),end=new Date(start);end.setDate(end.getDate()+7);
    const activities=(state.activities||[]).filter(a=>{const d=new Date(a.started_at);return d>=start&&d<end});
    const daily=(state.daily||[]).filter(x=>{const d=new Date(`${x.health_date}T00:00:00`);return d>=start&&d<end});
    const sleep=(state.sleep||[]).filter(x=>{const d=new Date(`${x.sleep_date}T00:00:00`);return d>=start&&d<end});
    const sessionTarget=4,minuteTarget=180,stepTarget=5,sleepTarget=5;
    const sessions=activities.length,minutes=Math.round(activities.reduce((sum,a)=>sum+n(a.duration_seconds)/60,0)),stepDays=daily.filter(x=>n(x.steps)>=10000).length,sleepDays=sleep.filter(x=>n(x.duration_minutes)>=420).length;
    const ratios=[sessions/sessionTarget,minutes/minuteTarget,stepDays/stepTarget,sleepDays/sleepTarget].map(x=>Math.min(1,x));const overall=Math.round(ratios.reduce((a,b)=>a+b,0)/ratios.length*100);
    set("weeklySessionsCurrent",sessions);set("weeklyMinutesCurrent",minutes);set("weeklyStepsCurrent",stepDays);set("weeklySleepCurrent",sleepDays);set("weeklyGoalOverall",`${overall}%`);
    progress("weeklySessionsBar",sessions/sessionTarget*100);progress("weeklyMinutesBar",minutes/minuteTarget*100);progress("weeklyStepsBar",stepDays/stepTarget*100);progress("weeklySleepBar",sleepDays/sleepTarget*100);
    const ring=$("#weeklyGoalRing");if(ring)ring.style.setProperty("--weekly-goal",overall);
    const finish=new Date(end);finish.setDate(finish.getDate()-1);set("weeklyGoalPeriod",`${start.toLocaleDateString([],{month:"short",day:"numeric"})}–${finish.toLocaleDateString([],{month:"short",day:"numeric"})}`);
    set("weeklyGoalHeadline",overall>=100?"Weekly goals completed":overall>=75?"Strong week in progress":overall>=45?"Momentum is building":"Build your weekly momentum");
    set("weeklyGoalMessage",overall>=100?"Excellent consistency. Protect recovery before adding more volume.":overall>=75?"You are close. One focused session may complete the week.":overall>=45?"Keep the next session realistic and maintain sleep quality.":"Start with one achievable session and a strong sleep routine.");
    set("weeklySessionsNote",sessions>=sessionTarget?"Session goal achieved":`${Math.max(0,sessionTarget-sessions)} sessions remaining`);set("weeklyMinutesNote",minutes>=minuteTarget?"Training minute goal achieved":`${Math.max(0,minuteTarget-minutes)} minutes remaining`);set("weeklyStepsNote",stepDays>=stepTarget?"Step-day goal achieved":`${Math.max(0,stepTarget-stepDays)} goal days remaining`);set("weeklySleepNote",sleepDays>=sleepTarget?"Sleep-day goal achieved":`${Math.max(0,sleepTarget-sleepDays)} sleep days remaining`);
  }

  function renderSignalCards() {
    const s=signals();
    set("coachRecoveryScore",`${s.recovery}%`);set("coachRecoveryLabel",s.recovery>=80?"Strong recovery window":s.recovery>=60?"Balanced recovery":"Recovery needs attention");progress("coachRecoveryBar",s.recovery);
    set("coachLoadScore",`${Math.round(s.loadMinutes)} min`);set("coachLoadLabel",s.load>=80?"High weekly volume":s.load>=45?"Productive training load":"Room to build gradually");progress("coachLoadBar",s.load);
    set("coachSleepScore",s.sleepScore?`${s.sleepScore}%`:"--");set("coachSleepLabel",s.sleepScore>=80?"Sleep supported recovery":s.sleepScore>=60?"Sleep was acceptable":"Protect sleep tonight");progress("coachSleepBar",s.sleepScore);
    set("coachFuelScore",`${Math.round(s.calories)} kcal`);set("coachFuelLabel",s.fuel>=90?"Daily fuel nearly complete":s.fuel>=45?"Fueling is in progress":"Log meals for better guidance");progress("coachFuelBar",s.fuel);
    const ring=$("#coachReadinessRing");if(ring)ring.style.setProperty("--coach-score",s.recovery);
  }

  function renderReport(report) {
    if(!report)return;
    const data=reportJson(report),score=Math.round(n(report.readiness_score??data.readiness_score)||signals().recovery);
    set("aiScore",`${score}%`);set("coachStatus",score>=80?"Ready to perform":score>=60?"Balanced training day":"Recovery first");set("coachGeneratedAt",`Updated ${formatDate(report.created_at)}`);
    const ring=$("#coachReadinessRing");if(ring)ring.style.setProperty("--coach-score",score);
    set("aiTitle",data.headline||report.headline||"Your personalized daily plan");set("aiSummary",data.summary||report.summary||"Your latest signals have been translated into a practical plan.");
    const training=data.training_recommendation||data.workout_recommendation||array(data.recommendations)[0]||defaultWorkout(score,focus);
    const recovery=data.recovery_recommendation||"Hydrate, eat a balanced meal and protect tonight’s sleep window.";
    const effort=data.effort_level||data.recommended_effort||(score>=80?"Moderate to challenging":score>=60?"Easy to moderate":"Recovery effort");
    const duration=data.target_duration||data.duration_recommendation||(score>=80?"45–60 min":score>=60?"30–45 min":"20–30 min");
    set("coachEffort",effort);set("coachDuration",duration);set("coachPriority",recovery.length>58?recovery.slice(0,55)+"…":recovery);
    set("coachWorkoutTitle",data.workout_title||workoutTitle(score,focus));set("coachWorkoutDetail",training);
    set("coachPlanBadge",focus.toUpperCase());
    renderCards("coachFindings",array(data.key_findings||data.findings),"signal");
    renderCards("coachActionsList",[...array(data.recommendations),data.training_recommendation,data.recovery_recommendation,data.weight_management_note].filter(Boolean),"action");
    renderTimeline(data,training,recovery);renderWeek(score,focus,data.weekly_plan);renderHistory();
  }

  function renderCards(id, items, type) {
    const root=document.getElementById(id);if(!root)return;const unique=[...new Set(items.map(String).filter(Boolean))].slice(0,5);
    root.innerHTML=unique.length?unique.map((text,index)=>`<div class="coachInsightCard"><span>${type==="action"?"✓":index+1}</span><div><b>${type==="action"?actionTitle(text,index):findingTitle(text,index)}</b><p>${esc(text)}</p></div></div>`).join(""):`<div class="empty">No ${type==="action"?"actions":"findings"} available yet.</div>`;
  }
  const findingTitle=(text,index)=>/sleep/i.test(text)?"Sleep signal":/stress|recovery/i.test(text)?"Recovery signal":/weight/i.test(text)?"Body trend":/heart/i.test(text)?"Heart-rate signal":`Signal ${index+1}`;
  const actionTitle=(text,index)=>/sleep/i.test(text)?"Protect sleep":/hydrat/i.test(text)?"Hydrate":/recover|rest/i.test(text)?"Recover well":/train|workout|run|walk/i.test(text)?"Training action":`Action ${index+1}`;
  function defaultWorkout(score,mode){if(mode==="recovery"||score<55)return"Choose a relaxed walk, mobility work or very easy cycling. Keep breathing comfortable and stop if anything feels unusual.";if(mode==="performance"&&score>=75)return"Complete a structured quality session after a progressive warm-up. Keep the final repetitions controlled rather than maximal.";if(mode==="weight")return"Combine steady aerobic work with a short full-body strength circuit. Prioritize sustainable consistency over excessive intensity.";return"Complete an easy-to-moderate aerobic session and finish with mobility. Adjust the intensity based on how the body feels."}
  function workoutTitle(score,mode){if(mode==="recovery"||score<55)return"Recovery movement and mobility";if(mode==="performance"&&score>=75)return"Controlled quality session";if(mode==="weight")return"Aerobic plus strength blend";return"Steady aerobic foundation"}
  function renderTimeline(data,training,recovery){const root=$("#coachTimeline");if(!root)return;const nutrition=data.nutrition_recommendation||"Choose a balanced meal with protein, carbohydrates and fluids after training.";root.innerHTML=[['Morning','Hydrate, review readiness and begin with light movement.'],['Primary session',training],['Refuel',nutrition],['Evening',recovery]].map((x,i)=>`<div><i>${i+1}</i><span><b>${x[0]}</b><p>${esc(x[1])}</p></span></div>`).join("")}
  function renderWeek(score,mode,provided){const root=$("#coachWeek");if(!root)return;if(Array.isArray(provided)&&provided.length){root.innerHTML=provided.slice(0,7).map((x,i)=>weekCard(i,x.day||dayName(i),x.title||x.session||"Adaptive session",x.intensity||"Planned")).join("");return}const recovery=mode==="recovery"||score<55;const days=recovery?[["Recovery walk","Easy"],["Mobility","Easy"],["Aerobic base","Light"],["Rest","Recovery"],["Strength basics","Light"],["Long easy movement","Easy"],["Rest and reset","Recovery"]]:[["Aerobic base","Moderate"],["Strength","Moderate"],["Recovery movement","Easy"],["Quality session","Focused"],["Rest or mobility","Recovery"],["Long steady session","Moderate"],["Easy reset","Easy"]];root.innerHTML=days.map((x,i)=>weekCard(i,dayName(i),x[0],x[1])).join("")}
  function dayName(offset){const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString([],{weekday:"short"})}
  function weekCard(i,day,title,intensity){return`<div class="weekDay ${i===0?"today":""}"><span>${day}</span><i>${i===0?"TODAY":intensity}</i><b>${esc(title)}</b><small>${intensity}</small></div>`}
  function renderHistory(){const reports=window.APP?.reports||[],root=$("#coachHistory");if(!root)return;root.innerHTML=reports.length?reports.slice(0,5).map((r,i)=>{const data=reportJson(r);return`<button data-report-index="${i}"><span class="historyScore">${Math.round(n(r.readiness_score??data.readiness_score))||"-"}</span><div><b>${esc(data.headline||r.headline||"Coach analysis")}</b><small>${formatDate(r.created_at)}</small></div><em>›</em></button>`}).join(""):'<div class="empty">No previous reports found.</div>'}

  async function generate() {
    if(working)return;working=true;const button=$("#generate");window.UI?.busy(button,true,"Building your plan...");
    try{const{data:{session}}=await db.auth.getSession();if(!session)throw Error("Session expired");const response=await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/${APP_CONFIG.AI_FUNCTION}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`,apikey:APP_CONFIG.SUPABASE_ANON_KEY},body:JSON.stringify({force_refresh:true,focus,include_weekly_plan:true,client_context:signals()})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Error(payload.error||payload.message||"Coach analysis failed");const report=payload.report||payload.data||payload;if(window.APP){window.APP.reports=[report,...(window.APP.reports||[]).filter(x=>x.id!==report.id)].slice(0,5)}renderReport(report);window.UI?.toast("Your coach plan is ready")}catch(error){window.UI?.toast(error.message,"error")}finally{working=false;window.UI?.busy(button,false)}}

  document.addEventListener("DOMContentLoaded",()=>{
    $$("#coachModes button").forEach(button=>{button.classList.toggle("active",button.dataset.focus===focus);button.addEventListener("click",()=>{focus=button.dataset.focus;localStorage.setItem("coach-focus",focus);$$("#coachModes button").forEach(x=>x.classList.toggle("active",x===button));set("coachPlanBadge",focus.toUpperCase());const report=window.APP?.reports?.[0];if(report)renderReport(report)})});
    const generateButton=$("#generate");if(generateButton)generateButton.onclick=generate;
    $("#coachRefresh")?.addEventListener("click",()=>{renderSignalCards();renderWeeklyGoals();const report=window.APP?.reports?.[0];if(report)renderReport(report);window.UI?.toast("Coach signals refreshed")});
    $("#coachHistory")?.addEventListener("click",event=>{const button=event.target.closest("[data-report-index]");if(button)renderReport(window.APP.reports[Number(button.dataset.reportIndex)])});
    $$('[data-go="coach"]').forEach(button=>button.addEventListener("click",()=>setTimeout(()=>{renderSignalCards();renderWeeklyGoals();const report=window.APP?.reports?.[0];if(report)renderReport(report);renderHistory()},90)));
    const loader=$("#loader");if(loader)new MutationObserver(()=>{if(loader.hidden){renderSignalCards();renderWeeklyGoals();const report=window.APP?.reports?.[0];if(report)renderReport(report);renderHistory()}}).observe(loader,{attributes:true,attributeFilter:["hidden"]});
  });
})();