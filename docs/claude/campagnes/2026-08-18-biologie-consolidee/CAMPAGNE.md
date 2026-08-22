---
id: "2026-08-18-biologie-consolidee"
titre: "Biologie consolidée — fermer les dettes de la surface vivante"
statut: "terminée (2026-08-22 — les trois lots livrés ; la double consignation garde son verrou côté écran seulement, défaut nommé sans lot d'accueil)"
créée_le: "2026-08-18"
mise_à_jour: "2026-08-22"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Biologie consolidée — fermer les dettes de la surface vivante

## Objectif

La proposition de bilan biologique et le courrier médecin ancré sont **en
production** depuis le 2026-08-18 (`WN_CB_PROPOSITION` posé et porté par un
build, campagne T0 close, PR #710). Trois dettes ont été nommées à cette
clôture ; aucune n'est soldée. La campagne les ferme : **l'ancrage devient une
garde lue**, la surface a **des parcours joués**, et un garde-fou déjà cassé
une fois devient **un contrat**.

## Résultat observable

1. Dans le fil de correspondance, une lettre biologique dit si son ancre
   **concorde** avec la table courante ou si elle est **périmée** — et une
   lettre sans ancre ne dit rien plutôt que de se faire passer pour périmée.
2. Un parcours praticien complet (dossier → proposition → déclaration de panel
   → courrier) est joué par Playwright, sur patient fictif.
3. Le CI refuse un pack actif qui référencerait un instrument suspendu.

## État réel au cadrage — 2026-08-20

Le brief de la file (`sources/brief-biologie-consolidee.md`, 2026-08-18)
écrivait « aucun chemin de lecture n'expose l'ancrage » et « le garde-fou des
packs n'est asséré par aucun contrat ». **Vérification faite, deux de ces
énoncés étaient trop larges** :

| Point | État vérifié le 2026-08-20 |
|---|---|
| Ancrage — **écriture** | **DÉJÀ GARDÉ.** `web/prisma/checks/c3_correspondance_ancrage_v1_negatif.sql` éprouve que les deux CHECK mordent : SHA sans version, version sans SHA, SHA de longueur invalide → rejet `23514`, et une ancre complète passe. |
| Ancrage — **lecture** | **MANQUE RÉEL, et localisé.** `web/src/app/api/praticien/correspondance-medecin/route.ts` — la constante `SELECTION` ne porte ni `ancrageSha256` ni `ancrageVersion` : le fil ne les lit jamais. C'est l'objet du LOT-01. |
| Ancrage — retour de création | Le POST du courrier **renvoie** l'ancre, et l'écran l'affiche à la lettre qui vient d'être établie. Ce n'est pas une relecture du fil : rien n'est comparé à la table courante. |
| E2E proposition / courrier | **AUCUN.** Confirmé : aucun fichier de `web/e2e/` ne couvre ces surfaces. |
| Contrat packs ↔ instruments suspendus | **N'EXISTE PAS.** `packs_registre_coherence_v1.sql` existe mais porte un **autre** invariant — la dérive entre `packs.qids` (legacy) et le miroir relationnel. Le contrat du LOT-03 en est le **frère**, pas un doublon. |

**Le point dur des E2E se dissout aussi.** On pouvait craindre que peupler un
patient déplace les bancs qui dépendent des trois patients fictifs
(`visual.spec.ts`, `fiche-detail-reponses`, `seedCertification.guard.test.ts`).
`web/e2e/fiche-trajectoire-peuplee.spec.ts` montre le patron qui l'évite :
provisionner en `beforeAll`, nettoyer en `afterAll`, mode sériel — **sans
toucher au seed**.

## Contraintes non négociables

- **Les tables signées ne se touchent pas** : `indicationsBiologieV1.ts`,
  `statuts.ts`, `courrier.ts`. Une seule ligne modifiée est une modification
  clinique — décision `D-xxx` + fragment `changelog.d/` (`DC-17`, `DC-18`).
- **Une donnée absente n'est jamais un défaut** (`DC-24`) : une lettre sans
  ancre n'est pas une lettre périmée. Le verdict a **trois** états, pas deux.
- **Aucune migration** dans cette campagne. Si un lot en découvre le besoin,
  il se scinde et la migration part seule, derrière son cycle `release-db`.
- **Les E2E sont l'exclusivité du Mac** — base partagée, jamais deux runs en
  parallèle. Le segment E2E de T3 relève du CI tant que `D-049` tient.
- **Patients fictifs seuls** dans les bancs et fixtures : Sophie Nicola,
  Jennifer Martin, Michel Dogné. Nettoyage chirurgical par identifiants
  préfixés, jamais un `reset` global.
- **UI en français**, textes sobres — un badge de plus sur chaque ligne du fil
  est du bruit, pas de l'information.

## Décisions qui bornent la campagne

- `D-073` (2026-08-19) — colonnes d'ancrage sur `correspondances_medecin` ;
  l'ancre vient du bloc **rendu**, jamais reconstruite.
- `D-071`, `D-072` — branchement de la proposition et solde de ses dettes.
- `D-049` — le segment E2E de T3 relève du CI (blocage WebKit sur le Mac).
- `D-052` — un défaut de migration n'est pas un jugement clinique (motif du
  fail-closed, réutilisé par le verdict d'ancrage).

## Questions ouvertes — hors périmètre, nommées pour ne pas les redécouvrir

- **Le courrier ne nomme jamais le patient** dans son texte (minimisation ;
  seul `id_patient` relie la lettre au dossier) — à confirmer comme choix, pas
  comme oubli. Aucun lot ne le tranche ici.
- **Double consignation par deux onglets** : le verrou de re-consignation est
  côté écran ; deux onglets peuvent encore établir deux lettres.
- **Appariement NABM et liens biomarqueur ↔ besoin** : lots de curation
  signée, campagne de rang 4 — tant qu'ils sont vides, les remboursements
  sortent `non_evalue`, et c'est l'aveu juste.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Le fil relit l'ancre et dit si elle tient — trois états | terminé (2026-08-20, PR #725 — verdict servi, D-079) | — |
| LOT-02 | E2E de la surface proposition + courrier (et du verdict du LOT-01) | terminé (2026-08-22, PR #726 — 6 points joués vert au CI et deux runs consécutifs verts en local : nettoyage prouvé) | LOT-01 |
| LOT-03 | Contrat SQL « aucun pack actif ne référence un instrument suspendu » | terminé (2026-08-22, PR #731 — prouvé par mutation les deux sens ; production constatée saine) | — |

## Done de campagne

À cocher sur preuve relue, jamais sur la prose d'un lot.

- [ ] Le fil rend un verdict d'ancrage **calculé côté serveur**, à trois
      états, et un banc par mutation prouve qu'une comparaison sur le seul SHA
      rougit.
- [ ] Une lettre sans ancre n'affiche aucun badge — vérifié à l'écran, pas
      seulement en test.
- [ ] Un parcours Playwright couvre proposition → panel documenté → courrier,
      sur patient fictif, avec nettoyage chirurgical vérifié par deux runs
      consécutifs.
- [ ] Le contrat packs ↔ instruments suspendus est joué par le CI et
      **éprouvé par mutation**.
- [ ] Aucune table signée n'a été modifiée ; aucune migration n'a voyagé.
