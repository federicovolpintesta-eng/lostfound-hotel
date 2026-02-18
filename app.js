// ============================
// UTIL
// ============================
function fechaHoraActual() {
  return new Date().toISOString();
}

function mostrar(seccion) {
  document.getElementById("login").style.display = "none";
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
// LOGIN (solo usuarios de prueba)
// ============================
let usuarioActual = null;

// Usuarios permitidos demo
const USUARIOS_DEMO = [
  { email: "gobernanta@lospinoshotel.com.ar", password: "LosPinos1234", nombre:"Sandra Lencina" },
  { email: "msotelo@lospinoshotel.com.ar", password: "LosPinos5678", nombre:"Marcelo Sotelo" }
];

function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const usuario = USUARIOS_DEMO.find(u => u.email === email && u.password === password);
  if(!usuario) return alert("Email o contraseña incorrectos");

  usuarioActual = usuario;
  alert(`Bienvenido ${usuario.nombre}`);
  mostrar("dashboard");
  cargarOlvidos();
}

function logout() {
  usuarioActual = null;
  mostrar("login");
}

// ============================
// LISTA GLOBAL
// ============================
let listaOlvidos = [];

// ============================
// GUARDAR OBJETO
// ============================
async function guardarOlvido() {
  const habitacion = document.getElementById("habitacion").value;
  const objeto = document.getElementById("objeto").value;
  const sector = document.getElementById("sector").value;
  const file = document.getElementById("imagen").files[0];

  if(!habitacion || !objeto) return alert("Completar datos");

  let imagen = "";
  if(file) imagen = await leerImagen(file);

  const { error } = await window.supabaseClient
    .from("olvidos")
    .insert([{ habitacion, objeto, sector, imagen, fecha_encuentro: fechaHoraActual(), entregado:false }]);

  if(error) return alert("Error al guardar");

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
// MARCAR ENTREGADO
// ============================
async function marcar(id) {
  const { error } = await window.supabaseClient
    .from("olvidos")
    .update({ entregado:true, fecha_entrega: fechaHoraActual() })
    .eq("id", id);

  if(error) return alert("Error al actualizar");
  cargarOlvidos();
}

// ============================
// BORRAR REGISTRO
// ============================
async function borrar(id) {
  if(!confirm("¿Seguro que quieres borrar este registro?")) return;
  const { error } = await window.supabaseClient
    .from("olvidos")
    .delete()
    .eq("id", id);
  if(error) return alert("Error al borrar registro");
  cargarOlvidos();
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

  data.forEach(o => {
    if(o.entregado){
      cantEntregados++;
      entregados.innerHTML += `
        <tr>
          <td>${o.habitacion}</td>
          <td>${o.objeto}</td>
          <td>${o.sector}</td>
          <td>${o.imagen ? `<img src="${o.imagen}" class="mini" onclick="verImagen('${o.imagen}')">` : "-"}</td>
          <td>${new Date(o.fecha_encuentro).toLocaleString()}</td>
          <td>${new Date(o.fecha_entrega).toLocaleString()}</td>
          <td>
            <button onclick="borrar(${o.id})" style="background:red;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Borrar</button>
          </td>
        </tr>
      `;
    } else {
      cantPendientes++;
      pendientes.innerHTML += `
        <tr>
          <td>${o.habitacion}</td>
          <td>${o.objeto}</td>
          <td>${o.sector}</td>
          <td>${o.imagen ? `<img src="${o.imagen}" class="mini" onclick="verImagen('${o.imagen}')">` : "-"}</td>
          <td>${new Date(o.fecha_encuentro).toLocaleString()}</td>
          <td>
            <button onclick="marcar(${o.id})">Entregar</button>
            <button onclick="borrar(${o.id})" style="background:red;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;margin-left:5px;">Borrar</button>
          </td>
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
    .order("fecha_encuentro", { ascending:false });

  if(error) return console.error(error);
  listaOlvidos = data;
  renderOlvidos(listaOlvidos);
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  mostrar("login");
});
