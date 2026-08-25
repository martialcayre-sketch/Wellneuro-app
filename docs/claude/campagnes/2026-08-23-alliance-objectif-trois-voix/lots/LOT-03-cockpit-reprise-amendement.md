---
id: "LOT-03"
titre: "Cockpit — reprendre, amender, écarter ; le diff proposé↔négocié"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Cockpit : reprendre, amender, écarter

## But

Donner au praticien la surface de disposition des propositions : reprendre
telle quelle, amender (sa reformulation, sa priorité), ou écarter avec
motif — et rendre lisible ce qui a été amendé (diff proposé↔négocié).

## Résultat observable

- Le panneau objectif du cockpit (phase « Compréhension ») affiche les
  propositions vivantes, chaque fragment **cliquable vers sa source**
  (anamnèse, instrument, règle + SHA).
- « Reprendre » pré-remplit le formulaire existant : `enoncePatient` par la
  **citation verbatim seule** (marquée comme citation, avec sa source),
  reformulation/priorité libres au praticien ; la soumission passe par le
  `POST /api/praticien/objectifs` existant, enrichi du seul champ
  `sourcePropositionId`.
- « Écarter » exige un motif (le matériau du bilan LOT-06).
- La trajectoire affiche le **diff** entre la proposition source et
  l'objectif négocié — ce que le praticien a changé est un fait observable.
- Une proposition caduque s'affiche comme telle et ne se reprend pas.

## Périmètre

- `web/src/components/patient-cockpit/ObjectifNegociePanel.tsx` (+ test)
- `web/src/app/api/praticien/objectifs/route.ts` : champ
  `sourcePropositionId` (référence souple, patron `supersedesObjectifId`) +
  l'événement `reprise` posé sur la proposition — **seule écriture nouvelle**.
- `web/src/lib/praticien/objectifNegocie.ts` si la préparation doit porter
  le champ.

## Hors périmètre

- Le moteur (LOT-02) ; le portail (LOT-04).
- Tout tri des propositions par priorité ou par score (G3/G7).
- Toute remise au patient.

## Fichiers probables

Ceux du périmètre ; gardes existantes à étendre :
`web/src/lib/praticien/objectifNegocie.guard.test.ts` (G1 : clé
`sourcePropositionId` entre dans la liste épinglée).

## Interdits

- `enoncePatient` jamais pré-rempli autrement que par citation verbatim
  sourcée ; jamais de texte machine assemblé dans ce champ.
- Les six gardes G1-G6 restent vertes sans assouplissement — un
  renommage plutôt qu'une exception si l'une mord à tort (précédent
  `marqueurPrisma`).
- Pas de compteur, taux ou agrégat de propositions reprises/écartées à
  l'écran (l'adhésion se constate, ne se compte pas).

## Étapes

- [x] Étendre la route objectifs (`sourcePropositionId` + événement
      `reprise` transactionnel) ; G1 mise à jour, vue rouge puis verte.
- [x] UI : liste des propositions, sources cliquables, reprise/écart, diff.
- [x] États vides et caducs (un bloc fermé est absent, pas vide — patron
      6.0-A).
- [x] T1 ; T2 avant commit.
- [ ] Revue `wn-reviewer`.

## Tests

- Route : reprise lie l'objectif à la proposition ; écart sans motif refusé ;
  proposition caduque non reprenable (409).
- Composant : rendu des sources, diff, aucun tri par priorité (garde
  élargie au rendu — leçon de la revue LOT-02 de 6.0-A).

## Critères de done

- T2 vert ; parcours reprendre/amender/écarter complet derrière drapeau ;
  diff lisible ; gardes étendues vues rouges.

## Résultats

Clos le 2026-08-25.

**Le déclencheur d'assemblage a demandé un arbitrage que la fiche ne posait
pas**, et la mesure a corrigé ce que je croyais savoir. Trois faits vérifiés
dans le code : `GET /cockpit` ne rend **jamais** `ready` ; le `POST` qui produit
la carte de décision **n'écrit rien** ; et la carte n'est persistée nulle part
(`protocol_drafts` n'en garde que des empreintes d'ancrage). La carte n'existe
donc que dans le navigateur, entre la confirmation d'épisode et le rechargement
suivant. Une carte du workflow a été établie pour trancher.

Conséquence directe : l'option « le panneau va chercher les candidats lui-même »
était **impossible** — il lui aurait fallu POSTer une confirmation, or confirmer
est un acte du praticien. Arbitré : **le navigateur enchaîne** — la section
clinique appelle `assembler` dès sa réponse `ready`, le poste de pilotage porte
un compteur d'assemblages, le panneau relit. L'échec de l'assemblage ne fait
jamais échouer la confirmation : l'épisode est confirmé, la carte est affichée,
c'est le résultat attendu.

**Le SHA du périmètre signé a dû être exposé.** Le moteur ne peut pas le lire
(G7 lui interdit `lib/clinical/`) et l'écran non plus. La réponse `ready` le
porte donc à côté de la carte — jamais dedans, sinon toutes les empreintes déjà
émises se déplaceraient — avec l'identifiant du canal de plainte, lu à travers
`tablePrioritesSignee()` : servir le SHA d'une table non signée laisserait
l'écran se réclamer d'une signature qui ne commande rien.

**Deux défauts trouvés par les paliers, tous deux invisibles de `tsc`.**

La garde de fraîcheur de la matrice de consommation a mordu la première : mon
import de `CANAL_PLAINTE` dans un composant `'use client'` aurait embarqué **les
667 lignes de la table signée** — règles, seuils, motifs — dans le bundle du
navigateur, pour une seule chaîne. Corrigé en faisant porter l'identifiant par
la réponse serveur ; la dérive de la matrice a disparu avec la cause.

Puis **T2 a fait échouer la construction de production** : le panneau, qui ne
prend du moteur qu'une borne de longueur, tirait `node:crypto` dans le bundle.
Le défaut venait du LOT-02 — le module mêlait un domaine pur et un hachage
réservé au serveur. Le découpage suit désormais la seule dépendance qui
l'exige : `assemblageProposition.ts` porte le hachage et l'assembleur,
`propositionObjectif.ts` reste **pur et n'importe rien**. Ce zéro est devenu un
invariant asserté (G7-1) : il rendra rouge, avant le build, toute dépendance
réservée au serveur qui y reviendrait.

**Deux ancres d'anti-vacuité se sont périmées au découpage, et elles l'ont dit
bruyamment** — exactement ce qu'on leur demande. C'est le risque que la revue du
LOT-02 avait nommé ; il s'est réalisé et il a été vu.

**Validation.** T1 vert. **T2 : 5 840 Vitest verts**, E2E 155 passés et 1 échec
— `portail-parcours` sur iPhone 13, blocage WebKit que l'outillage classe
lui-même comme signature macOS jamais observée en CI, et que le LOT-02 avait
déjà démontré étranger au lot sur ce même spec. Bancs touchés : route objectifs
41 cas, panneau 22, gardes G1-G6 14.

Reste : la revue `wn-reviewer`.
