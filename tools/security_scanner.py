#!/usr/bin/env python3
"""
Custom Security SAST & Secret Scanner
Developed for Application Security Audit & Portfolio Demonstration
Target Stack: Full Stack (JavaScript, Python, Supabase/PostgreSQL, HTML/CSS)
"""

import os
import re
import sys
import argparse
import sqlite3
from datetime import datetime, timezone

# Rule definitions mapping to OWASP Top 10 & CWE
RULES = [
    {
        "id": "SEC-XSS-001",
        "name": "Stored / DOM XSS via unescaped innerHTML",
        "cwe": "CWE-79",
        "owasp": "A03:2021-Injection",
        "pattern": r"\.innerHTML\s*=\s*`[^`]*\$\{[^}]+\}[^`]*`",
        "negative_pattern": r"escapeHTML\(",
        "severity": "HIGH",
        "description": "Direct interpolation of variables into innerHTML without escapeHTML sanitization."
    },
    {
        "id": "SEC-AUTH-001",
        "name": "Hardcoded Client-Side Credential / Secret Bypass",
        "cwe": "CWE-798",
        "owasp": "A07:2021-Identification and Authentication Failures",
        "pattern": r"(password\s*===?\s*[\"'][^\"']+[\"']|\"lospinos\")",
        "severity": "HIGH",
        "description": "Hardcoded password or client-side authentication comparison check."
    },
    {
        "id": "SEC-LEAK-001",
        "name": "Hardcoded Supabase API Key / Token",
        "cwe": "CWE-798",
        "owasp": "A01:2021-Broken Access Control",
        "pattern": r"sb_publishable_[a-zA-Z0-9_\-]{20,}",
        "severity": "MEDIUM",
        "description": "Hardcoded publishable anon key detected in source code. Should be verified against RLS."
    },
    {
        "id": "SEC-INJ-001",
        "name": "PostgREST Filter Injection Vector",
        "cwe": "CWE-89",
        "owasp": "A03:2021-Injection",
        "pattern": r"\.or\(`[^`]*\$\{[^}]+\}[^`]*`\)",
        "negative_pattern": r"sanitizePostgrestQuery\(",
        "severity": "HIGH",
        "description": "Dynamic string interpolation inside PostgREST .or() filter without sanitization."
    },
    {
        "id": "SEC-DOS-001",
        "name": "Unrestricted File Upload / Missing Size Check",
        "cwe": "CWE-400",
        "owasp": "A05:2021-Security Misconfiguration",
        "pattern": r"readAsDataURL\([^)]+\)",
        "negative_pattern": r"(MAX_FILE_SIZE|file\.size)",
        "severity": "LOW",
        "description": "FileReader operation detected without adjacent file size check."
    }
]

