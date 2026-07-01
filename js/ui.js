import { getDashboardStats, getSectorStats } from "./api.js";

// Global UI State
export const uiState = {
  registros: [],
  vistaActual: 'pendientes',
  viewMode: localStorage.getItem('viewMode') || 'table',
  currentSortCol: 'fecha',
  isAscending: false,
  myChart: null
};

// --- THEME MANAGEMENT ---
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('themeToggleIcon');
  if (themeIcon) {
    themeIcon.innerText = theme === 'dark' ? '🌙' : '☀️';
  }
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
}

// --- TOAST NOTIFICATIONS ---
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- MODALS ---
export function openInputModal(title, desc, placeholder) {
  return new Promise((resolve) => {
    document.getElementById('inputModalTitle').innerText = title;
    document.getElementById('inputModalDesc').innerText = desc;
    document.getElementById('inputModalInput').placeholder = placeholder;
    document.getElementById('inputModalInput').value = '';
    document.getElementById('inputModal').style.display = 'flex';
    document.getElementById('inputModalInput').focus();
    
    document.getElementById('inputModalConfirmBtn').onclick = () => {
      const val = document.getElementById('inputModalInput').value.trim();
      document.getElementById('inputModal').style.display = 'none';
      resolve(val);
    };
    window.closeInputModal = () => {
      document.getElementById('inputModal').style.display = 'none';
      resolve(null);
    };
  });
}

export function openConfirmModal(title, desc) {
  return new Promise((resolve) => {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalDesc').innerText = desc;
    document.getElementById('confirmModalInput').value = '';
    document.getElementById('confirmModal').style.display = 'flex';
    document.getElementById('confirmModalInput').focus();
    
    document.getElementById('confirmModalConfirmBtn').onclick = () => {
      const val = document.getElementById('confirmModalInput').value.trim();
      document.getElementById('confirmModal').style.display = 'none';
      resolve(val);
    };
    window.closeConfirmModal = () => {
      document.getElementById('confirmModal').style.display = 'none';
      resolve(null);
    };
  });
}

// --- PHOTO VIEW MODAL ---
export function verGrande(url) {
  const imgGrande = document.getElementById("imgGrande");
  const btnDescargar = document.getElementById("btnDescargarFoto");
  const modalFoto = document.getElementById("modalFoto");

  if (imgGrande) imgGrande.src = url;
  if (btnDescargar) {
    btnDescargar.href = url;
    
    let extension = 'jpg';
    const match = url.match(/^data:image\/(\w+);base64,/);
    if (match) {
      extension = match[1];
      if (extension === 'jpeg') extension = 'jpg';
    } else {
      const parts = url.split('.');
      if (parts.length > 1) {
        const ext = parts.pop().split('?')[0].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          extension = ext === 'jpeg' ? 'jpg' : ext;
        }
      }
    }
    btnDescargar.download = `foto_olvido_${Date.now()}.${extension}`;
  }

  if (modalFoto) modalFoto.style.display = "flex";
}

export function cerrarGrande() {
  const modalFoto = document.getElementById("modalFoto");
  if (modalFoto) modalFoto.style.display = "none";
  setTimeout(() => {
    const imgGrande = document.getElementById("imgGrande");
    if (imgGrande) imgGrande.src = "";
  }, 300);
}

// --- VIEW MANAGEMENT ---
export function setViewMode(mode) {
  uiState.viewMode = mode;
  localStorage.setItem('viewMode', mode);
  
  const btnTable = document.getElementById("btnViewTable");
  const btnGrid = document.getElementById("btnViewGrid");
  
  if (mode === 'table') {
    if (btnTable) btnTable.classList.add('active');
    if (btnGrid) btnGrid.classList.remove('active');
  } else {
    if (btnTable) btnTable.classList.remove('active');
    if (btnGrid) btnGrid.classList.add('active');
  }
  
  render();
}

export function switchTab(tab) {
  uiState.vistaActual = tab;
  document.querySelectorAll('.pill-link').forEach(btn => btn.classList.remove('active'));
  
  const buttonMap = {
    'pendientes': 'tabPendientes',
    'donaciones': 'tabDonaciones',
    'historial': 'tabHistorial'
  };
  
  const activeId = buttonMap[tab];
  if (activeId && document.getElementById(activeId)) {
    document.getElementById(activeId).classList.add('active');
  }
  render();
}

// --- SORTING ---
export function sortTable(col) {
  if (uiState.currentSortCol === col) {
    uiState.isAscending = !uiState.isAscending;
  } else {
    uiState.currentSortCol = col;
    uiState.isAscending = true;
  }
  render();
}

