### Agenda du sommeil : le compte de réveils devient exact — « 3 ou plus » ne masque plus la fragmentation (2026-08-22)

Demande explicite du praticien (2026-08-22, décision `D-091`) : recueillir
plusieurs réveils nocturnes. L'arbitrage retenu — débattu et tranché le même
jour — conserve la
doctrine du Consensus Sleep Diary : un **compte** et une **durée cumulée**,
jamais des horaires individuels. Horodater chaque réveil supposerait que le
patient regarde l'heure la nuit, exactement la conduite que l'instrument évite
(même raison que la latence en classes) ; le WASO continue de venir de la
durée cumulée déclarée.

Ce qui change réellement : le compte plafonnait à « 3 ou plus » — un patient à
six réveils par nuit était indiscernable d'un patient à trois, et la moyenne
`AGD_REV_MOY` était bornée à 3 par construction.

- **Contrat `agenda-sommeil-v3`** (`lib/agenda-sommeil/types.ts`) : le sens de
  `reveils.nombre` change — compte EXACT, borné par vraisemblance à
  `NB_REVEILS_MAX = 20` (chiffre technique, pas un seuil clinique). Sur une
  ligne v1/v2 déjà en base, un 3 reste un PLANCHER (« 3 ou plus ») et n'est
  jamais réinterprété — même doctrine que les classes d'éveil héritées. Le
  champ reste facultatif et hors de tout calcul structurel : l'indice /100 ne
  le voit qu'à travers l'efficacité, comme avant.
- **Formulaire patient** (`SaisieNuitForm.tsx`) : les puces « 1 / 2 / 3 ou
  plus » deviennent un compteur tactile − / + — toujours sans clavier.
  Décrémenter depuis 1 revient à « pas de réponse » : 0 reste réservé à la
  nuit continue, qui le pose d'elle-même ; les gardes de cohérence
  compte/durée sont inchangées.
- **Pseudo-item `AGD_REV_MOY`** (`questionnaires/sommeil.ts`) : borne
  déclarée 0..3 → 0..20, alignée sur le contrat. Métrique brute, hors indice —
  aucune cotation, aucun seuil, aucune interprétation modifiés.
