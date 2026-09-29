# Contre-revue adverse, seconde passe — les bancs de la fiche d'assiette mordent-ils ?

> Énoncé versé au dépôt AVANT d'être joué. Lancé manuellement par le
> responsable. Première passe (sur lecture, sans mutation) :
> `docs/claude/REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_2026-09-29.md`.

## 0. Ta mission

La première passe a jugé les affirmations de `D-251` **sur lecture**. Aucune
mutation n'a été jouée : les bancs n'ont jamais été éprouvés par un tiers.
C'est ta seule mission : **pour chaque invariant ci-dessous, casse le code de
production et dis si le banc qui le garde rougit.**

L'auteur des bancs est l'auteur du code. **C'est toi qui choisis la
mutation**, pas lui : une mutation que l'auteur aurait prévue ne prouve rien.

**Avant de jouer une mutation, désigne le ou les bancs censés la détecter** —
ceux qui gardent la surface que tu casses, pas tous ceux de la ligne : une
ligne peut réunir des surfaces indépendantes (M11 en compte cinq), et le banc
d'une page n'a pas à rougir quand tu casses la route. **Si tous les bancs
désignés restent verts, c'est une trouvaille P1** (« banc qui ne mord pas sur
un invariant »), `CONFIRMÉE` puisque tu donnes la sortie. Un banc non désigné
qui reste vert ne prouve rien.

---

## 1. Règles d'engagement — non négociables

- **Mutations dans un worktree jetable seulement** :
  `git worktree add --detach <dossier> <commit>`, **propre à sa création**
  (`git status --porcelain` vide), jamais la copie où tu as été lancé. Tu y
  mutes, joues le banc, notes la sortie, remets le fichier
  (`git checkout -- <fichier>`), mutation suivante. À la fin :
  `git worktree remove --force <dossier>`. Si tu ne peux pas créer ce worktree
  propre, **ne mute pas** : tout est `NON VÉRIFIABLE`, avec le motif.
- **Une mutation touche le code de production, jamais un banc.** Une seule
  idée par mutation, la plus petite possible.
- **Installation, une fois, avant la première mutation** : le worktree neuf
  n'a pas les `node_modules` de la copie d'origine. Depuis son `web/` :
  `npm ci` puis `npx prisma generate` — déterministes, depuis le lockfile et
  le schéma du commit visé. Si l'un échoue, tout est `NON VÉRIFIABLE`, avec la
  sortie.
- **Commandes admises**, depuis `web/` du worktree jetable :
  - `npx vitest run <fichier>`, `npm run check` ;
  - `npm run test:worktree -- --fast`, seulement pour les contrats SQL
    (`prisma/checks/*.sql`), et seulement si un PostgreSQL local répond ;
    sinon ces invariants sont `NON VÉRIFIABLE`. Ce script crée sa propre base
    **éphémère** et y applique les migrations (`prisma migrate deploy`) :
    c'est admis, et c'est même ce qui éprouve M4.
- **Aucune PR, aucun commit, aucun push.** Aucune migration appliquée **hors
  de la base éphémère de `test:worktree`**. Aucun accès à la production (ni
  `scalingo`, ni base, ni URL).
- **Aucune identité patient réelle** ; texte de fiche synthétique seulement.
  Le dépôt est public, et le texte des fiches n'y est pas.
- **Réponds en français. Ne corrige rien.**

---

## 2. Cible

`main` à **`2cdb6739`** (fusion de la PR #1252 : le correctif des journaux de
la première passe) ou postérieur.

---

## 3. Les invariants et leurs bancs

Au moins **une** mutation par ligne. Si la première n'est attrapée que par le
typage (`npm run check`), joue-en une seconde qui compile. La dernière colonne
liste les bancs de la ligne ; pour chaque mutation, tu en désignes ceux qui
doivent rougir (§0).

