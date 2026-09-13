### Fiche-trajectoire — annuler un envoi depuis la fiche, et voir ceux qu'aucune horloge ne regardait

L'annulation est le seul geste qui arrête une attente : `evaluerSecondRideau`
lit `Annulée` comme « le praticien ne l'attend plus » et cesse d'exiger cet
envoi pour confirmer l'ancre. Elle n'était atteignable que depuis le tableau des
patients. Mesuré en production le 2026-09-12 : **onze annulations, toutes sur le
rideau d'entrée, aucune sur la cascade d'explorations qui s'accumule** — le
geste manquait exactement là où le praticien constate l'attente.

La phase « Données fiables » **liste** désormais les envois en attente. Chaque
ligne porte son ancienneté, ses badges, et le bouton **« Annuler l'envoi »**
quand `estAnnulable` l'autorise — même route, même modale et même prédicat que
le tableau des patients, rien n'est réinventé. La phrase qui suit dit ce que le
geste veut dire, parce que le mot « annuler » ne le dit pas : *rien n'est
effacé, l'envoi sort des conditions de confirmation de l'ancre, et reste
réassignable*.

#### La péremption à 21 jours, et le trou qu'elle comble

Un envoi qui **porte** une échéance est déjà tenu de bout en bout : passé la
date, `isDeadlineExpired` ferme lecture, consentement et soumission côté
patient, le hub bascule en « Expiré », et le Fil du jour en fait une carte
« assignation en retard » datée. Le **second rideau**, lui, n'en porte aucune
tant que `WN_ECHEANCE_OBLIGATOIRE` est éteint — c'est le cas en production. Ces
envois-là ne peuvent jamais être en retard, jamais expirer, et n'apparaissent
dans aucun signal : ils attendent sans terme. C'est ce trou, et lui seul, que la
règle comble — le rendement du troisième tour d'exploration tombe à 11 % en
production, et rien ne le disait.

`JOURS_PEREMPTION_ENVOI = 21` est un **chiffre opérationnel et se déclare comme
tel** (`DC-19`, `DC-20`) : arbitrage praticien du 2026-09-13, il ne dérive
d'aucune source clinique ni d'aucun claim. Un banc l'assère nommément pour
qu'aucune modification ne passe sans relire ce qui le motive.

Trois bornes tiennent la règle honnête :

- **elle ne regarde pas les envois qui ont une échéance** — deux horloges sur la
  même attente donneraient deux nombres derrière le même mot, à deux écrans
  d'écart. Le jour où `WN_ECHEANCE_OBLIGATOIRE` s'allume, le second rideau
  rejoint la carte du Fil : la relève est propre, sans rien à coordonner ;
- **elle exempte les agendas** (`Q_SOM_09`, `Q_ALI_09`), dont la fenêtre EST de
  21 jours — les signaler périmés les marquerait le jour de leur clôture
  normale. Retour moyen mesuré à 27,1 jours ;
- **elle n'affirme « sans retour » que si c'est vrai** : un envoi portant une
  passation n'est jamais périmé, et un `aPassation` absent ne l'autorise pas
  davantage — l'inconnu n'est pas « aucune ». Défaut relevé par le banc d'écran
  avant toute mise en service.

Elle **propose, elle ne ferme rien** : aucun accès patient ne change. C'est ce
qui la distingue d'une échéance, et ce qui lui permet d'être plus courte que les
30 jours du pack de base.

Côté code, `QIDS_SANS_DATE_LIMITE` est **déplacé** de
`consultation/assignBasePack.ts` vers la feuille `assignations/peremption.ts`,
qui le ré-exporte : la règle de péremption exempte les deux mêmes instruments
pour le même motif de fond et doit se lire dans un composant client. La doctrine
propre au PACK reste où elle était. Set unique, déplacé et non recopié — même
patron que `clinical-engine/rideauT0.ts`.
