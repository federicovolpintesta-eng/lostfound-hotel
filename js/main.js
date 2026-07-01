import { login } from "./auth.js";
import { 
  fetchOlvidos, 
  buscarOlvidos, 
  crearOlvido, 
  entregarOlvido, 
  eliminarOlvido, 
  subscribeRealtime 
} from "./api.js";
import { 
  uiState, 
  applyTheme, 
  toggleTheme, 
  showToast, 
  openInputModal, 
  openConfirmModal, 
  verGrande, 
  cerrarGrande, 
  setViewMode, 
  switchTab, 
  sortTable, 
  syncDashboard, 
  syncChart, 
  render 
} from "./ui.js";
import { 
  exportPDF, 
  exportExcel, 
  generarActaEntrega 
} from "./pdf.js";
import { 
  initDragAndDrop, 
  getArchivoActual, 
  clearArchivoActual, 
  manejarArchivoSeleccionado 
} from "./dragDrop.js";

// --- STATE MANAGEMENT ---
let offset = 0;
const LIMITE_REGISTROS = 40;
let cargando = false;

// --- FLOW CONTROLLERS ---

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const btn = document.querySelector(".btn-login-action");
  btn.innerText = "Ingresando...";
  btn.disabled = true;

  try {
    const { error } = await login(email, password);
    
    if (error) {
      showToast("Credenciales incorrectas.", 'error');
      return;
    }
    
    showToast("Sesión iniciada correctamente", 'success');
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    await cargar(true);
    subscribeRealtime(() => cargar(true));
    initDragAndDrop();
  } catch (err) {
    showToast("Error de conexión", 'error');
    console.error(err);
  } finally {
    btn.innerText = "Ingresar al Sistema";
    btn.disabled = false;
  }
}

async function cargar(limpiar = true) {
  if (cargando) return;
  cargando = true;

  if (limpiar) {
    offset = 0;
    uiState.registros = [];
  }

  try {
    const { resData, resCount } = await fetchOlvidos(offset, LIMITE_REGISTROS);
    if (resData.error) throw resData.error;
    if (resCount.error) throw resCount.error;

    uiState.registros = limpiar ? (resData.data || []) : [...uiState.registros, ...(resData.data || [])];
    
    await syncDashboard(resCount.count);
    await syncChart();
    render();
  } catch (err) {
    showToast("Error al cargar datos", 'error');
    console.error(err);
  } finally {
    cargando = false;
    offset += LIMITE_REGISTROS;
  }
}

async function buscarReal() {
  const texto = document.getElementById("searchInput").value.trim().toLowerCase();
  
  if (texto === "") {
    await cargar(true);
    return;
  }

  const { data, error } = await buscarOlvidos(texto);

  if (!error) {
    uiState.registros = data || [];
    render();
  }
}

