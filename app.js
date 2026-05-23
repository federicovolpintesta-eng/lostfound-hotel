const supabaseClient = window.supabaseClient;

// --- VARIABLES DE CONTROL DE FLUJO ---
let offset = 0;
const LIMITE_REGISTROS = 40;
let cargando = false;
let registros = [];
let archivoActual = null;
let vistaActual = 'pendientes';
let myChart = null;

// --- SISTEMA DE NOTIFICACIONES TOAST ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
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

// --- SISTEMA DE MODALES PERSONALIZADOS ---
function openInputModal(title, desc, placeholder) {
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

function openConfirmModal(title, desc) {
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

// --- LÓGICA PRINCIPAL ---

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const btn = document.querySelector(".btn-login-action");
    btn.innerText = "Ingresando...";
    btn.disabled = true;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    btn.innerText = "Ingresar al Sistema";
    btn.disabled = false;

    if (error) return showToast("Credenciales incorrectas.", 'error');
    
    showToast("Sesión iniciada correctamente", 'success');
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    cargar(true);
}

async function cargar(limpiar = true) {
    if (cargando) return;
    cargando = true;

    if (limpiar) {
        offset = 0;
        registros = [];
    }

    const { data, error } = await supabaseClient
        .from("olvidos")
        .select("*")
        .range(offset, offset + LIMITE_REGISTROS - 1)
        .order("created_at", { ascending: false });

    const { count: totalReal } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        cargando = false;
        showToast("Error al cargar datos", 'error');
        return console.error(error);
    }

    registros = limpiar ? data : [...registros, ...data];
    
    actualizarDashboard(totalReal); 
    actualizarGrafico(); 
    render();
    
    cargando = false;
    offset += LIMITE_REGISTROS;
}

async function buscarReal() {
    const texto = document.getElementById("searchInput").value.trim().toLowerCase();
    
    if (texto === "") {
        cargar(true);
        return;
    }

    const { data, error } = await supabaseClient
        .from("olvidos")
        .select("*")
        .or(`objeto.ilike.%${texto}%,habitacion.ilike.%${texto}%,sector.ilike.%${texto}%`)
        .order("created_at", { ascending: false })
        .limit(100); 

    if (!error) {
        registros = data;
        render();
    }
}

async function actualizarDashboard(totalReal) {
    const { count: enCustodia } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true })
        .eq('entregado', false);

    const { count: entregados } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true })
        .eq('entregado', true);
    
    const totalActual = (enCustodia || 0) + (entregados || 0);
    const porcentaje = totalActual > 0 ? ((entregados / totalActual) * 100).toFixed(1) + "%" : "0%";

    document.getElementById("totalObjetos").innerText = totalReal || totalActual;
    document.getElementById("enCustodiaCount").innerText = enCustodia || 0;
    document.getElementById("entregadosCount").innerText = entregados || 0;
    document.getElementById("tasaRetorno").innerText = porcentaje;
}

// Variables globales para ordenamiento
let currentSortCol = 'fecha';
let isAscending = false;

function sortTable(col) {
    if (currentSortCol === col) {
        isAscending = !isAscending;
    } else {
        currentSortCol = col;
        isAscending = true;
    }
    render();
}

function getSortIcon(col) {
    if (currentSortCol !== col) return "⇅";
    return isAscending ? "↑" : "↓";
}

