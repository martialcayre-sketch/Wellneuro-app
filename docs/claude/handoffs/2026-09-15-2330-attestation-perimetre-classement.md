# Le périmètre du classement est attesté

**Attestation clinique du responsable**, 2026-09-15, sur l'empreinte
`da1ba306c0551d7b`. Elle a été demandée et donnée **en toutes lettres** : le
dépôt exige qu'elle soit décidée, pas déduite d'un « relue ».

## La chronologie fait la valeur

1. Périmètre posé INERTE et haché AVANT relecture ([[D-185]]) — pour que « ce
   qui est relu » soit mesurable.
2. Contre-expertise : trois des cinq objets ne pilotaient rien → liaison par
   comportement.
3. Contre-expertise : le banc ne couvrait que ce qu'il avait pensé à nommer →
   trois mutations vertes sur 46 cas.
4. Le responsable relit **et ne signe pas** : une réserve, fondée → le troisième
   invariant n'avait aucune épreuve ([[D-197]]).
5. La correction **ne touche pas au périmètre** → relecture toujours valide.
6. Le responsable atteste.

**Trois corrections de la preuve, zéro du contenu relu.**

## Ce qui est neuf, et ce qu'il faut savoir

**L'attestation se périme, et le contournement habituel ne marche plus.**

| Geste | Avant | Après |
| --- | --- | --- |
| Éditer un texte du périmètre | l'ancre rougit | l'ancre **et** l'attestation |
| Éditer **puis réancrer** | tout vert | **l'attestation rougit** |

`shaRelu` est un LITTÉRAL FIGÉ. Toute édition du module déplace `empreinte()`, le
littéral ne suit pas, et le banc réclame une re-signature en le disant.

**Si tu touches à `perimetreClassementV1.ts`** : ce n'est PAS une empreinte à
reporter. Retirer l'attestation (`relu: false`, dates et sha à `null`), écrire une
décision qui dit ce qui a bougé, et la redemander au responsable.

**L'écran a bougé** : la liste « Ajoutées par le moteur (hors périmètre signé) »
est SCINDÉE, parce qu'elle mélangeait les quatre textes relus et le motif de la
gate, qui ne l'est pas. L'écran LIT `ATTESTATION_CLASSEMENT` — retirée, les
textes retombent seuls sous « hors périmètre signé ».

## Ce qui reste ouvert

**La légitimité clinique des deux premiers termes n'est pas attestée.** Que la
plainte dominante prime sur la priorité intrinsèque — une règle de priorité 1
passe derrière une priorité 2 dès que le patient cote l'autre plus haut —
appellera son propre arbitrage. Le périmètre la décrit ; il ne la justifie pas.

## Passe Codex — BLOQUER, deux findings, et le second a périmé la signature

**P1-1 — l'écran déduisait la provenance d'une ÉGALITÉ DE LIBELLÉ.** Un motif de
gate portant le même texte qu'une limitation attestée s'affichait « relu ».
Vérifié par exécution : `INTITULE RENDU = "Périmètre du classement (relu le
2026-09-15)"` sur un texte qui ne venait pas du périmètre.

**Le dépôt l'interdisait DÉJÀ en toutes lettres** — contrat de
`limitationsRegleSignee` : « la deviner par comparaison de chaînes ferait
dépendre une garde de provenance d'une égalité de ponctuation ». La réponse était
écrite dans le fichier que je modifiais.

Corrigé : le producteur déclare `limitationsPerimetreClassement`, l'écran groupe
là-dessus.

**P1-2 — la PORTÉE vivait dans un commentaire**, donc n'était ni opposable ni
hachée. `PORTEE_ATTESTATION` entre dans `PERIMETRE_CLASSEMENT_V1`.

**CONSÉQUENCE : `da1ba306c0551d7b` → `9792c12e72db93d8`, ET LA SIGNATURE EST
PÉRIMÉE.** Le verrou posé le matin même a refusé la signature de celui qui
l'avait écrite. L'attestation est reposée à `relu: false` et redemandée.

## Mutations

