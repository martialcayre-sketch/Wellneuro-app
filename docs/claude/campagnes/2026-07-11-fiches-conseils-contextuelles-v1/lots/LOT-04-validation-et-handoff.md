---
id: "LOT-04"
titre: "Validation, tests de bout en bout et handoff"
statut: "livré"
dépend_de: "LOT-03"
---

# LOT-04 — Validation et handoff

> Compilé le 2026-07-18 depuis `../CAMPAGNE.md` (esquisse : « validation et handoff,
> C4/C5 comme futurs fournisseurs de blocs »). **Documentaire + tests. Aucune
> migration.**

## But

Valider C3 V1 de bout en bout (composition → états → rendus par destinataire →
impression → envoi réutilisé), consigner les dettes et **préparer C4/C5 comme
fournisseurs de blocs** sans les construire.

## Résultat observable

Un parcours praticien complet et testé : composer un document depuis des blocs
validés, le faire passer par les états, produire les trois rendus, l'imprimer en
HTML et l'envoyer par l'infra existante. Un handoff qui liste les points
d'extension (C4/C5, fil médecin, PDF, persistance).

## Périmètre

- Tests de bout en bout du parcours V1 (composition → envoi), données fictives.
- **Contrat d'extension bloc** : documenter comment C4 (fiches compléments) et C5
  (fiches alimentaires) publieront des blocs consommables par C3 — **contrat, pas
  implémentation** (C3 ne possède aucun contenu clinique, A2).
- Handoff : dettes assumées et conditions d'ouverture (fil médecin 5.0, PDF natif,
  persistance/versionnage immuable si (b)).
- Mise à jour de la fiche de campagne et du registre si une décision nouvelle est
  actée (sinon, pointeur seulement).

## Hors périmètre

- Construire les blocs C4/C5 (leurs campagnes).
- Fil bidirectionnel médecin, PDF natif, signature, authentification médecin.
- Migration/persistance sauf gate (b) confirmé.

## Fichiers probables

- `docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/**`
  (handoff, dettes)
- Tests E2E/unitaires du parcours (`web/**`), données fictives
- `docs/claude/REGISTRE_FRONTIERES.md` (pointeur, si décision nouvelle)

## Interdits

- Interface 100 % en français ; aucun secret ; données patient fictives seulement.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.
- Ne pas absorber le contenu clinique de C4/C5 (frontière A2).

## Étapes

- [x] Tests de bout en bout V1 (composition → états → rendus par destinataire) :
      `web/src/lib/documents/parcours.test.ts`.
- [x] Contrat d'extension bloc pour C4/C5 (documentaire) : `../HANDOFF_LOT-04.md` §2.
- [x] Handoff : dettes (montage, persistance, PDF), fil médecin 5.0 tranché/reporté.
- [x] Mettre à jour la fiche campagne (statut → terminée) ; pointeur registre.

## Tests

- `cd web && npm run type-check` ; `cd web && npm run scoring-check` ;
  `bash scripts/check_no_secrets.sh` ; `node scripts/wn-campaign-audit.mjs`
- E2E parcours praticien (rendus par destinataire, badge patient, envoi).

## Critères de done

- [x] Parcours V1 testé de bout en bout (domaine : synthèse → blocs → états → rendus).
- [x] Contrat C4/C5 documenté (sans implémentation).
- [x] Handoff et dettes consignés ; discordance 5.0 « fil de correspondance »
      **explicitement reportée** (rendu sortant V1 livré ; fil bidirectionnel à cadrer).
- [x] Aucune migration.

## Risques / points de vigilance

- **Discordance 5.0** : trancher ici le statut du « fil de correspondance »
  médecin (rendu sortant V1 vs fil bidirectionnel futur, sans HDS).
- Ne pas laisser la persistance se glisser sans gate confirmé.

## Résultats

Livré le 2026-07-18 — **clôture de C3 V1**. Handoff complet :
[`../HANDOFF_LOT-04.md`](../HANDOFF_LOT-04.md).

- **Parcours E2E (domaine)** `web/src/lib/documents/parcours.test.ts` : synthèse
  validée → `blocsDepuisSynthese` → `assemblerDocument` → machine d'états jusqu'à
  « envoyé » → `renderDocumentHtml` patient/médecin/praticien. Vérifie la **frontière
  de données** sur tout le parcours (champ interne jamais côté patient/médecin ;
  synthèse non validée → aucune diffusion).
- **Contrat d'extension bloc C4/C5** documenté (handoff §2) : provenance ancrée sur
  une vérité déjà persistée, régime + garde IA, field-filter, pattern
  `blocsDepuisX` pur. **Sans implémentation** (frontière A2).
- **Dettes** (handoff §3) : montage en page + route d'envoi C3 ; persistance
  option (b) sous gate migration non ouvert ; PDF natif ; signature ; auth médecin.
- **Discordance 5.0** (handoff §4) : rendu médecin **sortant** livré en V1 ; **fil
  bidirectionnel** (sans HDS) **reporté** à une campagne/lot d'extension dédié.

Validations : `type-check` vert ; `vitest` documents **38/38** ; `scoring-check`
vert ; `check_no_secrets` OK ; audit campagnes vert (flags CI). Aucune migration.
