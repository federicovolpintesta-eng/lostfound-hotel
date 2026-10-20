import { obtenerOlvidoPorId } from "./api.js";
import { escapeHTML, sanitizeUrl } from "./security.js";

async function init() {
  const loading = document.getElementById("loadingContainer");
  if (loading) loading.innerHTML = `<div class="view-card glass-panel" style="text-align: center;"><h2 style="color: var(--text-muted);">Consultando base de datos...</h2></div>`;

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    showError("Código QR incompleto: No se encontró ningún identificador de objeto en el enlace.");
    return;
  }

  try {
    const { data, error } = await obtenerOlvidoPorId(id);
    
    if (error) {
      console.error("Error al obtener objeto:", error);
      showError("No fue posible consultar el registro en la base de datos (" + (error.message || "Error de conexión") + ").");
      return;
    }
    
    if (!data) {
      showError("No se encontró ningún objeto registrado con el ID #" + id);
      return;
    }

    renderData(data);
  } catch (err) {
    console.error("Excepción en view.js:", err);
    showError("Error inesperado al cargar la información: " + err.message);
  }
}

// Module scripts run after the DOM is completely parsed.
// We can execute init() directly without waiting for events.
init();

function showError(msg) {
  const loading = document.getElementById("loadingContainer");
  if (loading) {
    loading.innerHTML = `
      <div class="view-card glass-panel" style="text-align: center; padding: 40px 24px;">
        <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: var(--danger); font-size: 20px; font-weight: 700; margin-bottom: 10px;">No fue posible cargar el registro</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5;">${escapeHTML(msg)}</p>
        <button onclick="location.reload()" style="background: var(--primary); color: #020617; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 14px;">Reintentar</button>
      </div>`;
  }
}

function renderData(registro) {
  document.getElementById("loadingContainer").style.display = "none";
  document.getElementById("contentContainer").style.display = "flex";

  const dataCard = document.getElementById("dataCard");
  const fH = new Date(registro.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  
  const safeImg = sanitizeUrl(registro.imagen);
  const safeObjeto = escapeHTML(registro.objeto);
  const safeHabitacion = escapeHTML(registro.habitacion || "No especificada");
  const safeSector = escapeHTML(registro.sector || "No especificado");
  const safePrioridad = escapeHTML(registro.prioridad || "Baja");
  const safeNombreEntrega = escapeHTML(registro.nombre_entrega || "No registrado");
  const safeId = parseInt(registro.id, 10);

  let imageHtml = "";
  if (safeImg) {
    imageHtml = `<img src="${safeImg}" alt="${safeObjeto}" class="view-image">`;
  } else if (registro.entregado) {
    imageHtml = `
      <div style="text-align:center; padding: 24px; background: rgba(16, 185, 129, 0.05); border-radius: 12px; border: 1px dashed rgba(16, 185, 129, 0.25); color: var(--text-muted); font-size: 13px;">
        <span style="font-size: 24px; display: block; margin-bottom: 6px; color: var(--success);">✓</span>
        Objeto entregado y cerrado (almacenamiento de imagen optimizado)
      </div>`;
  } else {
    imageHtml = `
      <div style="text-align:center; padding: 28px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed var(--glass-border); color: var(--text-muted); font-size: 13px;">
        <span style="font-size: 24px; display: block; margin-bottom: 6px; opacity: 0.5;">📷</span>
        Sin fotografía adjunta
      </div>`;
  }

  const statusClass = registro.entregado ? "status-entregado" : "status-custodia";
  const statusText = registro.entregado ? "ENTREGADO" : "EN CUSTODIA";

  const prioridadColor = registro.prioridad === 'Alta' ? '#fca5a5' : registro.prioridad === 'Media' ? '#fcd34d' : '#cbd5e1';

  dataCard.innerHTML = `
    <h1 class="view-title">${safeObjeto}</h1>
    <div style="text-align: center;">
        <span class="status-badge ${statusClass}">${statusText}</span>
    </div>
    
    ${imageHtml}

    <div class="view-details">
        <div class="detail-item">
            <div class="detail-label">ID Registro</div>
            <div class="detail-value">#${safeId}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Fecha y Hora de Hallazgo</div>
            <div class="detail-value">${fH}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Habitación / Ubicación</div>
            <div class="detail-value">${safeHabitacion}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Sector</div>
            <div class="detail-value">${safeSector}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Prioridad</div>
            <div class="detail-value" style="color: ${prioridadColor}">${safePrioridad}</div>
        </div>
        ${registro.entregado ? `
        <div class="detail-item">
            <div class="detail-label">Entregado a</div>
            <div class="detail-value" style="color: var(--success);">${safeNombreEntrega}</div>
        </div>
        ` : ''}
    </div>
  `;
}
