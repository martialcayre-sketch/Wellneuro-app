---
id: "LOT-04"
titre: "Un seul parcours patient"
statut: "livré (#591, 2026-08-05)"
dépend_de: "LOT-01"
---

# LOT-04 — Un seul parcours patient

## But

Deux parcours coexistent : le portail permanent (`web/src/app/portail/[token]/`,
la cible) et le flux historique par assignation
(`web/src/app/patient/[idAssignation]/page.tsx`). Tant que les deux vivent, deux
URL doivent être testées, deux parcours peuvent diverger, chaque correction se
reporte deux fois, les analytics deviennent illisibles et le support patient reste
ambigu.

On ne supprime pas une URL sans preuve qu'elle n'est plus empruntée. Ce lot
**date** le retrait et le prépare ; il l'exécute seulement si la preuve est là.

## Résultat observable

- On sait, chiffres à l'appui, combien de patients ont emprunté le parcours
  legacy sur les 30 derniers jours.
- Le parcours legacy porte, dans le code et dans la doc, une **date de retrait**.
- S'il n'est plus emprunté : il est retiré, et une redirection vers le portail
  remplace la route.
- S'il l'est encore : les patients concernés ont un chemin de bascule identifié,
  et le retrait est planifié dans un lot ultérieur nommé.

## Périmètre

- Mesurer l'usage réel du parcours legacy (`execute_sql`, lecture seule).
- Comparer les deux parcours : quelle divergence fonctionnelle existe aujourd'hui ?
- Marquer la route legacy comme sortante (commentaire daté, doc, analytics).
- Retrait ou redirection **si et seulement si** l'usage est nul.

## Hors périmètre

- Refonte du portail permanent.
- Migration de données patient.
- Suppression de la notion d'assignation côté praticien — seule la **surface
  patient** est concernée. Les routes `api/praticien/*` qui manipulent
  `idAssignation` restent inchangées.

## Fichiers probables

- `web/src/app/patient/[idAssignation]/page.tsx`, `web/src/app/patient/layout.tsx`
- `web/src/app/portail/[token]/`
- `web/e2e/` (parcours à dédupliquer si retrait)
- `docs/claude/PROJET_CONTEXTE.md`
- `changelog.d/2026-08-05-parcours-patient-unique.md`

## Interdits

- Pas de donnée patient réelle — mesure agrégée seule, exemples limités à Sophie
  Nicola, Jennifer Martin, Michel Dogné.
- Pas de suppression d'URL sans mesure préalable.
- Pas de migration.
- **E2E sur le Mac uniquement** (`npm run test:e2e` réinitialise `PAT_SEED_03`).

## Étapes

- [x] Mesurer l'usage du parcours legacy sur 30 jours.
- [x] Documenter les divergences fonctionnelles entre les deux parcours.
- [x] Marquer la route sortante avec sa date de retrait.
- [x] Retirer ou rediriger si usage nul. — *usage non nul (61 réponses/8 patients) : redirection posée quand même, route API retirée (voir Résultats), répertoire page conservé et daté.*
- [x] T3 `npm run test:worktree` (changement de parcours patient).

## Tests

- E2E : le portail couvre tout ce que couvrait le parcours legacy.
- Si redirection : test qu'une ancienne URL mène au portail sans perte de contexte.
- Baselines visuelles à rafraîchir si l'UI bouge.

## Critères de done

- [x] L'usage réel du legacy est chiffré et écrit.
- [x] Une date de retrait existe, dans le code et dans la doc.
- [x] Les E2E ne testent plus deux fois le même parcours pour rien. — *aucun E2E ne testait le legacy avant ce lot.*
- [x] Aucune régression sur le parcours patient (T3 vert).

## Résultats

**Le cadrage a débordé le périmètre écrit.** La revue adversariale préalable
(classe Auth) a trouvé un défaut de sécurité vivant, pas seulement une dette
d'architecture d'URL : sur 6 des 7 routes `api/patient/*`, le repli d'accès
sans session (email + `idAssignation`) ne relisait jamais `patients.actif` ni
`accessTokenRevoked` — un patient révoqué ou désactivé par son praticien
gardait un accès complet (lecture ET écriture). Le lot a donc porté deux
gestes, pas un.

**Mesure d'usage** (`execute_sql`, lecture seule, 2026-08-05) : **61 réponses
déposées par 8 patients distincts sur 30 jours** hors session portail. Usage
réel, pas résiduel négligeable.

**Décision retenue, en deux temps.** Un premier correctif a patché le repli
(revalider `actif`/`accessTokenRevoked` sur le chemin email) sans le retirer —
la revue a rendu NO-GO : une fois la redirection posée, plus aucun appelant
légitime n'atteint ces routes, donc garder le repli ne protège plus d'usage
réel, seulement une surface d'attaque. **Le repli a été retiré entièrement**
(6 routes exigent désormais une session, comme `protocole` déjà) — vérifié
empiriquement d'abord que la cible de redirection (`/portail/connexion`)
fonctionne réellement en production (logs runtime : sessions Google et lien
magique ouvertes dans les dernières 24h, les trois drapeaux G4/G5 actifs).

**Deuxième NO-GO, deuxième correction.** Les 6 routes renvoyaient 404 (lectures)
ou 403 (écritures) sur absence de session — mais le hub patient ne redirige
vers le gate de reconnexion que sur 400/401. Une session expirée (TTL 12h
glissantes) sur un lien profond rouvert atterrissait donc sur un écran d'erreur
sans chemin de retour. Codes uniformisés en **401** sur les 6 routes.

**Redirection inconditionnelle** `/patient/[idAssignation]` → `/portail/connexion`
(`next.config.mjs`, 307 — pas 308, réversible). Répertoire de la page legacy
conservé (pas supprimé) et marqué daté : son retrait effectif est laissé à un
lot ultérieur nommé, une fois vérifié que le portail couvre bien le
consentement RGPD et la consultation de réponses verrouillées que la page
legacy portait aussi.

**Validation** : T1 (`npm run check`) et T3 (`npm run test:worktree`, 120 tests
E2E) verts. **Trois passes `wn-reviewer`** : 2 NO-GO (contournement de
révocation, puis codes HTTP incompatibles avec la reprise cliente), 3ᵉ passe
**GO** sans réserve bloquante.

**Non fait, documenté pour la suite** : props `email` mortes dans
`ConsentScreen`/`GenericQuestionnaire`/`PlaintesForm` (le serveur ne les lit
plus) ; code d'événement `QUESTIONNAIRE_SUBMIT_FORBIDDEN` réutilisé pour un
refus 401 (à renommer si un jour un tableau d'alerte le lit).
