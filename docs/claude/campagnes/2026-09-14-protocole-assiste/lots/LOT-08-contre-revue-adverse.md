---
id: "LOT-08"
titre: "Ce que la contre-revue adverse a trouvé"
statut: "en cours"
dépend_de: "LOT-07"
---

# LOT-08 — Ce que la contre-revue adverse a trouvé

## D'où vient ce lot

**Il n'était pas au cadrage.** Il naît de la contre-revue adverse de campagne du
2026-09-16, lancée **avant** la clôture sur le patron de [[D-108]] — « la revue a été
lancée avant la clôture, et c'est ce qui a payé » : le lot de clôture ne change aucun
code, mais il **grave** l'état final ; une affirmation fausse y serait inscrite comme
acquise.

Vingt-six affirmations portantes ont été soumises à **réfutation** par quatre relecteurs
indépendants, en lecture seule, avec pour consigne de chercher le contre-exemple dans le
code et de conclure « réfuté » par défaut faute de preuve.

## Le verdict

| | |
|---|---|
| Réfutées | **6** — `A1`, `A5`, `B1`, `B2`, `B5`, `D5` |
| Vraies seulement bornées | 3 — `D1`, `D2`, `D6` |
| Confirmées | 17, dont les sept du barème de charge |

Le taux est celui de `D-108` (7 sur 13). **Toutes les réfutations portent sur des phrases
écrites par l'outil**, pas sur du code cassé — mais quatre d'entre elles recouvraient de
vrais défauts, vivants en production.

### Les six affirmations réfutées

1. **`A1` — « une seule description de la vue patient subsiste ».** Il en reste deux :
   `ProtocolConsultationPanel` en écrit une à la main depuis `ProtocolDraft`, sans passer
   par le contrat, et **ignore `interventionStatus`** — une action suspendue s'y lit comme
   un conseil ferme. Elle est inerte en production (`protocolDraft` forcé à `null` hors
   fixture), mais présente. S'y ajoute `projeterSurLeFil`, projection champ à champ **sans
   aucun banc** : un champ ajouté au contrat y serait abandonné en silence, `tsc` vert.
2. **`A5` — « le refus se voit des deux côtés ».** Le miroir praticien ne couvrait qu'**un
   des cinq motifs** de refus.
3. **`B1` — « `purpose` ne traverse plus en texte libre ».** Il le traverse toujours :
   c'est [[D-193]] qui a déplacé le constat à la **lecture**. L'affirmation décrivait le
   plan d'origine, pas le résultat arbitré.
4. **`B2` — « la garde de registre est posée sur tout champ qu'une route patient sert ».**
   Elle en portait quatre ; la route patient en servait six.
5. **`B5` — « le constructeur ne pose plus rien en silence ».** Vrai du type et de la
   charge ; **faux du statut d'intervention** : dès qu'une action est suspendue, l'écran
   pose `active` sur toutes les autres — valeur que le formulaire n'affiche jamais et que
   le moteur refuse précisément de poser par défaut (`DC-24`).
6. **`D5` — « `adviceSheetRef` est mort de bout en bout ».** Il était **non alimenté**, ce
   qui n'est pas la même chose : la route l'acceptait en texte libre non validé, le contrat
   le projetait, le portail le servait au navigateur du patient.

### Les trois affirmations vraies seulement si on les borne

`D1` (« zéro migration »), `D2` (« aucune identité réelle ») et `D6` (« aucune borne
inventée ») tiennent **sur les huit lots**, et tombent si on les reprend sans les borner :
une migration d'une autre session a été mergée dans la même fenêtre ; des auteurs
d'instruments — personnes physiques réelles — sont nommés au registre par un autre
chantier ; et le barème a bien été **proposé par la machine** avant d'être corrigé puis
déclaré conforme. La formulation juste est « aucune borne **mise en service** sans
déclaration ».

## Les quatre arbitrages du 2026-09-16

1. **Le refus de registre devient atteignable d'où que parte le geste.**
2. **Les deux chemins d'écriture ouverts sont fermés.**
3. **Le carnet cesse d'affirmer une absence de protocole**, et le miroir juge les deux
   marches.
4. **Le compte transitoire de la suggestion de charge reste tel quel** — l'état dure le
   temps de choisir un type, et se corrige à la frappe suivante.

## Ce que le lot livre

- **Le refus de registre atteignable** : la branche `REGISTRE_ANXIOGENE` ramène la sous-vue
  sur « protocole », là où l'alerte et son bouton se lisent. Le bloc était `hidden` hors de
  cette sous-vue, alors que `reviserApresArbitrages` part de « biologie » : le praticien
  cliquait « Appliquer les arbitrages » et **il ne se passait rien**. C'est le défaut du
  booklet à l'identique — une garde confirmable dont la commande est inatteignable est une
  garde bloquante déguisée. Gardé par `refusRegistreAtteignable.guard.test.ts`, de source :
  aucun banc de composant ne traverse ce chemin.
- **`POST /api/praticien/protocoles` retirée.** Aucun appelant applicatif — l'état machine
  du dépôt le notait déjà. Authentifiée, sans drapeau, elle acceptait un `ProtocolDraft`
  entier fabriqué par le client **avec son propre `inputHash`**, sans garde de registre et
  sans reconstruction serveur : un second chemin d'écriture vers ce que le patient lit,
  hors des gardes posées sur le premier. Le `GET` reste.
- **`adviceSheetRef` fermé à l'écriture** : la route le force à `null`.
- **`vuePatientOuRefus`** — la question « le portail peut-il servir ce protocole ? » posée
  à **un seul endroit**, appelée par le portail et par le miroir praticien. Recopier la
  seconde branche dans le miroir aurait fabriqué une deuxième description de la même règle.
- **Le carnet alimentaire distingue « aucun protocole » de « protocole non servable »**, et
  le dit au praticien en `role="alert"` avec le geste qui le répare.

## Vérifications

T1 vert, T3 vert. Deux mutations vues ROUGES avant tout vert, restaurées **depuis une
copie** : ramener le miroir au seul rejeu tue deux bancs neufs ; retirer la remise en vue
du refus de registre fait rougir la garde de source.

## Ce qui reste en dette, nommé

La seconde description de la vue patient (inerte, mais présente) ; `projeterSurLeFil` sans
banc ; le statut `active` posé en silence ; `limitations` projeté au patient et rendu par
aucun écran ; l'aperçu patient du cockpit, qui affiche son état vide à tout dossier réel.
