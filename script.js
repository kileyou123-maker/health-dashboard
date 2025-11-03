let allData = [];
let currentData = [];
let cityDistrictMap = {};
let currentPage = 1;
const itemsPerPage = 50;

/* 頁面載入動畫 */
window.addEventListener("load", () => {
  document.body.classList.add("loaded");
  document.querySelectorAll("header, main, footer").forEach(el => el.classList.add("fade-in-up"));
});

/* 初始化 */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await loadData();
  initUI();
});

async function loadData() {
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" },
  ];
  for (const f of files) {
    try {
      const res = await fetch(f.path);
      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",");
      const json = lines.slice(1).map((l) => {
        const vals = l.split(",");
        const obj = {};
        headers.forEach((h, i) => (obj[h] = vals[i] || ""));
        obj["來源"] = f.source;
        return obj;
      });
      allData = allData.concat(json);
    } catch (e) { console.warn("載入失敗：", f.path); }
  }
  normalizeAddress(allData);
  buildCityDistrictMap(allData);
}

function normalizeAddress(data){ data.forEach(d=>{ if(d["醫事機構地址"]) d["醫事機構地址"]=d["醫事機構地址"].replaceAll("臺","台"); }); }

const allCities=["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];
function buildCityDistrictMap(data){
  cityDistrictMap={};
  data.forEach(d=>{
    const addr=d["醫事機構地址"];
    if(!addr)return;
    const city=allCities.find(c=>addr.startsWith(c))||"其他";
    const after=addr.replace(city,"");
    const match=after.match(/[\u4e00-\u9fa5]{1,3}(區|鎮|鄉|市)/);
    const district=match?match[0]:"其他";
    if(!cityDistrictMap[city])cityDistrictMap[city]=new Set();
    cityDistrictMap[city].add(district);
  });
}

/* 初始化UI */
function initUI(){
  populateCityList();
  populateDistrictList();
  document.getElementById("searchBtn").addEventListener("click",searchData);
  document.querySelectorAll(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>quickFilter(btn.dataset.type)));
  setupAutocomplete();
  currentData=allData;
  renderResponsive();
}

/* 自動提示 */
function setupAutocomplete(){
  const input=document.getElementById("keyword");
  const box=document.getElementById("suggestionBox");
  const allNames=[...new Set(allData.map(d=>d["醫事機構名稱"]).filter(Boolean))];
  input.addEventListener("input",()=>{
    const val=input.value.trim();
    box.innerHTML="";
    if(!val){box.style.display="none";return;}
    const matches=allNames.filter(n=>n.includes(val)).slice(0,5);
    if(!matches.length){box.style.display="none";return;}
    matches.forEach(s=>{
      const div=document.createElement("div");
      div.textContent=s;
      div.addEventListener("click",()=>{input.value=s;box.style.display="none";searchData();});
      box.appendChild(div);
    });
    box.style.display="block";
  });
  document.addEventListener("click",(e)=>{
    if(!e.target.closest("#keyword")&&!e.target.closest("#suggestionBox"))box.style.display="none";
  });
}

/* 搜尋 */
function searchData(){
  currentPage=1;
  const city=document.getElementById("citySelect").value;
  const district=document.getElementById("districtSelect").value;
  const keyword=document.getElementById("keyword").value.trim();
  currentData=allData.filter(d=>{
    const addr=d["醫事機構地址"]||"",name=d["醫事機構名稱"]||"",phone=d["醫事機構電話"]||"",team=d["整合團隊名稱"]||"";
    return (city==="全部"||addr.includes(city))&&(district==="全部"||addr.includes(district))&&(!keyword||(name+addr+phone+team).includes(keyword));
  });
  renderResponsive();
}

/* 篩選 */
function quickFilter(type){
  currentPage=1;
  if(type==="全部")currentData=allData;
  else{
    const kw={醫院:["醫院"],診所:["診所","醫療"],護理之家:["護理","安養","養護"]}[type];
    currentData=allData.filter(d=>kw.some(k=>(d["醫事機構名稱"]||"").includes(k)));
  }
  renderResponsive();
}

