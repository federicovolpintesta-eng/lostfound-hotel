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
  
  let fE = "-";
  if (registro.fecha_entrega) {
    const d = new Date(registro.fecha_entrega);
    if (!isNaN(d.getTime())) {
      fE = d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }
  }

  const safeImg = sanitizeUrl(registro.imagen);
  const safeObjeto = escapeHTML(registro.objeto);
  const safeHabitacion = escapeHTML(registro.habitacion || "No especificada");
  const safeSector = escapeHTML(registro.sector || "No especificado");
  const safePrioridad = escapeHTML(registro.prioridad || "Baja");
  const safeNombreEntrega = escapeHTML(registro.nombre_entrega || "Titular no registrado");
  const safeId = parseInt(registro.id, 10);

  // Status Banner (Entregado vs En Custodia)
  let statusBannerHtml = "";
  if (registro.entregado) {
    statusBannerHtml = `
      <div class="state-banner state-delivered">
        <div class="state-badge-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="state-badge-content">
          <div class="state-badge-title">OBJETO ENTREGADO</div>
          <div class="state-badge-desc">Restituido exitosamente por el departamento de Gobernanza</div>
        </div>
      </div>
    `;
  } else {
    statusBannerHtml = `
      <div class="state-banner state-custody">
        <div class="state-badge-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <div class="state-badge-content">
          <div class="state-badge-title">EN CUSTODIA OFICIAL</div>
          <div class="state-badge-desc">Bajo resguardo en Recepción / Ama de Llaves</div>
        </div>
      </div>
    `;
  }

  let imageHtml = "";
  if (safeImg) {
    imageHtml = `<img src="${safeImg}" alt="${safeObjeto}" class="view-image">`;
  }

  const prioridadColor = registro.prioridad === 'Alta' ? '#fca5a5' : registro.prioridad === 'Media' ? '#fcd34d' : '#94a3b8';

  dataCard.innerHTML = `
    <h1 class="view-title">${safeObjeto}</h1>
    
    ${statusBannerHtml}
    
    ${imageHtml}

    <div class="view-details">
        ${registro.entregado ? `
        <div class="detail-item full-width detail-recipient">
            <div class="detail-label">Entregado Oficialmente a</div>
            <div class="detail-value detail-value-recipient">${safeNombreEntrega}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">Fecha de restitución: ${fE}</div>
        </div>
        ` : ''}

        <div class="detail-item">
            <div class="detail-label">ID Identificador</div>
            <div class="detail-value">#${safeId}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Prioridad de Custodia</div>
            <div class="detail-value" style="color: ${prioridadColor}">${safePrioridad}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Habitación / Ubicación</div>
            <div class="detail-value">${safeHabitacion}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Sector del Hotel</div>
            <div class="detail-value">${safeSector}</div>
        </div>
        <div class="detail-item full-width">
            <div class="detail-label">Fecha y Hora de Hallazgo</div>
            <div class="detail-value">${fH}</div>
        </div>
    </div>

    <div class="official-seal-box">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      <span>Registro Oficial Los Pinos Resort &amp; Spa Termal &bull; Sistema Lost &amp; Found</span>
    </div>
  `;
}
