import { obtenerOlvidoPorId } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    showError("No se proporcionó un ID válido.");
    return;
  }

  try {
    const { data, error } = await obtenerOlvidoPorId(id);
    
    if (error || !data) {
      showError("No se encontró el objeto o hubo un error al cargar.");
      return;
    }

    renderData(data);
  } catch (err) {
    showError("Error de conexión al obtener los datos.");
  }
});

function showError(msg) {
  const loading = document.getElementById("loadingContainer");
  loading.innerHTML = `<div class="view-card glass-panel" style="text-align: center;"><h2 style="color: var(--danger);">${msg}</h2></div>`;
}

function renderData(registro) {
  document.getElementById("loadingContainer").style.display = "none";
  document.getElementById("contentContainer").style.display = "flex";

  const dataCard = document.getElementById("dataCard");
  const fH = new Date(registro.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  
  let imageHtml = "";
  if (registro.imagen) {
    imageHtml = `<img src="${registro.imagen}" alt="${registro.objeto}" class="view-image">`;
  } else {
    imageHtml = `<div style="text-align:center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px dashed var(--glass-border); color: var(--text-muted);">Sin fotografía adjunta</div>`;
  }

  const statusClass = registro.entregado ? "status-entregado" : "status-custodia";
  const statusText = registro.entregado ? "ENTREGADO" : "EN CUSTODIA";

  const prioridadColor = registro.prioridad === 'Alta' ? '#fca5a5' : registro.prioridad === 'Media' ? '#fcd34d' : '#cbd5e1';

  dataCard.innerHTML = \`
    <h1 class="view-title">\${registro.objeto}</h1>
    <div style="text-align: center;">
        <span class="status-badge \${statusClass}">\${statusText}</span>
    </div>
    
    \${imageHtml}

    <div class="view-details">
        <div class="detail-item">
            <div class="detail-label">ID Registro</div>
            <div class="detail-value">#\${registro.id}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Fecha y Hora de Hallazgo</div>
            <div class="detail-value">\${fH}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Habitación / Ubicación</div>
            <div class="detail-value">\${registro.habitacion || "No especificada"}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Sector</div>
            <div class="detail-value">\${registro.sector || "No especificado"}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Prioridad</div>
            <div class="detail-value" style="color: \${prioridadColor}">\${registro.prioridad || "Baja"}</div>
        </div>
        \${registro.entregado ? \`
        <div class="detail-item">
            <div class="detail-label">Entregado a</div>
            <div class="detail-value" style="color: var(--success);">\${registro.nombre_entrega || "No registrado"}</div>
        </div>
        \` : ''}
    </div>
  \`;
}