function getSortIcon(col) {
  if (uiState.currentSortCol !== col) return "⇅";
  return uiState.isAscending ? "↑" : "↓";
}

// --- DASHBOARD AND CHART SYNC ---
export async function syncDashboard(totalReal) {
  try {
    const stats = await getDashboardStats();
    if (stats.error) throw stats.error;

    const totalActual = stats.enCustodia + stats.entregados;
    const porcentaje = totalActual > 0 ? ((stats.entregados / totalActual) * 100).toFixed(1) + "%" : "0%";

    const totalEl = document.getElementById("totalObjetos");
    const custodiaEl = document.getElementById("enCustodiaCount");
    const entregadosEl = document.getElementById("entregadosCount");
    const tasaEl = document.getElementById("tasaRetorno");

    if (totalEl) totalEl.innerText = totalReal || totalActual;
    if (custodiaEl) custodiaEl.innerText = stats.enCustodia;
    if (entregadosEl) entregadosEl.innerText = stats.entregados;
    if (tasaEl) tasaEl.innerText = porcentaje;
  } catch (err) {
    console.error("Error al actualizar dashboard:", err);
  }
}

export async function syncChart() {
  const ctx = document.getElementById('chartSectores')?.getContext('2d');
  if (!ctx) return;

  const { data, error } = await getSectorStats();
  if (error) return;

  const caps = { "A&B": 0, "Pileta": 0, "Spa & Salud": 0, "Recreación": 0, "Áreas Públicas": 0, "Habitaciones": 0 };
  const colores = ['#38bdf8', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#94a3b8']; // Premium Dark Mode Palette
  
  const items = data || [];
  items.forEach(r => {
    const cat = obtenerCategoriaSector(r.sector);
    if (caps.hasOwnProperty(cat)) caps[cat]++;
  });

  const leyendaDiv = document.getElementById("leyendaSectores");
  if (leyendaDiv) {
    leyendaDiv.innerHTML = "";
    Object.keys(caps).forEach((label, i) => {
      leyendaDiv.innerHTML += `
        <div class="legend-item">
          <div class="legend-color" style="background:${colores[i]}"></div>
          ${label}: <strong>${caps[label]}</strong>
        </div>`;
    });
  }

  if (uiState.myChart) uiState.myChart.destroy();
  uiState.myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(caps),
      datasets: [{ data: Object.values(caps), backgroundColor: colores, borderWidth: 2, borderColor: '#020617' }]
    },
    options: { cutout: '70%', plugins: { legend: { display: false } } }
  });
}

function obtenerCategoriaSector(sector) {
  const s = String(sector || "").toLowerCase();
  if (s.includes("a&b") || s.includes("bar") || s.includes("comedor")) return "A&B";
  if (s.includes("pileta")) return "Pileta";
  if (s.includes("spa") || s.includes("salud")) return "Spa & Salud";
  if (s.includes("recreacion")) return "Recreación";
  if (s.includes("publicas") || s.includes("areas")) return "Áreas Públicas";
  return "Habitaciones";
}

