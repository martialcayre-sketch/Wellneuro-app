---
id: "LOT-00"
titre: "BP-00 — Décision-cadre D-266, ouverture de la campagne"
statut: "terminé (2026-10-04, D-266 acceptée)"
dépend_de: "—"
---

# LOT-00 (BP-00) — Décision-cadre D-266, ouverture de la campagne

## But

Rendre le programme exécutable avant tout lot : arbitrages consignés,
frontières et doctrine amendées, campagne ouverte, BIO-INGEST réaligné.

## Résultat observable

- `D-266` est au registre.
- Le cadrage v3.1 est versé au dépôt ; il remplace le v1.
- La campagne est active en parallèle dans `.wn/state.json`, avec ses fiches
  de phase 0.
- BIO-INGEST porte LOT-07 ; BP-10 y est une précondition de LOT-04.
- `FILE_ATTENTE.md` est réaligné.

## Périmètre

- `docs/DECISIONS.md`, `CONSTITUTION_CLINIQUE.md`, `REGISTRE_FRONTIERES.md`.
- `ROADMAP_PRODUIT.md`, `POLITIQUE_REVUE.md`,
  `.claude/rules/pr-revue-et-release-db.md`.
- Les cadrages BIO-PARCOURS (v1 et v3.1) et BIO-INGEST, ce dossier de
  campagne, `FILE_ATTENTE.md`, l'état et sa vue, un fragment `changelog.d/`.

## Hors périmètre

Tout code applicatif, toute migration, tout texte TRUST servi, toute valeur
clinique.

## Fichiers probables

- `docs/DECISIONS.md`
- `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`
- `docs/claude/campagnes/`

## Interdits

- Aucune règle clinique, aucun seuil, aucune dose inventés ; aucun texte
  clinique dans le dépôt public (`D-251` §4).
- Aucun article du RGPD choisi à la place du responsable ; `D-234` intacte.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

`D-265` (préalable hors campagne, mergée).

## Étapes

- [x] Verser la v3.1 (identifiants seulement) ; bandeau sur le v1.
- [x] Rédiger `D-266` et amender doctrine, frontières, feuille de route,
      politique de revue et règle `release-db`.
- [x] Ouvrir la campagne, écrire les fiches de phase 0, amender BIO-INGEST et
      la file d'attente.
- [x] T1 complet, revue `wn-reviewer` (aucun P0, six P1 corrigés).
- [x] Passe Codex (décision de frontière), geste de l'utilisateur : première
      passe BLOQUER (deux P0 : contenu clinique au cadrage versé, DC-20/DC-47
      dites armées), corrigés avec réécriture de l'historique de la branche ;
      passe de correction ACCEPTER sur `f11d2d56`.
- [x] Statut de `D-266` passé à « accepté » sur confirmation du responsable.

## Tests

T1 complet : audit des campagnes, numérotation des décisions, anti-secrets.

## Critères de done

`D-266` acceptée ; T1 vert ; verdicts Codex rendus ; LOT-01 désigné lot
courant.

## Résultats

- `D-266` acceptée le 2026-10-04, après une revue `wn-reviewer` sans P0 :
  six P1 corrigés (portée de Codex bornée à la campagne, précondition BP-10
  dans la fiche BIO-INGEST LOT-04, DC-46 nommé sans exécution, DC-20 et DC-47
  « actées, banc dû », vocabulaire patient, statut).
- Huit orphelines reprises ; DC-45 reste orpheline (compte du marqueur : 5).
- Le cadrage v3.1 est versé sans contenu clinique : sorties d'adressage,
  médicaments interférents et attributions de claims sont renvoyés au Claude
  Doc.
- Écart avec le cadrage : la liste fermée du contexte DC-46 n'est pas arrêtée
  ici, mais par BP-05, faute de vocabulaire de catégories au dépôt.
