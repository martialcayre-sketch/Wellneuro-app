# Handoff — 2026-11-11 — BP-17, PR 3 : structure par références de la bibliothèque des options

## Branche et état Git

- Branche `feat/bp17-structure`, worktree `bp17-structure`, créée depuis
  `origin/main` (`68293eb1`, #1999), puis remise à niveau par merge de main
  (`32ab280b`, #2000, puis `f326f782`, #1998 et #2002).
- PR ordinaire de la file C : déclarée « prête @<sha> », mergée par
  l'intégrateur (D-373, D-454). Ni migration ni `schema.prisma`.

## Objectif

Livrer la première couche de D-480 §3 : la structure de références de la
bibliothèque des options, son format, sa signature à cinq termes et
l'empreinte des fiches d'usage, avec la structure du besoin 2 vide et non
signée.

## Décisions prises

Choix de forme de la session, tous dans le cadre de D-480 et du découpage
accepté (`20261111-1131-c`). Aucun ne touche au clinique.
- **Emplacement** : `web/src/lib/bibliotheque-options/`, hors de `clinical/`,
  sur le patron de `fiches-usage/`. Le module est distinct des fiches d'usage
  et du catalogue des conduites. Il importe la structure signée des fiches
  d'usage pour la clé et la population, et ne la modifie pas.
- **Identifiant d'option** : `^OPT_[A-Z0-9_]+$`, au plus 128 caractères. Il
  est donc conforme au CHECK `option_id ~ '^\S+$'` de la PR 2. Il est opaque.
  Pour qu'il ne soit jamais réattribué, la structure tient une liste
  `optionsRetirees` : une option qui y figure est incohérente.
- **Renvois** : chaînes `WN-CL-NNNN-NNN@vN.M` (le `v` est exigé, comme pour
  les claims épinglés), `WN-PE-NNNN@vN.M`, ou `information_manquante`. Cette
  dernière vaut pour la dose seulement, et seule dans sa rubrique.
- **Population** : une liste non vide de `POP_…` déclarés par la structure
  des fiches d'usage. Une option peut couvrir plusieurs populations. Une
  liste d'un élément reproduit le cas d'une fiche.
- **Rubriques** : les neuf de la migration, toutes présentes et aucune
  autre. Une liste de renvois vide signifie « non documentée » : ce que cela
  emporte relève de la PR 4.
- **Empreinte des fiches d'usage** : `shaFichesUsage` est inscrit aux
  métadonnées, recopié à la signature. Il n'entre pas dans les cinq termes :
  `etatBibliotheque()` rend `signee`, `a_relire` (fiches d'usage re-signées
  ou plus signées) ou `non_signee`.
- **Garde § 8** : banc `importeurs.guard.test.ts`, avec une liste de lecteurs
  admis vide. La PR 5 (atelier) et la PR 6 (cockpit) y ajouteront leur
  fichier, nommément.
- **Aucune option sans précautions (D-480 §5.1) entre dans cette PR**, sur
  l'arbitrage du responsable du 2026-11-12. CodeRabbit avait classé P0 son
  absence. Une option dont la rubrique `precautions` n'a aucun renvoi rend la
  structure incohérente (code `<option>:precautions`). La PR 4 garde les
  autres contrôles de §5 : deux tables au contrat de fraîcheur, contrat des
  positions citées, aucune lecture de dossier, hook DC-17, matrice de
  consommation.
- **Prédicat à consommer** (PR 5 et 6) : `etatBibliotheque(...) === 'signee'`,
  jamais `bibliothequeSignee` seul, qui ne vérifie pas que les fiches d'usage
  sont signées. C'est écrit en tête du module.
- Le verrou est ajouté au tableau `ETAT_VERROUS_SIGNATURE` et au balayage de
  `verrousSignatureDocumentes.guard.test.ts`. Sans cela, une signature
  future passerait sans que le tableau le dise.

## Fichiers modifiés

- `web/src/lib/bibliotheque-options/vocabulaire.ts` (pur),
  `bibliothequeBesoin2V1.ts`, et leurs bancs `vocabulaire.test.ts`,
  `bibliothequeBesoin2V1.test.ts`, `importeurs.guard.test.ts`.
- `web/src/lib/verrousSignatureDocumentes.guard.test.ts` : une racine
  balayée de plus.
- `docs/FEATURE_FLAGS.md` : une ligne au tableau des verrous (`false`,
  `null`).
- `changelog.d/2026-11-11-bp17-structure-bibliotheque.md`, fragment F11
  `2026-11-11-05-structure-bibliotheque-references.md`, ce handoff.

## Validations exécutées

- Bancs ciblés (module, verrous, garde « aucune phrase ») : 35 tests verts.
- T1 rapide : code 0. T1 complet (`npm run check`) : code 0.
- T3 `test:worktree`, joué sur la branche avant les merges de main : séquence
  complète verte en 11 min 35 s, code 0. Vitest : 16 856 tests réussis. E2E :
  360 réussis. Dérive schéma ↔ migrations : « No difference detected ».
  Main a ensuite apporté #2000, #1998 et #2002, sans fichier commun avec ce
  lot : le CI de la PR rejoue la séquence sur l'arbre fusionné.
- CI de #2006 sur `14c01b9e` : `wn-attendre-ci` à 0. Revue CodeRabbit
  déclenchée à la main (dépôt à moins de 10 étoiles), six remarques, verdicts
  dans la PR. Corrigés : la signature calcule l'empreinte et la cohérence
  sur la structure jugée (plus de paramètres séparés) ; le helper
  `balayageSources` balaie `.js`/`.jsx` et lit `require()` (aucun fichier ni
  appel de ce type en production : les 155 bancs de garde restent verts) ;
  le texte « à relire » est précisé (empreinte des fiches d'usage). Routés :
  « aucune option sans précautions » à la PR 4 ; forme de renvoi du registre
  des compléments, avant la transcription de la PR 7.
- Tête `58a2d1a3` : CodeRabbit à quota épuisé (une revue par heure),
  Copilot à quota épuisé (`--quota` à 1). PR-Agent est prouvé
  (`wn-revue-pr-agent` à 0) et pointe trois zones d'attention. Corrigées :
  une rubrique dont la valeur n'est pas une liste ferme le verrou ;
  `etatBibliotheque(metadata, structure, fichesUsage, fichesUsageMetadata)`
  calcule lui-même les deux signatures et l'empreinte. Écartée avec motif :
  le changement du helper partagé (155 bancs de garde verts, aucun `.js` ni
  `require()` en production).
- `wn-reviewer` (P0) sur `8bfacc95` : GO, avec 20 mutations jouées hors dépôt.
  Corrigé ensuite :
  - mutations survivantes, chacune avec son banc : fiches d'usage
    incohérentes, format des identifiants retirés, besoin 0, -1 et 2.5,
    `OPT_a` et `OPT_É`, bornes des versions de position (désormais dérivées
    de `positions-expert/vocabulaire.ts`) ;
  - banc §8 : il voit aussi un gabarit à accents graves ;
  - `estUnTest` aligné sur `.js` et `.jsx` ;
  - propriétés en trop refusées (`cles`) ;
  - commentaire §5.4 rectifié.

  Bancs de garde et `bio-parcours` : 158 fichiers verts, 2 980 tests.

## Problèmes ouverts

- **Deux sources de dose de D-480 §4 sans forme de renvoi** : le registre
  des compléments et les référentiels externes ingérés. Un référentiel
  ingéré l'est en claims (cas de WN-SRC-0652), qui se citent déjà. Le
  registre des compléments n'a pas de forme. L'ajouter change le format,
  sans migration ; la question est à poser à la PR 4 ou à la transcription
  de la PR 7, quand un contenu du responsable en aura besoin.
- **« Déclarée manquante » hors de la dose** : D-480 §5.2 dit qu'une
  métadonnée de DC-11 absente « ou déclarée manquante » rend l'option non
  exécutable. Le format n'admet `information_manquante` que pour la dose
  (§4, consigne du lot). Pour les autres rubriques, une liste vide tient lieu
  de « non documentée ». À trancher à la PR 4, qui juge l'exécutabilité.
- **Passe Codex** : la politique de revue la rend obligatoire pour un module
  clinique signé de la campagne BIO-PARCOURS (bibliothèque d'options). C'est
  un geste manuel du responsable (`$wellneuro-pr-review`). La PR n'est
  déclarée « prête » qu'après son verdict.
- Une re-signature des fiches d'usage qui RETIRE une hypothèse citée fait
  passer l'état à `non_signee` (structure incohérente), et non à `a_relire`.
  Ce sens est sûr, mais l'affichage du cockpit (PR 6) devra le distinguer
  (`wn-reviewer`, constat 4).
- Le chemin du module n'est pas encore sous le hook DC-17, au contrat de
  fraîcheur, à la matrice de consommation ni aux chemins de `release-db.yml` :
  c'est la PR 4. Tant que la structure est vide, rien n'en dépend.

## Prochaine action exacte

#2006 : CI de la tête, revue sur la tête (CodeRabbit dès que son quota
revient, sinon PR-Agent prouvé), passe Codex du responsable. Chaque remarque
reçoit son verdict, puis la PR est déclarée « prête @<sha> ».
L'intégrateur merge. La PR 4 (contrôles et garde) suit dans une nouvelle
session, puis la PR 5 (atelier), qui dépend de cette PR et de la PR 2,
constatée.

## Interdits encore actifs

- Aucune migration, aucune modification de `schema.prisma`. Aucune lecture
  ni écriture des tables de la PR 2 avant la PR 5.
- Aucune option, dose, durée, précaution, contre-indication, interaction ni
  libellé rédigé par une session (porte 23, DC-11) ; fixtures neutres
  seulement.
- Aucune signature : c'est le geste du responsable, à la PR 7.
- Aucun lecteur de `creePar` / `validePar` (D-459 §7). Aucun lecteur de la
  bibliothèque hors des bancs, de l'atelier et du cockpit (§8).
- Ne pas reposer D-480, ses trois points de forme ni le découpage ; ni les
  arbitrages BP-17, D-477, BP-14, D-459, F78 ou BP-12b.
- Production en lecture seule, par conteneur, en agrégats.
