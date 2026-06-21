const STORAGE_KEY = "seibi_records_v3_full";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(window.SEED_STATE);
const $ = id => document.getElementById(id);
let historyCategory = "全て見る";
let historyItem = "";
let mainPhotoTargetCar = "";

function migrate(){
  if(!state.photos) state.photos = [];
  if(typeof state.cars[0] === "string"){
    state.cars = state.cars.map(name => ({name, currentMileage: name === state.selectedCar ? (state.currentMileage || 0) : 0, mainPhoto:""}));
  }
  state.cars = state.cars.filter(c => c.name !== "その他");
  if(state.cars.length === 0) state.cars.push({name:"GK5 フィット", currentMileage:0, mainPhoto:"", model:"", number:"", purchaseDate:"", memo:""});
  state.cars.forEach(c => {
    if(!("mainPhoto" in c)) c.mainPhoto = "";
    if(!("currentMileage" in c)) c.currentMileage = 0;
    if(!("model" in c)) c.model = "";
    if(!("number" in c)) c.number = "";
    if(!("purchaseDate" in c)) c.purchaseDate = "";
    if(!("memo" in c)) c.memo = "";
  });
  state.records = state.records.filter(r => r.car !== "その他");
  state.records.forEach(r => {
    if(!r.category) r.category = "交換";
    if(!("cycleKm" in r)) r.cycleKm = 0;
    if(!("cycleMonth" in r)) r.cycleMonth = 0;
    delete r.cost;
  });
  if(!state.selectedCar || !state.cars.some(c => c.name === state.selectedCar)) state.selectedCar = state.cars[0].name;
}
migrate();

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function today(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function addMonths(s,m){ if(!m) return ""; const d = new Date(s + "T00:00:00"); d.setMonth(d.getMonth() + Number(m)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function num(n){ return Number(n || 0).toLocaleString("ja-JP"); }
function esc(t){ return String(t ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function currentCar(){ return state.selectedCar || state.cars[0].name; }
function carObj(name=currentCar()){ return state.cars.find(c => c.name === name) || state.cars[0]; }
function carRecords(){ return state.records.filter(r => r.car === currentCar()); }
function cycleFor(category, work){ return state.cycles.find(c => c.category === category && c.name === work) || {km:0, month:0}; }

function openMenu(){ $("drawer").classList.add("open"); $("sideBackdrop").classList.add("open"); }
function closeMenu(){ $("drawer").classList.remove("open"); $("sideBackdrop").classList.remove("open"); }
function showView(name){ document.querySelectorAll(".view").forEach(v=>v.classList.remove("active")); $("view-"+name).classList.add("active"); closeMenu(); render(); }

function renderCarSelects(){
  const opts = state.cars.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  $("topCar").innerHTML = opts; $("car").innerHTML = opts;
  $("topCar").value = currentCar(); $("car").value = currentCar();
}

function updateWorkOptions(selected=""){
  const category = $("category").value;
  const items = state.cycles.filter(c => c.category === category);
  $("work").innerHTML = items.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  if(selected && items.some(c => c.name === selected)) $("work").value = selected;
  updateCycleInputs();
}

function updateCycleInputs(){
  const c = cycleFor($("category").value, $("work").value);
  $("cycleKm").value = c.km || ""; $("cycleMonth").value = c.month || "";
  updateNextPreview();
}

function calcNext(){
  const baseKm = Number($("km").value || 0), baseDate = $("date").value || today();
  const cycleKm = Number($("cycleKm").value || 0), cycleMonth = Number($("cycleMonth").value || 0);
  return {nextKm: baseKm && cycleKm ? baseKm + cycleKm : 0, nextDate: cycleMonth ? addMonths(baseDate, cycleMonth) : "", cycleKm, cycleMonth};
}

function updateNextPreview(){
  const n = calcNext(), parts=[];
  if(n.nextKm) parts.push(`${num(n.nextKm)} km`);
  if(n.nextDate) parts.push(n.nextDate);
  $("nextPreview").textContent = parts.length ? `次回目安：${parts.join(" または ")}` : "この項目は目視・症状判断用です。必要ならサイクルを手入力してください。";
}

function openRecordModal(recordId=""){
  $("recordModalTitle").textContent = recordId ? "記録を編集" : "記録を追加";
  $("editId").value = recordId;
  const r = state.records.find(x => String(x.id) === String(recordId));
  $("car").value = r ? r.car : currentCar();
  $("date").value = r ? r.date : today();
  $("km").value = r ? r.km : "";
  $("category").value = r ? r.category : "交換";
  updateWorkOptions(r ? r.work : "");
  $("cycleKm").value = r ? (r.cycleKm || "") : $("cycleKm").value;
  $("cycleMonth").value = r ? (r.cycleMonth || "") : $("cycleMonth").value;
  $("memo").value = r ? (r.memo || "") : "";
  updateNextPreview();
  $("recordModal").classList.add("open");
}
function closeRecordModal(){ $("recordModal").classList.remove("open"); }

function saveRecordFromModal(){
  if(!$("date").value || !$("km").value || !$("work").value){ alert("日付・走行距離・内容を入力してください。"); return; }
  const n = calcNext();
  const data = {
    car:$("car").value, date:$("date").value, km:Number($("km").value),
    category:$("category").value, work:$("work").value, memo:$("memo").value.trim(),
    cycleKm:n.cycleKm, cycleMonth:n.cycleMonth, nextKm:n.nextKm, nextDate:n.nextDate, seeded:false
  };
  const editId = $("editId").value;
  if(editId){
    const idx = state.records.findIndex(r => String(r.id) === String(editId));
    if(idx >= 0) state.records[idx] = {...state.records[idx], ...data};
  } else {
    state.records.push({id: Date.now(), ...data});
  }
  const c = carObj(data.car);
  c.currentMileage = Math.max(Number(c.currentMileage || 0), data.km);
  state.selectedCar = data.car;
  save(); closeRecordModal(); render();
}

function deleteRecord(id){ if(!confirm("この記録を削除しますか？")) return; state.records = state.records.filter(r => String(r.id) !== String(id)); save(); render(); }

function latestExchangeByWork(){
  const latest = {};
  [...carRecords()].filter(r => r.category === "交換").sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0)).forEach(r=>{
    if(!latest[r.work]) latest[r.work] = r;
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
  return latestExchangeByWork().filter(r => r.nextKm || r.nextDate).map(r => ({r, info:alertInfo(r)})).sort((a,b)=>a.info.rank-b.info.rank||(a.info.remain??9999999)-(b.info.remain??9999999));
}
function alertHtml(items, onlyDue=false){
  const target = onlyDue ? items.filter(x => x.info.rank <= 1) : items;
  if(!target.length) return '<div class="empty">要確認項目はありません</div>';
  return target.map(({r, info}) => `
    <div class="alert">
      <div class="record-title"><span class="badge ${info.cls}">${info.label}</span>${esc(r.work)}</div>
      <div class="record-meta">
        前回：${esc(r.date)} / ${num(r.km)} km<br>
        次回：${r.nextKm ? num(r.nextKm) + " km" : ""}${r.nextKm && r.nextDate ? " または " : ""}${esc(r.nextDate || "")}<br>
        ${info.remain !== null ? "残り：約" + num(info.remain) + " km" : ""}
      </div>
    </div>
  `).join("");
}

function recordHtml(records){
  if(!records.length) return '<div class="empty">記録がありません</div>';
  return records.map(r => `
    <div class="record">
      <div class="record-title">${esc(r.category)} / ${esc(r.work)}</div>
      <div class="record-meta">
        車両：${esc(r.car)}<br>
        日付：${esc(r.date)}<br>
        距離：${num(r.km)} km<br>
        ${r.nextKm || r.nextDate ? `次回：${r.nextKm ? num(r.nextKm) + " km" : ""}${r.nextKm && r.nextDate ? " または " : ""}${esc(r.nextDate || "")}<br>` : ""}
        ${r.memo ? "メモ：" + esc(r.memo).replace(/\n/g, "<br>") : ""}
      </div>
      <div class="record-actions">
        <button class="edit-btn" onclick="openRecordModal('${r.id}')">編集</button>
        <button class="delete-btn" onclick="deleteRecord('${r.id}')">削除</button>
      </div>
    </div>
  `).join("");
}

function renderHome(){
  $("homeTitle").textContent = currentCar();
  const c = carObj();
  $("heroPhoto").innerHTML = c.mainPhoto ? `<img src="${c.mainPhoto}" alt="${esc(c.name)}">` : `<div class="hero-empty">${esc(c.name)}<small>設定からメイン写真を登録できます</small></div>`;
  const infoParts = [];
  if(c.model) infoParts.push(esc(c.model));
  if(c.number) infoParts.push(esc(c.number));
  if(c.purchaseDate) infoParts.push("購入日：" + esc(c.purchaseDate));
  $("homeCarInfo").innerHTML = infoParts.length ? infoParts.join("<br>") : "";
  const alerts = alertItems(), due = alerts.filter(x => x.info.rank <= 1);
  $("currentKm").textContent = num(c.currentMileage || 0); $("dueCount").textContent = due.length;
  $("homeAlerts").innerHTML = alertHtml(alerts, true);
  const recent = [...carRecords()].sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0)).slice(0,5);
  $("recentRecords").innerHTML = recordHtml(recent);
}

function renderAlerts(){
  $("nowKm").value = carObj().currentMileage || "";
  $("alerts").innerHTML = alertHtml(alertItems());
}

function renderHistoryControls(){
  const categorySelect = $("historyCategorySelect");
  const itemSelect = $("historyItemSelect");
  if(!categorySelect || !itemSelect) return;

  categorySelect.value = historyCategory;

  const source = historyCategory === "全て見る"
    ? carRecords()
    : carRecords().filter(r => r.category === historyCategory);

  const items = [...new Set(source.map(r => r.work))].sort();

  itemSelect.innerHTML = `<option value="">全て見る</option>` +
    items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join("");

  if(items.includes(historyItem)){
    itemSelect.value = historyItem;
  }else{
    historyItem = "";
    itemSelect.value = "";
  }
}

function getFilteredHistoryRecords(){
  const q = $("search").value.trim().toLowerCase();
  let records = carRecords();

  if(historyCategory !== "全て見る"){
    records = records.filter(r => r.category === historyCategory);
  }

  if(historyItem){
    records = records.filter(r => r.work === historyItem);
  }

  return records
    .filter(r => JSON.stringify(r).toLowerCase().includes(q))
    .sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.km||0)-Number(a.km||0));
}

function groupedHistoryHtml(records){
  if(!records.length) return '<div class="empty">記録がありません</div>';

  if(historyItem){
    return recordHtml(records);
  }

  const groups = {};
  records.forEach(r => {
    const key = historyCategory === "全て見る" ? `${r.category} / ${r.work}` : r.work;
    if(!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.keys(groups).sort().map((key, idx) => `
    <details class="history-group" ${idx === 0 ? "open" : ""}>
      <summary>${esc(key)} <span class="record-meta">${groups[key].length}件</span></summary>
      <div class="history-group-body">
        ${recordHtml(groups[key])}
      </div>
    </details>
  `).join("");
}

function renderRecords(){
  renderHistoryControls();
  const records = getFilteredHistoryRecords();
  $("historyCount").textContent = `該当履歴：${records.length}件`;
  $("records").innerHTML = groupedHistoryHtml(records);
}

function renderSettings(){
  $("carSettings").innerHTML = state.cars.map(c => `
    <div class="settings-item">
      <div class="settings-name">${esc(c.name)}</div>
      <div class="settings-meta">
        ${c.model ? "型式：" + esc(c.model) + "<br>" : ""}
        ${c.number ? "ナンバー：" + esc(c.number) + "<br>" : ""}
        ${c.purchaseDate ? "購入日：" + esc(c.purchaseDate) + "<br>" : ""}
        現在距離：${num(c.currentMileage || 0)} km
      </div>
      <div class="car-admin-actions">
        <button class="secondary" onclick="openCarModal('${esc(c.name)}')">車両情報編集</button>
        <button class="secondary" onclick="chooseMainPhoto('${esc(c.name)}')">メイン写真変更</button>
      </div>
      <button class="danger-btn" onclick="deleteCar('${esc(c.name)}')">車両削除</button>
    </div>
  `).join("");
  $("settingsList").innerHTML = state.cycles.filter(c => c.category === "交換").map(c => {
    const i = state.cycles.indexOf(c);
    return `<div class="settings-item">
      <div class="settings-name">${esc(c.name)}</div>
      <div class="settings-meta">現在：${c.km ? num(c.km)+" km" : "距離指定なし"} / ${c.month ? c.month+"ヶ月" : "期間指定なし"}</div>
      <div class="row">
        <div><label>距離 km</label><input type="number" inputmode="numeric" data-cycle-km="${i}" value="${c.km || ""}"></div>
        <div><label>月数</label><input type="number" inputmode="numeric" data-cycle-month="${i}" value="${c.month || ""}"></div>
      </div>
    </div>`;
  }).join("");
}
function saveSettings(){
  document.querySelectorAll("[data-cycle-km]").forEach(input => state.cycles[Number(input.dataset.cycleKm)].km = Number(input.value || 0));
  document.querySelectorAll("[data-cycle-month]").forEach(input => state.cycles[Number(input.dataset.cycleMonth)].month = Number(input.value || 0));
  save(); alert("設定を保存しました。"); render();
}

function renderAlbum(){
  $("albumTitle").textContent = currentCar() + " の写真";
  const photos = state.photos.filter(p => p.car === currentCar()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  $("photoGrid").innerHTML = photos.length ? photos.map(p => `
    <div class="photo-card">
      <img src="${p.dataUrl}" alt="photo">
      <div class="photo-body"><div class="photo-note">${p.note ? esc(p.note).replace(/\n/g,"<br>") : "メモなし"}</div><div class="record-meta">${esc(p.date)}</div></div>
      <div class="photo-actions"><button class="secondary" onclick="setPhotoAsMain('${p.id}')">メインにする</button><button class="delete-btn" onclick="deletePhoto('${p.id}')">削除</button></div>
    </div>
  `).join("") : '<div class="empty">写真がありません</div>';
}
function openPhotoModal(){ $("photoInput").value = ""; $("photoNote").value = ""; $("photoModal").classList.add("open"); }
function closePhotoModal(){ $("photoModal").classList.remove("open"); }
function compressImage(file, maxSize=1200, quality=0.72){
  return new Promise((resolve,reject)=>{
    const img = new Image(); const reader = new FileReader();
    reader.onload = e => { img.onload = () => {
      let w = img.width, h = img.height;
      if(Math.max(w,h) > maxSize){ const s = maxSize / Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    }; img.onerror = reject; img.src = e.target.result; };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}
async function savePhoto(){
  const file = $("photoInput").files[0];
  if(!file){ alert("写真を選んでください。"); return; }
  const dataUrl = await compressImage(file);
  state.photos.push({id:String(Date.now()), car:currentCar(), dataUrl, note:$("photoNote").value.trim(), date:today(), createdAt:new Date().toISOString()});
  save(); closePhotoModal(); renderAlbum();
}
function deletePhoto(id){ if(!confirm("この写真を削除しますか？")) return; state.photos = state.photos.filter(p => p.id !== id); save(); render(); }
function setPhotoAsMain(id){ const p = state.photos.find(x => x.id === id); if(!p) return; carObj(p.car).mainPhoto = p.dataUrl; save(); render(); alert("メイン写真に設定しました。"); }

function openCarModal(carName=""){
  const c = carName ? carObj(carName) : null;
  $("carModalTitle").textContent = c ? "車両情報編集" : "車両追加";
  $("editCarOriginalName").value = c ? c.name : "";
  $("carNameInput").value = c ? c.name : "";
  $("carModelInput").value = c ? (c.model || "") : "";
  $("carNumberInput").value = c ? (c.number || "") : "";
  $("carPurchaseInput").value = c ? (c.purchaseDate || "") : "";
  $("carMileageInput").value = c ? (c.currentMileage || "") : "";
  $("carMemoInput").value = c ? (c.memo || "") : "";
  $("carModal").classList.add("open");
}
function closeCarModal(){ $("carModal").classList.remove("open"); }

function saveCarFromModal(){
  const originalName = $("editCarOriginalName").value;
  const name = $("carNameInput").value.trim();
  if(!name){ alert("車両名を入力してください。"); return; }

  const duplicate = state.cars.some(c => c.name === name && c.name !== originalName);
  if(duplicate){ alert("同じ車両名があります。"); return; }

  const data = {
    name,
    model: $("carModelInput").value.trim(),
    number: $("carNumberInput").value.trim(),
    purchaseDate: $("carPurchaseInput").value,
    currentMileage: Number($("carMileageInput").value || 0),
    memo: $("carMemoInput").value.trim(),
    mainPhoto: originalName ? carObj(originalName).mainPhoto || "" : ""
  };

  if(originalName){
    const c = carObj(originalName);
    Object.assign(c, data);
    if(originalName !== name){
      state.records.forEach(r => { if(r.car === originalName) r.car = name; });
      state.photos.forEach(p => { if(p.car === originalName) p.car = name; });
      if(state.selectedCar === originalName) state.selectedCar = name;
    }
  }else{
    state.cars.push(data);
    state.selectedCar = name;
  }

  save();
  closeCarModal();
  render();
}

function deleteCar(carName){
  if(state.cars.length <= 1){
    alert("最後の1台は削除できません。");
    return;
  }
  if(!confirm(`${carName} を削除しますか？\\nこの車両の整備履歴と写真も削除されます。`)) return;
  state.cars = state.cars.filter(c => c.name !== carName);
  state.records = state.records.filter(r => r.car !== carName);
  state.photos = state.photos.filter(p => p.car !== carName);
  if(state.selectedCar === carName) state.selectedCar = state.cars[0].name;
  save();
  render();
}


function chooseMainPhoto(carName){ mainPhotoTargetCar = carName; $("mainPhotoInput").click(); }

$("mainPhotoInput").addEventListener("change", async e => {
  const file = e.target.files[0]; if(!file) return;
  carObj(mainPhotoTargetCar).mainPhoto = await compressImage(file, 1400, 0.75);
  save(); render(); alert("メイン写真を変更しました。");
});

function exportBackup(){ const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`seibi-v3-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); }
function resetSeed(){ if(!confirm("追加・変更した内容を消して、初期履歴に戻しますか？")) return; state = structuredClone(window.SEED_STATE); migrate(); save(); init(); }

$("topCar").addEventListener("change", e => { state.selectedCar = e.target.value; save(); render(); });
$("nowKm").addEventListener("input", () => { carObj().currentMileage = Number($("nowKm").value || 0); save(); render(); });
$("search").addEventListener("input", renderRecords);
$("historyCategorySelect").addEventListener("change", e => {
  historyCategory = e.target.value;
  historyItem = "";
  renderRecords();
});
$("historyItemSelect").addEventListener("change", e => {
  historyItem = e.target.value;
  renderRecords();
});
$("category").addEventListener("change", () => updateWorkOptions());
$("work").addEventListener("change", updateCycleInputs);
["km","date","cycleKm","cycleMonth"].forEach(id => { $(id).addEventListener("input", updateNextPreview); $(id).addEventListener("change", updateNextPreview); });
$("importFile").addEventListener("change", async e => {
  const file = e.target.files[0]; if(!file) return;
  const data = JSON.parse(await file.text());
  if(!data.records){ alert("読み込めない形式です。"); return; }
  state = data; migrate(); save(); init();
});

function render(){ renderCarSelects(); renderHome(); renderAlerts(); renderRecords(); renderSettings(); renderAlbum(); }
function init(){ renderCarSelects(); $("date").value = today(); updateWorkOptions(); render(); }
if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js").catch(()=>{}); }
init();