function render() {
    const ahora = new Date();
    const unAñoMs = 365 * 24 * 60 * 60 * 1000;

    let filtrados = registros.filter(r => {
        const esAntiguo = (ahora - new Date(r.created_at)) > unAñoMs;
        if (vistaActual === 'pendientes') return !r.entregado && !esAntiguo;
        if (vistaActual === 'donaciones') return !r.entregado && esAntiguo;
        if (vistaActual === 'historial') return r.entregado;
        return false;
    });

    // Ordenamiento en memoria
    filtrados.sort((a, b) => {
        let valA, valB;
        if (currentSortCol === 'fecha') {
            valA = new Date(a.created_at).getTime();
            valB = new Date(b.created_at).getTime();
        } else if (currentSortCol === 'prioridad') {
            const prioMap = { "Alta": 3, "Media": 2, "Baja": 1 };
            valA = prioMap[a.prioridad] || 0;
            valB = prioMap[b.prioridad] || 0;
        } else {
            // Ordenamiento por string genérico
            valA = (a[currentSortCol] || "").toLowerCase();
            valB = (b[currentSortCol] || "").toLowerCase();
        }

        if (valA < valB) return isAscending ? -1 : 1;
        if (valA > valB) return isAscending ? 1 : -1;
        return 0;
    });

    const thead = document.getElementById("cabeceraTabla");
    const tbody = document.getElementById("cuerpoTabla");
    tbody.innerHTML = "";

    if (vistaActual === 'historial') {
        thead.innerHTML = `<tr>
            <th style="cursor:pointer" onclick="sortTable('fecha')">HALLAZGO ${getSortIcon('fecha')}</th>
            <th style="cursor:pointer" onclick="sortTable('habitacion')">UBICACIÓN ${getSortIcon('habitacion')}</th>
            <th style="cursor:pointer" onclick="sortTable('objeto')">OBJETO ${getSortIcon('objeto')}</th>
            <th style="cursor:pointer" onclick="sortTable('nombre_entrega')">RECIBIÓ ${getSortIcon('nombre_entrega')}</th>
            <th>FOTO</th>
            <th>FECHA ENTREGA</th>
        </tr>`;
    } else {
        thead.innerHTML = `<tr>
            <th style="cursor:pointer" onclick="sortTable('fecha')">REGISTRO ${getSortIcon('fecha')}</th>
            <th style="cursor:pointer" onclick="sortTable('habitacion')">UBICACIÓN ${getSortIcon('habitacion')}</th>
            <th style="cursor:pointer" onclick="sortTable('objeto')">OBJETO ${getSortIcon('objeto')}</th>
            <th style="cursor:pointer" onclick="sortTable('sector')">SECTOR ${getSortIcon('sector')}</th>
            <th style="cursor:pointer" onclick="sortTable('prioridad')">PRIORIDAD ${getSortIcon('prioridad')}</th>
            <th>FOTO</th>
            <th style="text-align:center">ACCIÓN</th>
        </tr>`;
    }

    filtrados.forEach(r => {
        const tr = document.createElement("tr");
        const fH = new Date(r.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
        const img = r.imagen ? `<img src="${r.imagen}" class="img-thumbnail" loading="lazy" onclick="verGrande('${r.imagen}')">` : "<div style='width:48px;height:48px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:10px;'>Sin Foto</div>";

        if (r.prioridad === "Alta") tr.classList.add('priority-high');

        if (vistaActual !== 'historial') {
            tr.innerHTML = `
                <td style="color:var(--text-muted); font-size:13px; white-space:nowrap;">${fH}</td>
                <td style="font-weight:600">${r.habitacion || "-"}</td>
                <td style="font-weight:600; color:var(--primary)">${r.objeto}</td>
                <td style="font-size:13px; color:var(--text-muted)">${r.sector || "-"}</td>
                <td><span style="font-size:12px; padding:6px 10px; border-radius:12px; background:${r.prioridad==='Alta'?'rgba(239,68,68,0.2)':r.prioridad==='Media'?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'}; color:${r.prioridad==='Alta'?'#fca5a5':r.prioridad==='Media'?'#fcd34d':'#cbd5e1'}; font-weight:600;">${r.prioridad || "Baja"}</span></td>
                <td>${img}</td>
                <td class="action-buttons-wrapper">
                    <button onclick="entregar(${r.id})" class="btn-action-table">Entregar</button>
                    <button onclick="eliminar(${r.id})" class="btn-action-table btn-delete-table" title="Eliminar">🗑️</button>
                </td>`;
        } else {
            const fE = r.fecha_entrega ? new Date(r.fecha_entrega).toLocaleDateString('es-AR') : "-";
            tr.innerHTML = `
                <td style="color:var(--text-muted); font-size:13px; white-space:nowrap;">${fH}</td>
                <td style="font-weight:600">${r.habitacion || "-"}</td>
                <td style="font-weight:600; color:var(--primary)">${r.objeto}</td>
                <td style="font-weight:700; color:var(--navy)">${r.nombre_entrega || "S/D"}</td>
                <td>${img}</td>
                <td style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--text-muted); font-size:13px;">${fE}</span>
                    <button onclick="eliminar(${r.id})" class="btn-action-table btn-delete-table" style="padding:6px; margin-left:8px;" title="Eliminar">🗑️</button>
                </td>`;
        }
        tbody.appendChild(tr);
    });
}

function obtenerCategoriaSector(sector) {
    const s = (sector || "").toLowerCase();
    if (s.includes("a&b") || s.includes("bar") || s.includes("comedor")) return "A&B";
    if (s.includes("pileta")) return "Pileta";
    if (s.includes("spa") || s.includes("salud")) return "Spa & Salud";
    if (s.includes("recreacion")) return "Recreación";
    if (s.includes("publicas") || s.includes("areas")) return "Áreas Públicas"; 
    return "Habitaciones";
}

async function actualizarGrafico() {
    const ctx = document.getElementById('chartSectores')?.getContext('2d');
    if (!ctx) return;

    const { data, error } = await supabaseClient.from("olvidos").select("sector");
    if (error) return;

    const caps = { "A&B": 0, "Pileta": 0, "Spa & Salud": 0, "Recreación": 0, "Áreas Públicas": 0, "Habitaciones": 0 };
    const colores = ['#38bdf8', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#94a3b8']; // Dark Mode Paleta Premium
    
    data.forEach(r => { 
        const cat = obtenerCategoriaSector(r.sector); 
        if(caps.hasOwnProperty(cat)) caps[cat]++; 
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

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: Object.keys(caps), 
            datasets: [{ data: Object.values(caps), backgroundColor: colores, borderWidth: 2, borderColor: '#020617' }] 
        },
        options: { cutout: '70%', plugins: { legend: { display: false } } }
    });
}

function switchTab(t) { 
    vistaActual = t; 
    document.querySelectorAll('.pill-link').forEach(btn => btn.classList.remove('active')); 
    const mapaBotones = { 'pendientes': 'tabPendientes', 'donaciones': 'tabDonaciones', 'historial': 'tabHistorial' };
    const idActivo = mapaBotones[t];
    if (document.getElementById(idActivo)) document.getElementById(idActivo).classList.add('active');
    render(); 
}

// --- SECCIÓN: MANEJO DE FOTOS Y GUARDADO OPTIMIZADO ---

document.getElementById("file-upload").onchange = e => {
    archivoActual = e.target.files[0];
    const preview = document.getElementById("previewFoto");
    const label = document.getElementById("btnFotoLabel");
    
    if (archivoActual) {
        label.innerText = "Cambiar Foto";
        label.style.color = "var(--success)";
        
        // Vista previa
        const reader = new FileReader();
        reader.onload = (evt) => {
            preview.src = evt.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(archivoActual);
    } else {
        label.innerText = "Adjuntar Foto";
        label.style.color = "";
        preview.style.display = 'none';
        preview.src = '';
    }
};

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

        const { error } = await supabaseClient.from("olvidos").insert({ 
            habitacion: document.getElementById("habitacion").value, 
            objeto: obj, 
            sector: document.getElementById("sector").value, 
            prioridad: document.getElementById("prioridad").value, 
            entregado: false,
            imagen: urlPublica 
        });

        if (error) throw error;
        
        showToast("Hallazgo registrado con éxito", 'success');
        
        // Limpieza de formulario
        document.getElementById("objeto").value = "";
        document.getElementById("habitacion").value = "";
        archivoActual = null;
        document.getElementById("btnFotoLabel").innerText = "Adjuntar Foto";
        document.getElementById("btnFotoLabel").style.color = "";
        document.getElementById("previewFoto").style.display = 'none';
        document.getElementById("previewFoto").src = '';

        await cargar(true); 

    } catch (err) {
        showToast("Error: " + err.message, 'error');
    } finally {
        btn.innerText = "Registrar Hallazgo";
        btn.disabled = false;
    }
}

