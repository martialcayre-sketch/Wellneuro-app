# Refonte Lien / Empreinte — socle commun des deux plans

Deux lots précèdent les plans praticien et patient. Ce sont les seuls lots
qui touchent des fichiers communs aux deux rôles. Les deux sessions de
réalisation ne démarrent qu'après leur merge.

## DOC-0 — Décisions de la refonte

**Objet.** Inscrire au registre, dans une seule PR de documentation :

- les amendements acceptés mot pour mot (`amendements.md`, AM-1 à AM-6 ;
  AM-7 si Q-E2-1 (a), AM-8 si Q-E2-2 (b)) ;
- une décision « textes de la refonte Lien » qui recopie chaque texte du
  registre accepté (`registre-textes.md`), avec son identifiant T-nn, son
  emplacement et le texte qu'il remplace. Aucun lot n'applique un texte qui
  n'y figure pas.

Les numéros D-xxx se prennent à ce moment, sur `origin/main` relu, pour
qu'aucune des deux sessions n'ait à en prendre un. Un texte accepté plus
tard (T-30, T-31, T-33, T-34 sont facultatifs pour leur lot) passe par un
micro-lot `DOC-n` qui complète cette décision, un seul ouvert à la fois,
avant le lot qui l'applique.

**Préalable.** Les réponses écrites du responsable aux questions Q-E2-1 à
Q-E2-5 (`README.md` §4) et l'acceptation, amendement par amendement et
texte par texte.

**Fichiers.** `docs/decisions/D-xxx.md` (neufs), `docs/decisions/` (index),
`docs/claude/REGISTRE_FRONTIERES.md` (A5-R3), les décisions amendées
([[D-324]], [[D-447]], [[D-460]]) pour leur seule ligne de renvoi.

**Réception.** Une décision par amendement accepté, chacune citant sa
réponse ; une décision des textes acceptés, mot pour mot ; un amendement
refusé n'a pas de décision et ce qui en dépend est retiré du plan ; un texte
refusé laisse l'existant en place.

## COM-0 — Fondation Lien

**Objet.** Raccorder la palette, les polices, la marque et les icônes de
l'artefact « Wellneuro Lien — Empreinte », version 4, aux jetons du produit.
Lot 1 du cadrage v3 §18.

**Préalable.** DOC-0 (A5-R3 inscrite) ; Q-E2-3 tranchée.

**Fichiers (propriété exclusive de COM-0, gelés ensuite).**

- `web/src/app/globals.css` : jetons des deux thèmes, dont le rail nuit
  pétrole praticien, le fond sauge du rail patient (`rail-background`) et
  `rail-patient-compact` (13 rem) ;
- `web/tailwind.config.ts` ;
- `web/src/app/layout.tsx` : Lora ajoutée par `next/font`, polices non
  utilisées retirées seulement si aucun écran ne les cite ;
- `web/src/app/global-error.tsx`, `web/src/app/not-found.tsx` (X07) ;
- primitives employées par les deux rôles : `components/ui/Badge.tsx`,
  `components/ui/PanneauSuperpose.tsx`, `components/ui/ScoreGauge.tsx`,
  `components/physio-traitements/FormulaireTraitement.tsx` et
  `ChampDatePeriode.tsx` (importés par le panneau praticien et par les
  déclarations patient), et leurs tests ;
  `components/ui/design-system.guard.test.ts` ;
- marque Empreinte : un composant neuf et ses fichiers sous `web/public/`,
  licences comprises.

**Réception** (cadrage v3 l.522) : styles bornés par rôle, aucune palette
codée en dur ajoutée, nom « Wellneuro » partout, fonds sans texte incorporé,
contrastes vérifiés sur les composants représentatifs (jetons de l'artefact,
version 4), `ScoreGauge` toujours `showValue={false}` côté patient. Les deux
interfaces restent claires, sans sélecteur ni bascule de thème.

**Après COM-0.** Les fichiers ci-dessus sont gelés pour les deux sessions.
Un jeton ou une primitive commune qui manque passe par un micro-lot `COM-n` :
une PR courte, ouverte par la session qui en a besoin, annoncée dans les deux
artefacts de suivi ; l'autre session rebase dessus avant son prochain lot.
Deux `COM-n` ne sont jamais ouverts en même temps.

## Règles communes aux deux sessions

- Worktree neuf sur `origin/main` fraîchement fetché, un par lot ; jamais le
  `main` local. `npm ci` et `npx prisma generate` avant tout test.
- Un lot, une PR. Fragment `changelog.d/`, handoff `docs/claude/handoffs/`
  avant la PR. Revue : CodeRabbit, sinon Copilot si son quota le permet,
  sinon PR-Agent. CI suivie par `node scripts/wn-attendre-ci.mjs <N>`.
  Merge par « prête @<sha> » ; la session ne merge pas.
- Contrôles : T1 (`cd web && npm run check`), T2
  (`npm run test:worktree -- --fast`), constat à l'écran en local (base de
  test, patients fictifs Sophie Nicola, Jennifer Martin, Michel Dogné),
  relecture `ui-ux-pro-max` en lecture seule, qui ne prime jamais sur une
  décision ([[D-456]]).
- Aucun texte hors du registre accepté ; aucun chiffre sur une surface
  patient ([[D-333]]) ; aucune modification clinique, de questionnaire, de
  scoring, de route, de garde ni de schéma Prisma ; aucun drapeau posé ou
  retiré sans demande explicite.
- Un fichier hors de la liste du plan : vérifier qu'aucun écran de l'autre
  rôle ne l'importe (directement ou non) avant d'y toucher ; s'il est
  partagé, il passe par un `COM-n`.
- Chaque lot met à jour son artefact de suivi : statut, PR, SHA « prête »,
  date de merge, écarts.
