---
id: "LOT-09"
titre: "BP-09 — Annulation d'un résultat, ajout seul"
statut: "en_cours (2026-10-14) — PR 1 mergée (#1448), release-db constatée ; PR 2, code consommateur"
dépend_de: "LOT-00"
---

# LOT-09 (BP-09) — Annulation d'un résultat, ajout seul

## But

Permettre au praticien de retirer d'un dossier un résultat de biologie saisi
par erreur (mauvais dossier, mauvaise date, mauvais analyte), sans rien
effacer. Aujourd'hui seule la correction de valeur et d'unité existe
(`D-124` §3) : une erreur d'analyte, de date ou de dossier reste dans les
séries et ne peut pas en sortir.

## Résultat observable

Un résultat annulé sort de toute élection de tête de fil et de toute lecture
de « derniers résultats ». Il reste lisible dans la fiche du praticien, marqué
« annulé », avec son motif, son auteur et sa date. Une annulation faite par
erreur se révoque une fois, avec motif ; le résultat revient alors dans les
séries. Rien ne s'efface.

## Arbitrages du responsable (2026-10-14)

- **Motifs, liste fermée** : mauvais dossier, mauvaise date de prélèvement,
  mauvais analyte. Une erreur de valeur ou d'unité reste une correction
  (`D-124`). Aucun texte libre. Un motif nouveau exige une décision et une
  migration.
- **Révocation** : oui, une fois par annulation, motif obligatoire (patron
  `D-257` §6). Motifs, liste fermée (tranchés en session le même jour) :
  mauvais résultat annulé, résultat vérifié exact, motif d'annulation erroné.
- **La place se libère** (tranché en session le même jour, sur constat de la
  revue du lot de migration ; amende la phrase d'origine « la ligne annulée
  occupe toujours la clé ») : un fil annulé ne retient plus sa clé (dossier,
  analyte, date). La garde anti-doublon de `D-124` §2 devient un trigger qui
  ignore les fils annulés ; une révocation est refusée si la place a été
  reprise. Décision : `D-294`.

## Constat de production (2026-10-14, `one-off-6164`, lecture seule)

60 résultats, 2 dossiers, 0 correction, 0 clé (dossier, analyte, date) en
double parmi les têtes. `WN_CB_ENABLED` et `WN_CB_RESULTS_ENABLED` sont à
`true` : le lot porte sur des données réelles.

## Périmètre

- **Une table neuve, ajout seul**, deux actes (`annulation`, `revocation`),
  sur le patron de `LectureImportBiologique`
  (`20261006150000_lectures_imports_biologiques_v1`) : CHECK de forme par
  acte, motif en `CHECK … IN (liste fermée)`, triggers `_no_update`,
  `_no_truncate` et `_avant_insertion` (auteur et date posés serveur,
  inantidatables ; même dossier que le résultat visé ; une annulation non révoquée au plus
  par fil ; une révocation au plus par annulation). `DELETE` réservé à
  l'effacement nommé.
- **Cible** : la tête courante d'un fil de correction ; l'annulation retire
  le fil entier. Une correction d'un résultat annulé est refusée.
- **Aucune colonne neuve sur `resultats_biologiques`** : le contrat négatif
  `cb_resultats_biologiques_v1_negatif.sql` et sa liste blanche restent
  intacts.
- **Lecteurs de calcul** (élection de tête, derniers résultats, portes,
  contrôle de doublon, import) : excluent les fils annulés et non révoqués
  (liste close au 2026-10-14, ci-dessous).
- **Fiche praticien** : seule exception, elle affiche le résultat annulé,
  marqué « annulé », avec son motif, son auteur et sa date.
- **Mauvais dossier** : la valeur reste lisible dans le dossier qui l'a reçue,
  côté praticien seul, marquée annulée ; jamais côté patient. La `D-xxx` le
  dit.

## Hors périmètre

`serieParAnalyte` et le jour n (BP-03), les réveils d'attente typée (BP-04) :
ils n'existent pas encore et naîtront en excluant l'annulation. Le passage à
« à relire » d'un constat (cadrage v3, ligne « Réaction ») : il naît avec
BP-11. Toute qualification de valeur.