async function entregar(id) {
    const registro = registros.find(r => r.id === id);
    
    const nombrePersona = await openInputModal("Entregar Objeto", `Has seleccionado entregar: ${registro.objeto}.\nPor favor, ingresa el nombre de quien lo recibe:`, "Nombre completo");
    if (!nombrePersona) return; // Canceló o dejó vacío

    const { error } = await supabaseClient.from("olvidos")
        .update({ 
            entregado: true, 
            nombre_entrega: nombrePersona, 
            fecha_entrega: new Date().toISOString(),
            imagen: null 
        })
        .eq("id", id);

    if (error) {
        showToast("Error al actualizar estado", 'error');
    } else {
        showToast("Objeto entregado correctamente", 'success');
        generarActaEntrega(registro, nombrePersona);
        cargar(true);
    }
}

async function eliminar(id) {
    const password = await openConfirmModal("Seguridad Requerida", "Ingrese la contraseña de seguridad para eliminar este registro:");
    if (password === null) return; 
    
    if (password !== "lospinos") {
        showToast("Contraseña incorrecta", 'error');
        return;
    }

    const { error } = await supabaseClient.from("olvidos").delete().eq("id", id);
    
    if (error) {
        showToast("Error al eliminar: " + error.message, 'error');
    } else {
        showToast("Registro eliminado exitosamente.", 'success');
        cargar(true);
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(15, 23, 42); // Navy premium
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("REPORTE DE HALLAZGOS - LOST & FOUND", 14, 18);

    const head = [['FECHA', 'UBICACIÓN', 'OBJETO', 'SECTOR', 'PRIORIDAD', 'ESTADO']];
    const body = registros.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.habitacion || "-",
        r.objeto,
        r.sector || "-",
        r.prioridad || "Baja",
        r.entregado ? "Entregado" : "Custodia"
    ]);

    doc.autoTable({ startY: 35, head: head, body: body, theme: 'striped', headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`Reporte_L&F_${new Date().toLocaleDateString()}.pdf`);
    showToast("Reporte PDF descargado", "success");
}

