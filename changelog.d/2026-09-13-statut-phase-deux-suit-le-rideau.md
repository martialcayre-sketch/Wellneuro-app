### Fiche-trajectoire — « renseignée » veut enfin dire « le rideau T0 est complet »

Le rail marquait la phase 2 **« renseignée » dès qu'une passation existait**. Un
dossier à qui il manquait un questionnaire du rideau T0 — donc dont l'ancre
était inconfirmable — portait la même pastille verte qu'un dossier complet. Et
depuis les deux lots précédents, ce badge se lisait à trois centimètres d'un
compte, d'une liste et de badges qui disaient l'inverse.

Arbitrage praticien du 2026-09-13 : **le critère est celui de
`preconditionsT0`** — le rideau renseigné et cotable, ni plus ni moins. Le rail
dit maintenant la même chose que le panneau de confirmation d'épisode, et un
envoi du second rideau qui traîne ne fait pas retomber la phase : il n'empêche
pas de confirmer l'ancre, et la liste des envois le montre déjà pour ce qu'il
est.

**Le verdict est REMONTÉ, jamais recalculé.** « Cotable » n'est pas
« présent » : le prédicat exige une passation exploitable, écarte les statuts de
validité exclus et lit les comptes de recueil. Le refaire à l'écran en aurait
fait une seconde version, qui aurait dérivé de la première. `EtatRuntimeClinique`
porte donc `rideauT0Satisfait`, lu sur la checklist que la route sert déjà —
comme il porte `episodeConfirme` et `decisionBloquee`.

Quatre états, et aucun n'est affirmé sans donnée :

- **rideau complet** → « renseignée » ;
- **rideau incomplet** → « en attente du patient » — la qualification d'acteur
  est juste, c'est bien une matière du patient qui manque ;
- **aucun envoi jamais posé** → **« à ouvrir »**, et surtout pas « en attente du
  patient ». Cinq dossiers sur douze en production au 2026-09-12 sont dans ce
  cas : créés, zéro assignation. Reprocher l'attente au patient nommerait
  l'acteur opposé — le défaut même que la requalification de « Compréhension »
  a corrigé le 2026-09-10 ;
- **checklist absente, ou lecture des envois en échec** → « indéterminée ». La
  route ne calcule les préconditions qu'en visant une ancre : leur absence ne
  veut pas dire « rideau incomplet », elle veut dire inconnu (`DC-24`).

Un seul raccourci est admis, et il est motivé : **un épisode confirmé vaut
verdict**. Le rideau complet est une condition dure de la confirmation, et la
route cesse de calculer ce qu'elle n'a plus à autoriser — sans cette branche,
tout dossier ancré retomberait en « indéterminée ».

**Ce que ça déplace, et qui est le but.** Le statut alimente `phaseDue` au
troisième rang : un dossier dont le rideau est incomplet voit désormais son
bandeau « Prochaine étape » pointer *Données fiables*, et la fiche s'ouvrir
dessus. Sur le dossier qui a motivé l'arbitrage, la prochaine étape honnête
était « relancer l'enquête alimentaire », et le bandeau annonçait
« Décision 21 j ».

Baselines visuelles régénérées : le rail figure sur la preuve du cockpit.
