#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT_DIR=".repo-hygiene"
KEEP_CONTEXT_BASENAMES=(
  "CONTEXTE_SESSION_VERCEL_2026-07-01.md"
)
REM_ARGS=()

print_help() {
  cat <<'EOF'
Usage:
  bash scripts/repo-hygiene.sh <command> [options]

Commands:
  audit-only   Lecture seule: inventaire + detection de doublons
  apply-safe   Deplacements safe vers docs/archive + maj des references
  report-pr    Genere un template de PR a partir des artefacts d'audit

Options (all commands):
  --root <path>       Racine du depot (defaut: cwd)
  --out <path>        Dossier de sortie (defaut: .repo-hygiene)

Options (apply-safe):
  --dry-run           N'applique aucun deplacement/modification

Options (report-pr):
  --write <path>      Ecrit le rapport (defaut: .repo-hygiene/pr-template.md)
EOF
}

log() {
  printf '[repo-hygiene] %s\n' "$*"
}

abs_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    printf '%s\n' "$p"
  else
    printf '%s/%s\n' "$ROOT" "$p"
  fi
}

is_kept_context_file() {
  local base="$1"
  for kept in "${KEEP_CONTEXT_BASENAMES[@]}"; do
    if [[ "$base" == "$kept" ]]; then
      return 0
    fi
  done
  return 1
}

