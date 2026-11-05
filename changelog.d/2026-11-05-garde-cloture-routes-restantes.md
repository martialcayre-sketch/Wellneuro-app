### Portail patient : la fiche, le journal et les rendez-vous de suivi refusent un dossier clos (2026-11-05)

Suite de #1859. Trois routes d'écriture y restaient ouvertes au dossier clos faute
d'arbitrage, et `api/portail/physio-traitements` montrait au patient le texte destiné au
praticien (« Rouvrez le suivi pour reprendre »).

Arbitrage du responsable du 2026-11-05 :

- `api/portail/fiche` (POST) refuse `dossier_cloture` (409) : « Votre suivi est clôturé : vous
  ne pouvez plus modifier votre fiche. » `valider` refusant déjà le dossier clos, une fiche
  enregistrée ne mènerait plus à rien.
- `api/portail/ja/observations` (POST) refuse de la même façon : « Votre suivi est clôturé :
  vous ne pouvez plus transmettre votre journal. » Le GET reste ouvert aux archives.
- `api/portail/protocole/checkin` (POST) refuse de la même façon : « Votre suivi est clôturé :
  vous ne pouvez plus répondre à ce rendez-vous de suivi. » Le GET reste lisible.
- `api/portail/physio-traitements` garde sa raison `dossier_cloture` et son 409, mais le
  patient lit désormais « Votre suivi est clôturé : vous ne pouvez plus modifier vos
  traitements. », y compris quand la clôture est constatée sous le verrou de la transaction.

`refusClotureSuiviPour` prend un message optionnel pour nommer le geste refusé. Le banc
sentinelle `lib/patient/gardeCloture.routes.guard.test.ts` classe les trois routes comme
fermées. Il ne compte plus aucune route ouverte « non tranchée ». Il vérifie aussi que leurs
GET restent sans garde, quel que soit l'ordre des méthodes dans le fichier.

Pas de migration. Aucun chiffre sur une surface patient (D-333).
