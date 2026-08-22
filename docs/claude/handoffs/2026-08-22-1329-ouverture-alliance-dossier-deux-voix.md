# 2026-08-22 13:29 — Ouverture Alliance 6.0-A : le dossier à deux voix

## Ce qui a changé

- **La campagne `2026-08-21-alliance-dossier-deux-voix` est OUVERTE en
  primaire** (geste du responsable, `/wn-campaign alliance 6`) : CAMPAGNE.md
  et **six lots** écrits sur état réel re-mesuré du 2026-08-22 ; état,
  ACTIVE_CAMPAIGN et FILE_ATTENTE resynchronisés (`activate`, `next_action`
  tracé) ; fragment `changelog.d/` posé.
- Le cadrage corrige le brief (4 lots esquissés) sur trois mesures :
  1. le patron pour **tout texte patient** est
     `correspondance/registreGabarits.ts` (Socle LOT-03) — ajout AU REGISTRE
     avec déclaration de conformité, jamais inline ; le patron trust n'a ni
     deux dates ni hash-chain, « chaîné » s'entend par référence ;
  2. le cycle `brouillon → grille_a_relire → valide` existe sur
     `CabinetInstrument` (`schema.prisma:1450`) — **LOT-05 (EVA) est
     indépendant de la migration** et jouable en parallèle ;
  3. l'ancrage de l'objectif négocié a deux sources existantes : anamnèse
     `motif_principal`/`attentes` (`anamnese.ts:44,66`, colonne
     `anamnese Json?` — `schema.prisma:96`) + plainte dominante Q_MOD_03 au
     cockpit (`chaineC1.ts:172`, `D-054`) — matériau à afficher, jamais à
     réécrire.

## À savoir pour la suite

- **LOT-01 = migration, CONFIRMATION OBLIGATOIRE** : proposer le schéma
  (append-only par référence, deux dates, RLS d'office, aucun champ de
  score), **s'arrêter**, attendre l'accord ; migration seule dans sa PR,
  `release-db` avant tout code (LOT-02/03/04 gatés dessus).
- **Gate de campagne** : la ratification patient (LOT-06) précède toute
  activation élargie protocole→produits — l'activation elle-même reste un
  geste du responsable, hors campagne.
- LOT-04 et LOT-06 derrière le circuit du Socle : gabarits au registre,
  chemin neuf inscrit à la carte de couverture avec banc de débranchement.
- Arbitrages responsables pendants, hérités du Socle (inchangés) :
  `valideLe` des 8 gabarits, régimes de garde, candidats du hook, vestige
  `WN_ALLOW_RISKY_COMMAND`.

## Ouvert

- PR d'ouverture (docs seules) : CI à attendre, merge = Copilot ou go.
- Session parallèle : travail synthèse non commité toujours dans l'arbre
  (`web/src/app/api/praticien/synthese/` — non touché, non commité ici).
