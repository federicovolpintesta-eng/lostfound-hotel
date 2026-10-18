import { supabaseClient } from "./supabaseClient.js";
import { sanitizePostgrestQuery } from "./security.js";

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
  const safeText = sanitizePostgrestQuery(texto);
  if (!safeText) {
    return { data: [], error: null };
  }
  return await supabaseClient
    .from("olvidos")
    .select("*")
    .or(`objeto.ilike.*${safeText}*,habitacion.ilike.*${safeText}*,sector.ilike.*${safeText}*`)
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

export async function uploadToSupabaseStorage(fileBlob) {
  const fileName = `foto_${Date.now()}.jpg`;
  const { data, error } = await supabaseClient.storage
    .from('fotos_olvidos')
    .upload(fileName, fileBlob, {
      contentType: 'image/jpeg'
    });
    
  if (error) throw error;
  
  const { data: publicData } = supabaseClient.storage
    .from('fotos_olvidos')
    .getPublicUrl(fileName);
    
  return publicData.publicUrl;
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
  const safeId = parseInt(id, 10);
  if (isNaN(safeId)) return { error: new Error("ID inválido") };
  const cleanNombre = String(nombrePersona || '').trim().substring(0, 150);
  return await supabaseClient.from("olvidos")
    .update({
      entregado: true,
      nombre_entrega: cleanNombre,
      fecha_entrega: new Date().toISOString(),
      imagen: null
    })
    .eq("id", safeId);
}

export async function eliminarOlvido(id) {
  const safeId = parseInt(id, 10);
  if (isNaN(safeId)) return { error: new Error("ID inválido") };
  return await supabaseClient.from("olvidos").delete().eq("id", safeId);
}

export async function obtenerOlvidoPorId(id) {
  const safeId = parseInt(id, 10);
  if (isNaN(safeId)) return { data: null, error: new Error("ID inválido") };
  return await supabaseClient.from("olvidos").select("*").eq("id", safeId).single();
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
