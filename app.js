const supabaseClient = window.supabaseClient;

// --- VARIABLES DE CONTROL DE FLUJO ---
let offset = 0;
const LIMITE_REGISTROS = 40; // Carga de a 40 para mantener la fluidez
let cargando = false;
let registros = [];
let archivoActual = null; // Para manejo de Storage
let vistaActual = 'pendientes';
let myChart = null;

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Credenciales incorrectas.");
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    cargar(true); // Carga inicial limpia
}

// --- MEJORA: CARGA PAGINADA ---
async function cargar(limpiar = true) {
    if (cargando) return;
    cargando = true;

    if (limpiar) {
        offset = 0;
        registros = [];
    }

    // 1. Traemos datos por rangos (Pagination)
    const { data, error } = await supabaseClient
        .from("olvidos")
        .select("*")
        .range(offset, offset + LIMITE_REGISTROS - 1)
        .order("created_at", { ascending: false });

    // 2. Traemos el conteo total para los KPIs
    const { count: totalReal } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        cargando = false;
        return console.error(error);
    }

    registros = limpiar ? data : [...registros, ...data];
    
    // Actualizamos UI
    actualizarDashboard(totalReal); 
    actualizarGrafico(); 
    render();
    
    cargando = false;
    offset += LIMITE_REGISTROS;
}

// --- MEJORA: BÚSQUEDA EN SERVIDOR ---
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
    // 1. Pedimos a Supabase el conteo exacto de pendientes (en custodia)
    const { count: enCustodia } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true })
        .eq('entregado', false);

    // 2. Pedimos el conteo exacto de entregados
    const { count: entregados } = await supabaseClient
        .from("olvidos")
        .select('*', { count: 'exact', head: true })
        .eq('entregado', true);
    
    // Calculamos la eficacia basándonos en los totales reales de la DB
    const totalActual = (enCustodia || 0) + (entregados || 0);
    const porcentaje = totalActual > 0 ? ((entregados / totalActual) * 100).toFixed(1) + "%" : "0%";

    // Actualizamos las tarjetas de la UI
    document.getElementById("totalObjetos").innerText = totalReal || totalActual;
    document.getElementById("enCustodiaCount").innerText = enCustodia || 0;
    document.getElementById("entregadosCount").innerText = entregados || 0;
    document.getElementById("tasaRetorno").innerText = porcentaje;
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

    const thead = document.getElementById("cabeceraTabla");
    const tbody = document.getElementById("cuerpoTabla");
    tbody.innerHTML = "";

    if (vistaActual === 'historial') {
        thead.innerHTML = `<tr><th>HALLAZGO</th><th>UBICACIÓN</th><th>OBJETO</th><th>RECIBIÓ</th><th>FOTO</th><th>FECHA ENTREGA</th></tr>`;
    } else {
        thead.innerHTML = `<tr><th>REGISTRO</th><th>UBICACIÓN</th><th>OBJETO</th><th>SECTOR</th><th>FOTO</th><th>ACCIÓN</th></tr>`;
    }

    filtrados.forEach(r => {
        const tr = document.createElement("tr");
        const fH = new Date(r.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' });
        const img = r.imagen ? `<img src="${r.imagen}" class="img-thumbnail" loading="lazy" onclick="verGrande('${r.imagen}')">` : "-";

        if (r.prioridad === "Alta") tr.style.borderLeft = "5px solid #dc3545";

        if (vistaActual !== 'historial') {
            tr.innerHTML = `
                <td class="cell-nowrap">${fH}</td>
                <td style="font-weight:700">${r.habitacion || "-"}</td>
                <td style="font-weight:600; color:var(--navy)">${r.objeto}</td>
                <td style="font-size:11px; color:#666">${r.sector || "-"}</td>
                <td>${img}</td>
                <td style="display:flex; gap:5px; align-items:center; justify-content:center;">
                    <button onclick="entregar(${r.id})" class="btn-registrar" style="font-size:10px; padding:5px 8px">Entregar</button>
                    <button onclick="eliminar(${r.id})" class="btn-registrar" style="font-size:10px; padding:5px 8px; background-color:#dc3545; border-color:#dc3545;" title="Eliminar">🗑️</button>
                </td>`;
        } else {
            const fE = r.fecha_entrega ? new Date(r.fecha_entrega).toLocaleDateString('es-AR') : "-";
            tr.innerHTML = `
                <td class="cell-nowrap">${fH}</td>
                <td style="font-weight:700">${r.habitacion || "-"}</td>
                <td style="font-weight:600; color:var(--navy)">${r.objeto}</td>
                <td style="font-weight:700; color:#1e3a5f">${r.nombre_entrega || "S/D"}</td>
                <td>${img}</td>
                <td class="cell-nowrap" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${fE}</span>
                    <button onclick="eliminar(${r.id})" class="btn-registrar" style="font-size:10px; padding:3px 6px; background-color:#dc3545; border-color:#dc3545; margin-left:10px;" title="Eliminar">🗑️</button>
                </td>`;
        }
        tbody.appendChild(tr);
    });
}

