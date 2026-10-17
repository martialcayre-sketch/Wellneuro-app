# Surface de relecture — SAF-EI-01 amendée, signature M-1 (2026-10-17)

Ce que le responsable a lu avant de déclarer « Je signe tel quel », en séance
du 2026-10-17, sur questions à options ([[D-195]] : la déclaration précède la
frappe). Rien d'autre n'est couvert par la signature.

## Ce que l'empreinte couvre

`SAFETY_EI_SHA256` = `dafccdf0368e53aafdd5910568f5aaefe8b95b348bb710a79928b7a27218e9bb`,
calculée sur la conduite et les trois textes patient ci-dessous, et sur rien
d'autre. Les statuts ouverts en sont sortis le 2026-10-17 (D-281 §5, t27).

### La conduite, lue en séance

> Effet indésirable que le patient associe à un élément de son programme, ou
> sans pouvoir le préciser : l'élément désigné, ou ses compléments, est en
> pause, et aucun programme ne se diffuse pour ce dossier avant l'avis du
> praticien. Impliqué : l'élément ne repart ni à l'identique ni augmenté. Non
> impliqué : la pause est levée. Le statut ne lève rien.

### Les trois textes patient, déjà signés (D-281 §4)

- Élément désigné, signé le 2026-10-12 : « Vous nous avez signalé un effet que
  vous associez à cet élément. Il est en pause en attendant l'avis de votre
  praticien : ne le reprenez pas avant sa réponse. Le reste de votre programme
  continue. »
- Compléments en attente, signé le 2026-10-12 : « Vous nous avez signalé un
  effet sans pouvoir l'associer à un élément précis. Vos compléments sont en
  pause en attendant l'avis de votre praticien : ne les reprenez pas avant sa
  réponse. Votre alimentation et vos routines continuent. »
- Avis rendu, élément impliqué, signé le 2026-10-14 : « Votre praticien a
  examiné votre signalement : cet élément reste en pause. Ne le reprenez pas ;
  votre programme va être adapté. »

## Ce que la signature engage, lu en séance

1. Toute diffusion du dossier est bloquée, quelles que soient la version, la
   priorité ou la gravité déclarée.
2. La gravité déclarée n'entre pas dans la règle : elle ne règle que le message
   au patient.
3. Un signalement non rattaché au programme n'interrompt rien et ne figure pas
   sur la carte (t27).

## Les champs posés

- `version` : `safety-effet-indesirable-nnpp2-v2` (nouvelle version, D-281 §6).
- `dateValidation` : `2026-10-17T00:00:00.000Z`.
- `sourceReference` : « Constitution clinique DC-42 ; arbitrage du praticien
  consigné en D-281 du 2026-10-12 » (texte de D-281 §6).
- `shaPerimetre` : l'empreinte ci-dessus, recopiée mécaniquement.

## Les trois arbitrages rendus avec la signature

- **Programmes servis** : au déploiement, la règle passe de « candidate » à
  « validée ». L'empreinte des cartes change, et les programmes approuvés
  deviennent « indisponibles » au portail ; trois dossiers étaient concernés
  au relevé du 2026-10-17 (agrégats, lecture seule par conteneur). Effet
  accepté : le praticien prépare et diffuse une nouvelle version pour chacun
  aussitôt après le déploiement. Écartés : rediffuser plus tard ; un lot de
  code préalable qui retarde M-1. (La conséquence pour un dossier à l'avis
  « impliqué » a été relevée par la revue après la déclaration : elle est
  consignée en D-281 §6 a, pas dans cette surface.)
- **Q3 de t25** (programme lisible dont aucun élément n'est désignable :
  orientations ou prises de sang seules) : signature avec ce cas différé. Un
  tel programme n'a pas de complément à maintenir en pause.
- **Accès « Signaler un problème »** : signature sans attendre ; la visibilité
  du bandeau va dans un lot UI à part.

## État constaté avant le déploiement (agrégats, 2026-10-17)

Un seul signalement en base, rattaché à la dernière version de son dossier,
avec un avis « impliqué » rendu. Aucun dossier n'attend d'avis : la signature
ne bloque aucune diffusion. Drapeau `WN_EI_INTERRUPTION=1` en production.