| Mutation | Avant | Après |
| --- | --- | --- |
| Écran regroupe par chaîne (le défaut d'origine) | vert | rouge |
| Producteur oublie une condition côté provenance | **verte** | rouge |
| Un texte du périmètre servi mais NON déclaré | — | rouge |
| Intitulé d'écran élargi à « Périmètre du classement » | — | rouge |

La deuxième a survécu à ma première rédaction : rien ne garantissait que
`limitationsPerimetreClassement` et `limitations` restent cohérentes. Deux bancs
ajoutés — sous-ensemble, et exhaustivité.

**T1 a attrapé ce que `vitest` laissait passer** : un `Set` de littéraux dont
`has()` refuse un `string` à la compilation. Banc vert sous vitest, rouge sous
`tsc`.

## La branche « attestation posée » est prouvée séparément

`DecisionSummaryCardAtteste.test.tsx` double le seul champ `relu`. Sans lui,
cette branche serait livrée SANS AUCUNE PREUVE et ne s'exercerait pour la
première fois qu'en production, le jour de la re-signature.

## À CONSTATER AVANT LE DÉPLOIEMENT — la dérive d'empreinte

`limitationsPerimetreClassement` est un champ du candidat, `priorityCandidates`
entre dans `hashInput`, et `canonicalSha256` hache toutes les clés propres.
**`decisionCard.inputHash` bouge donc sur tout dossier** — vérifié par exécution :
`38ab6a859c80ff54` → `6f652101dec8d209` sur le harnais ergonomique.

Aucun banc ne peut l'attraper : ils recalculent les deux côtés. Seule une ligne
persistée avant le déploiement porte l'ancienne empreinte.

Inventaire fait : la plupart des comparaisons sont persisté-contre-persisté et ne
bougent pas. Trois surfaces comparent du persisté à du recalculé —
`buildPatientProtocolView` (`carte_derivee`, écran patient éteint, refus bruyant),
`ProtocolConsultationPanel` (brouillon non éligible), `POST
/api/praticien/protocoles` (`provenance_mismatch`, 400). **Aucune n'est
silencieuse.** La sélection de priorité, elle, lit sur `decisionCardId` seul :
elle n'est pas touchée.

La dernière lecture de production ([[D-173]], 2026-09-12) donnait **zéro
approbation de diffusion**. Elle date de quatre jours. **Un one-off avant merge
la reconstate** ; s'en passer coûterait un écran patient éteint sans que personne
ne l'ait prévu.

## Seconde contre-expertise — deux findings, un seul était encore ouvert

**P1-1, ouvert et corrigé.** L'écran ne lisait que `ATTESTATION_CLASSEMENT.relu`.
Un `shaRelu` périmé ou une date nulle présentaient les limitations comme relues,
alors que le banc de garde l'aurait refusée. **Le banc de l'écran administrait la
preuve du trou** : il injectait `shaRelu: 'simulé'` et attendait « relus ».

`attestationValide(attestation)` pose les trois questions ensemble, dans le
périmètre, lue par le banc comme par l'écran. `EMPREINTE_PERIMETRE_ATTENDUE`
descend dans le module — l'écran tourne dans le navigateur et ne peut que
comparer deux chaînes ; un cas de banc, et un seul, prouve que ce littéral vaut
le hash réel, sans quoi la comparaison serait creuse.

Mutation jouée : rendre à l'écran la lecture du seul booléen tue les deux
nouveaux cas et laisse vert l'anti-vacuité.

**P1-2, réfutation juste — de mon inventaire, et fermée par ailleurs.**
`GET /api/praticien/ja/cycle` rendait `protocoleDiffuse: false` sur
`carte_derivee` ; le carnet praticien le confond avec l'absence de protocole et
efface l'épisode **sans un mot**. Mon inventaire affirmait « aucune surface n'est
silencieuse » : faux.

Pourquoi je l'avais manqué — et c'est ce qu'il faut retenir : **l'inventaire a été
fait en cherchant les comparaisons d'empreintes**, et `ja/cycle` n'en fait
aucune ; il consomme le REFUS du rejeu. Un balayage sur `inputHash` ne pouvait
pas le voir.

La campagne voisine l'avait trouvé indépendamment le même jour ([[D-200]]) :
route, alerte praticien et banc de régression `carte_derivee` sont entrés ici par
la fusion de `main`.
