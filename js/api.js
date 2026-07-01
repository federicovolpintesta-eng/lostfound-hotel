import { supabaseClient } from "./supabaseClient.js";

export async function fetchOlvidos(offset, limit) {
  const resData = await supabaseClient
    .from("olvidos")
    .select("*")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  const resCount = await supabaseClient
    .from("olvidos")
    .select('*', { count: 'exact', head: true });

  return { resData, resCount };
}

export async function buscarOlvidos(texto) {
  return await supabaseClient
    .from("olvidos")
    .select("*")
    .or(`objeto.ilike.*${texto}*,habitacion.ilike.*${texto}*,sector.ilike.*${texto}*`)
    .order("created_at", { ascending: false })
    .limit(1000);
}

export async function getDashboardStats() {
  const [resCustodia, resEntregados] = await Promise.all([
    supabaseClient
      .from("olvidos")
      .select('*', { count: 'exact', head: true })
      .eq('entregado', false),
    supabaseClient
      .from("olvidos")
      .select('*', { count: 'exact', head: true })
      .eq('entregado', true)
  ]);
  return {
    enCustodia: resCustodia.count || 0,
    entregados: resEntregados.count || 0,
    error: resCustodia.error || resEntregados.error
  };
}

export async function getSectorStats() {
  return await supabaseClient.from("olvidos").select("sector");
}

export async function crearOlvido(habitacion, objeto, sector, prioridad, imagenUrl) {
  return await supabaseClient.from("olvidos").insert({
    habitacion,
    objeto,
    sector,
    prioridad,
    entregado: false,
    imagen: imagenUrl
  });
}

export async function entregarOlvido(id, nombrePersona) {
  return await supabaseClient.from("olvidos")
    .update({
      entregado: true,
      nombre_entrega: nombrePersona,
      fecha_entrega: new Date().toISOString(),
      imagen: null
    })
    .eq("id", id);
}

export async function eliminarOlvido(id) {
  return await supabaseClient.from("olvidos").delete().eq("id", id);
}

let realtimeChannel = null;
export function subscribeRealtime(onChange) {
  if (realtimeChannel) return;
  realtimeChannel = supabaseClient
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'olvidos'
      },
      (payload) => {
        onChange(payload);
      }
    )
    .subscribe();
}