async function guardar() {
  const obj = document.getElementById("objeto").value;
  if (!obj) {
    showToast("Por favor, describe el objeto.", 'warning');
    return;
  }
  
  const btn = document.querySelector(".btn-registrar");
  btn.innerText = "Subiendo...";
  btn.disabled = true;

  let urlPublica = null;
  const archivoActual = getArchivoActual();

  try {
    if (archivoActual) {
      const formData = new FormData();
      formData.append("image", archivoActual);
      
      const response = await fetch("https://api.imgbb.com/1/upload?key=3d55473935401cd7cb71b0ac18749f3c", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      
      if (result.success) {
        urlPublica = result.data.url;
      } else {
        throw new Error("Error al subir la foto: " + (result.error ? result.error.message : "Desconocido"));
      }
    }

    const { error } = await crearOlvido(
      document.getElementById("habitacion").value,
      obj,
      document.getElementById("sector").value,
      document.getElementById("prioridad").value,
      urlPublica
    );

    if (error) throw error;
    
    showToast("Hallazgo registrado con éxito", 'success');
    
    // Form Cleanup
    document.getElementById("objeto").value = "";
    document.getElementById("habitacion").value = "";
    clearArchivoActual();

    await cargar(true);
  } catch (err) {
    showToast("Error: " + err.message, 'error');
  } finally {
    btn.innerText = "Registrar Hallazgo";
    btn.disabled = false;
  }
}

async function entregar(id) {
  const registro = uiState.registros.find(r => r.id === id);
  if (!registro) return;
  
  const nombrePersona = await openInputModal(
    "Entregar Objeto", 
    `Has seleccionado entregar: ${registro.objeto}.\nPor favor, ingresa el nombre de quien lo recibe:`, 
    "Nombre completo"
  );
  if (!nombrePersona) return;

  const { error } = await entregarOlvido(id, nombrePersona);

  if (error) {
    showToast("Error al actualizar estado", 'error');
  } else {
    showToast("Objeto entregado correctamente", 'success');
    generarActaEntrega(registro, nombrePersona);
    await cargar(true);
  }
}

async function eliminar(id) {
  const password = await openConfirmModal("Seguridad Requerida", "Ingrese la contraseña de seguridad para eliminar este registro:");
  if (password === null) return;
  
  if (password !== "lospinos") {
    showToast("Contraseña incorrecta", 'error');
    return;
  }

  const { error } = await eliminarOlvido(id);
  
  if (error) {
    showToast("Error al eliminar: " + error.message, 'error');
  } else {
    showToast("Registro eliminado exitosamente.", 'success');
    await cargar(true);
  }
}

// --- QR CODE GENERATION MODAL ---
async function abrirModalQR(id) {
  const registro = uiState.registros.find(r => r.id === id);
  if (!registro) return;

  const modal = document.getElementById("modalQR");
  const canvasQR = document.getElementById("canvasQR");
  const details = document.getElementById("qrDetails");

  if (!modal || !canvasQR || !details) return;

  const fH = new Date(registro.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const qrText = `LOST & FOUND - HOTEL LOS PINOS\nID Objeto: #${registro.id}\nObjeto: ${registro.objeto}\nHabitacion: ${registro.habitacion || "S/D"}\nSector: ${registro.sector || "S/D"}\nFecha: ${fH}`;
  
  new QRious({
    element: canvasQR,
    value: qrText,
    size: 250,
    background: 'white',
    foreground: 'black',
    level: 'H'
  });

  details.innerHTML = `
    <div style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 8px;">${registro.objeto}</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 13px; text-align: left; margin: 12px 0 0 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--glass-border);">
      <div><strong>ID Objeto:</strong> #${registro.id}</div>
      <div><strong>Habitación:</strong> ${registro.habitacion || "S/D"}</div>
      <div><strong>Fecha Reg:</strong> ${fH}</div>
      <div><strong>Sector:</strong> ${registro.sector || "S/D"}</div>
      <div style="grid-column: span 2;"><strong>Prioridad:</strong> <span style="color:${registro.prioridad === 'Alta' ? '#fca5a5' : registro.prioridad === 'Media' ? '#fcd34d' : '#cbd5e1'}; font-weight:600;">${registro.prioridad || "Baja"}</span></div>
    </div>
  `;

  modal.style.display = "flex";
}

function cerrarModalQR() {
  const modal = document.getElementById("modalQR");
  if (modal) modal.style.display = "none";
}

function imprimirQR() {
  window.print();
}

// --- GLOBAL NAMESPACE EXPOSURE FOR DYNAMIC RENDER TRIGGERS ---
window.lostFound = {
  entregar,
  abrirModalQR,
  eliminar,
  verGrande,
  cerrarGrande,
  cerrarModalQR,
  imprimirQR,
  switchTab,
  setViewMode,
  sortTable,
  toggleTheme,
  cargar
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme
  applyTheme(localStorage.getItem('theme') || 'dark');
  
  // Set View Mode
  setViewMode(uiState.viewMode);

  // --- STANDARD DOM EVENT LISTENERS (REPLACING INLINE ATTRS) ---
  
  // Login Form
  const loginForm = document.querySelector(".login-form-stack");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  // Logout/Refresh
  const btnCerrar = document.querySelector(".btn-cerrar");
  if (btnCerrar) {
    btnCerrar.addEventListener("click", () => {
      location.reload();
    });
  }

  // Save / Register Button
  const btnRegistrar = document.querySelector(".btn-registrar");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", () => {
      guardar();
    });
  }

  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      buscarReal();
    });
  }

  // Priority filter change
  const prioFilter = document.getElementById("prioFilter");
  if (prioFilter) {
    prioFilter.addEventListener("change", () => {
      render();
    });
  }

  // File Upload listener
  const fileUpload = document.getElementById("file-upload");
  if (fileUpload) {
    fileUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      manejarArchivoSeleccionado(file);
    });
  }

  // Export Buttons
  const btnPDF = document.querySelector(".btn-export.pdf");
  if (btnPDF) {
    btnPDF.addEventListener("click", () => {
      exportPDF(uiState.registros);
    });
  }

  const btnExcel = document.querySelector(".btn-export.xls");
  if (btnExcel) {
    btnExcel.addEventListener("click", () => {
      exportExcel(uiState.registros);
    });
  }

  // Image Modal triggers (if clicked directly on backdrop)
  const modalFoto = document.getElementById("modalFoto");
  if (modalFoto) {
    modalFoto.addEventListener("click", (e) => {
      if (e.target === modalFoto) cerrarGrande();
    });
  }

  // QR Modal triggers
  const modalQR = document.getElementById("modalQR");
  if (modalQR) {
    modalQR.addEventListener("click", (e) => {
      if (e.target === modalQR) cerrarModalQR();
    });
  }
});
