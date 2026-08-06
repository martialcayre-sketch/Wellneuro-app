#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.

Usage:
    # Single server
    python scripts/with_server.py --server "npm run dev -- -p 5173" --port 5173 -- python automation.py
    python scripts/with_server.py --server "npm start" --port 3000 -- python test.py

    # Multiple servers
    python scripts/with_server.py \
      --server "cd backend && python server.py --port 3000" --port 3000 \
      --server "cd frontend && npm run dev -- -p 5173" --port 5173 \
      -- python test.py
"""

import os
import signal
import subprocess
import socket
import time
import sys
import argparse

def is_server_ready(process, port, timeout=30):
    """Wait for server to be ready by polling the port.

    Adaptation WellNeuro : un port qui répond ne prouve pas que c'est NOTRE
    processus qui répond — voir port_already_in_use(). Ici on ajoute l'autre
    moitié de la même vérification : si notre processus est déjà mort pendant
    l'attente, le port qui répond est forcément celui de quelqu'un d'autre
    (un autre worktree, une autre session). On échoue tout de suite plutôt que
    d'attendre le timeout puis de piloter ce serveur-là.
    """
    start_time = time.time()
    while time.time() - start_time < timeout:
        if process.poll() is not None:
            return False, 'died'
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True, None
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False, 'timeout'


def port_already_in_use(port):
    """True si quelque chose écoute déjà sur le port, avant notre lancement."""
    try:
        with socket.create_connection(('localhost', port), timeout=1):
            return True
    except (socket.error, ConnectionRefusedError):
        return False


def terminate_process_group(process, pgid, timeout=5):
    """Termine tout l'arbre de processus, pas seulement le shell intermédiaire,
    et ne rend `True` qu'une fois le groupe réellement éteint.

    Adaptation WellNeuro : `--server "cd X && cmd"` passe par `shell=True`, donc
    `process` est le `/bin/sh` et non le serveur réel. `process.wait()` seul ne
    surveille que ce shell : il rend la main dès que le shell meurt, souvent
    avant le serveur, qui garde alors le port occupé pour le prochain
    lancement — et fait accuser à tort « un autre worktree » par
    port_already_in_use(). On envoie le signal au groupe entier et on attend sa
    disparition réelle, pas seulement celle du PID direct.

    `pgid` doit être capturé par l'appelant IMMÉDIATEMENT après le `Popen`
    (avec `start_new_session=True`, il vaut `process.pid` — le nouveau process
    est chef de son propre groupe). Le recalculer plus tard via
    `os.getpgid(process.pid)` est un piège : une fois le process direct
    récolté (par `process.poll()` ou `communicate()`, par exemple après une
    mort détectée par `is_server_ready`), `os.getpgid` lève
    `ProcessLookupError` même si d'autres membres du groupe tournent encore —
    on croirait alors à tort le groupe déjà éteint et on laisserait un
    survivant garder le port. `pgid=None` signale une plateforme sans groupes
    de processus POSIX (Windows) : repli sur le PID direct seul.
    """
    if pgid is None:
        try:
            process.terminate()
            process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        except ProcessLookupError:
            pass
        return process.poll() is not None

    # `process.poll()` réclame le PID direct s'il vient de sortir. C'est
    # nécessaire AVANT CHAQUE appel à killpg, pas seulement dans la boucle de
    # sondage : sur macOS, killpg(pgid, ...) — y compris le tout premier
    # SIGTERM — lève PermissionError (EPERM), pas ProcessLookupError, quand le
    # chef du groupe est un zombie non encore récolté. Reproduit : un serveur
    # mort ~1 s plus tôt sans qu'aucun poll() n'ait eu lieu entre-temps fait
    # échouer killpg(pgid, SIGTERM) avec EPERM, alors que rien d'autre ne
    # tourne dans le groupe. Récolter d'abord fait retomber sur le cas normal
    # (ProcessLookupError = déjà mort).
    def signaler(sig):
        """Envoie `sig` au groupe. Rend True si le signal est parti ou si le
        groupe est déjà mort ; False si killpg reste bloqué (EPERM) malgré la
        récolte — cas résiduel où un AUTRE membre du groupe, hors de notre
        portée, est encore un zombie non récolté."""
        process.poll()
        try:
            os.killpg(pgid, sig)
            return True
        except ProcessLookupError:
            return True
        except PermissionError:
            return False

    def groupe_vivant():
        process.poll()
        try:
            os.killpg(pgid, 0)
            return True
        except ProcessLookupError:
            return False
        except PermissionError:
            # Ambigu (voir signaler ci-dessus) : on retient "vivant" pour
            # laisser la boucle appelante retenter/escalader plutôt que de
            # conclure "mort" sur une incertitude.
            return True

    if not signaler(signal.SIGTERM):
        # killpg bloqué même après récolte : repli sur le PID direct, qui ne
        # demande aucun privilège de groupe.
        try:
            process.terminate()
        except ProcessLookupError:
            pass

    deadline = time.time() + timeout
    while time.time() < deadline and groupe_vivant():
        time.sleep(0.1)

    if groupe_vivant():
        if not signaler(signal.SIGKILL):
            try:
                process.kill()
            except ProcessLookupError:
                pass
        deadline = time.time() + 2
        while time.time() < deadline and groupe_vivant():
            time.sleep(0.1)

    return not groupe_vivant()


def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers')
    parser.add_argument('--server', action='append', dest='servers', required=True, help='Server command (can be repeated)')
    parser.add_argument('--port', action='append', dest='ports', type=int, required=True, help='Port for each server (must match --server count)')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds per server (default: 30)')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command to run after server(s) ready')

    args = parser.parse_args()

    # Remove the '--' separator if present
    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        print("Error: No command specified to run")
        sys.exit(1)

    # Parse server configurations
    if len(args.servers) != len(args.ports):
        print("Error: Number of --server and --port arguments must match")
        sys.exit(1)

    if len(set(args.ports)) != len(args.ports):
        print(f"Error: --port values must be unique, got {args.ports}")
        sys.exit(1)

    servers = []
    for cmd, port in zip(args.servers, args.ports):
        servers.append({'cmd': cmd, 'port': port})

    server_processes = []

    try:
        # Start all servers
        for i, server in enumerate(servers):
            # Adaptation WellNeuro : la sonde de readiness ne distingue pas
            # « notre serveur » d'« un port qui répond ». Port déjà pris (autre
            # session/worktree) = notre serveur échoue à binder en silence et
            # l'automatisation piloterait l'UI d'une autre branche.
            if port_already_in_use(server['port']):
                raise RuntimeError(
                    f"Port {server['port']} déjà occupé avant lancement — un autre serveur "
                    f"(autre session/worktree ?) écoute. Choisir un port libre et le passer "
                    f"au serveur (ex. npm run dev -- -p <port>) ET à --port."
                )
            print(f"Starting server {i+1}/{len(servers)}: {server['cmd']}")

            # Use shell=True to support commands with cd and &&.
            # start_new_session=True crée un groupe de processus dédié dont ce
            # process est le chef : son pgid est son pid, capturé ci-dessous
            # une fois pour toutes (voir la docstring de terminate_process_group
            # pour la raison de ne jamais le recalculer plus tard).
            process = subprocess.Popen(
                server['cmd'],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
            )
            pgid = process.pid if hasattr(os, 'killpg') else None
            server_processes.append({'process': process, 'pgid': pgid})

            # Wait for this server to be ready
            print(f"Waiting for server on port {server['port']}...")
            ready, why = is_server_ready(process, server['port'], timeout=args.timeout)
            if not ready:
                if why == 'died':
                    # stdout/stderr sont en PIPE (voir le Popen ci-dessus) et jamais drainés
                    # ailleurs : sans communicate() ici, aucune trace ne serait
                    # affichée. Le process est déjà mort (poll() l'a confirmé
                    # dans is_server_ready) donc cet appel ne bloque
                    # normalement pas — sauf si un petit-fils détaché a hérité
                    # des tubes et les garde ouverts (ex. `cmd &` en arrière-
                    # plan) : dans ce cas on n'attend qu'un temps borné et on
                    # le dit, plutôt que de laisser TimeoutExpired remonter et
                    # avaler le diagnostic.
                    try:
                        out, err = process.communicate(timeout=1)
                        sortie = (err or out or b'').decode(errors='replace').strip()
                        detail = sortie[-2000:] if sortie else '(aucune sortie capturée)'
                    except subprocess.TimeoutExpired:
                        detail = (
                            '(sortie non capturée : un processus détaché tient '
                            'encore les tubes ouverts)'
                        )
                    raise RuntimeError(
                        f"Server for port {server['port']} exited before becoming ready "
                        f"(commande : {server['cmd']!r}). Sortie :\n{detail}"
                    )
                raise RuntimeError(f"Server failed to start on port {server['port']} within {args.timeout}s")

            print(f"Server ready on port {server['port']}")

        print(f"\nAll {len(servers)} server(s) ready")

        # Run the command
        print(f"Running: {' '.join(args.command)}\n")
        result = subprocess.run(args.command)
        sys.exit(result.returncode)

    finally:
        # Clean up all servers. Chaque itération est isolée : une exception
        # sur l'arrêt du serveur N (killpg refusé, etc.) ne doit pas priver
        # les serveurs N+1..fin de leur propre nettoyage.
        print(f"\nStopping {len(server_processes)} server(s)...")
        tous_confirmes = True
        for i, entry in enumerate(server_processes):
            try:
                confirme = terminate_process_group(entry['process'], entry['pgid'])
            except Exception as e:
                confirme = False
                print(f"Server {i+1}: erreur pendant l'arrêt ({e})")
            if confirme:
                print(f"Server {i+1} stopped")
            else:
                tous_confirmes = False
                print(f"Server {i+1}: arrêt NON confirmé — un processus a pu survivre et garder le port")
        print("All servers stopped" if tous_confirmes else "Some servers may not have stopped — see above")


if __name__ == '__main__':
    main()