// --- MAIN RENDER ENGINE ---
export function render() {
  try {
    const ahora = new Date();
    const unAñoMs = 90 * 24 * 60 * 60 * 1000; // 90 days instead of 365
    const prioFilterVal = document.getElementById("prioFilter")?.value || "Todas";

    let filtrados = (uiState.registros || []).filter(r => {
      if (!r) return false;
      const createdTime = r.created_at ? new Date(r.created_at).getTime() : 0;
      const esAntiguo = isNaN(createdTime) ? false : (ahora.getTime() - createdTime) > unAñoMs;
      
      let show = false;
      if (uiState.vistaActual === 'pendientes') show = !r.entregado && !esAntiguo;
      else if (uiState.vistaActual === 'donaciones') show = !r.entregado && esAntiguo;
      else if (uiState.vistaActual === 'historial') show = !!r.entregado;
      
      if (show && prioFilterVal !== "Todas") {
        return (r.prioridad || "Baja") === prioFilterVal;
      }
      return show;
    });

    // Memory Sorting
    filtrados.sort((a, b) => {
      let valA, valB;
      if (uiState.currentSortCol === 'fecha') {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0;
        valB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (isNaN(valA)) valA = 0;
        if (isNaN(valB)) valB = 0;
      } else if (uiState.currentSortCol === 'prioridad') {
        const prioMap = { "Alta": 3, "Media": 2, "Baja": 1 };
        valA = prioMap[a.prioridad] || 0;
        valB = prioMap[b.prioridad] || 0;
      } else {
        valA = String(a[uiState.currentSortCol] || "").toLowerCase();
        valB = String(b[uiState.currentSortCol] || "").toLowerCase();
      }

      if (valA < valB) return uiState.isAscending ? -1 : 1;
      if (valA > valB) return uiState.isAscending ? 1 : -1;
      return 0;
    });

    const thead = document.getElementById("cabeceraTabla");
    const tbody = document.getElementById("cuerpoTabla");
    const table = document.getElementById("tablaPrincipal");
    const grid = document.getElementById("gridPrincipal");
    
    if (!thead || !tbody || !table || !grid) return;
    
    tbody.innerHTML = "";
    grid.innerHTML = "";

    if (uiState.viewMode === 'table') {
      table.style.display = "table";
      grid.style.display = "none";

      if (uiState.vistaActual === 'historial') {
        thead.innerHTML = `<tr>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('fecha')">HALLAZGO ${getSortIcon('fecha')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('habitacion')">UBICACIÓN ${getSortIcon('habitacion')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('objeto')">OBJETO ${getSortIcon('objeto')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('nombre_entrega')">RECIBIÓ ${getSortIcon('nombre_entrega')}</th>
          <th>FOTO</th>
          <th>FECHA ENTREGA</th>
          <th style="text-align:center">ETIQUETA</th>
        </tr>`;
      } else {
        thead.innerHTML = `<tr>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('fecha')">REGISTRO ${getSortIcon('fecha')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('habitacion')">UBICACIÓN ${getSortIcon('habitacion')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('objeto')">OBJETO ${getSortIcon('objeto')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('sector')">SECTOR ${getSortIcon('sector')}</th>
          <th style="cursor:pointer" onclick="window.lostFound.sortTable('prioridad')">PRIORIDAD ${getSortIcon('prioridad')}</th>
          <th>FOTO</th>
          <th style="text-align:center">ACCIÓN</th>
        </tr>`;
      }

      filtrados.forEach(r => {
        const tr = document.createElement("tr");
        let fH = "-";
        if (r.created_at) {
          const d = new Date(r.created_at);
          if (!isNaN(d.getTime())) {
            fH = d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
          }
        }
        const img = r.imagen 
          ? `<img src="${r.imagen}" class="img-thumbnail" loading="lazy" onclick="window.lostFound.verGrande('${r.imagen}')">` 
          : "<div style='width:48px;height:48px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:10px;'>Sin Foto</div>";

        if (r.prioridad === "Alta") tr.classList.add('priority-high');

        if (uiState.vistaActual !== 'historial') {
          tr.innerHTML = `
            <td style="color:var(--text-muted); font-size:13px; white-space:nowrap;">${fH}</td>
            <td style="font-weight:600">${r.habitacion || "-"}</td>
            <td style="font-weight:600; color:var(--primary)">${r.objeto}</td>
            <td style="font-size:13px; color:var(--text-muted)">${r.sector || "-"}</td>
            <td><span style="font-size:12px; padding:6px 10px; border-radius:12px; background:${r.prioridad==='Alta'?'rgba(239,68,68,0.2)':r.prioridad==='Media'?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'}; color:${r.prioridad==='Alta'?'#fca5a5':r.prioridad==='Media'?'#fcd34d':'#cbd5e1'}; font-weight:600;">${r.prioridad || "Baja"}</span></td>
            <td>${img}</td>
            <td class="action-buttons-wrapper">
              <button onclick="window.lostFound.entregar(${r.id})" class="btn-action-table">Entregar</button>
              <button onclick="window.lostFound.abrirModalQR(${r.id})" class="btn-action-table btn-qr-table" title="Código QR" style="background:rgba(255,255,255,0.05);color:var(--text-main);border:1px solid var(--glass-border);padding:6px 10px;border-radius:6px;cursor:pointer;">🏷️</button>
              <button onclick="window.lostFound.eliminar(${r.id})" class="btn-action-table btn-delete-table" title="Eliminar">🗑️</button>
            </td>`;
        } else {
          let fE = "-";
          if (r.fecha_entrega) {
            const d = new Date(r.fecha_entrega);
            if (!isNaN(d.getTime())) {
              fE = d.toLocaleDateString('es-AR');
            }
          }
          tr.innerHTML = `
            <td style="color:var(--text-muted); font-size:13px; white-space:nowrap;">${fH}</td>
            <td style="font-weight:600">${r.habitacion || "-"}</td>
            <td style="font-weight:600; color:var(--primary)">${r.objeto}</td>
            <td style="font-weight:700; color:var(--navy)">${r.nombre_entrega || "S/D"}</td>
            <td>${img}</td>
            <td>${fE}</td>
            <td class="action-buttons-wrapper" style="justify-content:center">
              <button onclick="window.lostFound.abrirModalQR(${r.id})" class="btn-action-table btn-qr-table" title="Ver QR" style="background:rgba(255,255,255,0.05);color:var(--text-main);border:1px solid var(--glass-border);padding:6px 10px;border-radius:6px;cursor:pointer;">🏷️</button>
              <button onclick="window.lostFound.eliminar(${r.id})" class="btn-action-table btn-delete-table" title="Eliminar">🗑️</button>
            </td>`;
        }
        tbody.appendChild(tr);
      });
    } else {
      table.style.display = "none";
      grid.style.display = "grid";

      filtrados.forEach(r => {
        const card = document.createElement("div");
        card.className = "object-card glass-panel";
        let fH = "-";
        if (r.created_at) {
          const d = new Date(r.created_at);
          if (!isNaN(d.getTime())) {
            fH = d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
          }
        }
        
        const badge = `<span style="font-size:12px; padding:6px 10px; border-radius:12px; background:${r.prioridad==='Alta'?'rgba(239,68,68,0.2)':r.prioridad==='Media'?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'}; color:${r.prioridad==='Alta'?'#fca5a5':r.prioridad==='Media'?'#fcd34d':'#cbd5e1'}; font-weight:600;">${r.prioridad || "Baja"}</span>`;
        const fotoCard = r.imagen 
          ? `<img src="${r.imagen}" class="card-img" onclick="window.lostFound.verGrande('${r.imagen}')">`
          : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:12px;"><span style="font-size:2rem;margin-bottom:8px;display:block">📷</span>Sin Foto</div>`;

        if (r.prioridad === "Alta") card.classList.add('priority-high');

        const habValor = String(r.habitacion || "").trim();
        let habitacionTexto = "Sin Datos";
        if (habValor) {
          if (/^\d+$/.test(habValor)) {
            habitacionTexto = `Hab. ${habValor}`;
          } else if (habValor.toLowerCase().startsWith("hab")) {
            habitacionTexto = habValor;
          } else {
            habitacionTexto = `Encontrado: ${habValor}`;
          }
        }

        if (uiState.vistaActual !== 'historial') {
          card.innerHTML = `
            <div class="card-img-container">
              ${fotoCard}
              <span class="card-room">${habitacionTexto}</span>
              <div class="card-badge-wrapper">${badge}</div>
            </div>
            <div class="card-body">
              <h4 class="card-title" style="color:var(--primary);">${r.objeto}</h4>
              <p class="card-detail">📍 <span><strong>Sector:</strong> ${r.sector || "-"}</span></p>
              <p class="card-detail">📅 <span><strong>Fecha:</strong> ${fH}</span></p>
            </div>
            <div class="card-footer">
              <button onclick="window.lostFound.entregar(${r.id})" class="btn-action-table" style="flex:2">Entregar</button>
              <button onclick="window.lostFound.abrirModalQR(${r.id})" class="btn-action-table" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);color:var(--text-main);" title="Etiqueta QR">🏷️ QR</button>
              <button onclick="window.lostFound.eliminar(${r.id})" class="btn-action-table btn-delete-table" style="flex:1" title="Eliminar">🗑️</button>
            </div>`;
        } else {
          let fE = "-";
          if (r.fecha_entrega) {
            const d = new Date(r.fecha_entrega);
            if (!isNaN(d.getTime())) {
              fE = d.toLocaleDateString('es-AR');
            }
          }
          card.innerHTML = `
            <div class="card-img-container">
              ${fotoCard}
              <span class="card-room">${habitacionTexto}</span>
              <div class="card-badge-wrapper">${badge}</div>
            </div>
            <div class="card-body">
              <h4 class="card-title" style="color:var(--primary);">${r.objeto}</h4>
              <p class="card-detail">👤 <span><strong>Recibió:</strong> ${r.nombre_entrega || "S/D"}</span></p>
              <p class="card-detail">📅 <span><strong>Entrega:</strong> ${fE}</span></p>
            </div>
            <div class="card-footer">
              <button onclick="window.lostFound.abrirModalQR(${r.id})" class="btn-action-table" style="flex:3;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);color:var(--text-main);" title="Ver QR">🏷️ Ver QR</button>
              <button onclick="window.lostFound.eliminar(${r.id})" class="btn-action-table btn-delete-table" style="flex:1" title="Eliminar">🗑️</button>
            </div>`;
        }
        grid.appendChild(card);
      });
    }
  } catch (e) {
    console.error("Error crítico durante render():", e);
  }
}
