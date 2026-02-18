// ============================
// UTIL
// ============================
function fechaHoraActual() {
  return new Date().toISOString();
}

function mostrar(seccion) {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("lf").style.display = "none";
  document.getElementById("reportes").style.display = "none";

  document.getElementById(seccion).style.display = "block";
}

function leerImagen(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function verImagen(src) {
  const nueva = window.open("");
  nueva.document.write(`<img src="${src}" style="width:100%">`);
}

// ============================
// LISTA GLOBAL (para filtrar)
// ============================
let listaOlvidos = [];

// ============================
// GUARDAR
// ============================
async function guardarOlvido() {
  const habitacion = document.getElementById("habitacion").value;
  const objeto = document.getElementById("objeto").value;
  const sector = document.getElementById("sector").value;
  const file = document.getElementById("imagen").files[0];

  if (!habitacion || !objeto) return alert("Completar datos");

  let imagen = "";
  if (file) imagen = await leerImagen(file);

  const { error } = await window.supabaseClient
    .from("olvidos")
    .insert([
      {
        habitacion,
        objeto,
        sector,
        imagen,
        fecha_encuentro: fechaHoraActual(),
        entregado: false,
      },
    ]);

  if (error) {
    console.error(error);
    alert("Error al guardar");
  } else {
    alert("Objeto registrado");
    limpiarFormulario();
    cargarOlvidos();
  }
}

function limpiarFormulario() {
  document.getElementById("habitacion").value = "";
  document.getElementById("objeto").value = "";
  document.getElementById("sector").value = "";
  document.getElementById("imagen").value = "";
}

// ============================
// MARCAR ENTREGADO
// ============================
async function marcar(id) {
  const { error } = await window.supabaseClient
    .from("olvidos")
    .update({
      entregado: true,
      fecha_entrega: fechaHoraActual(),
    })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar");
  } else {
    cargarOlvidos();
  }
}

// ============================
// RENDER TABLAS
// ============================
function renderOlvidos(data) {
  const pendientes = document.getElementById("pendientes");
  const entregados = document.getElementById("entregados");

  pendientes.innerHTML = "";
  entregados.innerHTML = "";

  let cantPendientes = 0;
  let cantEntregados = 0;

  data.forEach((o) => {
    if (o.entregado) {
      cantEntregados++;
      entregados.innerHTML += `
        <tr>
          <td>${o.habitacion}</td>
          <td>${o.objeto}</td>
          <td>${o.sector}</td>
          <td>${
            o.imagen
              ? `<img src="${o.imagen}" class="mini" onclick="verImagen('${o.imagen}')">`
              : "-"
          }</td>
          <td>${new Date(o.fecha_encuentro).toLocaleString()}</td>
          <td>${new Date(o.fecha_entrega).toLocaleString()}</td>
        </tr>
      `;
    } else {
      cantPendientes++;
      pendientes.innerHTML += `
        <tr>
          <td>${o.habitacion}</td>
          <td>${o.objeto}</td>
          <td>${o.sector}</td>
          <td>${
            o.imagen
              ? `<img src="${o.imagen}" class="mini" onclick="verImagen('${o.imagen}')">`
              : "-"
          }</td>
          <td>${new Date(o.fecha_encuentro).toLocaleString()}</td>
          <td><button onclick="marcar(${o.id})">Entregar</button></td>
        </tr>
      `;
    }
  });

  document.getElementById("kpiPendientes").textContent = cantPendientes;
  document.getElementById("kpiEntregados").textContent = cantEntregados;
}

// ============================
// CARGAR DESDE BD
// ============================
async function cargarOlvidos() {
  const { data, error } = await window.supabaseClient
    .from("olvidos")
    .select("*")
    .order("fecha_encuentro", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  listaOlvidos = data;
  renderOlvidos(listaOlvidos);
}

// ============================
// FILTRAR
// ============================
function filtrarOlvidos() {
  const texto = document
    .getElementById("buscador")
    .value
    .toLowerCase();

  const filtrados = listaOlvidos.filter((o) =>
    (o.habitacion || "").toString().toLowerCase().includes(texto) ||
    (o.objeto || "").toLowerCase().includes(texto) ||
    (o.sector || "").toLowerCase().includes(texto)
  );

  renderOlvidos(filtrados);
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  mostrar("dashboard");
  cargarOlvidos();
});
