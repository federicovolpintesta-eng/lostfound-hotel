# Reporte de Escaneo Estático de Seguridad (SAST)

**Generado el:** 2026-10-18 15:36:16 UTC

| Severidad | Regla | CWE | OWASP | Archivo:Línea | Snippet |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MEDIUM** | Hardcoded Supabase API Key / Token (`SEC-LEAK-001`) | CWE-798 | A01:2021-Broken Access Control | `./js/supabaseClient.js:2` | `const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";` |
| **MEDIUM** | Hardcoded Supabase API Key / Token (`SEC-LEAK-001`) | CWE-798 | A01:2021-Broken Access Control | `./js/supabaseClient.js:2` | `const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";` |
| **LOW** | Unrestricted File Upload / Missing Size Check (`SEC-DOS-001`) | CWE-400 | A05:2021-Security Misconfiguration | `./js/main.js:421` | `reader.readAsDataURL(file);` |
| **LOW** | Unrestricted File Upload / Missing Size Check (`SEC-DOS-001`) | CWE-400 | A05:2021-Security Misconfiguration | `./js/dragDrop.js:58` | `reader.readAsDataURL(file);` |
| **HIGH** | PostgREST Filter Injection Vector (`SEC-INJ-001`) | CWE-89 | A03:2021-Injection | `./js/api.js:26` | `.or(`objeto.ilike.*${safeText}*,habitacion.ilike.*${safeText}*,sector.ilike.*${safeText}*`)` |
| **MEDIUM** | Hardcoded Supabase API Key / Token (`SEC-LEAK-001`) | CWE-798 | A01:2021-Broken Access Control | `./js/supabaseClient.js:2` | `const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";` |
| **LOW** | Unrestricted File Upload / Missing Size Check (`SEC-DOS-001`) | CWE-400 | A05:2021-Security Misconfiguration | `./js/main.js:421` | `reader.readAsDataURL(file);` |
| **HIGH** | Hardcoded Client-Side Credential / Secret Bypass (`SEC-AUTH-001`) | CWE-798 | A07:2021-Identification and Authentication Failures | `./js/main.js:201` | `if (password !== "lospinos") {` |
| **LOW** | Unrestricted File Upload / Missing Size Check (`SEC-DOS-001`) | CWE-400 | A05:2021-Security Misconfiguration | `./js/dragDrop.js:58` | `reader.readAsDataURL(file);` |