| # | Invariant | Code à muter | Bancs à jouer |
|---|---|---|---|
| M1 | Aucun `console.*` ni `logger.*` du chantier ne recopie le message d'une erreur | `app/api/praticien/protocoles/diffusion/route.ts`, `app/api/internal/fiches-assiette/ingest/route.ts`, `app/api/portail/lectures/route.ts`, `lib/observability/classeEtCode.ts` | `lib/fiches-assiette/journaux.guard.test.ts`, les trois `route.test.ts` |
| M2 | L'e-mail ne nomme ni assiette, ni fiche, ni lien secret | `lib/correspondance/registreGabarits.ts` (`document_remis`), `lib/consultation/email.ts` | `lib/correspondance/registreGabarits.test.ts`, `lib/consultation/email.test.ts` |
| M3 | Le clic ne remet que l'aperçu vu : recalcul sous verrou, jeton comparé, sinon 409 sans écriture | `app/api/praticien/protocoles/diffusion/route.ts`, `lib/fiches-assiette/remise.ts` | `diffusion/route.fiches.test.ts`, `diffusion/route.test.ts`, `lib/fiches-assiette/remise.test.ts` |
| M4 | La base refuse une version non validée ou retirée, une empreinte fausse, une action sans l'assiette, un autre dossier ; idempotence | `prisma/migrations/20260927190000_fiches_assiette_remises_v1/migration.sql` (trigger) | `prisma/checks/fiches_assiette_remises_v1_negatif.sql` |
| M5 | Deux clics concurrents : ni deux têtes de chaîne, ni deux remises, ni deux e-mails | `diffusion/route.ts` (verrous), `remise.ts` | `diffusion/route.test.ts`, `remise.test.ts` |
| M6 | Drapeau d'émission fermé : la route lit et écrit ce qu'elle faisait avant le lot 8 | `diffusion/route.ts` | `diffusion/route.test.ts`, `diffusion/route.fiches.test.ts` |
| M7 | Un dossier inactif ou clôturé ne reçoit aucune fiche (côté route) | `lib/fiches-assiette/apercuRemise.ts`, `diffusion/route.ts` | `apercuRemise.test.ts`, `diffusion/route.fiches.test.ts` |
| M8 | Aucune remise d'un autre dossier n'est servie | `lib/fiches-assiette/servicePatient.ts`, `app/api/portail/fiches-assiette/route.ts` | `servicePatient.test.ts`, `portail/fiches-assiette/route.test.ts` |
| M9 | Seule la remise en cours de chaque fiche est servie | `lib/fiches-assiette/ficheServie.ts` | `ficheServie.test.ts`, `servicePatient.test.ts` |
| M10 | Une version retirée ou qui échoue aux contrôles n'est pas servie, sans motif | `servicePatient.ts`, `lib/fiches-assiette/controle.ts` | `servicePatient.test.ts`, `lecture.test.ts` |
| M11 | Drapeau de lecture fermé : les cinq surfaces se taisent | `portail/fiches-assiette/route.ts`, `app/portail/[token]/fiches/**`, `app/api/portail/lectures/route.ts`, `components/patient-companion/LienFichesRemises.tsx`, `lib/fiches-assiette/annonce.ts` | `portail/fiches-assiette/route.test.ts`, `portail/[token]/fiches/page.test.tsx`, `portail/lectures/route.test.ts`, `LienFichesRemises.test.tsx`, `annonce.test.ts` |
| M12 | L'accusé de lecture n'est consigné que pour une fiche servie à ce patient, texte affiché | `components/patient/fiches-assiette/FicheRemiseLecture.tsx`, `portail/lectures/route.ts` | `FichesRemises.test.tsx`, `portail/lectures/route.test.ts` |
| M13 | Le texte d'une fiche est rendu comme texte, jamais comme HTML | `components/patient/fiches-assiette/*` | `FichesRemises.test.tsx`, `textesFiches.test.ts` |
| M14 | Un e-mail au plus par clic, après le commit, trace `Non_envoye` née dans la transaction, panne absorbée ; portail fermé = rien | `lib/fiches-assiette/annonce.ts`, `diffusion/route.ts` | `annonce.test.ts`, `diffusion/route.test.ts` |
| M15 | L'effacement d'un dossier supprime ses remises et ses lectures ; seul lui les supprime | `lib/patient/effacement.ts` | `effacement.test.ts`, `lib/fiches-assiette/remises.guard.test.ts` |
| M16 | L'ingestion ne crée aucun acte ; seul un acte validé fait une version servie | `lib/fiches-assiette/ingestion.ts`, `app/api/praticien/fiches-assiette/actes/route.ts`, `lib/fiches-assiette/etat.ts` | `ingestion.test.ts`, `ingest/route.test.ts`, `actes/route.test.ts`, `etat.test.ts`, `catalogue.guard.test.ts` |

La colonne « Code à muter » est un point de départ, pas une borne : si
l'invariant se casse mieux ailleurs, mute ailleurs, et dis où.

---

## 4. Ce qu'il ne faut PAS demander

Arbitrages du responsable, datés et consignés dans `D-251` :

- que la base garantisse les contrôles de contenu, le dossier clos ou le
  caractère humain d'une validation — **borné à la route**, sans migration
  (2026-09-29) ;
- qu'on relise le drapeau juste avant l'e-mail — il se lit dans
  l'environnement du processus, fixe pendant sa vie ;
- que l'état du compte soit verrouillé pendant l'envoi SMTP — refusé ;
- le contenu clinique des fiches, le texte de l'e-mail (gabarit validé).

---

## 5. Sortie attendue

1. **Tableau** : `#` | fichier:ligne muté | mutation (une ligne de diff) |
   bancs désignés (avant de jouer) | résultat de chacun (**rouge** / **vert** /
   typage seul) | verdict (`MORD` / `NE MORD PAS` / `NON VÉRIFIABLE`).
2. **Trouvailles** : chaque `NE MORD PAS`, en P1, avec la sortie des bancs
   désignés restés verts et l'invariant qu'ils laissent passer.
3. **Non vérifié**, et pourquoi.

Sois bref sur ce qui mord ; sois précis sur ce qui ne mord pas.
