# Handoff — BIO-INGEST LOT-03 : photo ou scan (2026-10-04)

## Branche et état

`feat/bio-ingest-lot03-photo-scan`, partie de `1dccd635`. `origin/main` a avancé de #1308
(lettre d'adressage LOT-03a) : seul fichier commun, `docs/DOSSIER_RGPD.md`, sur des hunks éloignés
(l. 205 contre l. 328), sans conflit attendu. PR à ouvrir.

## Objectif

Accepter une photo ou un scan de compte rendu par le pipeline du LOT-02 : seul l'extracteur change.

## Décisions

- Pas de migration : le CHECK `type_mime` admettait déjà JPEG, PNG et WebP ; le §2 ter RGPD déclarait déjà les images.
- Format lu à la signature, et il doit concorder avec le type déclaré ; HEIC et GIF refusés (415).
- EXIF/GPS retirés au dépôt par réencodage `sharp` (arbitrage du responsable, option a). `sharp` 0.35.4
  devient une dépendance directe (il était déjà présent comme dépendance optionnelle de Next).
- Plafonds : 10 Mo reçus ; image préparée ≤ 3,75 Mio (5 Mio en base64) ; côté ≤ 8 000 px, lu dans l'en-tête avant décodage.
- Procédé `bio-extraction-v1` inchangé : même consigne, même schéma, bloc `image` au lieu de `document`.
- Revue `/code-review medium` : (1) dimensions contrôlées avant décodage → corrigé ; (2) refus fréquents
  d'images trop lourdes → limite affichée à l'écran, redimensionnement écarté pour l'instant ; (3) perte
  à la qualité 85 → écarté, le fournisseur réduit lui-même les grandes images.

## Fichiers

`web/src/lib/biology-library/import/{depot,extraction,lancerExtraction}.ts` et leurs tests ;
`web/src/app/api/praticien/biologie/import/depot/route.ts` et son test ;
`web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx` ; `web/package.json`, `web/package-lock.json` ;
`docs/DOSSIER_RGPD.md` ; le fichier du lot ; `changelog.d/2026-10-04-bio-ingest-photo-scan.md`.

## Validations

T1 complet vert ; T2 `--fast` vert en 3 min 54 s (build et E2E compris), joué avant les corrections de revue.
Après les corrections : `tsc` vert et 203 tests ciblés verts.

## Ouvert

- Un compte rendu en plusieurs photos (une photo par dépôt aujourd'hui).
- Redimensionnement serveur, si les refus `image_trop_lourde` se constatent en production.

## Prochaine action

T1 complet, commit, PR `--body-file`, `node scripts/wn-attendre-ci.mjs <N>` en fond, puis merge.
Le drapeau `WN_BIO_INGEST_ENABLED` est posé : **l'image est servie dès le déploiement**.

## Interdits actifs

Aucune écriture dans `resultats_biologiques` sans validation humaine ; aucune qualification de valeur ;
aucune conversion d'unité (`D-157`) ; pas de migration ; aucune donnée patient réelle.
