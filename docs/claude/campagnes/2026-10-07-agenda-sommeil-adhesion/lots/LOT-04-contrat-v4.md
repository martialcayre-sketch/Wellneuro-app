---
id: "LOT-04"
titre: "Contrat v4 — « Je ne sais pas » et repère « essayé de dormir »"
statut: "terminé (2026-10-08, #1365) — recette sur appareil après merge, avant annonce"
dépend_de: "LOT-03"
---

# LOT-04 — Contrat v4 de l'agenda du sommeil

## But

Lever les deux ambiguïtés que l'interface seule ne pouvait pas lever, parce
qu'elles touchent à ce que l'instrument mesure : le repère du soir, et les
deux estimations que le patient n'a pas observées. Clinique : deux décisions,
[[D-271]] et [[D-272]], un contrat `agenda-sommeil-v4` commun.

## Arbitrages (2026-10-07 puis 2026-10-08, en session)

- Changements retenus : « Je ne sais pas » / nuit partielle, et repère
  « essayer de dormir ». Écartés : nuit blanche, J-2, durée configurable.
- « Je ne sais pas » : **endormissement et durée des réveils seulement**.
- Libellé : **« J'ai essayé de dormir »** (Consensus Sleep Diary), partout.
- Agendas en cours : **ils gardent leur contrat** — celui de leur première
  nuit.

## Résultat observable

- Un agenda neuf demande l'heure où le patient a essayé de dormir, et propose
  « Je ne sais pas » pour l'endormissement et pour la nuit. La nuit part.
- Un agenda commencé en v3 garde « J'ai éteint la lumière » et ne propose pas
  « Je ne sais pas » ; le serveur refuse `inconnu` sous v3.
- Côté praticien : « Ne sait pas » dans l'infobulle, aucune portion
  d'endormissement dessinée, latence médiane « sur N nuits », repère nommé
  selon le contrat.
- Agrégats : une réponse inconnue sort de chaque métrique qui en dépend,
  jamais un centre de classe ; chaque fréquence a son dénominateur
  (`AGD_NB_NUITS_LAT`, `AGD_NB_NUITS_FREQ_WASO`, `AGD_NB_NUITS_FREQ`).

## Risque de déploiement

**Pas de retour arrière du code** une fois une nuit `inconnu` écrite : la
lecture d'avant la v4 la refuse, et le GET portail, la vue praticien et la
clôture du patient tomberaient. Seule une correction en avant est possible.
Fenêtre résiduelle connue : un onglet ouvert avant le déploiement sur un
agenda encore vide envoie sa première nuit avec les mots v3 (« éteint la
lumière »), et le serveur la tamponne v4.

## Ce qui ne change pas

Seuils (7 et 14 nuits, 4 de week-end), bornes de classes, barème de l'indice,
fenêtre J / J-1, base (aucune migration : le contrat vit dans le JSON).

## Validation attendue

T1 complet ; suites de l'agenda (domaine, formulaire, route, vue praticien) ;
E2E `agenda-sommeil-saisie.spec.ts`, qui note désormais une nuit avec « Je ne
sais pas » ; relecture `wn-reviewer` (chemin clinique). T3 local impossible
depuis une session distante : le job CI `e2e` en tient lieu, à dire dans la
PR.
