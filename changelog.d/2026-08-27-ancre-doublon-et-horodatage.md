### Une re-confirmation vise la ligne existante, et un contournement porte la date de sa confirmation (contre-revue `N1.1`, `N1.8`)

La contre-revue Codex du 2026-08-27 a **réfuté deux affirmations de niveau 1**.
Toutes deux vérifiées indépendamment avant correction.

**`N1.1` — le correctif de `D-113` était contournable par un doublon d'ancre.**
`ancreRecevable` raisonnait sur les NOMS : `T0` déjà posé ⇒ recevable, parce que
la persistance traite la re-confirmation en `upsert` idempotent. Mais idempotent
**sur son identifiant**. Un `T0` posté sous un identifiant que la base ne porte
pas n'était pas une re-confirmation : c'était une **création**, et le dossier se
retrouvait avec deux lignes `milestone = 'T0'`, donc deux cycles portant le même
nom.

Or le nom est précisément ce dont l'identifiant des mesures est dérivé depuis le
correctif précédent : les `J21` des deux cycles reprenaient tous deux
`…-T0-J21`, et **la collision de clé primaire que `D-113` venait de fermer se
rouvrait** — écriture perdue sous une réponse `ok: true`. Le premier correctif
avait déplacé le défaut, pas supprimé sa condition.

Une ancre déjà posée n'est désormais re-confirmable que par **l'épisode qui la
porte**. Un dossier portant déjà un doublon reste réparable : chacune de ses
lignes reste re-confirmable, seule la création d'une nouvelle est refusée.

**`N1.8` — la date d'un contournement était choisie par le client.** `decidePar`
était recoupé contre la session ; `decideLe` n'était vérifié que comme **ISO
lisible**. Le commentaire de la garde décrivait pourtant déjà le risque qu'il ne
fermait pas — « le dater à volonté, dans la seule ligne qui en fera foi pour
toujours ». Un contournement du rideau `D-052` pouvait donc porter un horodatage
arbitraire.

**Recoupé, pas réécrit** : réécrire ferait diverger l'épisode de celui qui a été
haché dans `snapshot.inputHash`, et casserait la chaîne de provenance que ces
routes existent pour tenir. Le recoupement **n'invente aucune tolérance** : le
cockpit pose un seul horodatage pour l'épisode, le snapshot, la revue et la
carte. Un contournement décidé à la confirmation porte donc exactement l'instant
de cette confirmation.

**Ce que ce contrôle ne ferme pas**, et qui est nommé plutôt que sous-entendu :
un épisode dont `confirmedAt` serait lui-même forgé reste cohérent avec ses
contournements. Ancrer `confirmedAt` sur une preuve serveur est un chantier
distinct.

**Les bancs portaient la laxité qu'ils auraient dû interdire** : trois fixtures
posaient un `decideLe` arbitraire, sans rapport avec la confirmation. Elles
prennent désormais l'horodatage de la fixture.

**Aucune modification clinique** au sens de `DC-17`/`DC-18` : aucun seuil, dose
ni borne n'est touché.
