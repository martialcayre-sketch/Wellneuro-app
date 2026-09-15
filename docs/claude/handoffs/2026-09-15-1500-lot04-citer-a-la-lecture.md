# Handoff — 2026-09-15 — LOT-04 (2/2) : citer, et vérifier la citation à la lecture

Seconde et dernière PR du LOT-04. Elle referme l'étage 1 de la campagne — **citer** —
et clôt le septième lot sur huit.

## L'arbitrage a été reposé, parce que le premier était faux

`D-189` §1 écrivait « la provenance est **portée par la version** ». Cette phrase
avait été posée **par analogie** avec `objectifs_negocies`, dont la provenance vit
dans **neuf colonnes ajoutées par une migration**. `protocol_drafts` n'en a aucune, et
`ProtocolDraft` n'a aucun champ où la marque pourrait se poser. L'arbitrage rendu sur
cette base ne valait pas ; les trois voies ont été reposées **après vérification en
code**, et le responsable a tranché le **constat à la lecture**.

C'est le mécanisme même qu'il venait de retenir pour la vue patient du LOT-03 : pas
un pis-aller, le style de ce chemin.

## Branche et état Git

- Branche `lot04-citer-lecture`, rebasée sur `origin/main` à `2ef899c3` (LOT-03 2/2).

## Ce qui est livré

- **`lib/protocol/provenancePurpose.ts`** — pur, lisible des deux côtés : les trois
  marques, la **liste fermée** des sources, et la comparaison stricte au `trim` près.
- **`lib/praticien/teteObjectifCitable.ts`** — la lecture partagée, plutôt qu'une
  **troisième** copie de `SELECTION_OBJECTIF`. Zéro ou plusieurs têtes actives ⇒ rien
  de citable : deux têtes sont une discordance que le dépôt refuse de moyenner.
- **Le GET des versions** sert les sources citables et, sur la version active, la
  provenance **constatée** — jamais persistée.
- **Le constructeur** propose « Reprendre », recopie le texte tel quel, et affiche ce
  que la version active cite. Le clic ne transmet rien : c'est le **texte** qui fait
  foi, pas le geste.
- **Le marquage « votre patient la lit »**, reporté du LOT-03 et posé ici, sur le
  champ effectivement servi.

## Un défaut trouvé en chemin

**Une commodité emportait le chemin principal.** La lecture des sources est appelée
depuis le GET qui porte l'historique du protocole : une erreur de base y aurait fait
tomber toute la page pour un bouton « Reprendre ». Elle ne lève plus.

## Vérifications

- T1 vert. T2 rapide : **9 293 bancs unitaires verts**, 198 E2E verts, aucun rouge.
- **Mutation vue ROUGE** avant de déclarer vert : comparaison élargie à la casse et
  aux espaces internes → banc rouge ; restauration depuis une copie.
- Aucune migration, aucun drapeau, aucune identité patient.

## Ce qui reste, et ce qui bloque

- **LOT-06 — le barème de charge.** Le **mécanisme est écrit et ses bancs sont verts**
  (table signée à quatre termes, refus sur table vide, refus de la discordance), sur
  la branche locale `lot06-bareme-charge`, **non poussée**. Il **attend la première
  ligne signée du praticien** : je ne peux inventer ni seuil ni pondération
  (`DC-19`/`DC-20`), et la campagne a écrit qu'une table livrée vide se remplit à
  taux zéro.
- **LOT-07 — le bilan.** Sa mesure au conteneur sur dossiers réels a été **refusée par
  le classifieur de sécurité** de la session ; elle n'a pas été contournée.

Voir [[D-193]].
