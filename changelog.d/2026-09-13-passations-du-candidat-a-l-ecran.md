### Carte de décision — les passations qui fondent un candidat atteignent enfin l’écran (2026-09-13)

`ClinicalFindingProvenance.responseIds` est calculée, validée contre le snapshot
— `buildDecisionCard` **jette** si un identifiant y est absent —, hachée dans
l'empreinte de la carte et envoyée au navigateur sur **chaque** candidat de
priorité. Aucun composant ne la rendait. C'est la position exacte qu'occupaient
les limitations d'abstention avant le LOT-05 : un fait porté par la carte, payé
par le moteur, et invisible.

`DC-34` exige que le praticien puisse ouvrir « quelles données patient » fondent
une suggestion ; `DC-01` fait de la chaîne observation → instrument une part de
ce qui **valide** la sortie, pas un supplément. Le dépliant « Voir les sources
et limites » porte donc désormais, sous le motif du candidat, les passations qui
le fondent — instrument et date, dans le fuseau clinique.

**Par candidat, jamais par argument, et le banc l'épingle.** Un candidat porte
UN `rationale` monolithique et UN jeu de `responseIds` dédupliqué pour toute la
règle : le couple {motif d'un déclencheur, instruments de ce déclencheur}
n'existe qu'un instant dans `evaluerPriorites` avant d'être aplati. Découper le
rationale à l'écran pour coller « les mêmes passations » sous chaque morceau
rendrait N provenances identiques présentées comme distinctes — un maillon
**faux**, que `DC-01` sanctionne plus lourdement qu'un maillon absent.

**Aucun claim n'est servi.** `PRIORITY_RULES_V1[].justificationClaims` existe et
serait tentant, mais `D-093` amendé par `D-163` l'interdit tant que le
classement, les textes `LIMITATION_*` et l'ordre d'évaluation vivent hors du
périmètre signé : peindre des claims VALIDE sous un candidat dont la sélection
n'est pas signée attacherait une provenance certifiée à un acte qui ne l'est
pas. Instrument et date sont des faits du relevé, pas une certification — et un
banc refuse toute apparition de `WN-CL-` ou du mot « claim » sous le candidat.

**Une source introuvable est DITE, pas élidée.** C'est la divergence assumée
avec `recoupementsContradictions`, qui la filtre : là-bas on calcule une
intersection, et un identifiant sans instrument n'appartient à aucune des deux
listes. Ici on rend une provenance, et taire une source qu'on n'a pas su
retrouver ferait passer une chaîne trouée pour une chaîne complète.

**Le relevé arrive à côté de la carte, jamais dedans.** `sourceRefs` vit dans le
snapshot ; le faire entrer dans `DecisionCard` déplacerait son `inputHash`, donc
`versionId`, donc le recoupement de toutes les versions de protocole déjà
persistées (`D-054` §2, `D-127`). La prop est facultative et vide par défaut :
hors `ready`, la rubrique dit simplement que les sources ne sont pas retrouvées.
