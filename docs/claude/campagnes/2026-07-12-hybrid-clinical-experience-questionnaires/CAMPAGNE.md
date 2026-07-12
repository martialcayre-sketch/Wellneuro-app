---
id: "2026-07-12-hybrid-clinical-experience-questionnaires"
titre: "HC-F — Hybrid Clinical Foundation"
statut: "à_faire"
créée_le: "2026-07-12"
mise_à_jour: "2026-07-12"
lot_courant: "LOT-01 (en attente d'autorisation explicite)"
---

# HC-F — Hybrid Clinical Foundation

> Révision du 2026-07-12. Remplace la version initiale de la PR #31 :
> abandon du double mode Jour/Nuit (**tout en mode clair**, décision
> utilisateur), périmètre questionnaires transféré à la campagne **QX**,
> périmètre métier (cockpit, carte de décision, timeline, comparateur,
> constructeur 21 jours) transféré en **intrants C1/C2** (registre A2).
> Les documents `sources/` restent valides comme matériau, à lire à travers
> ce fichier.

## Objectif

Transformer la direction Hybrid Clinical en socle UX durable :

- shell praticien premium : **rail sombre structurel + espace de travail
  clair**, vraies icônes SVG (Lucide), grille d'alignement stable ;
- portail patient clair fixe, chaleureux, calme, à faible densité ;
- primitives partagées accessibles (Radix/shadcn sélectionnées) ;
- **mécanismes** transverses : `ModeConsultation`, `PrévisualisationPatient`,
  double niveau de lecture (règle + mécanisme générique) — chacun livré avec
  un contrat d'instanciation d'une page ;
- palette de commandes praticien, états vides actionnables, réversibilité ;
- gouvernance : checklist de conformité imposée aux modules futurs, lexique
  UX praticien/patient.

Règle directrice inchangée : chaque écran doit aider à comprendre, décider ou
agir ; tout le reste est retiré, regroupé ou relégué.

## Décisions actées (remplacent celles de la version PR initiale)

- **Tout clair.** Pas de mode Nuit, pas de contrôleur Auto/Jour/Nuit, pas de
  préférence de thème. `data-theme="praticien|patient"` ; l'attribut
  `data-color-mode` peut être conservé avec la seule valeur `light`
  (extension future à coût nul).
- **Interdits D1 §5 amendés** (cf. patch `design-system-d1`) : primitives
  Radix/shadcn sélectionnées, Lucide React et Motion autorisés ; « toggle de
  thème » et « theme-provider » sans objet.
- Le premium vient des alignements, de la hiérarchie et de la réduction du
  bruit — pas d'une accumulation d'effets. Motion uniquement quand une
  transition explique un changement d'état.
- HC-F ne conçoit **aucun contenu clinique** : les mécanismes sont livrés
  vides et testables ; leur contenu est instancié par C1/C3 (registre A2).
- Le comparateur avant/maintenant, la timeline, la carte de décision et le
  constructeur 21 jours ne sont **pas** dans cette campagne (specs d'entrée
  C1/C2, conservées dans `sources/05_INNOVATIONS_UX_VAGUE_2.md`).

## Contraintes non négociables

Invariants du registre §1, plus :

- patients fictifs : Sophie Nicola, Jennifer Martin, **Michel Dogne** (sans
  accent — corriger les deux occurrences fautives de la version initiale) ;
- vocabulaire : remplacer les occurrences « prescription(s) » / « prescrits »
  de la version initiale par le vocabulaire réglementaire ;
- pas de tableau horizontal comme rendu patient mobile par défaut ;
- pas de Storybook, de WebGL, de migration de framework ;
- aucune migration Prisma (aucune préférence d'affichage en base).

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit réel et arbitrages : géométrie du shell C0-UX, tokens consommés, classification des pages praticien en vagues de migration, frontières de données praticien/patient, lexique existant. Arbitrages : pages de première vague ; palette de commandes livrée ou différée ; contrats d'instanciation des 3 mécanismes validés par l'utilisateur | terminé | — |
| LOT-01 | Tokens Hybrid Clinical clairs : `tailwind.config.ts` + `globals.css`, thème praticien clair (rail sombre structurel) + patient clair, amendement effectif de `docs/design-system-d1.md` | à_faire | LOT-00 |
| LOT-02 | Shell premium : rail avec icônes Lucide, alignements mesurés, palette de commandes (si arbitrée livrable), états vides actionnables | à_faire | LOT-01 |
| LOT-03 | Surfaces praticien génériques (dashboard, annuaire — coquilles) + livraison des 3 mécanismes avec contrats d'instanciation. **Prérequis** : `feat/e0-patients-pagination` mergée avant restylage de l'annuaire | à_faire | LOT-02 |
| LOT-04 | Portail patient clair : onboarding, hub, lecture seule, correction (textes de consentement R8-lite **figés**, restylage uniquement), états de sauvegarde/connexion explicites, confort de lecture | à_faire | LOT-01 |
| LOT-05 | Gouvernance et handoff : lexique UX, checklist de conformité Hybrid Clinical des modules futurs, mise à jour du document design system canonique, handoff vers C1/QX | à_faire | LOT-02 à LOT-04 |

## Hors périmètre

Moteur de rendu des questionnaires et randomisation (→ QX) ; cockpit, carte
de décision, timeline, comparateur, protocole/constructeur 21 jours,
mode consultation *rempli* (→ C1/C2) ; documents multi-destinataires (→ C3) ;
toute persistance serveur (localStorage uniquement, sinon handoff C2) ;
refonte auth, routes API métier, scoring.

## Definition of Done

- [ ] Contrat visuel clair validé sur desktop, tablette et mobile (captures
      des 3 patients fictifs).
- [ ] Alignement géométrique du rail et des icônes vérifié par mesures.
- [ ] Portail patient clair cohérent sur les 5 parcours (gate, consentement,
      hub, saisie, correction) sans modification de texte figé.
- [ ] Les 3 mécanismes livrés vides, testés, avec contrat d'instanciation
      d'une page chacun.
- [ ] `design-system-d1.md` (ou successeur canonique) amendé et à jour.
- [ ] Lexique UX livré ; checklist de conformité opposable aux campagnes
      suivantes.
- [ ] Tests Playwright existants verts ; parcours clavier/tactile documentés.
- [ ] Aucune occurrence de vocabulaire banni ni de « Dogné » dans la campagne.
