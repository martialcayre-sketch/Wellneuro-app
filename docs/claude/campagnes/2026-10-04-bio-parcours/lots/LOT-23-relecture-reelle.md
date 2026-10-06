---
id: "LOT-23"
titre: "BP-23 — Relecture réelle (D-213 §1)"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-23 (BP-23) — Relecture réelle (D-213 §1)

## But

Exécuter `D-213` §1 sur la route : la relecture cesse d'être un tampon.

## Résultat observable

`review` reste nul quand la coche de relecture est fausse ; la validation pour
diffusion reste un second verrou.

## Périmètre

La route des versions (`versions/route.ts`) et son banc.

## Hors périmètre

~~L'interface seule : le banc porte sur la route.~~ Levé par le cadrage du
2026-10-06 : sans transport de la coche, le correctif de route bloque toute
diffusion. Le banc porte toujours sur la route ; l'interface suit dans la
même PR.

## Fichiers probables

- `web/src/app/api/**/versions/route.ts`

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

1. **Relire un contenu inchangé.** Recommandation : le no-op devient « même
   contenu clinique ET même état de relecture ». Cocher un brouillon inchangé
   crée une nouvelle version append-only (même contenu, revue posée, chaînée
   par `supersedes_draft_id`). Écarté : modifier la ligne existante, ce qui
   romprait l'append-only.
2. **Ré-enregistrer décoché un contenu déjà relu.** Recommandation : no-op.
   La relecture s'attache au contenu ; une coche remise à faux sans frappe ne
   la retire pas. L'alternative serait de la rétrograder en `draft`.
3. **Le geste à l'écran.** Recommandation : une coche explicite « J'ai relu ce
   contenu » à côté d'« Enregistrer la version ». Elle part dans la soumission
   et se remet à faux à chaque frappe, comme aujourd'hui. La validation pour
   diffusion reste le second geste, distinct.

**Le passé reste tel quel.** Les versions déjà enregistrées portent un tampon
non gagné. On n'y touche pas (append-only). La date de bascule se lit au
changelog du lot.

## Étapes

- [x] Cadrage (2026-10-06) : deux pièges, trois questions ci-dessus.
- [ ] Arbitrages du responsable sur les trois questions.
- [ ] Écrire le banc sur la route, rouge sur le code actuel.
- [ ] Corriger la route et transporter la coche depuis le constructeur.
- [ ] T2 : parcours d'enregistrement puis de diffusion d'un protocole.

## Tests

T2 ; banc de route.

## Critères de done

Le banc mord sur la route, pas seulement sur l'interface.

## Résultats

À compléter à la clôture.
