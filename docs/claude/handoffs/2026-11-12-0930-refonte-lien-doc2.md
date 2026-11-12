# Handoff — 2026-11-12 — Refonte Lien / Empreinte, DOC-2 : décor du kit inscrit (amendement de D-481)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc2`, créée depuis `origin/main` (`5823e961`) dans le worktree `wt-refonte-doc2`. Documentation seule.
- À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue. La session ne merge pas.
- Checkout principal non touché.

## Objectif

Inscrire le décor du kit Lien v2 dans la décision d'identité. Les 22 fonds, ornements et motifs sont versés sous `web/public/wellneuro-lien/` par COM-0, mais aucun écran ne les affiche et aucun lot ne les prévoit ; [[D-481]] §1 et A5-R3 ne nommaient que la palette, la marque et la typographie.

## Décisions prises

Le responsable a répondu par écrit le 2026-11-12 : « Q1a — Q2a,b,d,e,f — Q3b — Q4b — Q5a » ; décors statiques.
- Q1 (a) : décor retenu avec parcimonie, inscrit dans la décision d'identité, sans imposer les 22 éléments.
- Q2 : connexion praticien, entrée patient, dossier à deux voix, en-tête de fiche praticien, états vides réels. Pas de décor sur les pages d'erreur (priorité visuelle, pas interdiction).
- Q3 (b) : signature du hub patient par un lot distinct (PAT-3b), après révision et revalidation du prototype PAT-3.
- Q4 (b) : ornement neuf réunissant végétal et connexion, optionnel, validé avant usage.
- Q5 (a) : primitive commune `LienDecor`, par le micro-lot COM-1.

Inscription par amendement daté de [[D-481]] (§1 bis, ter, quater), sans nouveau numéro, comme DOC-1 l'a fait pour [[D-488]].

## Fichiers modifiés

- `docs/decisions/D-481.md` : amendement du 2026-11-12.
- `docs/claude/REGISTRE_FRONTIERES.md` : ligne de renvoi sous A5-R3.
- Dossier de l'étape 2 (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/`) :
  - `plan-praticien.md` : préalable DOC-2 et COM-1 ; décor des fiches PRA-2, PRA-3a et PRA-3b.
  - `plan-patient.md` : préalables ; décor de PAT-2 et PAT-5 ; lot PAT-3b ajouté au tableau et décrit ; PAT-7 en dépend.
  - `socle-commun.md` : COM-1.
  - `README.md` : index et règle des lots communs.
- `changelog.d/2026-11-12-refonte-lien-doc2-decor.md`, ce handoff.

## Validations exécutées

- Noms des éléments cités relus dans `web/public/wellneuro-lien/` (`backgrounds/`, `ornaments/`).
- Lots attribués d'après la colonne « Lot » de `catalogue-revise.md` : X01 → PRA-2, U01–U09 → PAT-2, U25 → PAT-5, P04 → PRA-3a, X03 → chaque lot. Le panneau praticien de l'objectif négocié (`components/patient-cockpit/ObjectifNegociePanel.tsx`) relève de PRA-3b.
- Les deux prototypes existants (PAT-3 validé, PRA-3a en reprise) relus : aucun décor n'y figure.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Le prototype PRA-3a est en reprise dans la session PRA, avec le verdict du responsable du 2026-11-12 ; le motif d'alliance de l'en-tête y est demandé comme variante. Après le merge de DOC-2, il cesse d'être une variante.
- L'ornement neuf du §1 ter n'a pas de dessinateur désigné ; il ne bloque rien.
- Le statut d'A5-R3 (« non appliqué au code ») est antérieur au merge de COM-0 ; non modifié ici (périmètre).

## Prochaine action exacte

Après le merge : ouvrir COM-1 (`web/src/components/ui/LienDecor.tsx` et son test, worktree neuf sur `origin/main`), annoncé dans les deux pages de suivi. Ensuite, les sessions PRA et PAT emploient `LienDecor` dans les lots nommés ; la session PAT révise le prototype PAT-3 pour PAT-3b.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun chiffre côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification clinique, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
