# Handoff — 2026-09-19 — Le régime alimentaire devient une porte (D-232)

## 1. Branche et état Git

- Branche `wn-declencheur-etat-population-2026-09-19`, partie de `origin/main` à
  `1351456d` (#1194, `D-231`). Worktree `phases-hash-2026-09-16`.

## 2. Objectif de la session

Le dernier des cinq chantiers que `D-216` laisse devant l'attestation du
catalogue d'assiettes : **la porte du régime alimentaire**, dont la méthylation
dépend. Arbitrage du responsable : lire l'`EtatPopulation`, **pas** faire du champ
un drapeau.

## 3. Décisions prises

- **`D-232`**, sur **arbitrage du responsable**.
- **Pas un drapeau** : le champ vit dans la section « État actuel », réservée aux
  états de population (`D-101`), et a **déjà** un lecteur. Une onzième clé de
  `DrapeauxAnamnese` lui aurait donné deux lecteurs de formes différentes.
- **Un seul critère des sept** : les six autres sont des critères d'EXCLUSION ;
  en faire des portes d'indication retournerait leur sens.
- **`inconnu` n'allume rien, et ne s'écrit pas** — le garde de forme le refuse.
- **`ContexteDossier` remplace le paramètre positionnel de `D-231`** : le motif de
  celui-ci visait l'optionalité, que l'objet satisfait aussi ; ce qu'il ne
  supportait pas est le nombre.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** la dette de `D-229` §5 — et **pas** par le correctif qu'elle
  annonçait, qui reposait sur une prémisse fausse, corrigée au registre avant
  d'écrire.
- **Ferme les cinq chantiers de `D-216`.** Ce qui reste devant les lignes n'est
  plus mécanique : c'est clinique.
- **N'atteint pas** : aucune règle ne porte cette porte, la table des indications
  reste **VIDE**, verrou **ÉTEINT**. La gate de population est **inchangée** —
  elle lit le même objet, pour écarter. Aucune migration, aucun drapeau, aucun
  écran.

## 5. Fichiers modifiés

**Neufs** — le fragment `changelog.d/` du jour · ce handoff.

**Modifiés** — `orientationRulesV1.ts` (variante `exclusionAlimentaire`) ·
`orientationEngine.ts` (`ContexteDossier`, évaluation, entrée) ·
`orientationService.ts` (lecture de l'état de population) ·
`indicationsAssiettesV1.ts` (garde de forme, chapeau) · quatre bancs ·
`docs/DECISIONS.md` · la surface de relecture · `FILE_ATTENTE.md` ·
`docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **T1** vert (404 tests, anti-secrets OK). **Bancs cliniques** : 732 tests.
- **Le banc de la variante** éprouve les valeurs citées et non citées, `inconnu`,
  l'état non lu, l'absence d'instrument, et **l'indépendance des deux portes du
  contexte** — un âge inconnu n'empêche pas une porte alimentaire.
- **LE CÂBLAGE EST GARDÉ DÈS L'ÉCRITURE**, sans attendre la revue : anamnèse →
  `lireEtatPopulation` → moteur, avec trois contre-épreuves (aucune anamnèse,
  anamnèse sans le champ, régime autre). **Muté** : retirer `etatPopulation` de
  l'appel fait rougir le cas de câblage, **seul**. Service restauré identique,
  vérifié par `diff`. C'est la leçon de la revue de `D-231`.
- **T2 `--fast`** : voir le commentaire de PR, rapporté tel quel.

## 7. Problèmes ouverts

- **Plus aucun chantier mécanique devant les lignes.** Ce qui reste est
  d'écrire les lignes d'indication, claim par claim, puis de les faire attester.
- **Le jour où une règle d'orientation portera cette porte**, vérifier que son
  appelant fournit `etatPopulation` — même piège que pour l'âge, même banc.
- **Numéro `D-232` à vérifier au merge.**

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot aux TROIS emplacements avant de
   merger**, puis merger avec `--subject` portant le bon `D-NNN`.
2. Ensuite **les lignes d'indication** : les écrire depuis la surface de
   relecture, en relisant chaque claim sur pièce — la table est prête, le
   catalogue est prêt, les portes sont prêtes.
3. Puis l'attestation, qui ne se pose jamais par l'outil : surface, demande,
   transcription.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée.
- **Aucun seuil ni critère inventé** : une porte sans claim qui la fonde reste
  interdite, et aucun banc ne peut le dire — seule la relecture le voit.
- Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
