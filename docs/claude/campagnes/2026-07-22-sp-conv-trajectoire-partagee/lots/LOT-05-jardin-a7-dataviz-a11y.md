---
id: "LOT-05"
titre: "Jardin — renommage A7, « Mon équilibre » qualitatif, résidus a11y"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-05 — Jardin — renommage A7, « Mon équilibre » qualitatif, résidus a11y

## But

Rendre la Spirale au parcours global (réouverture d'A7 arbitrée le
2026-07-22), achever la doctrine « construction, jamais dégradation » dans
« Mon équilibre », et fermer les résidus d'accessibilité vérifiés.

## Résultat observable

- **Renommage A7** : une proposition d'adaptation (modèle
  `12_CONTREPOINT_ET_ADAPTATION.md`) est rédigée, l'entrée A7 du
  `REGISTRE_FRONTIERES.md` amendée **sur place** avec mention datée, et les
  surfaces patient renommées : « Ma spirale alimentaire » →
  **« Mon carnet alimentaire »** (D9, tranché au cadrage le 2026-07-22 ;
  casse de surface alignée sur « Mon équilibre »).
  « Ma Spirale »/« Mon parcours » désigne la trajectoire globale.
- **« Mon équilibre »** (`MonEquilibreAccueil.tsx`) : la frise en barres
  proportionnelles (l.26) devient des repères temporels qualitatifs ;
  « En baisse depuis votre dernier bilan » (l.12) devient « Des repères ont
  évolué » ; « Vos priorités » (l.127, tri par couverture l.92-94) devient
  « Points à explorer avec votre praticien » tant qu'aucune validation
  praticien n'existe.
- **A11y ≥ 44 px** : fermeture de l'aperçu patient
  (`PatientPreview.tsx:38-45`, 36 px), radios d'anamnèse
  (`PlaintesForm`), boutons « Retour » de Mon équilibre.
- **Brouillons questionnaires** : expiration vérifiée et, si absente,
  ajoutée (`web/src/lib/questionnaire-draft.ts` — `savedAt` existe déjà),
  alignée sur les 30 jours du wizard.
- **Code mort** : `MetricsSection.tsx` + son test supprimés (démonté par
  V14 ; hors périmètre du chantier code mort de g-trust-04, borné à
  `ui/Score*` — vérifier avant, ne pas doublonner).

## Périmètre

Surfaces patient (`components/patient/`, `app/portail/`), registre (entrée
A7 seule), `PatientPreview`, `questionnaire-draft.ts`, suppression
`MetricsSection`. E2E patient dans le même commit.

## Hors périmètre

Le moteur `lib/equilibre` (aucune valeur recalculée — seule la
représentation change) ; la campagne JA elle-même (ses régimes et règles
restent intacts, seul le **nom** change) ; toute nouvelle dataviz chiffrée
patient (A6).

## Fichiers probables

- `docs/claude/propositions/2026-07-22-sp-conv-trajectoire-partagee-adaptation-a7/` (créé)
- `docs/claude/REGISTRE_FRONTIERES.md` (entrée A7, amendement daté)
- `web/src/components/patient/MonEquilibreAccueil.tsx`, `MonEquilibreDetail.tsx`
- `web/src/components/PatientPreview.tsx`
- `web/src/components/patient/PlaintesForm.tsx`
- `web/src/lib/questionnaire-draft.ts`
- `web/src/components/MetricsSection.tsx` + `.test.tsx` (supprimés)
- Surfaces portant « Ma spirale alimentaire » (grep au lot)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.
- Pas de changement de logique clinique ni de seuil.

## Étapes

- [ ] Rédiger la proposition d'adaptation A7 (nom acté : « Mon carnet
      alimentaire », D9) ; amender le registre.
- [ ] Renommer les surfaces (grep exhaustif, E2E ajustés).
- [ ] Refondre la frise et les libellés de Mon équilibre selon la maquette
      LOT-00.
- [ ] Cibles 44 px ; TTL brouillons ; suppression MetricsSection.
- [ ] T1, T2, E2E ; relire le diff.

## Tests

Vitest : garde vocabulaire (« En baisse » absent des surfaces patient) ;
axe « zéro score patient » de la grille ; E2E : parcours Mon équilibre
inchangé fonctionnellement ; a11y : cibles mesurées.

## Critères de done

Registre amendé ; plus aucune occurrence patient de « spirale alimentaire »
ni « En baisse » ; cibles ≥ 44 px constatées ; `verify` vert.

## Résultats

À compléter à la clôture.
