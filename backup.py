import urllib.request
import json
import os
import sys

# Load credentials from environment variables for secure execution
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nfjwpsnztkihqwdbmxja.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("[Error] Variable de entorno SUPABASE_KEY requerida.", file=sys.stderr)
    print("Ejemplo de uso: SUPABASE_KEY='tu_clave' python3 backup.py", file=sys.stderr)
    sys.exit(1)

endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/olvidos?select=*"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

try:
    req = urllib.request.Request(endpoint, headers=headers)
    with urllib.request.urlopen(req) as response:
        if response.status != 200:
            print(f"[Error] Falló la solicitud: Código {response.status}", file=sys.stderr)
            sys.exit(1)
            
        data = json.loads(response.read().decode('utf-8'))
        
        # Export records securely
        output_file = "backup_records.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"[OK] Se exportaron exitosamente {len(data)} registros a {output_file}.")
except Exception as e:
    print(f"[Error] Ocurrió un fallo durante el backup: {e}", file=sys.stderr)
    sys.exit(1)