/* 城市 */
function populateCityList(){
  const citySel=document.getElementById("citySelect");
  citySel.innerHTML='<option value="全部">全部</option>';
  Object.keys(cityDistrictMap).forEach(c=>{
    const opt=document.createElement("option");
    opt.value=c;opt.textContent=c;citySel.appendChild(opt);
  });
  citySel.addEventListener("change",populateDistrictList);
}

/* 地區 */
function populateDistrictList(){
  const city=document.getElementById("citySelect").value;
  const districtSel=document.getElementById("districtSelect");
  districtSel.innerHTML='<option value="全部">全部</option>';
  if(city!=="全部"&&cityDistrictMap[city])[...cityDistrictMap[city]].forEach(d=>{
    const opt=document.createElement("option");
    opt.value=d;opt.textContent=d;districtSel.appendChild(opt);
  });
}

/* 顯示結果 */
function renderResponsive(){
  if(window.innerWidth<=768){
    document.getElementById("resultTable").style.display="none";
    document.getElementById("resultCards").style.display="flex";
    renderMobileCards();
  }else{
    document.getElementById("resultCards").style.display="none";
    document.getElementById("resultTable").style.display="table";
    renderTablePage();
  }
}

/* 桌機表格 */
function renderTablePage(){
  const tbody=document.querySelector("#resultTable tbody");
  tbody.innerHTML="";
  const start=(currentPage-1)*itemsPerPage;
  const end=start+itemsPerPage;
  currentData.slice(start,end).forEach(d=>{
    const addr=d["醫事機構地址"],tel=d["醫事機構電話"],mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const tr=document.createElement("tr");
    tr.classList.add("hidden");
    tr.innerHTML=`<td>${d["醫事機構名稱"]}</td>
<td><a href="${mapUrl}" target="_blank">${addr}</a></td>
<td><a href="tel:${tel}">${tel}</a></td>
<td>${d["整合團隊名稱"]}</td>
<td>${d["來源"]}</td>`;
    tbody.appendChild(tr);
  });
  renderPagination();initScrollAnimation();
}

/* 手機卡片 */
function renderMobileCards(){
  const c=document.getElementById("resultCards");
  c.innerHTML="";
  currentData.forEach(d=>{
    const addr=d["醫事機構地址"],tel=d["醫事機構電話"],mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const card=document.createElement("div");
    card.className="card hidden";
    card.innerHTML=`<h3>${d["醫事機構名稱"]}</h3>
<p>📍 <a href="${mapUrl}" target="_blank">${addr}</a></p>
<p>📞 <a href="tel:${tel}">${tel}</a></p>
<p>🏥 ${d["整合團隊名稱"]||"未提供"}</p>
<p class="src">資料來源：${d["來源"]}</p>`;
    c.appendChild(card);
  });
  initScrollAnimation();
}

/* 分頁 */
function renderPagination(){
  const total=Math.ceil(currentData.length/itemsPerPage);
  const box=document.getElementById("pagination");
  box.innerHTML="";
  if(total<=1)return;
  const prev=document.createElement("button");
  prev.textContent="上一頁";prev.disabled=currentPage===1;
  prev.onclick=()=>{currentPage--;renderResponsive();window.scrollTo({top:0,behavior:"smooth"});};
  const next=document.createElement("button");
  next.textContent="下一頁";next.disabled=currentPage===total;
  next.onclick=()=>{currentPage++;renderResponsive();window.scrollTo({top:0,behavior:"smooth"});};
  const info=document.createElement("span");
  info.textContent=`第 ${currentPage} / ${total} 頁`;
  box.append(prev,info,next);
}

/* 動畫 */
function initScrollAnimation(){
  const ob=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting)x.target.classList.add("visible");});},{threshold:0.1});
  document.querySelectorAll(".hidden").forEach(el=>ob.observe(el));
}

/* 主題切換 */
function initTheme(){
  const btn=document.getElementById("themeToggle");
  if(localStorage.getItem("theme")==="dark")document.body.classList.add("dark");
  btn.addEventListener("click",()=>{
    document.body.classList.toggle("dark");
    localStorage.setItem("theme",document.body.classList.contains("dark")?"dark":"light");
  });
}
