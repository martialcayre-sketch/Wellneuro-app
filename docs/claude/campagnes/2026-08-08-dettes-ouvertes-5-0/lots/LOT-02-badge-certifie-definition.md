---
id: "LOT-02"
titre: "« Certifié » à l'écran sans la définition de D-034"
statut: "à ouvrir"
dépend_de: "aucun"
---

# LOT-02 — « Certifié » à l'écran sans la définition de D-034

## But

**Faire voyager la définition de D-034 jusqu'à l'écran où le mot s'affiche.**
Aujourd'hui elle est écrite dans `docs/DECISIONS.md` (D-034) et
`docs/claude/corpus/README.md`, et elle a été portée dans la seule surface du
**runtime** qui revendiquait la validation — la consigne système de synthèse,
`synthese-v18` → `synthese-v19`, avec un garde de banc. **Elle n'est nulle part
dans l'UI praticien.**

Les badges concernés, vérifiés au cadrage du 2026-08-08 :

- `web/src/components/BibliothequePanel.tsx:33-34` → **« Certifié »**, variante
  `success`, sur toute entrée de bibliothèque dont `statutCertification` vaut
  `certifie` ;
- `web/src/components/FichePatientPanel.tsx:137-147` → **« Certifié Drive »** et
  **« Certifié manuel EORTC »**, sur la fiche patient.

Ce que le mot veut dire, d'après D-034 : *le code reproduit fidèlement la règle
enregistrée* — items conformes à la source, moteur vérifié par le banc `certify`.
Ce qu'il **ne** dit pas : rien de la qualité psychométrique, de la validité de
construit, de la fidélité, ni de l'étalonnage des seuils. Un praticien qui lit
« Certifié » en vert sur une fiche patient n'a, à l'écran, aucun moyen de faire
cette différence.

## Statut de cette dette — nommée, pas réglée

**Ce lot n'est pas fait.** D-034 a fermé la dette 2 *de la campagne close* : la
décision de ne pas entrer la validation psychométrique au programme, et
l'alignement de la consigne de synthèse. Elle n'a **pas** traité l'affichage
praticien, qui n'était pas dans son périmètre et que la clôture n'a pas relevé.
La campagne le porte comme **dû**, et ne s'en prévaudra pas avant livraison.

## Hors périmètre

- Toute modification du registre `instrument_registry.json`, du champ `cosmin`,
  ou du banc `verifier_registre_instruments.js` — D-034 les fige.
- Le texte patient : `web/src/lib/trust/contenus/registre.ts` ne revendique
  **déjà** rien (« cet accompagnement relève du bien-être et du suivi ; il
  n'établit pas de diagnostic médical »). D-034 aligne l'interne sur l'externe,
  pas l'inverse.
- Réécrire les commentaires `// Certifié v2 — …` de `web/src/lib/questions.ts` :
  ils datent une conformité de source, ils ne s'affichent pas.

## Preuve attendue

- Un praticien voyant le badge peut atteindre la définition **sans quitter
  l'écran** (infobulle, libellé, ou lien court).
- Un banc assère la présence de la qualification **et** refuse le retour du mot
  nu — un garde qui n'assère que la présence est satisfait par l'inversion exacte
  du défaut.
- Textes en français ; T2 avant commit (changement UI).

## Question à trancher à l'ouverture

Infobulle, libellé plus long (« Scoring vérifié »), ou lien vers la définition ?
Le mot « Certifié » est employé à l'oral par le praticien : le renommer a un coût
d'usage réel, à peser contre l'ambiguïté qu'il porte.
