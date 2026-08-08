---
id: "LOT-01"
titre: "Dette 5 — une date de retrait réelle, et plus aucun lien vers le legacy"
statut: "à ouvrir"
dépend_de: "aucun"
---

# LOT-01 — Dette 5 : une date de retrait réelle, et plus aucun lien vers le legacy

## But

Petit et borné, comme la déclaration le dit. Deux gestes :

1. **Poser une date-cible de retrait** du parcours patient legacy. Le code porte
   `// PARCOURS INATTEIGNABLE — RETRAIT PRÉVU (LOT-04, 2026-08-05)` : **2026-08-05
   est la date de la décision, pas une échéance**. Le texte renvoie à « un lot
   nommé au prochain cadrage » et `web/next.config.mjs:34` à « une nouvelle
   mesure d'usage ». Aucune date-cible nulle part — c'est ce qui a fait cocher à
   tort le critère du LOT-04 (`LOT-04-validation.md:80`).
2. **Retirer le lien interne survivant** :
   `web/src/app/patient/[idAssignation]/page.tsx:191-192` porte encore
   `href={/patient/${encodeURIComponent(a.idAssignation)}}` (bouton « Ouvrir »).
   Vérifié présent au cadrage du 2026-08-08.

Correction mineure rattachée : les commentaires de
`web/src/lib/clinical/orientationEngine.ts:212` et
`orientationRulesV1.ts:229` déclarent encore **ouverts** `sum_decimal`,
`count_threshold` et `ecab` — fermés au LOT-03 de la campagne close (PR #583,
trois gates, 19 cas). Le dépôt contredit sa propre correction à deux endroits.

## Ce qui est déjà fait, et ne se refait pas

Le risque est fermé : redirection 307 (`permanent: false`, choisi contre le 308
pour ne pas graver un cache navigateur —
`web/next.config.mjs:30-41`) de `/patient/:idAssignation*` vers
`/portail/connexion`, plus le retrait du repli e-mail sur six routes
`api/patient/*`. **L'inatteignabilité repose sur `next.config.mjs:42-50`, pas sur
la page** : `page.tsx` (406 lignes) ne redirige pas, il rend toujours l'ancien
parcours entier. Le lot ne touche pas à ce choix.

## Hors périmètre

- **Supprimer le répertoire `web/src/app/patient/`.** Ce lot pose la date ; il ne
  l'exécute pas. Supprimer sans mesure d'usage est exactement ce que le LOT-04
  avait refusé de faire.
- Modifier la redirection ou son code HTTP.

## Preuve attendue

- Une **échéance** (date calendaire) dans le code et dans la doc, distincte de
  toute date de décision, avec la mesure d'usage à laquelle elle est adossée —
  ou l'aveu écrit qu'elle n'est adossée à rien.
- `grep` sur le dépôt : zéro `href` interne vers `/patient/`.
- E2E existants rejoués (T2) — la page reste rendue, seul le bouton disparaît.

## Question à trancher à l'ouverture

Quelle échéance, adossée à quoi ? C'est une **décision produit**, pas un choix
technique : à porter à l'utilisateur si aucune mesure d'usage n'existe.
