// 載入資料
fetch('data/processed_data.json')
  .then(res => res.json())
  .then(data => {
    window.allData = data;
    populateFilters(data);
  });

// 產生下拉選單
function populateFilters(data) {
  const regions = [...new Set(data.map(d => d.region))];
  const ages = [...new Set(data.map(d => d.ageGroup))];
  const genders = [...new Set(data.map(d => d.gender))];

  fillSelect('regionSelect', regions);
  fillSelect('ageGroupSelect', ages);
  fillSelect('genderSelect', genders);
}

function fillSelect(id, arr) {
  const sel = document.getElementById(id);
  const allOpt = document.createElement('option');
  allOpt.value = '全部';
  allOpt.textContent = '全部';
  sel.appendChild(allOpt);
  arr.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

// 查詢按鈕功能
document.getElementById('queryBtn').addEventListener('click', () => {
  const region = document.getElementById('regionSelect').value;
  const age = document.getElementById('ageGroupSelect').value;
  const gender = document.getElementById('genderSelect').value;

  const filtered = allData.filter(d =>
    (region === '全部' || d.region === region) &&
    (age === '全部' || d.ageGroup === age) &&
    (gender === '全部' || d.gender === gender)
  );

  renderTable(filtered);
  renderChart(filtered);
});

// 顯示表格
function renderTable(data) {
  const container = document.getElementById('resultTable');
  if (data.length === 0) {
    container.innerHTML = '<p>無符合資料</p>';
    return;
  }
  let html = '<table><tr><th>地區</th><th>年齡層</th><th>性別</th><th>病例數</th></tr>';
  data.forEach(d => {
    html += `<tr><td>${d.region}</td><td>${d.ageGroup}</td><td>${d.gender}</td><td>${d.cases}</td></tr>`;
  });
  html += '</table>';
  container.innerHTML = html;
}

// 畫出 Chart.js 圖表
let chartInstance = null;
function renderChart(data) {
  const ctx = document.getElementById('chartArea');
  const labels = data.map(d => d.region);
  const values = data.map(d => d.cases);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '病例數',
        data: values,
        backgroundColor: '#319795'
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}
