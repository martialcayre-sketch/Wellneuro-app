### Restitution — la couverture des chemins sortants devient un contrat prouvé (Socle LOT-01)

- **La carte des chemins sortants** vit désormais en tête de
  `web/src/lib/documents/vocabulaire.ts` : quatre chemins, leur garde, leur
  régime (journalisant / confirmable / refus dur — choix datés, jamais alignés
  sans décision) et leur **banc de câblage**. Consigne opposable : un chemin de
  texte sortant neuf s'ajoute à la carte avec sa garde et son banc, dans la
  même PR — c'est le gate des campagnes 6.0.
- **Le bilan portail re-vérifie au service** ce qu'il sert
  (`api/portail/bilan/route.ts`) : le narratif vient du champ **vivant**
  `syntheseJson` — un texte réécrit après l'envoi n'a jamais repassé la garde
  du booklet. Régime **journalisant** (`PORTAIL_BILAN_REGISTRE_ANXIOGENE`,
  code neuf) : la garde d'envoi étant confirmable, retenir au service ce que
  le praticien a pu confirmer changerait un verdict — le durcissement est un
  arbitrage du responsable, instruit au handoff, non tranché. Le log porte le
  champ, jamais le terme ni le texte.
- **Deux bancs de câblage neufs**, chacun **vu rouge garde débranchée puis
  vert rebranché** : le service du bilan (trois cas — narratif signalé mais
  servi, note re-vérifiée, registre sain silencieux) et le chokepoint du rendu
  médecin (`rendu.test.ts` — `vocabulaire.test.ts` ne prouvait que la
  fonction, pas son câblage). Les deux bancs existants cités par la carte
  (booklet, synthèse) ont subi la même preuve de mutation : quatre gardes,
  quatre rouges vus, tout rebranché vert.
- Aucun verdict existant modifié ; aucun terme ajouté aux registres ; aucune
  migration. Dette profonde nommée sans être traitée : servir un instantané de
  `syntheseJson` figé à l'envoi serait la vraie fermeture — migration, décision
  séparée.