// --- LÓGICA DEL GRÁFICO (RESTAURADA) ---
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

    // Consulta real a Supabase de todos los sectores para el conteo total
    const { data, error } = await supabaseClient.from("olvidos").select("sector");
    if (error) return;

    const caps = { "A&B": 0, "Pileta": 0, "Spa & Salud": 0, "Recreación": 0, "Áreas Públicas": 0, "Habitaciones": 0 };
    const colores = ['#4e73df', '#f6c23e', '#1cc88a', '#36b9cc', '#6610f2', '#858796'];
    
    data.forEach(r => { 
        const cat = obtenerCategoriaSector(r.sector); 
        if(caps.hasOwnProperty(cat)) caps[cat]++; 
    });

    // Actualiza la leyenda debajo del gráfico
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
            datasets: [{ data: Object.values(caps), backgroundColor: colores, borderWidth: 0 }] 
        },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
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

// Selecciona el archivo y prepara la UI
document.getElementById("file-upload").onchange = e => {
    archivoActual = e.target.files[0];
    if (archivoActual) {
        document.getElementById("btnFotoLabel").innerText = "📸 Imagen lista";
        document.getElementById("btnFotoLabel").style.color = "#28a745";
    }
};

// Función para guardar que sube la foto al Storage y actualiza el gráfico
async function guardar() {
    const obj = document.getElementById("objeto").value;
    if (!obj) return alert("Por favor, describe el objeto.");
    
    const btn = document.querySelector(".btn-registrar");
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    let urlPublica = null;

    try {
        // Subida de imagen a ImgBB para ahorrar espacio en base de datos
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

        // Registro en la tabla 'olvidos'
        const { error } = await supabaseClient.from("olvidos").insert({ 
            habitacion: document.getElementById("habitacion").value, 
            objeto: obj, 
            sector: document.getElementById("sector").value, 
            prioridad: document.getElementById("prioridad").value, 
            entregado: false,
            imagen: urlPublica 
        });

        if (error) throw error;
        
        alert("✅ Registrado con éxito");
        
        // Limpieza de formulario
        document.getElementById("objeto").value = "";
        document.getElementById("habitacion").value = "";
        archivoActual = null;
        document.getElementById("btnFotoLabel").innerText = "Foto";
        document.getElementById("btnFotoLabel").style.color = "";

        // RECARGA LOS DATOS Y EL GRÁFICO AUTOMÁTICAMENTE
        await cargar(true); 

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "Registrar Hallazgo";
        btn.disabled = false;
    }
}


async function entregar(id) {
    const registro = registros.find(r => r.id === id);
    const nombrePersona = prompt("Nombre completo de quien recibe el objeto:");
    if (!nombrePersona) return;

    // Al actualizar, ponemos la imagen en null para liberar espacio
    const { error } = await supabaseClient.from("olvidos")
        .update({ 
            entregado: true, 
            nombre_entrega: nombrePersona, 
            fecha_entrega: new Date().toISOString(),
            imagen: null // <--- Esto borra la foto de la DB al entregar
        })
        .eq("id", id);

    if (error) {
        alert("Error al actualizar");
    } else {
        // El acta se genera con 'registro', que todavía tiene la foto en memoria,
        // así que el PDF saldrá con foto, pero la base de datos quedará limpia.
        generarActaEntrega(registro, nombrePersona);
        cargar(true);
    }
}

