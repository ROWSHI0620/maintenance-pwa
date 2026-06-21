const STORAGE_KEY = "seibi_records_v2_menu";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(window.SEED_STATE);
const $ = id => document.getElementById(id);

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function today(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function addMonths(s,m){ if(!m) return ""; const d = new Date(s + "T00:00:00"); d.setMonth(d.getMonth() + Number(m)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function yen(n){ return Number(n || 0).toLocaleString("ja-JP"); }
function km(n){ return Number(n || 0).toLocaleString("ja-JP"); }
function esc(t){ return String(t ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

function currentCar(){ return state.selectedCar || state.cars[0].name; }
function carObj(name=currentCar()){ return state.cars.find(c => c.name === name) || state.cars[0]; }
function carRecords(){ return state.records.filter(r => r.car === currentCar()); }
function cycleFor(category, work){ return state.cycles.find(c => c.category === category && c.name === work) || {km:0, month:0}; }

function openMenu(){ $("drawer").classList.add("open"); $("sideBackdrop").classList.add("open"); }
function closeMenu(){ $("drawer").classList.remove("open"); $("sideBackdrop").classList.remove("open"); }
function showView(name){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $("view-" + name).classList.add("active");
  closeMenu();
  render();
}
function openAddModal(){
  $("car").value = currentCar();
  $("date").value = today();
  $("addModal").classList.add("open");
  updateWorkOptions();
}
function closeAddModal(){ $("addModal").classList.remove("open"); }

function renderCarSelects(){
  const opts = state.cars.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  $("topCar").innerHTML = opts;
  $("car").innerHTML = opts;
  $("topCar").value = currentCar();
  $("car").value = currentCar();
}

function updateWorkOptions(){
  const category = $("category").value;
  const items = state.cycles.filter(c => c.category === category);
  $("work").innerHTML = items.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  updateCycleInputs();
}

function updateCycleInputs(){
  const c = cycleFor($("category").value, $("work").value);
  $("cycleKm").value = c.km || "";
  $("cycleMonth").value = c.month || "";
  updateNextPreview();
}

function calcNext(){
  const baseKm = Number($("km").value || 0);
  const baseDate = $("date").value || today();
  const cycleKm = Number($("cycleKm").value || 0);
  const cycleMonth = Number($("cycleMonth").value || 0);
  return {
    nextKm: baseKm && cycleKm ? baseKm + cycleKm : 0,
    nextDate: cycleMonth ? addMonths(baseDate, cycleMonth) : "",
    cycleKm, cycleMonth
  };
}

function updateNextPreview(){
  const n = calcNext();
  const parts = [];
  if(n.nextKm) parts.push(`${km(n.nextKm)} km`);
  if(n.nextDate) parts.push(n.nextDate);
  $("nextPreview").textContent = parts.length ? `次回目安：${parts.join(" または ")}` : "この項目は目視・症状判断用です。必要ならサイクルを手入力してください。";
}

function latestByWork(){
  const latest = {};
  [...carRecords()].sort((a,b) => new Date(b.date) - new Date(a.date) || Number(b.km||0) - Number(a.km||0)).forEach(r => {
    const key = r.category + "::" + r.work;
    if(!latest[key]) latest[key] = r;
  });
  return Object.values(latest);
}

function alertInfo(r){
  const now = Number(carObj().currentMileage || 0);
  const remain = r.nextKm ? r.nextKm - now : null;
  const dateDue = r.nextDate && r.nextDate <= today();
  if((remain !== null && remain <= 0) || dateDue) return {label:"交換時期", cls:"danger", rank:0, remain};
  if(remain !== null && remain <= 1000) return {label:"そろそろ", cls:"warn", rank:1, remain};
  return {label:"余裕あり", cls:"ok", rank:2, remain};
}

function alertItems(){
  return latestByWork()
    .filter(r => r.nextKm || r.nextDate)
    .map(r => ({r, info: alertInfo(r)}))
    .sort((a,b) => a.info.rank - b.info.rank || (a.info.remain ?? 9999999) - (b.info.remain ?? 9999999));
}

function alertHtml(items, limit=0){
  const target = limit ? items.slice(0, limit) : items;
  if(!target.length) return '<div class="empty">要確認項目はありません</div>';
  return target.map(({r, info}) => `
    <div class="alert">
      <div class="record-title"><span class="badge ${info.cls}">${info.label}</span>${esc(r.category)} / ${esc(r.work)}</div>
      <div class="record-meta">
        前回：${esc(r.date)} / ${km(r.km)} km<br>
        次回：${r.nextKm ? km(r.nextKm) + " km" : ""}${r.nextKm && r.nextDate ? " または " : ""}${esc(r.nextDate || "")}<br>
        ${info.remain !== null ? "残り：約" + km(info.remain) + " km" : ""}
      </div>
    </div>
  `).join("");
}

function recordHtml(records){
  if(!records.length) return '<div class="empty">記録がありません</div>';
  return records.map(r => `
    <div class="record">
      <div class="record-title">
        <span class="badge ${r.seeded ? "seed" : ""}">${r.seeded ? "初期" : "追加"}</span>
        ${esc(r.category)} / ${esc(r.work)}
      </div>
      <div class="record-meta">
        車両：${esc(r.car)}<br>
        日付：${esc(r.date)}<br>
        距離：${km(r.km)} km<br>
        費用：${yen(r.cost)} 円<br>
        ${r.nextKm || r.nextDate ? `次回：${r.nextKm ? km(r.nextKm) + " km" : ""}${r.nextKm && r.nextDate ? " または " : ""}${esc(r.nextDate || "")}<br>` : ""}
        ${r.memo ? "メモ：" + esc(r.memo).replace(/\n/g, "<br>") : ""}
      </div>
      <button class="delete-btn" onclick="deleteRecord('${r.id}')">削除</button>
    </div>
  `).join("");
}

function renderHome(){
  const recs = carRecords();
  const alerts = alertItems();
  const due = alerts.filter(x => x.info.rank <= 1);
  $("currentKm").textContent = km(carObj().currentMileage || 0);
  $("dueCount").textContent = due.length;
  $("totalCost").textContent = yen(recs.reduce((sum, r) => sum + Number(r.cost || 0), 0));
  $("homeAlerts").innerHTML = alertHtml(due, 5);
  const recent = [...recs].sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0)).slice(0,5);
  $("recentRecords").innerHTML = recordHtml(recent);
}

function renderAlerts(){
  $("nowKm").value = carObj().currentMileage || "";
  $("alerts").innerHTML = alertHtml(alertItems());
}

function renderRecords(){
  const q = $("search").value.trim().toLowerCase();
  const sorted = [...carRecords()]
    .filter(r => JSON.stringify(r).toLowerCase().includes(q))
    .sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0));
  $("records").innerHTML = recordHtml(sorted);
}

function renderSettings(){
  $("settingsList").innerHTML = state.cycles.map((c, i) => `
    <div class="settings-item">
      <div class="settings-name">${esc(c.category)} / ${esc(c.name)}</div>
      <div class="settings-meta">現在：${c.km ? km(c.km) + " km" : "距離指定なし"} / ${c.month ? c.month + "ヶ月" : "期間指定なし"}</div>
      <div class="row">
        <div><label>距離 km</label><input type="number" inputmode="numeric" data-cycle-km="${i}" value="${c.km || ""}"></div>
        <div><label>月数</label><input type="number" inputmode="numeric" data-cycle-month="${i}" value="${c.month || ""}"></div>
      </div>
    </div>
  `).join("");
}

function saveSettings(){
  document.querySelectorAll("[data-cycle-km]").forEach(input => state.cycles[Number(input.dataset.cycleKm)].km = Number(input.value || 0));
  document.querySelectorAll("[data-cycle-month]").forEach(input => state.cycles[Number(input.dataset.cycleMonth)].month = Number(input.value || 0));
  save();
  alert("設定を保存しました。");
  render();
}

function addRecord(){
  if(!$("date").value || !$("km").value || !$("work").value){
    alert("日付・走行距離・内容を入力してください。");
    return;
  }
  const n = calcNext();
  const carName = $("car").value;
  state.records.push({
    id: Date.now(),
    car: carName,
    date: $("date").value,
    km: Number($("km").value),
    category: $("category").value,
    work: $("work").value,
    cost: Number($("cost").value || 0),
    memo: $("memo").value.trim(),
    cycleKm: n.cycleKm,
    cycleMonth: n.cycleMonth,
    nextKm: n.nextKm,
    nextDate: n.nextDate,
    seeded: false
  });
  const c = carObj(carName);
  c.currentMileage = Math.max(Number(c.currentMileage || 0), Number($("km").value));
  state.selectedCar = carName;
  save();
  closeAddModal();
  $("km").value = "";
  $("cost").value = "";
  $("memo").value = "";
  $("date").value = today();
  init();
}

function deleteRecord(id){
  if(!confirm("この記録を削除しますか？")) return;
  state.records = state.records.filter(r => String(r.id) !== String(id));
  save();
  render();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `seibi-v2-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetSeed(){
  if(!confirm("追加・変更した内容を消して、初期履歴に戻しますか？")) return;
  state = structuredClone(window.SEED_STATE);
  save();
  init();
}

$("topCar").addEventListener("change", e => {
  state.selectedCar = e.target.value;
  save();
  render();
});

$("nowKm").addEventListener("input", () => {
  carObj().currentMileage = Number($("nowKm").value || 0);
  save();
  render();
});

$("search").addEventListener("input", renderRecords);
$("category").addEventListener("change", updateWorkOptions);
$("work").addEventListener("change", updateCycleInputs);
["km","date","cycleKm","cycleMonth"].forEach(id => {
  $(id).addEventListener("input", updateNextPreview);
  $(id).addEventListener("change", updateNextPreview);
});

$("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  const data = JSON.parse(await file.text());
  if(!data.records){ alert("読み込めない形式です。"); return; }
  state = data;
  if(!state.cars) state.cars = window.SEED_STATE.cars;
  if(!state.cycles) state.cycles = window.SEED_STATE.cycles;
  if(!state.selectedCar) state.selectedCar = state.cars[0].name;
  save();
  init();
});

function render(){
  renderCarSelects();
  renderHome();
  renderAlerts();
  renderRecords();
  renderSettings();
}

function init(){
  renderCarSelects();
  $("date").value = today();
  updateWorkOptions();
  render();
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js").catch(()=>{}); }
init();