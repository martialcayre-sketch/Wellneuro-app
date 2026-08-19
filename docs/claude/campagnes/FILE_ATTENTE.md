# File d'attente des campagnes — hiérarchie du 2026-08-18

Arbitrée en session le 2026-08-18, à la clôture de la chaîne T0 (10/10 lots).
Cinq dossiers initialisés en `--init-only` : le cadrage complet (CAMPAGNE.md,
lots) s'écrit au moment d'ouvrir chaque campagne, avec un état réel frais —
jamais d'avance. Ce fichier porte l'ordre et sa raison ; il se met à jour à
chaque ouverture ou réarbitrage.

## L'ordre, et pourquoi

| Rang | Campagne | Dossier | Raison du rang |
|---|---|---|---|
| 1 | Échéance HDS — G-TRUST-04 | `2026-08-18-echeance-hds-g-trust-04/` | Seule échéance qui avance sans nous : dérogation expire le 2026-10-21, gate + dossier RGPD reprennent la règle le même jour. |
| 2 | Biologie consolidée | `2026-08-18-biologie-consolidee/` | Ferme les trois dettes nommées d'une surface VIVANTE en production (ancrage écriture seule, zéro E2E, garde-fou packs non contractualisé). Courte, sans migration. |
| 3 | Doctrine exécutable | `2026-08-18-doctrine-executable/` | Cinq véhicules déjà ordonnés par l'audit du 2026-08-11 ; V3 porte le coût de report « le plus élevé de tout l'audit ». V2 est une migration (release-db entre V2 et V3). |
| 4 | Curation signée | `2026-08-18-curation-signee/` | **En parallèle continu, pas en séquence** : cadence praticien (claim par claim), aucune dépendance technique. NABM, liens biomarqueur↔besoin, vérification par fiche, question D-062. |
| 5 | Nutrition référentielle (R1→R3) | `2026-08-18-nutrition-referentielle/` | Arc produit choisi par arbitrage utilisateur du 2026-08-18 (préféré à l'arc espace patient, différé sans être écarté). Premier lot = arbitrages de recouvrement avec le rayon C4. |

## Ce qui n'est PAS en file — des gestes, pas des campagnes

- **Relancer le recueil 21 jours** du carnet alimentaire (pilote PAT006) :
  seul débloqueur des campagnes existantes `2026-08-04-agenda-alimentaire`
  (LOT-06 barème) et `2026-08-10-chaine-alimentaire` (LOT-02/03) — elles
  reprennent, elles ne se recréent pas.
- **Orientation NNPP2 — FAIT, plus rien à signer ni à poser** : les trois
  tables sont signées depuis les 2026-08-15/16 (`D-061`, `D-062`, `D-067`,
  frein structurel `D-065`), les deux drapeaux sont posés, et l'activation
  est CONSTATÉE en production — par le comportement (`D-074`, 2026-08-18 :
  le panneau sert des recommandations, seule preuve valable puisque la
  variable est sensitive et que les E2E arment le même drapeau sur la même
  base), puis valeur `'1'` confirmée au panneau le 2026-08-19. Reste la
  dette d'interface nommée par `D-074` §4 : `MESSAGE_ORIENTATION_INACTIVE`
  périmé (ne s'affiche plus en production, correction = autre finalité).
- **Constater** la proposition de bilan sur un vrai dossier (preuve terminale
  de la chaîne T0).
- **Trancher les arbitrages pendants** : `complements-clean-label-v1`
  (« remplacée ? »), dégel JA5-05, sort de `2026-08-02-rayon-biologie-cb`
  (recouverte par le LOT-06 de la chaîne T0), worktree
  `arbitrage-boucle-clinique`.

## Écarté à cet arbitrage — et pourquoi

- **Arc espace patient (E3→E2→E4)** : différé, pas écarté — l'arc nutrition
  lui a été préféré ; les deux convergent au dashboard E4, en mener deux de
  front éparpillerait. IDP2 (LOT-04, jeton permanent) reste de toute façon
  bloqué par une mesure d'usage (12/13 accès sans nouveau chemin).
- **E8 / résultats biologiques réels et D5 / messagerie** : derrière le gate
  HDS — la campagne de rang 1 est leur préalable, pas leur début.
- **Programme corpus (gates G0-G4, pilote sommeil)** : G6 jamais ouvert ;
  aucune campagne tant que l'extraction du stock n'est pas faite.
