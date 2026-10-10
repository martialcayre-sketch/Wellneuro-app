---
id: "LOT-09"
titre: "Le soir dans l’ordre vécu — le coucher d’abord"
statut: "terminé (2026-10-10, #1381) — lecture du 2026-10-29 : compter les deux textes du refus d’ordre"
dépend_de: "LOT-04"
---

# LOT-09 — Le soir dans l’ordre vécu

## Constat

Recette du responsable sur un téléphone Android, le 2026-10-10, sur un dossier
de test (observé sur un parcours réel, au sens de `D-125`). L’écran « Le soir »
demandait d’abord l’heure du repère — « J’ai éteint la lumière à » (v3), « J’ai
essayé de dormir à » (v4) —, puis « Par rapport à votre coucher… au même moment
/ plus tard », et seulement après « plus tard » « Je me suis mis·e au lit à ».
C’est l’inverse de la soirée vécue, et « coucher » et « mise au lit » nommaient
le même instant de deux façons.

## Arbitrage

Responsable, 2026-10-10, sur question fermée : « Couché d’abord ». Écartés :
demander les deux heures à chaque nuit (une liste de plus pour tous, alors que
la plupart éteignent en se couchant) ; ne demander que le coucher (le repère
des calculs changerait — décision `D-xxx` et contrat v5 —, et le temps passé
au lit avant de dormir redeviendrait du temps d’endormissement, l’erreur que
[[D-272]] a corrigée).

## Ce qui change

- L’écran du soir s’ouvre sur **« 🛏️ Je me suis couché·e à »**, puis **« Une
  fois couché·e, vous avez éteint la lumière… »** (v4 : « … vous avez essayé de
  dormir… ») [Au même moment] [Plus tard], puis, seulement « plus tard »,
  l’heure du repère, puis l’endormissement.
- « Couché·e » partout côté patient, y compris dans deux refus de validation
  (« … doit suivre l’heure du coucher. », « Indiquez l’heure à laquelle vous
  vous êtes couché·e. »).
- « Comme d’habitude » propose l’heure habituelle du **coucher** (médiane de la
  mise au lit, ou du repère quand il tombe au même instant).
- La question citée par [[D-272]] §2 se lit désormais « Une fois couché·e, vous
  avez essayé de dormir… » : même référence au coucher, même réponse, même
  champ. Précision datée ajoutée à D-272 ; aucune nouvelle décision, aucun
  contrat : la doctrine n'exige une `D-xxx` que pour la logique, les seuils
  ou le barème.
- Une nuit d'avant la mise au lit (v1, sans `extinctionImmediate`) corrigée ne
  préremplit plus le coucher : son heure est une extinction. Cas inatteignable
  aujourd'hui (seules la nuit du jour et la veille se corrigent), fermé quand
  même.

## Ce qui ne change pas

Les champs envoyés et leur sens : « au même moment », l’heure du coucher est le
repère (`heureCoucher`, `extinctionImmediate: true`) ; « plus tard », elle part
en `heureMiseAuLit` et le repère en `heureCoucher`
(`extinctionImmediate: false`). Contrats v3 et v4, validation serveur, seuils,
agrégats, barème, libellés praticien. Un agenda v3 garde ses mots dans le
nouvel ordre ([[D-272]] §3).

## Note pour la lecture du 2026-10-29

Le refus d’ordre du soir est journalisé avec son texte
(`PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_REJETEE`, `detail`) : « … doit suivre la
mise au lit. » avant le déploiement, « … doit suivre l’heure du coucher. »
après. Compter les deux formes.

## Validation

- Bancs unitaires du formulaire : ordre des contrôles dans la page, rangement
  des heures à l’envoi (« au même moment » et « plus tard »), correction d’une
  nuit « plus tard » relue et renvoyée à l’identique, liste de ce qui manque en
  v3 et v4 ; heure habituelle du coucher (`horairesHabituels`).
- Revue adverse en quatre angles (invariance des données envoyées, mots et
  accessibilité, tests, doctrine clinique) : dix constats, tous mineurs ; un
  seul sur les données envoyées, la correction d'une nuit v1, inatteignable
  et fermée. Retenus : le préremplissage v1, l'heure habituelle
  testée, la précision de D-272, le commentaire « côté patient ». Écartés avec
  motif : les libellés praticien « mise au lit » (terme du temps au lit,
  inchangé) et trois refus serveur que le formulaire ne peut pas atteindre.
- E2E de la saisie (Chromium bureau et WebKit au gabarit iPhone 13 en CI).
- T1 complet ; CI.
