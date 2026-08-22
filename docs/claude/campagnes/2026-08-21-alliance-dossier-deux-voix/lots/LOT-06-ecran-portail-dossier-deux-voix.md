---
id: "LOT-06"
statut: "à faire"
dépend_de: "LOT-02, LOT-03, LOT-04 (LOT-05 souhaitable, non bloquant)"
---

# LOT-06 — L'écran « dossier à deux voix » au portail : ratification et constat du gate

## But

À la fin de ce lot, le patient voit au portail son **dossier à deux voix** —
l'objectif négocié et son état, « ce qui compte pour moi » et sa trajectoire,
la synthèse de compréhension et ses désaccords — et peut **ratifier**
l'objectif (ou marquer son désaccord). C'est la première tranche du dashboard
patient E4 (absorbé, réconcilié ici). La clôture du lot **constate le gate de
campagne** : la ratification patient existe, l'activation élargie
protocole→produits peut désormais s'en réclamer — son activation restant un
geste du responsable, hors campagne.

## Périmètre

- Écran portail assemblant les objets des LOT-02/03/04 (lecture) — derrière
  la session patient existante (lien magique).
- Le geste de ratification : append-only, deux dates, référençant la version
  exacte de l'objectif ratifié ; une ratification ne se retire pas, un
  changement d'avis est une nouvelle entrée (patron désaccord, `DC-30`).
- Visibilité praticien de l'état de ratification au cockpit.
- Critère transverse 6.0 appliqué à l'écran : ce qui est montré doit être
  compréhensible sans le praticien — textes UI en français courant, aucun
  jargon de moteur, aucun score affiché sur ces objets.
- Constat de clôture : vérifier le résultat observable des six lots sur un
  dossier de test réel (lecture par identifiant, MCP) et l'écrire dans la
  clôture de campagne.

## Fichiers probables

- `web/src/app/portail/` (écran + navigation existante du portail).
- `web/src/app/api/portail/` (ratification + lecture assemblée).
- `web/src/components/patient-cockpit/` (état de ratification côté
  praticien).
- Carte de couverture du Socle si l'écran montre du texte praticien (le
  chemin est alors déjà inscrit par le LOT-04 — vérifier, pas dupliquer).

## Interdits

- Aucun score, aucune bande, aucun élément du moteur clinique sur cet écran.
- Aucun texte praticien hors circuit gardé (acquis LOT-04 — ne pas le
  contourner en « affichant directement »).
- Aucune notification/e-mail neuf hors registre de gabarits.
- Pas d'activation protocole→produits dans ce lot : le lot constate le gate,
  il ne l'ouvre pas.
- Aucun seed ni E2E visant un dossier réel (`D-075`).

## Dépendances

LOT-02 (objectif + API), LOT-03 (entrées « ce qui compte »), LOT-04 (synthèse
gardée + désaccord). LOT-05 non bloquant : l'EVA vit dans le parcours
instruments existant.

## Étapes

1. Contrat de l'écran (états : objectif absent, proposé, ratifié, contesté ;
   silences distingués des réponses) + bancs.
2. Routes portail + écran ; ratification append-only prouvée.
3. État de ratification au cockpit.
4. T2 ; E2E du parcours portail sur fixtures ; revue `wn-reviewer`
   (surface patient) ; fragment `changelog.d/`.
5. Clôture de campagne : constat du gate sur dossier de test réel (lecture
   MCP), FILE_ATTENTE et état resynchronisés.

## Tests

- Bancs de route (session patient exigée ; ratification référencée à la
  version exacte ; nouvelle entrée au changement d'avis, rien d'écrasé).
- Banc d'affichage : silence ≠ réponse sur chaque objet (`DC-24`).
- E2E portail sur fixtures (Sophie Nicola / Jennifer Martin / Michel Dogné).
- T2 avant commit ; T3 avant la PR si le lot touche un chemin clinique.

## Critères de done

- [ ] L'écran assemble les trois objets, compréhensible seul, sans score.
- [ ] Ratification append-only opérante, visible des deux côtés.
- [ ] Revue `wn-reviewer` passée ; T2 vert ; E2E fixtures verts.
- [ ] Gate constaté et écrit à la clôture de campagne — l'activation élargie
      reste un geste du responsable.
