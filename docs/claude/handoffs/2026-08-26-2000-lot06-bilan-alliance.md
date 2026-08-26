# LOT-06 — le bilan de l'alliance, et ce qu'il refuse de conclure (`D-112`)

**Date** : 2026-08-26 · **Campagne** : Alliance 6.0-B — l'objectif à trois voix
**Branche** : `docs/lot06-bilan-consolidation` · **Décision** : `D-112`

## Le fait qui commande tout

**Les neuf tables de la campagne portent zéro ligne en production.** L'appareil
est complet, déployé, appliqué — et n'a jamais servi. Constaté le 2026-08-26 par
conteneur one-off, identifiants seuls.

Et un fait plus large : **zéro épisode `T0` confirmé** sur 21 dossiers et 15
consultations validées. Aucun cycle n'est ancré en production.

## Ce que le lot a REFUSÉ de faire, et pourquoi

**Il n'a pas préparé le dossier de signature du classement.** La fiche
l'autorisait « si le matériau le justifie » ; il n'existe pas. Signer un
classement certifie la provenance d'un ORDRE de présentation — zéro
présentation, zéro reprise, zéro écart motivé, donc rien à certifier. Le rédiger
aurait produit un document qui **suppose** un comportement au lieu de le
documenter : la fabrication de provenance que toute la campagne s'interdit
(`DC-19`).

C'est la décision la plus importante du lot, et elle est écrite comme telle.

## `D-093` : où en sont ses deux conditions

- **(a) une réponse patient réelle** → non constatée, et la cause est en amont :
  aucun objectif n'existe à ratifier. La précondition que `D-093` nommait
  lui-même — « le praticien doit rédiger un objectif sur au moins un des
  trois » — n'est pas levée, trois jours après.
- **(b) un bilan sur le comportement du classement** → **non productible**, pas
  seulement « non atteint ». Le moteur est éteint (`WN_OBJECTIF_PROPOSE`
  absent). La nuance compte : « pas encore » invite à attendre, « impossible en
  l'état » désigne un geste manquant.

**Borne : 2026-10-04.** À son terme, sans les deux conditions, le périmètre se
referme — il ne s'étend pas par défaut (`DC-24`).

## Le geste unique qui débloque la suite

Qu'un objectif négocié soit **rédigé** sur l'un des trois dossiers du périmètre
`D-093`. Les trois surfaces patient sont déjà ouvertes en production
(`WN_DOSSIER_DEUX_VOIX` posé). La réponse d'étape du LOT-05 demande **en plus**
un `T0` confirmé.

## Ce qui reste, et à qui

1. **Passe Codex du LOT-05** (classe P0) — geste du responsable.
2. **Contre-revue adverse de campagne**, sous forme d'affirmations à réfuter,
   **avant** la clôture — jamais après.
3. **Arbitrages du responsable** : rédiger un objectif sur un dossier du
   périmètre ; poser ou non `WN_OBJECTIF_PROPOSE` ; trancher le comportement
   multi-cycle du LOT-05 (confirmer un nouveau `T0` ferme une fenêtre d'étape
   ouverte — un patient à J85 perdrait sa question J90).
4. **Avant le 2026-10-04** : reprendre le bilan avec les constats de la fenêtre.

## Dette de lecture nommée

`scalingo env-get` rend `An error occurred:` aussi bien pour une variable absente
que pour un incident d'API — indiscernables. C'est cette ambiguïté qui a fait
accuser à tort le drapeau `WN_MIGRATIONS_PAR_RELEASE_DB` au premier run
`release-db` du LOT-05. Toute garde lisant une variable d'app doit distinguer les
deux cas, ou dire qu'elle ne le peut pas.