class SecurityScanner:
    def __init__(self, db_path="security_findings.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self._init_db()

    def _init_db(self):
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS scan_findings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_timestamp TEXT,
                    rule_id TEXT,
                    rule_name TEXT,
                    cwe TEXT,
                    owasp TEXT,
                    file_path TEXT,
                    line_number INTEGER,
                    severity TEXT,
                    snippet TEXT,
                    description TEXT
                )
            """)

    def scan_file(self, file_path, scan_time):
        findings = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception as e:
            print(f"[!] Error leyendo {file_path}: {e}", file=sys.stderr)
            return findings

        content = "".join(lines)

        for rule in RULES:
            for idx, line in enumerate(lines, 1):
                if re.search(rule["pattern"], line):
                    # Check negative pattern (mitigation present in function scope)
                    if "negative_pattern" in rule:
                        start = max(0, idx - 30)
                        end = min(len(lines), idx + 10)
                        context = "".join(lines[start:end])
                        if re.search(rule["negative_pattern"], context):
                            continue

                    finding = {
                        "timestamp": scan_time,
                        "rule_id": rule["id"],
                        "rule_name": rule["name"],
                        "cwe": rule["cwe"],
                        "owasp": rule["owasp"],
                        "file_path": file_path,
                        "line_number": idx,
                        "severity": rule["severity"],
                        "snippet": line.strip()[:120],
                        "description": rule["description"]
                    }
                    findings.append(finding)
        return findings

    def run(self, target_dir=".", exclude_dirs=None):
        if exclude_dirs is None:
            exclude_dirs = [".git", "node_modules", "tools", "__pycache__", "venv", ".venv"]

        scan_time = datetime.now(timezone.utc).isoformat()
        total_files = 0
        all_findings = []

        print(f"[*] Iniciando escaneo de seguridad en: {os.path.abspath(target_dir)}")
        print(f"[*] Fecha y Hora UTC: {scan_time}")

        for root, dirs, files in os.walk(target_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith((".js", ".py", ".html", ".yaml", ".yml")):
                    filepath = os.path.join(root, file)
                    total_files += 1
                    file_findings = self.scan_file(filepath, scan_time)
                    all_findings.extend(file_findings)

        self._save_findings(all_findings)
        self._print_summary(total_files, all_findings)
        return all_findings

    def _save_findings(self, findings):
        with self.conn:
            for f in findings:
                self.conn.execute("""
                    INSERT INTO scan_findings 
                    (scan_timestamp, rule_id, rule_name, cwe, owasp, file_path, line_number, severity, snippet, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f["timestamp"], f["rule_id"], f["rule_name"], f["cwe"], f["owasp"],
                    f["file_path"], f["line_number"], f["severity"], f["snippet"], f["description"]
                ))

    def _print_summary(self, total_files, findings):
        print("-" * 75)
        print(f"[+] Archivos auditados: {total_files}")
        print(f"[+] Hallazgos de seguridad detectados: {len(findings)}")
        print("-" * 75)

        severities = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for f in findings:
            severities[f["severity"]] = severities.get(f["severity"], 0) + 1

        print(f"    ALTA (HIGH):       {severities['HIGH']}")
        print(f"    MEDIA (MEDIUM):    {severities['MEDIUM']}")
        print(f"    BAJA (LOW):        {severities['LOW']}")
        print("-" * 75)

        if findings:
            print("\nDetalle de Hallazgos:")
            for f in findings:
                print(f" [{f['severity']}] {f['rule_name']} ({f['rule_id']})")
                print(f"  Archivo: {f['file_path']}:{f['line_number']}")
                print(f"  Código:  {f['snippet']}")
                print(f"  OWASP:   {f['owasp']} | CWE: {f['cwe']}")
                print()
        else:
            print("[✓] ¡Felicidades! No se encontraron vulnerabilidades activas.")

    def export_markdown(self, output_path="SECURITY_SCAN_RESULTS.md"):
        cursor = self.conn.cursor()
        cursor.execute("SELECT rule_id, rule_name, cwe, owasp, file_path, line_number, severity, snippet FROM scan_findings ORDER BY id DESC")
        rows = cursor.fetchall()

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("# Reporte de Escaneo Estático de Seguridad (SAST)\n\n")
            f.write(f"**Generado el:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
            f.write("| Severidad | Regla | CWE | OWASP | Archivo:Línea | Snippet |\n")
            f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
            for r in rows:
                f.write(f"| **{r[6]}** | {r[1]} (`{r[0]}`) | {r[2]} | {r[3]} | `{r[4]}:{r[5]}` | `{r[7]}` |\n")

        print(f"[+] Reporte exportado a: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Custom SAST Security Scanner")
    parser.add_argument("--target", default=".", help="Directorio objetivo para escanear")
    parser.add_argument("--export", action="store_true", help="Exportar resultados a Markdown")
    args = parser.parse_args()

    scanner = SecurityScanner()
    scanner.run(target_dir=args.target)
    if args.export:
        scanner.export_markdown()
