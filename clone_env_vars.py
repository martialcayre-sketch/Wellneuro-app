#!/usr/bin/env python3
"""
Clone les variables d'environnement Vercel du target "production" vers "preview"
pour un projet donne, sans lire ni retransmettre les valeurs secretes.

Fonctionnement:
- Liste les variables du projet via l'API Vercel.
- Pour chaque variable dont target contient "production" mais pas "preview",
  envoie un PATCH pour ajouter "preview" au tableau target.

Usage:
  export VERCEL_TOKEN="..."
  python3 clone_env_vars.py

Optionnel:
  export VERCEL_PROJECT_ID="prj_..."
  export VERCEL_TEAM_ID="team_..."
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# Valeurs par defaut du projet wellneuro-app
PROJECT_ID = os.environ.get("VERCEL_PROJECT_ID", "prj_9sg8HgiCvxQfZiULTnmXIaU5c12k")
TEAM_ID = os.environ.get("VERCEL_TEAM_ID", "team_Az14FhLC4e2zq44X0E6W1ANx")
def resolve_token() -> str | None:
    env_token = os.environ.get("VERCEL_TOKEN")
    if env_token:
        return env_token

    auth_path = os.path.expanduser("~/.vercel/auth.json")
    try:
        with open(auth_path, "r", encoding="utf-8") as fh:
            auth_data = json.load(fh)
        file_token = auth_data.get("token")
        if isinstance(file_token, str) and file_token:
            return file_token
    except FileNotFoundError:
        return None
    except (OSError, json.JSONDecodeError):
        return None

    return None


TOKEN = resolve_token()

if not TOKEN:
    sys.exit(
        "Aucun token Vercel disponible (ni VERCEL_TOKEN, ni ~/.vercel/auth.json). "
        "Definis VERCEL_TOKEN dans ce terminal puis relance."
    )

BASE_URL = f"https://api.vercel.com/v9/projects/{PROJECT_ID}/env"
COMMON_HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def request_json(method: str, url: str, *, params: dict[str, str] | None = None, payload: dict | None = None) -> tuple[int, dict]:
    if params:
        query = urllib.parse.urlencode(params)
        url = f"{url}?{query}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url=url, data=data, method=method, headers=COMMON_HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            return status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return exc.code, parsed


def list_envs() -> list[dict]:
    status, data = request_json("GET", BASE_URL, params={"teamId": TEAM_ID})
    if status >= 400:
        raise RuntimeError(f"GET envs HTTP {status}: {json.dumps(data, ensure_ascii=True)}")
    return data.get("envs", []) or []


def unique_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def main() -> int:
    try:
        envs = list_envs()
    except Exception as exc:
        print(f"Erreur recuperation variables: {exc}")
        return 1

    updated: list[str] = []
    skipped: list[str] = []
    failed: list[tuple[str, int, str]] = []

    for env_var in envs:
        key = env_var.get("key", "<sans_nom>")
        env_id = env_var.get("id")
        var_type = env_var.get("type")
        targets = env_var.get("target") or []

        if var_type == "system":
            continue
        if not env_id:
            failed.append((key, 0, "id manquant"))
            continue
        if "production" not in targets:
            continue
        if "preview" in targets:
            skipped.append(key)
            continue

        new_targets = unique_preserve_order([*targets, "preview"])
        patch_url = f"{BASE_URL}/{env_id}"
        status, data = request_json(
            "PATCH",
            patch_url,
            params={"teamId": TEAM_ID},
            payload={"target": new_targets},
        )

        if status < 400:
            updated.append(key)
        else:
            failed.append((key, status, json.dumps(data, ensure_ascii=True)))

    print(f"\nVariables mises a jour ({len(updated)}):")
    for key in updated:
        print(f"  - {key}")

    print(f"\nDeja presentes en Preview, ignorees ({len(skipped)}):")
    for key in skipped:
        print(f"  - {key}")

    if failed:
        print(f"\nEchecs ({len(failed)}):")
        for key, status, details in failed:
            print(f"  - {key}: HTTP {status} {details}")
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
