---
id: "LOT-03"
statut: "terminé (2026-08-22) — contrat prouvé par mutation les deux sens (vu rouge sur chaque assertion, vu vert sain et non-vacu) ; constat production : dix suspendus en base, aucun référencé par un pack actif"
dépend_de: "aucun"
---

# LOT-03 — Le garde-fou déjà cassé une fois devient un contrat

## But

À la fin de ce lot, le CI **refuse** qu'un pack actif référence un instrument
suspendu. Aujourd'hui, rien ne le vérifie : le prérequis a été cassé une
première fois le 2026-08-06 à 18h02 — `Q_ALI_09` entré au pack de base, auteur
indéterminé, aucune colonne d'audit — et réparé le 2026-08-07 à 15h46 **par
l'effet d'une écriture d'une autre campagne**. Par accident, pas par
mécanisme. La réserve est écrite à la clôture de
`2026-08-07-dettes-packs-residuelles` et n'a jamais eu de lot d'accueil.

## Résultat observable

Un pack actif référençant un qid suspendu fait **rougir le CI**, avec un motif
lisible qui nomme le pack et le qid.

## Ce que ce contrat n'est pas — à écrire en tête du fichier

`web/prisma/checks/packs_registre_coherence_v1.sql` existe déjà et porte un
**autre invariant** : la dérive entre `packs.qids` (legacy, `text[]`) et le
miroir relationnel `questionnaire_packs → pack_questionnaires`. Les deux
peuvent dire la même chose et être **tous deux faux** — un pack parfaitement
miroité peut référencer un instrument suspendu. Le contrat de ce lot en est le
**frère**, jamais le doublon, et son en-tête doit le dire pour que personne ne
le supprime un jour comme redondant.

## La source des suspendus — le piège à éviter

`IDS_SUSPENDUS` (`web/src/lib/questionnaires-catalog`) **dérive du champ
`actif` du catalogue** : c'est une vue TypeScript, pas une liste autonome. Le
contrat SQL doit donc s'appuyer sur **la base** — l'état de suspension tel
qu'il y vit — et jamais sur une liste de qids recopiée dans le `.sql`. Une
liste recopiée dérive en silence dès la première suspension suivante, et un
contrat qui dérive est pire qu'un contrat absent : il rassure.

## Périmètre

- `web/prisma/checks/packs_instruments_suspendus_v1.sql` (neuf), au patron de
  `packs_registre_coherence_v1.sql` — en-tête qui explique **pourquoi le
  fichier existe** et ce qu'il ne double pas, assertions conditionnées comme
  il faut, transaction annulée à la fin.
- `.github/workflows/ci.yml` — la ligne d'appel, au voisinage des autres
  contrats.

## Interdits

- **Aucune liste de qids en dur** dans le SQL.
- **Ne pas modifier** `packs_registre_coherence_v1.sql` ni le catalogue.
- **Aucun SQL destructif** — le contrat lit, éprouve dans une transaction, et
  annule.
- **Ne pas « réparer » un pack** si le contrat en trouve un fautif : le
  signaler est le travail du contrat, corriger est une décision.

## Dépendances

Aucune.

## Tests

- **Mutation obligatoire, avant de conclure quoi que ce soit** : insérer un
  pack actif référençant un qid suspendu doit faire rougir le contrat. Un
  contrat qu'on n'a pas vu échouer ne garde rien.
- Mutation symétrique : un pack actif dont tous les qids sont actifs passe.
- Palier **T3** (contrats SQL), puis vérification que le CI le joue vraiment.

## Critères de done

- [ ] Le contrat existe, son en-tête dit ce qu'il garde et ce qu'il ne double
      pas.
- [ ] Il s'appuie sur l'état de suspension **en base**, aucune liste recopiée.
- [ ] **Éprouvé par mutation** dans les deux sens — vu rouge, vu vert.
- [ ] La ligne d'appel est dans `ci.yml`, et le CI le joue réellement.
- [ ] T3 vert ; fragment `changelog.d/` écrit.