async function eliminar(id) {
    const password = prompt("🔒 Ingrese la contraseña de seguridad para eliminar este registro:");
    if (password === null) return; // El usuario canceló
    
    if (password !== "lospinos") {
        alert("❌ Contraseña incorrecta.");
        return;
    }
    
    const confirmar = confirm("¿Está seguro que desea eliminar este registro de forma permanente? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    // Ejecutamos el borrado en Supabase
    const { error } = await supabaseClient.from("olvidos").delete().eq("id", id);
    
    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        alert("✅ Registro eliminado exitosamente.");
        cargar(true); // Recargar la tabla
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("LOS PINOS RESORT & SPA TERMAL - REPORTE", 14, 15);

    const head = [['FECHA', 'UBICACIÓN', 'OBJETO', 'SECTOR', 'ESTADO']];
    const body = registros.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.habitacion,
        r.objeto,
        r.sector,
        r.entregado ? "Entregado" : "Custodia"
    ]);

    doc.autoTable({ startY: 35, head: head, body: body, theme: 'striped' });
    doc.save(`Reporte_${new Date().toLocaleDateString()}.pdf`);
}

function exportExcel() {
    const data = registros.map(r => ({ "Fecha": r.created_at, "Ubicación": r.habitacion, "Objeto": r.objeto, "Sector": r.sector, "Estado": r.entregado ? 'Entregado' : 'Custodia' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "LostFound_Excel.xlsx");
}

function verGrande(u) { 
    document.getElementById("imgGrande").src = u; 
    document.getElementById("modalFoto").style.display = "flex"; 
}

async function generarActaEntrega(item, persona) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleString();
    let yActual = 50;

    // --- LOGOS Y CABECERA ---
    try {
        // Carga de logos desde la carpeta local 'img'
        const logoPinos = await cargarImagen('img/los-pinos.png');
        const logoTremun = await cargarImagen('img/tremun.jpeg');
        
        if (logoPinos) doc.addImage(logoPinos, 'PNG', 15, 10, 35, 25);
        if (logoTremun) doc.addImage(logoTremun, 'JPEG', 160, 10, 35, 25);
    } catch (e) { 
        console.warn("No se pudieron cargar los logos para el PDF."); 
    }

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text("ACTA DE ENTREGA", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Gestión de Objetos Hallados", 105, 28, { align: "center" });

    doc.setDrawColor(30, 58, 95); 
    doc.line(15, 40, 195, 40);

    // --- CUERPO DEL ACTA ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Fecha de Emisión: ${fechaActual}`, 15, yActual);
    
    yActual += 10;
    doc.setFillColor(248, 249, 250); // Recuadro gris claro para detalles
    doc.rect(15, yActual, 180, 40, 'F');
    
    doc.setFont(undefined, 'bold');
    doc.text("DETALLES DEL REGISTRO", 20, yActual + 10);
    doc.setFont(undefined, 'normal');
    doc.text(`• Objeto: ${item.objeto}`, 20, yActual + 20);
    doc.text(`• Ubicación/Hab: ${item.habitacion || "S/D"}`, 20, yActual + 28);
    doc.text(`• Entregado a: ${persona}`, 20, yActual + 36);

    yActual += 55;

   // Foto del objeto (mejorado para URLs de Storage)
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
    
    // --- SECCIÓN DE FIRMAS ---
    doc.setFont(undefined, 'bold');
    doc.text("CONFORMIDAD DE RECEPCIÓN", 105, yActual + 10, { align: "center" });
    yActual += 35;
    
    doc.line(20, yActual, 90, yActual); // Línea Firma Huésped
    doc.line(120, yActual, 190, yActual); // Línea Firma Responsable
    
    doc.setFontSize(9);
    doc.text("Firma del Huésped", 55, yActual + 7, { align: "center" });
    doc.text("Firma Responsable", 155, yActual + 7, { align: "center" });

    // Descarga del archivo
    doc.save(`Acta_Entrega_${item.id}.pdf`);
}

// Función auxiliar necesaria para procesar las imágenes (Logos y URL de Supabase)
function cargarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Crucial para evitar errores de CORS con Supabase
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => {
            console.error("Error cargando imagen: " + url);
            resolve(null);
        };
        img.src = url;
    });
}

function cargarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}