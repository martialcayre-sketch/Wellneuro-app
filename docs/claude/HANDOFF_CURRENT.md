# Handoff — 2026-08-03

## Git

- Session dans le worktree `.claude/worktrees/lot-04-drapeaux-anamnese`, branche
  `worktree-lot-04-drapeaux-anamnese` — **mergée et supprimée côté distant**
  (PR #539, squash). Le worktree local n'a pas encore été nettoyé (`ExitWorktree`
  n'est pas invoqué proactivement par consigne de l'outil).
- Arbre propre, aucun diff non commité.
- `main` a reçu #539 depuis cette session ; repartir de `main` (pas de cette
  branche squashée) pour le lot suivant.

## Objectif atteint

LOT-04 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
— structurer l'intake pour un moteur d'orientation déterministe. **Livré et
mergé**, recadré au cadrage sur son périmètre résiduel réel.

## Décisions prises, et pourquoi

- **Le lot d'origine a été recadré** : « schéma applicatif » (motifs, formulaire
  d'anamnèse) déjà existant (`motifs.ts`, `anamnese.ts`). Ce qui manquait pour
  LOT-05 (table de règles) : une extraction **typée et nommée**, pas de la
  prose (`contexteClinique.ts` produit du texte pour un LLM, pas des drapeaux).
- **Valeurs autorisées lues dynamiquement dans `ANAMNESE_SECTIONS`**, jamais
  dupliquées en constantes locales — élimine le risque de divergence de
  libellé (apostrophes typographiques notamment) entre deux sources de vérité.
- **`Consultation.motif` et `anamnese.motif_principal` restent hors périmètre** :
  le premier peut être `null` (non fiable), le second est du texte libre — ni
  l'un ni l'autre ne devient un drapeau.
- **Revue adversariale `wn-reviewer` avant clôture, deux défauts majeurs
  corrigés** : tests initiaux tautologiques (l'attendu dérivait du même code
  que l'extraction) → remplacés par des libellés **figés en dur**, qui cassent
  bruyamment si `anamnese.ts` dérive ; filtrage qui passait par un helper
  borné à 50 éléments bruts avant dédup (ordre dépendant du stockage, risque
  théorique de perte d'un signal valide) → réécrit pour itérer sur l'énuméré
  clinique (ordre canonique, pas de troncature avant filtrage).
- **Écarté** : ajouter un champ `signauxAlerteNonReconnus` pour distinguer un
  signal hors énuméré d'un signal absent — pas de consommateur aujourd'hui
  (LOT-05 non écrit), aurait anticipé un besoin hypothétique. Documenté en
  commentaire de type à la place.
- **Pas de promotion `docs/DECISIONS.md`** : le point le plus proche d'une
  décision structurante (`signaux_alerte` filtré n'est pas une garantie de
  sécurité, `extraireVigilanceDeterministe` non filtré l'est) est un corollaire
  de D-003 déjà au registre, pas une nouvelle frontière — et porte sur une
  fonction qu'aucun code ne consomme encore. À revisiter explicitement au
  cadrage de LOT-05.

## Fichiers livrés

- `web/src/lib/consultation/drapeauxAnamnese.ts` — `extraireDrapeauxAnamnese`,
  8 drapeaux (5 `checkbox-multi` + 3 `radio`).
- `web/src/lib/consultation/drapeauxAnamnese.test.ts` — garde anti-dérive à
  libellés figés + cas adverses (null, type inattendu, hors énuméré, doublons,
  ordre, espaces).
- `web/src/lib/consultation/motifs.test.ts` — `isMotifValide` n'avait aucun test.
- `web/src/lib/consultation/contexteClinique.ts` — `asRecord`/`texte`/`liste`
  passés en `export` (3 mots, comportement inchangé).
- `docs/claude/campagnes/2026-08-03-.../lots/LOT-04-structuration-intake.md`
  (statut `livré` + `## Résultats`), `docs/claude/SESSION_LOG.md`,
  `changelog.d/2026-08-03-lot-04-drapeaux-anamnese.md`.

## Validations exécutées

- T1 (`npm run check`) : vert, deux fois (avant et après corrections de revue).
- T2 (`npm run test:worktree -- --fast`) : vert, 108 tests E2E, deux fois.
- CI de la PR #539 : `verify` présent et vert (pas de gel `action_required`),
  checks Vercel verts.
- Aucun secret introduit (`check_no_secrets.sh`) ; aucune donnée patient réelle
  (Sophie Nicola uniquement).

## Problèmes ouverts

- **LOT-05 devra trancher explicitement** : `signauxAlerte` peut-il porter une
  décision de sécurité malgré son filtrage silencieux, ou reste-t-il un signal
  secondaire avec `extraireVigilanceDeterministe` en filet de sécurité ?
- Le worktree `lot-04-drapeaux-anamnese` n'a pas été supprimé (branche déjà
  morte côté distant) — à nettoyer à la prochaine ouverture de session dessus.
- Questions héritées de LOT-03, toujours ouvertes : `estAdministrableParLaRoute`
  ne vérifie pas `actif` contrairement à `IDS_ASSIGNABLES` ; 10 des 16 packs de
  doctrine n'existent pas en base (décision produit).

## Prochaine action exacte

**LOT-05** (table de règles d'orientation — dépend de LOT-03 et LOT-04, les
deux livrés) ou **LOT-01** (validation praticien des 755 claims d'intervention,
sans dépendance). Les deux sont disponibles ; LOT-05 est le consommateur direct
de ce lot.

## Interdits encore actifs

- **Pas de migration Prisma** sur les lots de cette campagne sauf demande
  explicite distincte.
- **Pas de branchement de `extraireDrapeauxAnamnese`** dans une route sans
  cadrer d'abord la question de sécurité ci-dessus (LOT-05).
- **Repartir de `main`** pour le prochain lot, jamais de la branche squashée
  `worktree-lot-04-drapeaux-anamnese`.
- **Ne pas merger sans avoir lu `verify`** — les seuls checks Vercel ne prouvent
  rien (régime en vigueur, `CLAUDE.md`).
