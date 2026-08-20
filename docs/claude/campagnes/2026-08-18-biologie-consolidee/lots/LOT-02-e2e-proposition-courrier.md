---
id: "LOT-02"
statut: "à faire"
dépend_de: "LOT-01"
---

# LOT-02 — La surface vivante a enfin des parcours

## But

À la fin de ce lot, un parcours praticien complet — ouvrir un dossier, lire la
proposition de bilan, déclarer un panel documenté, établir le courrier — est
joué par Playwright dans un vrai navigateur. Aujourd'hui, **aucun E2E ne
couvre ces surfaces**, alors que `WN_CB_PROPOSITION` est posé en production
depuis le 2026-08-18 : ce qui casserait à l'écran ne serait vu par personne
avant un praticien.

## Résultat observable

`npm run test:e2e` joue un spec neuf qui traverse la surface biologie de bout
en bout sur un patient fictif, et le rejoue **deux fois de suite sans échouer**
— la preuve que son nettoyage est complet.

## Le patron à suivre, et pourquoi il évite le piège

`web/e2e/fiche-trajectoire-peuplee.spec.ts` provisionne son épisode en
`beforeAll`, nettoie en `afterAll`, tourne en **mode sériel**, et note en tête
qu'aucun autre spec ne lit ses données. C'est ce qui permet de peupler un
patient **sans toucher au seed** — et donc sans déplacer les bancs qui
dépendent des trois patients fictifs (`visual.spec.ts` et sa capture pixel,
`fiche-detail-reponses.spec.ts`, `seedCertification.guard.test.ts`). Modifier
`web/prisma/seed.ts` les emporterait tous : c'est l'interdit central du lot.

Helpers à écrire dans `web/e2e/helpers/db.ts`, au patron de
`provisionnerReponseOrientation` / `nettoyerOrientationFileEnvoi` :

- provisionner de quoi rendre la proposition **non vide** (le moteur doit
  avoir de la matière : passations et drapeaux d'anamnèse) ;
- nettoyer **chirurgicalement** — identifiants préfixés, suppression ciblée du
  panel documenté, de la correspondance et des réponses fabriquées, dans un
  ordre sûr vis-à-vis des clés étrangères.

## Périmètre

- `web/e2e/biologie-proposition-courrier.spec.ts` (neuf).
- `web/e2e/helpers/db.ts` — provisionnement et nettoyage, rien d'autre.
- Aucune modification de code applicatif : si le parcours révèle un défaut, il
  se traite dans un lot propre — un E2E qui « corrige au passage » cache ce
  qu'il a trouvé.

## Ce que le parcours doit prouver

1. Le panneau de proposition s'affiche et porte des lignes.
2. Déclarer un panel documenté change ce que le moteur propose.
3. Le formulaire de courrier n'apparaît que s'il y a quelque chose à proposer.
4. Le courrier s'établit, son texte est rendu pour transcription, et
   **aucun envoi n'a lieu**.
5. Une seconde consignation sans changer de destinataire est refusée.
6. Le fil porte le **verdict d'ancrage du LOT-01** — c'est la raison de la
   dépendance.

## Interdits

- **Ne jamais modifier `web/prisma/seed.ts`.**
- **Jamais `resetPortailState`** pour nettoyer ce spec : elle filtre sur
  `idAssignation: { not: null }` et laisserait la matière fabriquée en place.
- **Aucune donnée patient réelle** : Sophie Nicola, Jennifer Martin, Michel
  Dogné seulement.
- **Jamais deux runs E2E en parallèle** — base partagée, Mac exclusivement.
- Ne pas corriger de code applicatif dans ce lot.

## Dépendances

LOT-01, pour le point 6 du parcours. Le reste pourrait s'écrire avant, mais
scinder ferait deux passages sur le même fichier.

## Tests

Le lot **est** le test. Vérification propre : deux runs consécutifs verts
(preuve du nettoyage), et le segment E2E de T3 reste au CI tant que `D-049`
tient — un blocage WebKit sur le Mac y fait expirer une navigation sans qu'une
requête parte, et `wn-test-worktree.sh` le classe tout seul.

## Critères de done

- [ ] Le spec joue les six points ci-dessus, en mode sériel.
- [ ] Deux runs consécutifs passent — le nettoyage est prouvé, pas supposé.
- [ ] `web/prisma/seed.ts` est intact ; aucun autre spec n'a bougé.
- [ ] Aucun code applicatif modifié — ou, si un défaut a été trouvé, il est
      **nommé** et renvoyé à un lot propre.
- [ ] T2 vert ; fragment `changelog.d/` écrit.
