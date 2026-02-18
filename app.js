// ============================
// Supabase
// ============================
const SUPABASE_URL = "https://nfjwpsnztkihqwdbmxja.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================
// Utilidades
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
  return new Promise(resolve => {
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
// LOGIN
// ============================
async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) return alert("Completar email y contraseña");

  const { data, error } = await window.supabaseClient
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .limit(1)
    .single();

  if (error || !data) {
    return alert("Usuario o contraseña incorrectos");
  }

  // Mostrar app y ocultar login
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("appContent").style.display = "flex";

  cargarOlvidos();
}

// ============================
// Lista global de objetos
// ============================
let listaOlvidos = [];

// ============================
// Guardar olvido
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
    .insert([{
      habitacion,
      objeto,
      sector,
      imagen,
      fecha_encuentro: fechaHoraActual(),
      entregado: false
    }]);

  if (error) return alert("Error al guardar");

  alert("Objeto registrado");
  limpiarFormulario();
  cargarOlvidos();
}

function limpiarFormulario() {
  document.getElementById("habitacion").value = "";
  document.getElementById("objeto").value = "";
  document.getElementById("sector").value = "";
  document.getElementById("imagen").value = "";
}

// ============================
// Marcar entregado
// ============================
async function marcar(id) {
  const { error } = await window.supabaseClient
    .from("olvidos")
    .update({ entregado: true, fecha_entrega: fechaHoraActual() })
    .eq("id", id);

  if (error) return alert("Error al actualizar");

  cargarOlvidos();
}

// ============================
// Borrar
// ============================
async function borrar(id) {
  if (!confirm("¿Desea borrar este registro?")) return;

  const { error } = await window.supabaseClient
    .from("olvidos")
    .delete()
    .eq("id", id);

  if (error) return alert("Error al borrar");

  cargarOlvidos();
}

// ============================
// Render tablas
// ============================
function renderOlvidos(data) {
  const pendientes = document.getElementById("pendientes");
  const entregados = document.getElementById("entregados");
  pendientes.innerHTML = "";
  entregados.innerHTML = "";

  let cantPendientes = 0, cantEntregados = 0;

  data.forEach(o => {
    const fila = `
      <tr>
        <td>${o.habitacion}</td>
        <td>${o.objeto}</td>
        <td>${o.sector}</td>
        <td>${o.imagen ? `<img src="${o.imagen}" class="mini" onclick="verImagen('${o.imagen}')">` : "-"}</td>
        <td>${new Date(o.fecha_encuentro).toLocaleString()}</td>
        <td>${o.entregado ? new Date(o.fecha_entrega).toLocaleString() : ""}</td>
        <td>
          ${o.entregado ? `<button onclick="borrar(${o.id})">Borrar</button>` : `<button onclick="marcar(${o.id})">Entregar</button> <button onclick="borrar(${o.id})">Borrar</button>`}
        </td>
      </tr>
    `;
    if(o.entregado){ entregados.innerHTML += fila; cantEntregados++; }
    else{ pendientes.innerHTML += fila; cantPendientes++; }
  });

  document.getElementById("kpiPendientes").textContent = cantPendientes;
  document.getElementById("kpiEntregados").textContent = cantEntregados;
}

// ============================
// Cargar desde BD
// ============================
async function cargarOlvidos() {
  const { data, error } = await window.supabaseClient
    .from("olvidos")
    .select("*")
    .order("fecha_encuentro", { ascending: false });

  if(error){ console.error(error); return; }

  listaOlvidos = data;
  renderOlvidos(listaOlvidos);
}

// ============================
// Filtrar
// ============================
function filtrarOlvidos() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const filtrados = listaOlvidos.filter(o =>
    (o.habitacion||"").toLowerCase().includes(texto) ||
    (o.objeto||"").toLowerCase().includes(texto) ||
    (o.sector||"").toLowerCase().includes(texto)
  );
  renderOlvidos(filtrados);
}