## Fichiers probables

**PR 1 — migration seule**
- `web/prisma/schema.prisma` (modèle neuf)
- `web/prisma/migrations/<horodatage>_annulations_resultats_biologiques_v1/migration.sql`
- `web/prisma/checks/annulations_resultats_biologiques_v1_negatif.sql` (neuf)
- `docs/DOSSIER_RGPD.md` (traitement : la table porte `id_patient`)
- `docs/DECISIONS.md` : `D-xxx` amendant `D-124` §3 (annulation en ajout
  seul, motifs, révocation, cible, mauvais dossier) ; elle dit que la
  condition « premier import » sort des préalables (plan, F03)
- Ajoutés à la livraison (`D-294`) : la garde anti-doublon par trigger et
  l'amendement du contrat `cb_resultats_biologiques_v1_negatif.sql` ; le banc
  `web/scripts/banc-annulations-resultats-deux-sessions.test.mjs` (CI et T3) ;
  `web/src/lib/patient/effacement.ts`, avancé de la PR 2 — le banc de
  complétude de l'effacement l'exige avec la table

**PR 2 — code consommateur, après release-db constatée**
- `web/src/lib/biology-library/filCorrection.ts` (élection de tête)
- `web/src/lib/biology-library/derniersResultats.ts`
- `web/src/lib/clinical/portesBiologiquesService.ts`
- `web/src/app/api/praticien/biologie/resultats/route.ts` (lecture, actes
  d'annulation et de révocation, refus de corriger un annulé)
- `web/src/app/api/praticien/biologie/resultats/bilan/route.ts` (contrôle de
  doublon)
- `web/src/lib/biology-library/import/decisions.ts` et
  `web/src/app/api/praticien/biologie/import/decisions/route.ts`
  (résultats existants avant validation)
- les commentaires qui disent encore « une racine par clé »
  (`filCorrection.ts`, routes de saisie) : faux depuis `D-294`
- `web/src/components/patient-cockpit/EstimeMesurePanel.tsx` (geste et
  marquage « annulé »)
- tests de chacun ; `scripts/wn-matrice-consommation.mjs` si la matrice change

## Interdits

- **Migration : confirmation distincte**, migration seule dans sa PR,
  `release-db` approuvée, sentinelle, constat par conteneur, puis le code
  (`D-087`, `D-266` §11).
- Passe Codex obligatoire sur la migration.
- Registre RGPD mis à jour avant la table.
- Effacement : vérifier, avant la release-db, que la clé étrangère de la table
  neuve ne bloque pas l'effacement nommé tant que la PR 2 n'est pas déployée.
  L'effacement étant livré avec la migration (`D-294` §7), le risque est
  l'inverse : entre le merge et la release-db, un effacement de dossier
  échoue sur la table absente (rien d'effacé) — approuver dans la foulée.
- Aucune lecture ni qualification de valeur ; aucun texte libre ; pas de
  donnée patient réelle dans le dépôt.

## Tests

- Contrat négatif SQL : UPDATE, TRUNCATE, DELETE hors effacement refusés ;
  motif hors liste refusé ; seconde annulation d'un fil non révoqué refusée ; révocation
  sans annulation ou double refusée ; dossier différent refusé ; date
  antidatée ignorée.
- Lecteurs : un fil annulé sort de la tête, des derniers résultats et des
  portes ; révoqué, il revient.
- Route : seul le praticien du dossier annule ; correction d'un annulé
  refusée (la base la refuse déjà depuis la PR 1 ; la route en donne le
  message).
- Palier T3 (migration).

## Critères de done

`release-db` constatée par conteneur ; résultat annulé exclu de l'élection et
des derniers résultats ; révocation constatée ; contrat négatif vert en CI ;
registre RGPD à jour.

## Dépendances

LOT-00 (BP-00). Release-db au rang 3 du plan, après celle de `D-281` lot 2
(constatée le 2026-10-13), avant l'essai de restauration (porte 8), qu'elle
n'attend pas.
