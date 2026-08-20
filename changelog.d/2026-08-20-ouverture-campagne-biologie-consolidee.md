### La campagne « Biologie consolidée » s'ouvre — et son cadrage a réduit deux dettes sur trois

- Campagne de rang 2 de `FILE_ATTENTE.md` cadrée et **activée en primaire** ;
  la campagne HDS passe en **parallèle** — elle garde son échéance du
  2026-10-21 dans `blocking_issues`, mais aucun de ses lots n'est pilotable
  (Scalingo, gestes ops, revue future) et l'activité primaire doit être celle
  où le travail a lieu.
- **Le cadrage a corrigé le brief, écrit avant vérification** : l'ancrage de
  `D-073` n'est **pas** « sans garde » — `c3_correspondance_ancrage_v1_negatif.sql`
  éprouve déjà que les CHECK mordent à l'écriture. Le manque réel est la
  **relecture**, et il est localisé à une constante :
  `correspondance-medecin/route.ts`, `SELECTION`, qui ne porte ni
  `ancrageSha256` ni `ancrageVersion`. De même,
  `packs_registre_coherence_v1.sql` existe mais garde un **autre** invariant
  (dérive legacy ↔ miroir) : le contrat du LOT-03 en est le frère, et son
  en-tête devra le dire pour que personne ne le supprime comme redondant.
- **Le point dur des E2E se dissout** : `fiche-trajectoire-peuplee.spec.ts`
  montre le patron qui peuple un patient **sans toucher au seed** —
  provisionnement en `beforeAll`, nettoyage chirurgical en `afterAll`, mode
  sériel. Modifier `seed.ts` aurait déplacé la capture pixel, les bancs de
  fiche et la garde de certification.
- **Trois lots** : le fil relit l'ancre et rend un verdict à **trois** états
  (`concordante`, `perimee`, et `sans_ancrage` qui n'est PAS une péremption —
  `DC-24`) ; un parcours Playwright de la surface proposition + courrier ; le
  contrat SQL « aucun pack actif ne référence un instrument suspendu », dont
  le prérequis avait été cassé le 2026-08-06 et réparé par accident.
- Aucune migration, aucune table signée touchée, aucun code applicatif : la
  PR est documentaire et d'état machine.
