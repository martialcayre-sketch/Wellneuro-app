# 2026-08-19 15:30 — La campagne HDS s'ouvre, réconciliée avec D-078

## Ce qui a changé

- **Campagne `2026-08-18-echeance-hds-g-trust-04` ACTIVÉE** — primaire,
  `en_cours (ouverte 2026-08-19)`, lot courant **LOT-01**, état machine et
  `ACTIVE_CAMPAIGN.md` synchronisés par `wn-campaign.mjs activate` + `sync`.
- **Réconciliation des lots avec `D-078`** (rendu dans #720 après l'écriture
  du cadrage qu'il transporte) :
  - LOT-01 : réduit à l'annexe HDS — l'arbitrage migrer/reconduire est rendu
    (migrer, sans attendre l'annexe) ; demande 2026-08-12 et relance
    2026-08-19 cochées sur preuve (checklist du gate, `D-078`).
  - LOT-02 : débloqué — l'ordre « (a) d'abord » de `D-006` est suspendu
    (`D-078` §4) ; restent, non négociables : confirmation obligatoire à
    chaque geste, décommissionnement interdit avant l'annexe signée, fenêtre
    bascule→signature moins couverte écrite en tête de lot.
  - LOT-04 : recentré sur la revue du **2026-10-21** — la levée par écart
    assumé est déjà consignée (checklist §« Décision du 2026-08-19 », qui
    prime sur son en-tête ; `D-078` ; `state.json`).
  - LOT-03 : intouché — l'information des personnes reste échue et devient
    plus exigeante avec `D-078`.
- `FILE_ATTENTE.md` : rang 1 ouverte ; geste « désarmer
  `WN_CB_RESULTS_ENABLED` » renversé par `D-078` (trace du relevé conservée).

## À savoir pour la suite

- **LOT-01 attend Scalingo** (annexe — relance partie le 2026-08-19). À
  réception : signer, archiver hors dépôt, consigner (rubrique 6 + §14).
- **LOT-03 est le lot actionnable sans dépendance externe** — et le plus
  pressant (échéance « au plus tôt », déjà échue).
- **LOT-02 ne démarre que sur confirmations explicites**, geste par geste ;
  le staging est validé au boot, pas en recette (3 items §A non cochés).
- Tension nommée, à traiter avec CB-09 : le commentaire du verrou
  `isCbResultsEnabled` (« jamais true avant l'attestation ») contredit
  `D-078`.

## Revue

`wn-reviewer` (Opus) : GO sous conditions — 1 bloquant (Done de campagne
réimposant l'ordre écarté), 6 majeurs, tous refermés dans la même passe. À
retenir : la case « demande d'annexe partie » est DÉCOCHÉE — sa preuve était
`D-078` lui-même (circulaire) ; **la référence du canal du 2026-08-12
(numéro de ticket ou courriel) est à consigner pour la cocher** — geste
praticien. Question de revue laissée ouverte : la fenêtre de moindre
couverture n'a pas de terme propre (borne de fait : la revue du 2026-10-21,
désormais écrite au LOT-02).

## Vérifié

- `wn-campaign.mjs status` : campagne primaire, `next` rend LOT-01
  réconcilié. `main` stable (`d99983d3`) au moment de l'ouverture.
- JSON de `state.json` valide ; audit campagnes 0 erreur (1 warning
  préexistant) ; cohérence d'état 24/24 ; anti-secrets vert ; T1 vert.
