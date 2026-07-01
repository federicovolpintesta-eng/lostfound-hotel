import { showToast } from "./ui.js";

export function exportPDF(registros) {
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

  doc.autoTable({
    startY: 35,
    head: head,
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] }
  });
  doc.save(`Reporte_L&F_${new Date().toLocaleDateString()}.pdf`);
  showToast("Reporte PDF descargado", "success");
}

export function exportExcel(registros) {
  const data = registros.map(r => ({
    "Fecha": r.created_at,
    "Ubicación": r.habitacion,
    "Objeto": r.objeto,
    "Sector": r.sector,
    "Prioridad": r.prioridad,
    "Estado": r.entregado ? 'Entregado' : 'Custodia'
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "LostFound_Excel.xlsx");
  showToast("Archivo Excel descargado", "success");
}

export async function generarActaEntrega(item, persona) {
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
    } catch (e) {
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
