// LOGIN
async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("loginForm").style.display = "none";
  document.getElementById("appContent").style.display = "flex";
  cargarOlvidos();
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// Navegación
function mostrar(seccion){
  document.getElementById("dashboard").style.display="none";
  document.getElementById("lf").style.display="none";
  document.getElementById("reportes").style.display="none";
  document.getElementById(seccion).style.display="block";
}

// GUARDAR OLVIDO CON IMAGEN
async function guardarOlvido(){
  const habitacion = document.getElementById("habitacion").value;
  const objeto = document.getElementById("objeto").value;
  const sector = document.getElementById("sector").value;
  const file = document.getElementById("imagen").files[0];

  let imageUrl = null;

  if(file){
    const fileName = `${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("olvidos")
      .upload(fileName, file);

    if(uploadError){
      alert(uploadError.message);
      return;
    }

    const { data } = supabaseClient
      .storage
      .from("olvidos")
      .getPublicUrl(fileName);

    imageUrl = data.publicUrl;
  }

  const { error } = await supabaseClient.from("olvidos").insert([
    { 
      habitacion, 
      objeto, 
      sector, 
      entregado: false,
      fecha_encuentro: new Date(),
      imagen: imageUrl
    }
  ]);

  if(error){
    alert(error.message);
    return;
  }

  document.getElementById("habitacion").value = "";
  document.getElementById("objeto").value = "";
  document.getElementById("sector").value = "";
  document.getElementById("imagen").value = "";

  cargarOlvidos();
}

// CARGAR DATOS
async function cargarOlvidos(){
  const { data, error } = await supabaseClient
    .from("olvidos")
    .select("*")
    .order("created_at",{ascending:false});

  if(error){
    alert(error.message);
    return;
  }

  const pendientes = document.getElementById("pendientes");
  const entregados = document.getElementById("entregados");

  pendientes.innerHTML="";
  entregados.innerHTML="";

  let p=0;
  let e=0;

  data.forEach(item=>{
    const fila=document.createElement("tr");

    if(item.entregado === false){
      p++;
      fila.innerHTML=`
        <td>${item.habitacion}</td>
        <td>${item.objeto}</td>
        <td>${item.sector}</td>
        <td>
          ${item.imagen ? `<img src="${item.imagen}" width="60">` : "—"}
        </td>
        <td>${item.fecha_encuentro ? new Date(item.fecha_encuentro).toLocaleString() : "—"}</td>
        <td class="acciones">
          <button class="btn-entregar" onclick="entregar(${item.id})">Entregar</button>
          <button class="btn-borrar" onclick="borrar(${item.id})">Borrar</button>
        </td>
      `;
      pendientes.appendChild(fila);
    }

    if(item.entregado === true){
      e++;
      fila.innerHTML=`
        <td>${item.habitacion}</td>
        <td>${item.objeto}</td>
        <td>${item.sector}</td>
        <td>
          ${item.imagen ? `<img src="${item.imagen}" width="60">` : "—"}
        </td>
        <td>${item.fecha_encuentro ? new Date(item.fecha_encuentro).toLocaleString() : "—"}</td>
        <td>${item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleString() : "—"}</td>
      `;
      entregados.appendChild(fila);
    }
  });

  document.getElementById("kpiPendientes").innerText=p;
  document.getElementById("kpiEntregados").innerText=e;
}

// ENTREGAR
async function entregar(id){
  await supabaseClient
    .from("olvidos")
    .update({
      entregado: true,
      fecha_entrega: new Date()
    })
    .eq("id",id);

  cargarOlvidos();
}

// BORRAR
async function borrar(id){
  await supabaseClient
    .from("olvidos")
    .delete()
    .eq("id",id);

  cargarOlvidos();
}

// AUTO SESIÓN
supabaseClient.auth.getSession().then(({data})=>{
  if(data.session){
    document.getElementById("loginForm").style.display="none";
    document.getElementById("appContent").style.display="flex";
    cargarOlvidos();
  }
});
