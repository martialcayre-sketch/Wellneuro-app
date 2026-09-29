# Handoff — 2026-09-29 — Fiches d'assiette : l'espace de lecture et la tâche du fil (lot 10)

## 1. Branche et état Git

`feat/fiches-assiette-lot10-lecture`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`0f6a3767` (#1247, lot 9). Pas de migration. Un merge à la fois.

## 2. Objectif

Lot 10 de `D-251` : l'espace de lecture « Fiches remises par mon praticien »,
la tâche « à lire » au fil du jour et la lecture tracée (espèce
`fiche_assiette`), sous `WN_FICHES_ASSIETTE_LECTURE` fermé.

## 3. Décisions prises

Choix de mise en œuvre consignés dans l'amendement de `D-251` du 2026-09-29,
révisables par le responsable :

1. **Deux écrans.** La liste n'a pas de texte. La page d'une fiche porte le
   texte et la phrase du §5. Lire une fiche acquitte SA lecture : la trace
   part de sa page une fois le texte affiché (revue, P2-1).
2. **Une lecture par fiche servie.** Au fil, une tâche par fiche, avec
   l'assiette en appui. Une fiche retirée ou indisponible n'est pas une
   lecture.
3. **Accès permanent** dans « Autres espaces » : si la surface est ouverte ET
   qu'une fiche au moins a été remise.
4. **P2-2 du lot 9, tranché** : la mention « ne fait plus partie » dit la
   décision du praticien, même quand la page protocole est indisponible.
5. **Impression**, comme le bilan.

## 4. Fichiers modifiés

- **Domaine des lectures** :
  - `lib/portail/lecturesAttendues.ts` : l'espèce `fiche_assiette`, le libellé
    et le lien par fiche ;
  - `lib/portail/filDuJour.ts` : l'appui de la tâche.
- **Routes** :
  - `app/api/portail/lectures/route.ts` : les fiches servies, calculées par
    `fichesRemisesAuPatient` (règle empruntée), `null` si le drapeau est
    fermé ; accusé vérifié ;
  - `app/api/portail/fiches-assiette/route.ts` : le mode `?interrupteur=1` ;
  - `lib/fiches-assiette/servicePatient.ts` : `aDesFichesRemises`.
- **Écrans** :
  - `app/portail/[token]/fiches/page.tsx` et
    `app/portail/[token]/fiches/[idRemise]/page.tsx` ;
  - `components/patient/fiches-assiette/` : `FichesRemises`,
    `FicheRemiseLecture`, `useFichesRemises`, `textesFiches` (pur) ;
  - `components/patient-companion/LienFichesRemises.tsx`, posé dans la nav de
    `app/portail/[token]/questionnaires/page.tsx` ;
  - `components/patient/ConsignerLecturePortail.tsx` : `idObjet` optionnel,
    monté par `FicheRemiseLecture` sous le texte affiché, jamais par la page.
- **Garde** : `lib/portail/portailLecturesPatient.guard.test.ts` :
  `ficheAssietteRemise` rejoint les modèles append-only.
- **Observabilité** : `lib/observability/masquageChemin.ts` reçoit les
  gabarits des deux pages. Sans eux, leur chemin tombait dans le repli fermé :
  aucune fuite, mais un diagnostic aveugle. T3 l'a vu, pas T2.
- **Docs** :
  - `docs/DECISIONS.md` (amendement) ;
  - `docs/FEATURE_FLAGS.md` (les quatre surfaces du drapeau de lecture) ;
  - changelog, ce handoff, SESSION_LOG, matrice régénérée si elle a bougé.

## 5. Validations exécutées

- **Bancs** : 200 tests sur les 11 fichiers touchés. Parmi eux :
  - textes : 12 ;
  - écrans : 17 ;
  - lien : 5 ;
  - pages : 6 ;
  - trace : 13 ;
  - route des fiches : 16 ;
  - route des lectures : 37 ;
  - lectures attendues : 19 ;
  - fil : 46 ;
  - service patient : 24 ;
  - garde append-only : 5.
- **32 mutants joués en session** (scripts hors dépôt), tous tués : 24 sur le
  lot, 8 sur les correctifs de revue. Le seul survivant du premier passage
  était un banc trop faible : un texte glissé dans une carte de la liste. Le
  banc est renforcé.
- **T1 vert ; T3 complet vert sur l'état final** (4 min 2 s, 221 E2E). Un
  premier T3 avait rougi sur le masquage des chemins, corrigé.
- **Revue `wn-reviewer` : GO**, aucun P0 ni P1. Verdicts :
  - P2-1, la tâche acquittée sans que le texte paraisse (panne passagère de
    la route des fiches) : **corrigé**, la trace est montée sous le texte ;
  - P2-2, les contrôles rejoués à chaque accueil : **routé** au lot 11 (§7) ;
  - P2-3, « n'est plus celle qui vous est remise » pour un identifiant tapé
    à la main : **corrigé**, « Cette fiche n'est pas disponible. » ;
  - tests manquants (indisponible, 403, 500, panne au POST) : **ajoutés** ;
  - impression de l'URL qui porte l'identifiant du dossier : **écarté**,
    `MonBilan` imprime déjà ainsi, et ce segment n'ouvre rien sans la
    session.

## 6. Problèmes ouverts

- **Aucun E2E** ne parcourt l'espace : le drapeau est fermé dans les E2E. Le
  constat viendra en production, drapeau de lecture ouvert, sur un dossier de
  test.
- **Le drapeau d'émission** attend toujours son constat par le comportement :
  la section des fiches vue en sous-vue Diffusion.
- **Six fiches sur sept** attendent la relecture du responsable.
- **Le document TRUST sur l'IA** (§5) n'est pas encore écrit. La page d'une
  fiche porte la phrase du §5, sans lien vers ce document. Le lien viendra
  avec le document.
- **La phase « Actions »** reste à cadrer avec le responsable.

## 7. Prochaine action exacte

Le lot 11 : l'e-mail neutre. Objet « Un document de votre praticien vous
attend », corps « Un document de votre praticien vous attend dans votre
espace. ». Y joindre le P2-2 de la revue du lot 10 : la route des lectures
n'a besoin que de l'état des fiches, pas de leur texte ni du protocole servi.
Une variante de `fichesRemisesAuPatient` qui s'arrête là éviterait de
rejouer les contrôles à chaque accueil. Ensuite, le lot dédié au document
TRUST sur l'IA (rédigé par Claude, validé par le responsable), puis la
contre-revue adverse avant l'ouverture de la lecture.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- `WN_FICHES_ASSIETTE_LECTURE` reste fermé jusqu'aux conditions du §10 : sept
  fiches validées, espace de lecture constaté, document TRUST sur l'IA publié,
  contre-revue adverse.
