# Handoff — BIO-INGEST LOT-11 : preuves de la transmission patient

## Branche et état Git

- Branche `bio-ingest/lot11-preuves-transmission`, avancée en avance rapide
  sur `origin/main` 2951aa03 (#1379), avec l'accord du responsable.
- Rien n'est commité au moment de ce handoff. La PR du lot portera le code,
  la fiche, la campagne, l'état, le fragment, ce handoff et le
  `SESSION_LOG`.

## Objectif

Lever la réserve de clôture du LOT-04 : prouver la transmission patient par
des tests rejouables en CI.

## Décisions prises (responsable, 2026-10-10)

- L'E2E s'arrête sur « En attente », le statut réel après un dépôt.
  « Reçu » suppose une lecture lancée par le praticien, donc l'IA.
- L'écoute VoiceOver est faite par le responsable sur une grille de 8
  points : 8/8 OK, tracés dans la fiche.
- Le contraste du bandeau de succès patient était de 4,39:1. Le texte passe
  en couleur courante dans `PatientInlineMessage`, pour les six écrans
  patient. Le praticien n'est pas touché, et le jeton global n'est pas
  modifié.
- #1379 est intégrée en avance rapide. T3 a été rejoué après l'intégration.

## Fichiers modifiés

- Neufs :
  - `web/e2e/portail-transmission-compte-rendu.spec.ts` ;
  - `web/scripts/banc-plafond-transmission-deux-depots.test.ts`.
- `web/e2e/helpers/db.ts` : deux helpers en lecture seule.
- `web/src/components/patient/biologie/TransmissionCompteRendu.tsx` et son
  test : région `role="status"`.
- `web/src/components/patient/ui/PatientInlineMessage.tsx` : ton `success`.
- `web/playwright.config.ts`, `.github/workflows/ci.yml` et
  `scripts/wn-test-worktree.sh` : drapeaux `WN_BIO_INGEST_ENABLED` et
  `WN_BIO_PORTAIL_ENABLED` au serveur et aux builds E2E, plus l'étape du
  banc.
- `web/package.json` et le lockfile : `@axe-core/playwright` 4.13.0.
  `axe-core` transitif passe de 4.12.1 à 4.13.0.
- Documentation : la fiche LOT-11 (statut terminé, résultats, relecture), la
  campagne, `.wn/state.json`, le fragment `changelog.d/` et le
  `SESSION_LOG`.

## Validations exécutées

- **T1** `check:rapide` vert.
- **Vitest** ciblé vert : garde du staging et six écrans du bandeau, soit
  142 cas.
- **Banc seul** sur la base de dev : vert. Deux mutations rougissent le
  banc, le verrou retiré comme le rejugement retiré.
- **E2E seul** : vert sous Chromium et sous iPhone 13.
- **T3 complet** vert deux fois. Après intégration : 705 fichiers Vitest,
  contrats SQL, bancs, 259 E2E (3 sautés, qui ne sont pas du lot), en
  5 min 2 s.
- **Reste à faire** : `npm run check` (T1 complet) avant le commit, puis le
  CI de la PR.

## Problèmes ouverts

- **Lancer les E2E à la main en local** demande
  `NEXTAUTH_URL=http://localhost:3000`, sans quoi WebKit refuse le cookie
  Secure. T3 et le CI le posent déjà.
- **Sous `next dev`**, la première visite d'une page peut recharger le hub,
  à cause de la compilation à la demande. Ce n'est pas le cas sous le build
  de production.
- **Le constat d'usage du LOT-04** reste à rejouer à la première
  transmission réelle.

## Prochaine action exacte

1. Lancer `npm run check`.
2. Committer, ouvrir la PR avec `--body-file`, puis attendre
   `node scripts/wn-attendre-ci.mjs <N>` en fond.
3. Lire les commentaires en ligne, puis merger.
4. Mettre à jour le suivi BioFlow (artefact hors dépôt).
5. En session neuve : contre-revue adverse de campagne, sous forme
   d'affirmations à réfuter, AVANT le lot de clôture. Ensuite seulement,
   créer et faire la fiche du lot de clôture.

## Interdits encore actifs

- Aucune migration. Aucune écriture dans `resultats_biologiques`.
- Aucun dossier réel dans un seed ou un E2E (`D-075`). Fixtures seules.
- Pas de `retries` Playwright.
- Aucune suppression de compte rendu hors l'effacement nommé et le retrait
  (`staging.guard.test.ts`).
- Ne jamais committer une trace Playwright : elle porte un jeton de session.