parse_common_args() {
  REM_ARGS=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --root)
        ROOT="$(abs_path "$2")"
        shift 2
        ;;
      --out)
        OUT_DIR="$2"
        shift 2
        ;;
      -h|--help)
        print_help
        exit 0
        ;;
      --)
        shift
        break
        ;;
      *)
        REM_ARGS+=("$1")
        shift
        ;;
    esac
  done
  while [[ $# -gt 0 ]]; do
    REM_ARGS+=("$1")
    shift
  done
}

ensure_out_dir() {
  mkdir -p "${ROOT}/${OUT_DIR}"
}

run_audit_only() {
  ensure_out_dir

  log "Inventaire git + volumetrie -> ${OUT_DIR}/inventory.txt"
  {
    echo "## BRANCHES"
    git -C "$ROOT" branch --all --no-color || true
    echo
    echo "## STATUS"
    git -C "$ROOT" status --short || true
    echo
    echo "## TOP DOSSIERS (taille)"
    du -h --max-depth=2 "$ROOT" 2>/dev/null | sort -h | tail -n 120
    echo
    echo "## DOCS VOLUMINEUSES (.md > 200KB)"
    find "$ROOT" -type f -name '*.md' -size +200k \
      -not -path '*/.git/*' \
      -not -path '*/node_modules/*' | sed "s#${ROOT}/##" | sort
    echo
    echo "## SCRIPTS POTENTIELLEMENT DORMANTS (heuristique)"
    if [[ -d "$ROOT/scripts" ]]; then
      while IFS= read -r file; do
        refs="$({ rg -n --fixed-strings "$file" "$ROOT" 2>/dev/null || true; } | wc -l | tr -d ' ')"
        if [[ "${refs:-0}" -le 1 ]]; then
          printf '%s\n' "$file"
        fi
      done < <(find "$ROOT/scripts" -type f \( -name '*.sh' -o -name '*.mjs' -o -name '*.js' \) | sed "s#${ROOT}/##" | sort)
    fi
  } > "${ROOT}/${OUT_DIR}/inventory.txt"

  log "Doublons stricts (hash) -> ${OUT_DIR}/duplicates-strict.txt"
  find "$ROOT" -type f \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -not -path '*/.next/*' \
    -not -path '*/dist/*' \
    -not -path '*/build/*' \
    -print0 \
    | xargs -0 sha256sum | sort > "${ROOT}/${OUT_DIR}/all-hashes.txt"

  awk '
  {h=$1; $1=""; p=substr($0,2); a[h]=a[h] ? a[h] "\n" p : p; c[h]++}
  END{
    for (k in c) if (c[k] > 1) {
      print "### " k
      print a[k]
      print ""
    }
  }' "${ROOT}/${OUT_DIR}/all-hashes.txt" > "${ROOT}/${OUT_DIR}/duplicates-strict.txt"

  log "Quasi-doublons (basename) -> ${OUT_DIR}/duplicates-quasi.txt"
  find "$ROOT" -type f \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -printf '%f|%p\n' | sort > "${ROOT}/${OUT_DIR}/by-basename.txt"

  awk -F'|' '
  {n[$1]++; paths[$1]=paths[$1] "\n" $2}
  END{
    for (k in n) if (n[k] > 1) {
      print "### " k
      print paths[k]
      print ""
    }
  }' "${ROOT}/${OUT_DIR}/by-basename.txt" > "${ROOT}/${OUT_DIR}/duplicates-quasi.txt"

  log "Carte des zones a risque generee."
}

move_file_safe() {
  local src="$1"
  local dest="$2"
  local dry_run="$3"

  mkdir -p "$(dirname "$dest")"
  if [[ "$dry_run" == "1" ]]; then
    printf 'MOVE %s -> %s\n' "$src" "$dest"
    return 0
  fi

  if git -C "$ROOT" ls-files --error-unmatch "$src" >/dev/null 2>&1; then
    git -C "$ROOT" mv "$src" "$dest"
  else
    mv "$src" "$dest"
  fi
}

replace_path_refs() {
  local old_rel="$1"
  local new_rel="$2"
  local dry_run="$3"

  local targets
  targets="$(rg -l --fixed-strings "$old_rel" "$ROOT" \
    -g '!**/.git/**' -g '!**/node_modules/**' -g '!**/.next/**' || true)"

  if [[ -z "$targets" ]]; then
    return 0
  fi

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if [[ "$dry_run" == "1" ]]; then
      printf 'REPLACE %s in %s\n' "$old_rel" "${file#${ROOT}/}"
    else
      old_esc="$(printf '%s' "$old_rel" | sed 's/[.[\\*^$()+?{|]/\\\\&/g')"
      new_esc="$(printf '%s' "$new_rel" | sed 's/[&/]/\\\\&/g')"
      sed -i "s/${old_esc}/${new_esc}/g" "$file"
    fi
  done <<< "$targets"
}

run_apply_safe() {
  local dry_run="0"

  while [[ ${#REM_ARGS[@]} -gt 0 ]]; do
    case "${REM_ARGS[0]}" in
      --dry-run)
        dry_run="1"
        REM_ARGS=("${REM_ARGS[@]:1}")
        ;;
      *)
        printf 'Unknown option for apply-safe: %s\n' "${REM_ARGS[0]}" >&2
        exit 2
        ;;
    esac
  done

  ensure_out_dir
  local moved_map="${ROOT}/${OUT_DIR}/moved-map.tsv"
  : > "$moved_map"

  local archive_context_dir="${ROOT}/docs/archive/contextes"
  local archive_reprise_dir="${ROOT}/docs/archive/reprise"
  local source_context_dir="${ROOT}/docs/claude"
  local source_reprise_dir="${ROOT}/docs/claude/reprise"

  mkdir -p "$archive_context_dir" "$archive_reprise_dir"

  log "Deplacement des snapshots de reprise -> docs/archive/reprise"
  if [[ -d "$source_reprise_dir" ]]; then
    while IFS= read -r src_abs; do
      [[ -z "$src_abs" ]] && continue
      src_rel="${src_abs#${ROOT}/}"
      dest_abs="${archive_reprise_dir}/$(basename "$src_abs")"
      dest_rel="${dest_abs#${ROOT}/}"
      move_file_safe "$src_rel" "$dest_rel" "$dry_run"
      printf '%s\t%s\n' "$src_rel" "$dest_rel" >> "$moved_map"
    done < <(find "$source_reprise_dir" -maxdepth 1 -type f -name '*.md' | sort)
  fi

  log "Deplacement des contextes dates -> docs/archive/contextes"
  if [[ -d "$source_context_dir" ]]; then
    while IFS= read -r src_abs; do
      [[ -z "$src_abs" ]] && continue
      base="$(basename "$src_abs")"
      if is_kept_context_file "$base"; then
        continue
      fi
      src_rel="${src_abs#${ROOT}/}"
      dest_abs="${archive_context_dir}/$base"
      dest_rel="${dest_abs#${ROOT}/}"
      move_file_safe "$src_rel" "$dest_rel" "$dry_run"
      printf '%s\t%s\n' "$src_rel" "$dest_rel" >> "$moved_map"
    done < <(find "$source_context_dir" -maxdepth 1 -type f -name '*_20[0-9][0-9]-[01][0-9]-[0-3][0-9].md' | sort)
  fi

  log "Mise a jour des references texte"
  while IFS=$'\t' read -r old_rel new_rel; do
    [[ -z "$old_rel" ]] && continue
    replace_path_refs "$old_rel" "$new_rel" "$dry_run"
  done < "$moved_map"

  log "Apply-safe termine. Mapping: ${OUT_DIR}/moved-map.tsv"
}

run_report_pr() {
  local output_rel="${OUT_DIR}/pr-template.md"

  while [[ ${#REM_ARGS[@]} -gt 0 ]]; do
    case "${REM_ARGS[0]}" in
      --write)
        if [[ ${#REM_ARGS[@]} -lt 2 ]]; then
          printf 'Missing value for --write\n' >&2
          exit 2
        fi
        output_rel="${REM_ARGS[1]}"
        REM_ARGS=("${REM_ARGS[@]:2}")
        ;;
      *)
        printf 'Unknown option for report-pr: %s\n' "${REM_ARGS[0]}" >&2
        exit 2
        ;;
    esac
  done

  ensure_out_dir
  output_abs="$(abs_path "$output_rel")"
  mkdir -p "$(dirname "$output_abs")"

  inventory_file="${ROOT}/${OUT_DIR}/inventory.txt"
  strict_file="${ROOT}/${OUT_DIR}/duplicates-strict.txt"
  moved_file="${ROOT}/${OUT_DIR}/moved-map.tsv"

  strict_count="0"
  moved_count="0"
  if [[ -f "$strict_file" ]]; then
    strict_count="$(grep -c '^### ' "$strict_file" || true)"
  fi
  if [[ -f "$moved_file" ]]; then
    moved_count="$(grep -c '.' "$moved_file" || true)"
  fi

  {
    echo "## Perimetre"
    echo "- Hygiene documentaire et structure du depot"
    echo
    echo "## Preuves de redondance"
    echo "- Groupes de doublons stricts detectes (hash): ${strict_count}"
    echo "- Voir: ${OUT_DIR}/duplicates-strict.txt"
    echo
    echo "## Changements"
    echo "- Fichiers deplaces (apply-safe): ${moved_count}"
    echo "- Mapping: ${OUT_DIR}/moved-map.tsv"
    echo
    echo "## Risques"
    echo "- Liens documentaires residuels"
    echo "- Scripts references anciens chemins"
    echo
    echo "## Rollback rapide"
    echo "- git restore --staged . && git checkout -- ."
    echo "- ou git revert <commit>"
    echo
    if [[ -f "$inventory_file" ]]; then
      echo "## Resume inventaire"
      sed -n '1,80p' "$inventory_file"
    fi
  } > "$output_abs"

  log "Template PR genere: ${output_rel}"
}

main() {
  if [[ $# -lt 1 ]]; then
    print_help
    exit 1
  fi

  local command="$1"
  shift

  parse_common_args "$@"

  case "$command" in
    audit-only)
      run_audit_only
      ;;
    apply-safe)
      run_apply_safe
      ;;
    report-pr)
      run_report_pr
      ;;
    -h|--help|help)
      print_help
      ;;
    *)
      printf 'Unknown command: %s\n\n' "$command" >&2
      print_help
      exit 2
      ;;
  esac
}

main "$@"
