### Moteur de scoring — une passation vide ne rend plus de verdict clinique

**Impact sur les passations existantes : nul, et c'est mesuré.** Sur les 61 passations
de production portant des `rawAnswers`, une seule famille n'est pas reconnue par la
définition qu'on lui sert aujourd'hui — les 8 passations `AL*` de `Q_ALI_01`, drapeau
`WN_ALI_01_SIIN57` allumé — et celles-là étaient **déjà** non scorées par la garde
posée en #436. Toutes les autres portent les identifiants réels de leur instrument. La valeur de
ce lot est donc **prospective** : il ferme la classe pour les vingt-cinq autres moteurs,
afin que la prochaine évolution d'identifiants ne fabrique pas de verdicts.

- **Mesuré avant d'écrire quoi que ce soit** : `calculateScore(id, {})` rendait **40
  verdicts cliniques sur 22 instruments**, sans une seule réponse. Trente en direction
  rassurante — « Pas de trouble du sommeil » (PSQI), « Absence de symptomatologie »
  (HAD), « Risque faible d'apnée du sommeil » (Berlin) : un questionnaire blanc se
  lisait comme un bilan propre. Dix en direction alarmante — les sept sous-échelles de
  `Q_MOD_01` en rouge, « Risque élevé de chute » (Tinetti), « Tout à fait du soir »
  (Horne), et `Q_GEO_06` annonçant « Trouble de la mémoire épisodique — consultation
  neurologique ». Aucune des deux directions n'est moins fausse que l'autre.
- **Deux moteurs sur les 27 servis portaient déjà la garde** — `sum` depuis le
  2026-07-28, `seuils_points` depuis #436. Une garde générale est désormais posée avant
  la répartition par moteur, avec le même contrat (`scored: false`, `total: null`,
  `interpretation: null`, `raisonNonScore`). Celle de `sum` avait un prédicat
  strictement identique et devenait morte : elle est retirée. Celle de `seuils_points`
  reste, son barème pouvant être un sous-ensemble des questions.
- **Elle ne préempte pas ceux qui disent déjà mieux.** `agenda_sommeil` et `journal`
  portaient leur propre non-scoré, avec un motif que le générique ne saurait pas dire —
  le décompte de nuits recueillies pour l'un, « recueil sans score global » pour les
  autres, ce dernier restant vrai quelles que soient les réponses. Ils passent à
  travers.
- **« Mon équilibre » ne fabrique plus de preuve à partir de rien.**
  `calculerNiveauPreuveBesoin(5, { Q_SOM_01: {} })` rendait **« preuve de niveau A »**.
  C'est la classe de badge fabriqué déjà corrigée en #430 pour `Q_ALI_01`, restée
  ouverte ailleurs. Elle rend maintenant `NON_MESURE`.
- **Quatre fixtures de test s'appuyaient sur des identifiants qui n'existent pas.**
  `evidence.test.ts` écrivait `{ Q_SOM_01: { P1: '1' } }`, `{ Q_MOD_01: { ACT1: '1' } }`
  et `{ Q_GAS_01: { G1: '1' } }` ; `score.test.ts` écrivait `MOD_AP_01`…`MOD_AP_04`.
  Aucune de ces clés n'appartient à son instrument : ces tests mesuraient une couverture
  bâtie sur rien, et passaient précisément à cause du défaut corrigé ici. Rebranchés sur
  les vrais identifiants — et sur la bonne sous-échelle, `ACTIVITE_PHYSIQUE` étant celle
  que lit le besoin 5 — leur intention est intacte.

**Ce qui est rejoué à la lecture.** Aucune passation n'est rescorée en base : seuls
`api/patient/submit` et la clôture d'agenda écrivent `scoresJson`. Mais **sept points
d'entrée rappellent `calculateScore` sur les `rawAnswers` stockées** — l'indice patient
(`/api/patient/equilibre`), l'indice et les grades praticien (`/api/praticien/equilibre`,
`/besoins`), la trajectoire (`/api/praticien/trajectoire`), les jalons T0/J21/J42/J90
recalculés rétroactivement (`/api/praticien/protocoles/checkins`,
`lib/protocol/trajectoire.ts`) et les objets cliniques du cockpit
(`lib/clinical-engine/clinicalSnapshot.ts`). Ce que ces écrans affichent d'une passation
ancienne dépend donc du moteur du jour.

**Ce que ce lot ne ferme pas.** La garde ne mord que sur le **vide**. Une passation
**partielle** gonfle toujours les sous-scores non répondus à zéro, et cela va dans les
deux sens :

- vers l'alarmant — Karasek avec la seule sous-échelle « demande » renseignée rend
  « Iso-Strain — risque burnout élevé », son libellé le plus grave, sur trois
  sous-échelles sans une donnée ; `Q_MOD_01` avec trois réponses rend **six** verdicts
  rouges d'un coup ;
- vers le rassurant, et c'est plus fréquent — `Q_GAS_01` avec **3 items sur 31** rend
  « A — Absence de troubles fonctionnels » et **0,978 de couverture** sur le besoin 4,
  qui est une fondation critique ; un PSQI à 8 items sur 18 rend « Pas de trouble du
  sommeil » et 0,857 sur le besoin 5.

Fermer cela demande que chaque sous-score distingue « zéro » de « non mesuré », et que
les totaux globaux sachent l'ignorer. Le test qui épinglait ce défaut sur la passation
vide a été **réépinglé sur le cas partiel**, pour qu'il fasse rougir le lot suivant.

**Réserve nommée** : `raisonNonScore` est produit et n'est affiché nulle part. Une
passation blanche se lit donc « — » partout en fiche praticien, ce que le dépôt tient
ailleurs pour un incident technique plutôt que pour une décision clinique
(`FichePatientPanel.tsx`, chemin `nonInterpretable`). Ce lot ne crée pas ce manque — il
existait pour les deux moteurs déjà gardés — mais il l'étend. À traiter.

Six tests neufs (`web/src/lib/passationVide.guard.test.ts`), dont deux balayages du
catalogue entier aux valeurs exactes, et cinq preuves par mutation — dont celle qui
élargit la garde à toute passation incomplète, et celle qui lui fait écraser le motif de
l'agenda.