function exportExcel() {
    const data = registros.map(r => ({ "Fecha": r.created_at, "Ubicación": r.habitacion, "Objeto": r.objeto, "Sector": r.sector, "Prioridad": r.prioridad, "Estado": r.entregado ? 'Entregado' : 'Custodia' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "LostFound_Excel.xlsx");
    showToast("Archivo Excel descargado", "success");
}

function verGrande(u) { 
    document.getElementById("imgGrande").src = u; 
    
    // Configurar el enlace de descarga
    const btnDescargar = document.getElementById("btnDescargarFoto");
    if (btnDescargar) {
        btnDescargar.href = u;
        
        // Determinar extensión adecuada
        let extension = 'jpg';
        const match = u.match(/^data:image\/(\w+);base64,/);
        if (match) {
            extension = match[1];
            if (extension === 'jpeg') extension = 'jpg';
        } else {
            const parts = u.split('.');
            if (parts.length > 1) {
                const ext = parts.pop().split('?')[0].toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    extension = ext === 'jpeg' ? 'jpg' : ext;
                }
            }
        }
        btnDescargar.download = `foto_olvido_${Date.now()}.${extension}`;
    }

    document.getElementById("modalFoto").style.display = "flex"; 
}

function cerrarGrande() {
    document.getElementById("modalFoto").style.display = "none";
    setTimeout(() => {
        document.getElementById("imgGrande").src = "";
    }, 300);
}

async function generarActaEntrega(item, persona) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString();
    let yActual = 50;

    try {
        const logoPinos = await cargarImagen('img/los-pinos.png');
        const logoTremun = await cargarImagen('img/tremun.jpeg');
        if (logoPinos) doc.addImage(logoPinos, 'PNG', 15, 10, 35, 25);
        if (logoTremun) doc.addImage(logoTremun, 'JPEG', 160, 10, 35, 25);
    } catch (e) { 
        console.warn("No se pudieron cargar los logos."); 
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text("ACTA DE ENTREGA", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Gestión de Objetos Hallados", 105, 28, { align: "center" });

    doc.setDrawColor(226, 232, 240); 
    doc.line(15, 40, 195, 40);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.text(`Fecha de Emisión: ${fechaActual}`, 15, yActual);
    
    yActual += 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, yActual, 180, 40, 'F');
    
    doc.setFont(undefined, 'bold');
    doc.text("DETALLES DEL REGISTRO", 20, yActual + 10);
    doc.setFont(undefined, 'normal');
    doc.text(`• Objeto: ${item.objeto}`, 20, yActual + 20);
    doc.text(`• Ubicación/Hab: ${item.habitacion || "S/D"}`, 20, yActual + 28);
    doc.text(`• Entregado a: ${persona}`, 20, yActual + 36);

    yActual += 55;

    if (item.imagen) {
        doc.setFont(undefined, 'bold');
        doc.text("EVIDENCIA FOTOGRÁFICA", 15, yActual);
        yActual += 5;
        try {
            const imgData = await cargarImagen(item.imagen);
            if (imgData) {
                doc.addImage(imgData, 'JPEG', 15, yActual, 80, 60);
                yActual += 70;
            }
        } catch(e) { 
            console.error("Error al añadir imagen al PDF", e);
            yActual += 10; 
        }
    }
    
    doc.setFont(undefined, 'bold');
    doc.text("CONFORMIDAD DE RECEPCIÓN", 105, yActual + 10, { align: "center" });
    yActual += 35;
    
    doc.setDrawColor(148, 163, 184);
    doc.line(20, yActual, 90, yActual);
    doc.line(120, yActual, 190, yActual);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text("Firma del Huésped", 55, yActual + 7, { align: "center" });
    doc.text("Firma Responsable", 155, yActual + 7, { align: "center" });

    doc.save(`Acta_Entrega_${item.id}.pdf`);
}

function cargarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = url;
    });
}