import { showToast } from "./ui.js";

let archivoActual = null;

export function getArchivoActual() {
  return archivoActual;
}

export function setArchivoActual(val) {
  archivoActual = val;
}

export function clearArchivoActual() {
  archivoActual = null;
  const preview = document.getElementById("previewFoto");
  const label = document.getElementById("btnFotoLabel");
  
  if (label) {
    label.innerText = "Adjuntar Foto";
    label.style.color = "";
  }
  if (preview) {
    preview.style.display = 'none';
    preview.src = '';
  }
}

export function manejarArchivoSeleccionado(file) {
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast("El archivo seleccionado no es una imagen.", "warning");
    return;
  }
  
  archivoActual = file;
  const preview = document.getElementById("previewFoto");
  const label = document.getElementById("btnFotoLabel");
  
  if (label) {
    label.innerText = "Cambiar Foto";
    label.style.color = "var(--success)";
  }
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    if (preview) {
      preview.src = evt.target.result;
      preview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

export function initDragAndDrop() {
  const dropZone = document.querySelector(".btn-foto-ui");
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      manejarArchivoSeleccionado(files[0]);
      showToast("Imagen cargada con arrastrar y soltar", "success");
    }
  }, false);

  document.addEventListener('paste', (e) => {
    const appBox = document.getElementById("app");
    if (appBox && appBox.style.display === "none") return;
    
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        manejarArchivoSeleccionado(file);
        showToast("Imagen pegada desde el portapapeles", "success");
        break;
      }
    }
  });
}
