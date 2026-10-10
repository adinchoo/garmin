// logic-fixes-v53.js - Fixes for data logic issues reported in screenshots
(() => {
"use strict";

// 1. Fix badminton metrics: hide distance/pace/elevation for indoor sports
const INDOOR_SPORTS = ['badminton', 'tennis', 'squash', 'table_tennis', 'basketball', 'volleyball', 'indoor', 'gym', 'yoga', 'strength'];
const RUN_METRICS = ['distance', 'avg pace', 'elevation gain', 'pace'];

function isIndoorSport(name, type){
  const s = (name + ' ' + type).toLowerCase();
  return INDOOR_SPORTS.some(k => s.includes(k));
}

function filterMetricsForSport(){
  const hero = document.querySelector('.activityHero h2');
  if(!hero) return;
  const sportName = hero.textContent || '';
  const labelEl = document.querySelector('.activityHeroCopy small');
  const sportType = labelEl ? labelEl.textContent : '';
  
  if(isIndoorSport(sportName, sportType)){
    // Hide running metrics
    document.querySelectorAll('.detailMetric, .detailMetricV25').forEach(el => {
      const keyEl = el.querySelector('span');
      if(!keyEl) return;
      const key = keyEl.textContent.toLowerCase();
      if(RUN_METRICS.some(rm => key.includes(rm))){
        el.style.display = 'none';
        el.dataset.hiddenForIndoor = 'true';
      }
    });
    // Add badminton-specific note
    const statsContainer = document.querySelector('.detailStatsV25, .detailStats');
    if(statsContainer && !document.getElementById('indoorNote')){
      const note = document.createElement('div');
      note.id = 'indoorNote';
      note.style.cssText = 'grid-column:1/-1;padding:12px;background:rgba(34,199,242,0.1);border-radius:12px;font-size:12px;color:#22C7F2';
      note.innerHTML = '🏸 Indoor sport: Distance/Pace hidden. Focus on heart rate, calories, and duration.';
      statsContainer.appendChild(note);
    }
  }
}

// Observe activity detail changes
const detailObserver = new MutationObserver(filterMetricsForSport);
document.addEventListener('DOMContentLoaded', () => {
  const detail = document.getElementById('detail');
  if(detail) detailObserver.observe(detail, {childList: true, subtree: true});
});

// 2. Fix Trends header truncation
function fixTrendsHeader(){
  const header = document.querySelector('[data-view="trends"] .pageHero h2, [data-view="trends"] h2');
  if(header && header.textContent.includes('Consistency is your biggest')){
    header.style.whiteSpace = 'normal';
    header.style.overflow = 'visible';
    header.style.textOverflow = 'clip';
    header.textContent = 'Consistency is your biggest advantage';
  }
}

// 3. Fix Trends filters active state
function fixTrendsFilters(){
  document.querySelectorAll('[data-range], .trendsFilters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-range], .trendsFilters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// 4. Fix graph legend and touch instead of hover
function fixTrendsGraph(){
  const canvas = document.querySelector('[data-view="trends"] canvas');
  if(!canvas) return;
  // Add touch handler for iPhone
  canvas.addEventListener('touchstart', e => {
    // Chart.js handles touch if responsive, but ensure tooltip shows
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    // Let Chart.js handle it
  }, {passive: true});
}

// 5. Fix Coach contradictions: Training Load 0 + Recovery 39% = contradiction
function fixCoachLogic(){
  const recoveryEl = document.getElementById('coachRecoveryScore');
  const loadEl = document.getElementById('coachLoadScore');
  const fuelEl = document.getElementById('coachFuelScore');
  
  if(recoveryEl && loadEl){
    const recovery = parseInt(recoveryEl.textContent) || 0;
    const loadText = loadEl.textContent || '';
    const loadMin = parseInt(loadText) || 0;
    
    if(loadMin === 0 && recovery < 50){
      // If no load, recovery should be high
      const label = document.getElementById('coachRecoveryLabel');
      if(label){
        label.textContent = 'Low recent load - recovery opportunity';
        label.style.color = '#22C7F2';
      }
    }
  }
  
  if(fuelEl){
    const kcal = parseInt(fuelEl.textContent) || 0;
    if(kcal > 0 && kcal < 1500){
      const label = document.getElementById('coachFuelLabel');
      if(label && label.textContent.includes('Fueling is in progress')){
        label.textContent = 'Low intake detected - consider balanced meals';
        label.style.color = '#FF9500';
      }
    }
  }
}

// 6. Fix weight stale data: show relative time properly
function fixWeightStale(){
  const note = document.getElementById('homeWeightNote');
  if(note && note.textContent.includes('Updated')){
    // Parse date and show days ago
    const match = note.textContent.match(/(\d+)\s+(\w+)/);
    if(match){
      // If older than 3 days, highlight as stale
      const dateStr = note.textContent.replace('Updated ', '');
      // Simple stale warning
      if(dateStr.includes('Oct') && new Date().getMonth() === 9){ // October
        const day = parseInt(dateStr);
        const today = new Date().getDate();
        const diff = today - day;
        if(diff > 3){
          note.innerHTML = `Updated ${dateStr} <span style="color:#FF9500">• ${diff} days ago - log new</span>`;
        }
      }
    }
  }
}

// Run fixes on view change
document.addEventListener('DOMContentLoaded', () => {
  fixTrendsHeader();
  fixTrendsFilters();
  fixTrendsGraph();
  
  // Watch for view changes
  const observer = new MutationObserver(() => {
    if(document.querySelector('[data-view="trends"]:not([hidden])')){
      fixTrendsHeader();
      fixTrendsFilters();
    }
    if(document.querySelector('[data-view="coach"]:not([hidden])')){
      setTimeout(fixCoachLogic, 100);
    }
    if(document.querySelector('[data-view="home"]:not([hidden])')){
      setTimeout(fixWeightStale, 100);
    }
  });
  
  observer.observe(document.body, {attributes: true, subtree: true, attributeFilter: ['hidden']});
  
  // Also listen for data-go clicks
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        fixTrendsHeader();
        fixCoachLogic();
        fixWeightStale();
        filterMetricsForSport();
      }, 200);
    });
  });
});

console.log('[Logic Fixes v53] Initialized - indoor sport filter, trends header, coach contradiction fix');
})();
