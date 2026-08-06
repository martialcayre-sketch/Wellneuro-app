---
id: "LOT-02"
titre: "L'orientation propose des ensembles personnalisés (⚠ clinique)"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — L'orientation propose des ensembles personnalisés

## But

Faire de l'orientation un producteur d'**envois personnalisés** : les
suggestions ne ciblent plus de packs mais des questionnaires, et le geste
praticien depuis le panneau devient « Ajouter à la file d'envoi » (arbitrage du
2026-08-06). C'est le lot **clinique** de la campagne : il modifie la table de
règles signée.

## Résultat observable

- Plus aucune suggestion à `packId` dans `orientationRulesV1.ts` ; les 6
  suggestions concernées portent les compositions de questionnaires arrêtées au
  LOT-01.
- `ORIENTATION_RULES_SHA256` re-signée ; le banc de certification des règles
  vert.
- Dans le panneau d'orientation, chaque recommandation (ou la sélection)
  s'ajoute à la file d'envoi du patient ; plus de bouton « Assigner ce pack ».
- Le badge « déjà assigné » (LOT-B #589) et le segment « État » transmis au
  modèle IA restent exacts avec des cibles questionnaires.

## Périmètre

- `web/src/lib/clinical/orientationRulesV1.ts` — re-ciblage des 6 suggestions.
- `web/src/components/patient-cockpit/OrientationPanel.tsx` — geste « Ajouter à
  la file d'envoi » (`POST /api/praticien/file-envoi`, `qids` libres, plafond
  60, dédup existante) ; textes UI en français.
- `web/src/app/api/praticien/synthese/route.ts` — vérifier que le bloc
  d'orientation transmis au modèle reste cohérent sans cibles pack.
- CHANGELOG : fragment `changelog.d/` documentant le changement de logique
  clinique (exigence de `CLAUDE.md`).

## Hors périmètre

- Toute désactivation de pack en base (LOT-03) — les packs restent actifs
  pendant ce lot ; l'ordre garantit qu'aucune règle ne perd sa cible avant
  d'avoir sa composition de remplacement.
- `portail/valider` (pack de base) et `pack-reevaluation`.
- Toute migration.

## Fichiers probables

- `web/src/lib/clinical/orientationRulesV1.ts`
- `web/src/lib/clinical/orientationEngine.ts` (absorption pack→membres, si du
  code mort apparaît — retrait minimal seulement)
- `web/src/components/patient-cockpit/OrientationPanel.tsx`
- `web/src/app/api/praticien/synthese/route.ts`
- `changelog.d/2026-08-JJ-orientation-ensembles-personnalises.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot ; ne pas toucher aux seuils ni aux conditions de
  déclenchement des règles — seules les **cibles** changent.

## Étapes

- [ ] Re-cibler les 6 suggestions selon les compositions du LOT-01.
- [ ] Re-signer la table des règles et rejouer son banc.
- [ ] Brancher « Ajouter à la file d'envoi » dans le panneau (états : ajouté,
      déjà dans la file, déjà assigné).
- [ ] Vérifier le segment « État » côté synthèse IA.
- [ ] **Revue adversariale `wn-reviewer` obligatoire**, puis relancer le
      reviewer sur ses propres correctifs.

## Tests

- T1 après chaque édition ; banc des règles d'orientation.
- T2 avant commit (UI touchée).
- Mutation ciblée : une suggestion re-ciblée dont on retire un questionnaire
  doit faire échouer le banc (pas de garde de forme faible).

## Critères de done

- Zéro `packId` en cible de suggestion ; banc et signature verts.
- Parcours praticien : recommandation → file d'envoi → envoi groupé fonctionne
  avec la dédup existante.
- CHANGELOG porté, revue adversariale passée (GO explicite).

## Résultats

À compléter à la clôture.
