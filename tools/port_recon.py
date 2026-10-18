#!/usr/bin/env python3
"""
Automated Network & Port Reconnaissance Tool
Developed for Security Portfolios and Infrastructure Auditing
Features:
- Concurrent TCP port scanner
- Service banner grabbing
- Subdomain enumeration via DNS resolution
- Local SQLite database persistence for reconnaissance findings
"""

import socket
import sys
import argparse
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    465: "SMTPS",
    993: "IMAPS",
    995: "POP3S",
    3000: "Node/React Dev",
    3306: "MySQL",
    5432: "PostgreSQL",
    6379: "Redis",
    8000: "HTTP-Alt / Django",
    8080: "HTTP-Proxy",
    8443: "HTTPS-Alt"
}

DEFAULT_SUBDOMAINS = [
    "www", "mail", "api", "dev", "staging", "test", 
    "admin", "panel", "auth", "db", "vpn", "remote"
]

class NetworkReconScanner:
    def __init__(self, db_path="network_recon.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self._init_db()

    def _init_db(self):
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS port_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_timestamp TEXT,
                    target_host TEXT,
                    target_ip TEXT,
                    port INTEGER,
                    state TEXT,
                    service_name TEXT,
                    banner TEXT
                )
            """)
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS subdomain_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_timestamp TEXT,
                    domain TEXT,
                    subdomain TEXT,
                    resolved_ip TEXT
                )
            """)

    def scan_port(self, host, ip, port, timeout=1.0):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            result = sock.connect_ex((ip, port))
            if result == 0:
                service = COMMON_PORTS.get(port, "Unknown")
                banner = ""
                # Attempt light banner grab
                try:
                    sock.sendall(b"HEAD / HTTP/1.0\r\n\r\n")
                    banner_bytes = sock.recv(256)
                    banner = banner_bytes.decode("utf-8", errors="ignore").split("\r\n")[0]
                except Exception:
                    banner = "No banner returned"

                return {
                    "port": port,
                    "state": "OPEN",
                    "service": service,
                    "banner": banner.strip()
                }
        except Exception:
            pass
        finally:
            sock.close()
        return None

    def scan_ports(self, target, ports=None, max_workers=20):
        if ports is None:
            ports = list(COMMON_PORTS.keys())

        try:
            target_ip = socket.gethostbyname(target)
        except socket.gaierror as e:
            print(f"[!] Error: No se pudo resolver el host {target}: {e}", file=sys.stderr)
            return []

        scan_time = datetime.now(timezone.utc).isoformat()
        print(f"[*] Escaneando host: {target} ({target_ip})")
        print(f"[*] Puertos a auditar: {len(ports)} | Hilos concurrentes: {max_workers}")
        print("-" * 75)

        open_ports = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self.scan_port, target, target_ip, p) for p in ports]
            for f in futures:
                res = f.result()
                if res:
                    open_ports.append(res)
                    print(f" [+] Puerto {res['port']:5d}/TCP ABIERTO -> {res['service']:<15} | Banner: {res['banner']}")

        with self.conn:
            for item in open_ports:
                self.conn.execute("""
                    INSERT INTO port_scans (scan_timestamp, target_host, target_ip, port, state, service_name, banner)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (scan_time, target, target_ip, item["port"], item["state"], item["service"], item["banner"]))

        print("-" * 75)
        print(f"[✓] Escaneo de puertos completado. {len(open_ports)} puertos abiertos encontrados.")
        return open_ports

    def enumerate_subdomains(self, base_domain, wordlist=None):
        if wordlist is None:
            wordlist = DEFAULT_SUBDOMAINS

        scan_time = datetime.now(timezone.utc).isoformat()
        print(f"[*] Iniciando enumeración DNS de subdominios para: {base_domain}")
        print("-" * 75)

        discovered = []
        for sub in wordlist:
            fqdn = f"{sub}.{base_domain}"
            try:
                ip = socket.gethostbyname(fqdn)
                discovered.append((fqdn, ip))
                print(f" [+] Subdominio Activo: {fqdn:<30} -> IP: {ip}")
            except socket.gaierror:
                continue

        with self.conn:
            for fqdn, ip in discovered:
                self.conn.execute("""
                    INSERT INTO subdomain_scans (scan_timestamp, domain, subdomain, resolved_ip)
                    VALUES (?, ?, ?, ?)
                """, (scan_time, base_domain, fqdn, ip))

        print("-" * 75)
        print(f"[✓] Enumeración completada. {len(discovered)} subdominios resueltos.")
        return discovered

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Network & Subdomain Recon Scanner")
    parser.add_argument("--host", help="Objetivo para escaneo de puertos (IP o dominio)")
    parser.add_argument("--domain", help="Dominio base para enumeración de subdominios")
    parser.add_argument("--threads", type=int, default=20, help="Número de hilos concurrentes")

    args = parser.parse_args()

    scanner = NetworkReconScanner()

    if args.host:
        scanner.scan_ports(args.host, max_workers=args.threads)

    if args.domain:
        scanner.enumerate_subdomains(args.domain)

    if not args.host and not args.domain:
        parser.print_help()
