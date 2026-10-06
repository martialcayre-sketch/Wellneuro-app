---
id: "LOT-23"
titre: "BP-23 — Relecture réelle (D-213 §1)"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-23 (BP-23) — Relecture réelle (D-213 §1)

## But

Exécuter `D-213` §1 sur la route : la relecture cesse d'être un tampon.

## Résultat observable

`review` reste nul quand la coche de relecture est fausse ; la validation pour
diffusion reste un second verrou.

## Périmètre

La route des versions (`versions/route.ts`) et son banc ; le transport de la
coche depuis le constructeur (cadrage du 2026-10-06, piège 1).

## Hors périmètre

~~L'interface seule : le banc porte sur la route.~~ Levé par le cadrage du
2026-10-06 : sans transport de la coche, le correctif de route bloque toute
diffusion. Le banc porte toujours sur la route ; l'interface suit dans la
même PR.

## Fichiers probables

- `web/src/app/api/praticien/protocoles/versions/route.ts`
- `web/src/lib/protocol/versioning.ts` (court-circuit « inchangé »)
- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx`
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx`

## Interdits

- Contrôle d'accès avant la lecture des données.
- Aucune modification de logique clinique.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-01 (BP-01) ; `D-213` §1.

## Cadrage du 2026-10-06 (avant code) — deux pièges, trois questions

Lecture du dépôt le 2026-10-06, sans écrire de code. Le « banc sur la route »
seul ne suffit pas : deux pièges rendraient le correctif nuisible.

**Piège 1 — le client n'envoie aucune coche.** `ProtocolMiniBuilder.tsx` porte
`reviewed` (remis à faux par `markDirty`). Mais `saveVersion` le pose à vrai
sans condition, et la soumission (`collectSubmission`, envoyée par
`ClinicalRuntimeSection.tsx` vers `protocoles/versions`) ne contient aucun champ
de coche. Si la route aligne `review` sur une coche absente, chaque
enregistrement devient `draft`. `validateDiffusionApproval` refuse alors
(`not_reviewed`), et le portail (`portailProtocol.ts`, `patient/protocole`)
comme le contenu patient (`contenuPatientProtocole.ts:101`) ne servent plus
rien. Les protocoles réels se bloquent. **La route et le transport côté client
partent donc ensemble** : le « hors périmètre : l'interface » de cette fiche
est à lever.

**Piège 2 — une relecture sans modification est un no-op.** `inputHash`
contient `status` et `review`, mais le court-circuit de la route juge
`isClinicalChange`, c'est-à-dire `clinicalContentHash`, qui exclut la revue.
Enregistrer décoché, puis cocher sans toucher au texte, rend
`unchanged: true` : aucune version relue ne naît jamais.

**Effets de bord à tenir.** `buildFoodCompassProtocolV2FromSource` exige une
cible `practitioner_reviewed` : un enregistrement décoché avec référence C5 en
V2 devient un 400. `prevol.ts` suppose `reviewedAt` non nul sur les protocoles
relus. L'approbation du cockpit (`activeReviewedVersion`) se désactive tant
que la version active est `draft`.

**Questions au responsable :**

1. **Relire un contenu inchangé.** Recommandation : une seule transition
   écrit sans changement de contenu, de `draft` vers relu. Contenu identique,
   version active `draft`, coche vraie : nouvelle version append-only (même
   contenu, revue posée, chaînée par `supersedes_draft_id`). Écarté : modifier
   la ligne existante, ce qui romprait l'append-only.
2. **Ré-enregistrer décoché un contenu déjà relu.** Recommandation : no-op.
   La transition inverse, de relu vers `draft`, n'écrit jamais sur un contenu
   identique. La relecture s'attache au contenu ; une coche remise à faux sans
   frappe ne la retire pas. L'alternative serait de rétrograder en `draft`.
   **Contrat proposé pour le banc** : contenu identique ⇒ no-op, SAUF
   (active `draft` ET coche vraie) ⇒ nouvelle version relue. Contenu modifié
   ⇒ nouvelle version, relue si et seulement si la coche est vraie.
3. **Le geste à l'écran.** Recommandation : une coche explicite « J'ai relu ce
   contenu » à côté d'« Enregistrer la version ». Elle part dans la soumission
   et se remet à faux à chaque frappe, comme aujourd'hui. La validation pour
   diffusion reste le second geste, distinct.

**Le passé reste tel quel.** Les versions déjà enregistrées portent un tampon
non gagné. On n'y touche pas (append-only). La date de bascule se lit au
changelog du lot.

## Arbitrages du responsable (2026-10-06)

1. Relire un contenu inchangé : **les trois recommandations sont retenues**.
   Brouillon actif + coche vraie ⇒ nouvelle version relue, chaînée.
2. Décoché sur un contenu déjà relu : **no-op**.
3. Le geste : **coche explicite** « J'ai relu ce contenu ».
4. Question née du code (piège 3, ci-dessous) : la révision après arbitrages
   biologiques porte **sa propre coche dans le panneau** ; le bouton reste
   inactif tant qu'elle n'est pas posée.

**Piège 3, trouvé en écrivant le transport.** La révision après arbitrages
(`ArbitrageBiologiquePanel` → `ClinicalRuntimeSection.reviserApresArbitrages`)
enregistre sans passer par le constructeur. Sans coche, elle naissait
toujours brouillon, sur un contenu qu'aucun écran ne permettait ensuite de
relire. D'où l'arbitrage 4.

Trace de la précision : `D-213` §1, précision du 2026-10-06.

## Étapes

- [x] Cadrage (2026-10-06) : deux pièges, trois questions ci-dessus.
- [x] Arbitrages du responsable sur les trois questions (et la quatrième).
- [x] Écrire le banc sur la route (huit cas, `relecture réelle (BP-23)`).
- [x] Corriger la route et transporter la coche depuis le constructeur et le
  panneau d'arbitrage.
- [x] T2 : parcours d'enregistrement du constructeur, coche comprise.

## Tests

T2 ; banc de route.

## Critères de done

Le banc mord sur la route, pas seulement sur l'interface.

## Résultats

- Route : `review` n'est posé que sur `reviewed === true` (booléen strict :
  `'true'`, `1` et `'oui'` ne relisent rien). Seule la transition brouillon → relu
  écrit sur un contenu identique. Un enregistrement sans action est refusé
  (400 `draft_invalid`) : il ne passait que parce que la relecture tamponnée
  le faisait valider plus loin.
- Une référence Boussole (V1/V2) exige la coche : refus 400 explicite, au lieu
  de l'erreur interne de `buildFoodCompassProtocolV2FromSource`.
- **Mutations jouées** : tampon inconditionnel rétabli ⇒ 4 rouges sur 47 ;
  exception du no-op retirée ⇒ 1 rouge (la version relue chaînée). Les deux
  restaurées, verts.
- Revue wn-reviewer : NO-GO sur un défaut, corrigé. Le bouton « Re-valider
  pour diffusion » s'affichait sur une version active brouillon et ne faisait
  rien ; il ne s'affiche plus que sur une version relue, et le panneau dit le
  geste dû. La coche du panneau d'arbitrage survivait à la révision suivante :
  le panneau se remonte désormais à chaque version active. Routés au handoff :
  le badge du constructeur suit la coche locale, pas le serveur ; un brouillon
  relu perd ses arbitrages (append-only) ; pas de réhydratation du
  constructeur ; E2E de diffusion après relecture.
- Les versions déjà enregistrées gardent leur tampon (append-only) ; la bascule
  se lit au changelog `2026-10-06-bio-parcours-bp23-relecture-reelle.md`.
