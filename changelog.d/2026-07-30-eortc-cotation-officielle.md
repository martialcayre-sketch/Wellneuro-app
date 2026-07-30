### Les deux questionnaires EORTC sont cotés selon leurs manuels officiels

**Modification de logique clinique**, sur arbitrage du praticien du 2026-07-30.

`Q_CAN_01` (QLQ-C30) et `Q_CAN_02` (QLQ-BR23) étaient servis par une **somme brute**
de leurs items, assortie de bandes locales : 28→112 pour l'un, 23→92 pour l'autre.
Ce nombre n'existe nulle part dans la littérature EORTC, et il portait un défaut
réel — la bande « aucun problème signalé » du module sein couvrait 0–13 pour un
plancher de 23. **La patiente sans aucune plainte ne pouvait pas la recevoir.**

Les deux instruments suivent désormais la cotation de leurs manuels : score brut =
moyenne des items de l'échelle, puis transformation linéaire vers 0–100 —
`(1 − (RS−1)/étendue) × 100` pour une échelle fonctionnelle,
`((RS−1)/étendue) × 100` pour une échelle de symptômes et pour la santé globale.
Quinze échelles pour le C30, huit pour le BR23. **Aucun score global d'instrument
n'est plus rendu** : le manuel n'en définit pas, et en fabriquer un revenait à
inventer une mesure.

**La règle qu'il fallait aller chercher.** Le manuel BR23 exige que la cotation des
questions 44, 45 et 46 — fonctionnement et plaisir sexuels — soit **inversée avant
moyenne**. Les traiter comme les autres échelles fonctionnelles donne le contraire
de la réalité : la patiente qui déclare le plus d'intérêt reçoit le score le plus
bas. Cette règle ne se déduit d'aucune autre ; elle a été relevée dans le manuel, et
une preuve par mutation la verrouille — retirer `inverser: true` fait rougir le banc.

**Absence et non-applicabilité restent distinctes.** Une échelle dont moins de la
moitié des items est renseignée n'est pas scorée (règle du manuel, `XNUM >= NITEMS/2`),
et le plaisir sexuel est **sans objet** — pas manquant — s'il n'y a pas eu d'activité
sexuelle. Ces deux cas se ressemblaient sous l'ancien moteur.

**Effets à connaître :**

- Les deux instruments **redeviennent assignables**, sur décision du praticien. La
  réserve « © EORTC, enregistrement requis » **reste au dossier** et la garde
  d'exposition exige la décision écrite qui l'accompagne. La cancérologie, domaine
  à deux instruments, rouvre donc en entier.
- **Les échelles EORTC arrivent au modèle de synthèse** : 17 émetteurs de
  sous-scores deviennent 19. Un score de fonctionnement physique dit quelque chose
  en consultation ; une somme de 28 à 112 ne disait rien.
- **Consigne de synthèse en v12** : elle décrit le nouveau champ `sens`, sans lequel
  un score de 100 est illisible — « fonctionnement sexuel » et « symptômes du bras »
  se lisent en sens contraires et rien dans leur libellé ne le dit. C'est le banc des
  sous-scores qui a exigé cette ligne : il refuse tout champ livré au modèle et non
  décrit.
- **Les passations déjà enregistrées gardent leur score** : seul le robinet change.
  Aucun rescorage rétroactif — il reste derrière son go séparé.

Les deux instruments montent à `scoring_verifie` : **53 sur 64**.

**Ce que la revue adversariale a corrigé avant merge :**

- **Une absence de réponse devenait une affirmation clinique.** `evalConditionnel`
  rend `false` aussi bien sur un déclencheur répondu par la négative que sur un
  déclencheur MUET : l'échelle sortait alors « sans objet pour cette patiente », et
  cette phrase part dans la charge du modèle de synthèse. On affirmait qu'une
  patiente n'avait pas eu d'activité sexuelle, ou pas perdu ses cheveux, alors
  qu'elle n'avait rien dit — la symétrie exacte du défaut du 2026-07-29, où une
  absence devenait la valeur la plus basse. Un déclencheur non répondu rend
  désormais l'item **indéterminé**, donc manquant, et le badge de relance le compte.
- **Le résultat était invisible là où il arrive.** Sans bande ni score global, le fil
  praticien affichait « Sans score principal » et aucune synthèse sur un
  questionnaire pourtant complet. Le résumé court rend maintenant un constat
  strictement factuel — les deux extrêmes, avec leur sens, sans verdict inventé.
- **La direction était expliquée au modèle et cachée à l'humain.** La fiche affichait
  « Fatigue 100/100 » et « Fonctionnement physique 100/100 » à l'identique. Le sens
  y figure désormais.
- **Le badge disait « Non certifié »** sur un instrument que le registre porte à
  `scoring_verifie` : `manuel_eortc` n'était pas une provenance connue du type.
- **Un second bloc `eortc` mort** portait le même discriminant avec un contrat
  incompatible — piège armé pour le prochain moteur. Supprimé.
- **L'échelle « santé globale » s'appelait `QL2`, comme l'item 2** du questionnaire :
  deux grandeurs sans rapport sous un même nom dans la charge du modèle. Les sigles
  du C30 sont préfixés, et une garde de forme refuse désormais la collision.
- **Quatre tests manquaient**, dont celui qui rendait une inversion de sens
  indétectable : le contrôle des bornes n'assertait que « 0 ou 100 », or formule et
  sens basculent ensemble. Chaque échelle est maintenant nommée avec sa valeur
  attendue dans les deux sens.
