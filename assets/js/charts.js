const healthCharts = {};

function chartColors() {
  const light = document.documentElement.dataset.theme === "light";
  return {
    grid: light ? "rgba(15,23,42,.08)" : "rgba(148,163,184,.10)",
    text: light ? "#64748b" : "#8ea0b8",
    tooltip: light ? "#ffffff" : "#07111f",
    tooltipText: light ? "#0f172a" : "#f8fafc",
    blue: "#38bdf8", green: "#34d399", orange: "#fb923c",
    red: "#fb7185", purple: "#a78bfa"
  };
}

function destroyChart(id) {
  if (healthCharts[id]) healthCharts[id].destroy();
}

function formatTooltipNumber(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "No data";
  if (unit === "steps") return `${Math.round(number).toLocaleString()} steps`;
  if (unit === "kg") return `${number.toFixed(1)} kg`;
  if (unit === "bpm") return `${Math.round(number)} bpm`;
  if (unit === "score") return `${Math.round(number)} stress`;
  if (unit === "minutes") return `${Math.round(number)} min`;
  return String(number);
}

function createTrendChart({id, type, labels, data, color, unit, fill = false}) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  const c = chartColors();

  healthCharts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: type === "bar" ? color : `${color}22`,
        hoverBackgroundColor: type === "bar" ? `${color}dd` : `${color}30`,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointRadius: data.length > 20 ? 2 : 3,
        pointHoverRadius: 7,
        pointHitRadius: 18,
        borderWidth: 2.5,
        borderRadius: 8,
        maxBarThickness: 34,
        tension: .35,
        fill,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false, axis: "x" },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length ? "crosshair" : "default";
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
          backgroundColor: c.tooltip,
          titleColor: c.tooltipText,
          bodyColor: c.tooltipText,
          borderColor: color,
          borderWidth: 1,
          padding: 12,
          caretPadding: 8,
          displayColors: false,
          callbacks: {
            title: items => items[0]?.label || "",
            label: context => formatTooltipNumber(context.parsed.y, unit)
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: c.text, maxTicksLimit: 7 } },
        y: { beginAtZero: type === "bar", grid: { color: c.grid }, ticks: { color: c.text, maxTicksLimit: 5 } }
      }
    }
  });
}

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function renderCharts(dataset) {
  const range = Number(document.getElementById("trendRange")?.value || 14);
  const daily = dataset.daily.slice(0, range).reverse();
  const weights = dataset.body.slice(0, range).reverse();
  const label = value => new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  const c = chartColors();

  createTrendChart({id:"weightChart",type:"line",labels:weights.map(x=>label(String(x.measured_at).slice(0,10))),data:weights.map(x=>Number(x.weight_kg)),color:c.green,unit:"kg",fill:true});
  createTrendChart({id:"stepsChart",type:"bar",labels:daily.map(x=>label(x.health_date)),data:daily.map(x=>Number(x.steps||0)),color:c.blue,unit:"steps"});
  createTrendChart({id:"heartChart",type:"line",labels:daily.map(x=>label(x.health_date)),data:daily.map(x=>x.resting_heart_rate==null?null:Number(x.resting_heart_rate)),color:c.red,unit:"bpm",fill:true});
  createTrendChart({id:"stressChart",type:"line",labels:daily.map(x=>label(x.health_date)),data:daily.map(x=>x.stress_average==null?null:Number(x.stress_average)),color:c.orange,unit:"score",fill:true});

  const dailyKeys = daily.map(x=>x.health_date);
  const minutesByDate = Object.fromEntries(dailyKeys.map(key=>[key,0]));
  let selectedActivityCount = 0;
  dataset.activities.forEach(activity => {
    const key = localDateKey(activity.started_at);
    if (key && Object.hasOwn(minutesByDate,key)) {
      minutesByDate[key] += Number(activity.duration_seconds||0)/60;
      selectedActivityCount += 1;
    }
  });
  const activityMinutesData = dailyKeys.map(key=>Math.round(minutesByDate[key]||0));
  createTrendChart({id:"activityTrendChart",type:"bar",labels:dailyKeys.map(label),data:activityMinutesData,color:c.purple,unit:"minutes"});

  const average = (rows,key) => rows.length ? Math.round(rows.reduce((sum,row)=>sum+(Number(row[key])||0),0)/rows.length) : 0;
  text("avgSteps", average(daily,"steps").toLocaleString());
  text("avgStress", average(daily,"stress_average"));
  const weightDelta = weights.length > 1 ? Number(weights.at(-1).weight_kg)-Number(weights[0].weight_kg) : 0;
  text("weightChange", weights.length>1?`${weightDelta>0?"+":""}${weightDelta.toFixed(1)} kg`:"-");
  text("weightTrendNote", weights.length<2?"More data needed":weightDelta<0?"Moving toward goal":weightDelta>0?"Increased in period":"Stable");
  const totalMinutes = Math.round(activityMinutesData.reduce((sum,value)=>sum+value,0));
  text("activityMinutes", `${totalMinutes.toLocaleString()} min`);
  text("activityCount", `${selectedActivityCount} ${selectedActivityCount===1?"activity":"activities"}`);
}

window.addEventListener("themechange",()=>window.dashboardDataset&&renderCharts(window.dashboardDataset));
