# Runbook — allumer `WN_AGENDA_ALI` et lancer le recueil pilote

Décision de référence : `D-024` (amende le point 2 de `D-022`) dans
`docs/DECISIONS.md`. Patron suivi : `ACTIVATION_RUNBOOK_G4.md` de la campagne
`2026-07-19-idp-identite-patient-durable`.

Ce runbook décrit un geste **d'exploitation**, pas un lot de code. Rien ici ne
passe par une PR : la variable se pose au panneau Vercel, l'assignation se fait
par l'interface praticien.

## Ce que ce runbook n'autorise pas

- Poser la variable sur un autre **scope Vercel** que Production. La Preview lit
  la base de production et le praticien ne peut de toute façon pas s'y connecter
  (`D-024` point 1). Cela ne concerne pas le banc de test, où
  `web/playwright.config.ts` pose légitimement `WN_AGENDA_ALI: 'true'`.
- Étendre le recueil à des dossiers patients réels. Le pilote porte sur **un**
  dossier de contrôle ; l'extension est une décision distincte, à consigner.
- Toute écriture en base par script. Les seuls gestes sont l'interface praticien,
  le portail patient, et des lectures `execute_sql`.

## Ce qu'il faut savoir avant de commencer

- **L'instrument est non scoré.** `scoring.type = 'journal'` ne lit rien et rend
  `scored: false`. Ni barème, ni indice, ni seuil : c'est l'objet de `LOT-05`,
  qui n'est pas écrit. Allumer n'expose aucune interprétation.
- **Le geste est en deux temps, et l'ordre décide.** `IDS_SUSPENDUS` est un
  `const` de module calculé à l'import : poser la variable **sans** redéployer ne
  change rien, et se lit exactement comme un drapeau éteint.
- **C'est réversible.** Éteindre referme la bibliothèque praticien *et* les
  assignations déjà créées (barrière 5 de
  `web/src/lib/agenda-alimentaire/portail.ts`, traversée par le GET et le POST).
  Les journées déjà notées, elles, restent en base : le modèle est append-only.
- **La bibliothèque affichera « 0 questions » et « Statut inconnu ».** C'est normal :
  l'instrument n'a ni `sections` ni bloc `certification`. Ne pas le lire comme
  une anomalie de déploiement.

## Prérequis (à confirmer avant l'allumage)

- [ ] `D-024` mergée sur `main`, CI verte.
- [ ] **Aucun pack ne référence `Q_ALI_09`.** C'est le seul chemin qui
      assignerait l'agenda **sans clic praticien** : `assignPackToPatient`, appelé
      par l'onboarding portail, n'écarte que `IDS_SUSPENDUS`. Rien ne valide les
      `qids` d'un pack contre cette liste — la vérification est le seul filet.

```sql
SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);
-- attendu : 0 ligne
```

Interroger `packs.qids` suffit, et il ne faut pas doubler la requête sur
`questionnaire_packs` : `resolvePackQuestionnaireIds` ne fait confiance au
registre relationnel que s'il couvre exactement le même ensemble, si bien
qu'aucun chemin ne peut assigner un `qid` absent de `packs.qids`.

- [ ] **Le recueil est bien à zéro**, relu au moment du geste :

```sql
SELECT (SELECT count(*) FROM agenda_alimentaire_jours) AS jours,
       (SELECT count(*) FROM assignations WHERE id_questionnaire = 'Q_ALI_09') AS assignations;
-- attendu : 0 | 0
```

- [ ] **Le dossier de contrôle est choisi, créé et assignable** (section
      suivante).
- [ ] **`WN_G4_LIEN_MAGIQUE` est à `true` en Production.** Ce n'est pas une
      option : il ne reste que **deux chemins d'entrée au portail**, Google (G5)
      et le lien reçu par e-mail (G4), et le client OAuth **patient** n'est pas
      configuré en production (`playwright.config.ts` : « allumé pour les tests,
      absent de Vercel »). Sans G4, aucune entrée patient n'existe, et l'action
      n'apparaît même pas dans l'interface (`PatientRow.tsx`). La branche
      self-service exige en plus `WN_G4_REDEMANDE_PATIENT`.

## Choisir le dossier de contrôle — les trois patients de graine ne conviennent pas

Le motif qui vaut pour les trois, et il est indépendant de tout état : leur
adresse `@fictif.wellneuro.fr` **n'existe pas**. Or le lien d'entrée au portail
part par e-mail, et l'interface ne l'affiche pas — `PatientsPanel.tsx` rend
« Lien à usage unique envoyé » et jette le `lien` que la route renvoie. Un essai
sur une fixture ne testerait donc jamais la moitié de la chaîne que le patient
voit en premier.

| Patient | Identifiant | Second motif |
|---|---|---|
| Sophie Nicola | `PAT_SEED_01` | `actif = false` au 2026-08-05 — `accepteNouvelEnvoi` refuse l'assignation |
| Jennifer Martin | `PAT_SEED_02` | muté par `preparerReprisePourTest` (réponses, jeton, `actif`) |
| Michel Dogné | `PAT_SEED_03` | réinitialisé par les parcours E2E |

Les états `actif` sont **datés** et ne font pas règle : `preparerReprisePourTest`
écrit `actif: true` sur `PAT_SEED_02` et `nettoyerReprise` ne le restaure pas. Ce
qui écarte durablement les trois, c'est l'adresse et la mutation par les E2E.

**La règle est celle déjà payée par le gate G4, le 2026-07-21** : « la précaution
qui compte n'est pas "un patient fictif", c'est **aucune boîte d'un tiers** ». Le
dossier de contrôle porte donc une **adresse relevant du praticien**, comme
`PAT006` lors du premier essai réel du lien magique.

**Le créer, ou en réutiliser un.** Soit reprendre un dossier de contrôle existant
(`PAT006` a servi au gate G4), soit en créer un par l'interface praticien avec
une adresse du praticien. Dans les deux cas, vérifier qu'il est `en_suivi`
**avant** l'étape 4 — `accepteNouvelEnvoi` lit `actif` et `suiviClotureLe` ; la
troisième colonne est un contrôle distinct, posé plus loin par la route
d'assignation :

```sql
SELECT id_patient, actif, suivi_cloture_le, access_token_revoked
FROM patients WHERE id_patient = '<dossier de contrôle>';
-- attendu : actif = true, suivi_cloture_le = NULL, access_token_revoked = false
```

## Procédure

1. **Poser la variable** — Vercel, projet `wellneuro-app`, Settings →
   Environment Variables → **Production seule** :

   ```text
   WN_AGENDA_ALI = true
   ```

   **La créer non sensible** : une variable masquée n'est plus relisible, ce qui
   empêche de vérifier sa valeur après coup. Le lecteur est *fail-closed* et
   compare à la chaîne exacte `true` (`featureFlag.ts`) — `TRUE`, `1` ou une
   valeur vide laissent l'instrument fermé.

2. **Redéployer** la production. Sans ce second temps, rien ne change.

3. **Vérifier l'allumage.** Ouvrir la bibliothèque praticien sur
   `app.wellneuro.fr` : « Agenda alimentaire — 21 jours » doit apparaître dans la
   catégorie Alimentaire, avec « 0 questions » et « Statut inconnu ». S'il n'y est
   pas, relire la variable au panneau (elle est non sensible) : présente ⇒ le
   redéploiement n'a pas eu lieu ; absente ⇒ l'étape 1 a échoué.

4. **Assigner** `Q_ALI_09` au dossier de contrôle, depuis la bibliothèque.

5. **Donner le consentement.** Une assignation créée depuis la bibliothèque naît
   `consentement: 'non_donne'` (`D-015`), et la barrière 8 refuse l'agenda en
   `403` tant qu'il manque. L'écran de consentement se présente à la première
   entrée dans le portail.

6. **Noter les journées**, par le portail patient. Le recueil s'ancre sur la
   **première journée notée**, jamais sur la date d'assignation (`D-022` point 1) :
   la fenêtre de 21 jours court à partir de là.

7. **Rejouer les trois assertions de données** du contrat, après les premières
   journées puis à la clôture. Elles rendent 0 ligne **par vacuité** tant
   qu'aucune journée n'existe et ne prouvent alors rien (`D-015`) : ce pilote est
   le premier événement qui les rend exigibles. Les assertions de **structure**
   (1 à 4) sont déjà jouées en CI et n'ont rien à rejouer.

   `web/prisma/checks/agenda_alimentaire_v1.sql` ne se rejoue **pas tel quel** :
   c'est un unique bloc `DO $$`, que le garde MCP refuse (`do` n'est pas une
   ouverture de lecture, et figure dans la liste d'écriture). Les trois assertions
   transcrites en `SELECT`, vérifiées exécutables le 2026-08-05 :

   ```sql
   SELECT
     (SELECT count(*) FROM public.agenda_alimentaire_jours j,
        LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(j.reponses) = 'object'
                                       THEN j.reponses ELSE '{}'::jsonb END) AS k
      WHERE k ~* '(gramme|kcal|score|indice|quantite)')       AS perimetre_jsonb,
     (SELECT count(*) FROM public.agenda_alimentaire_jours j
      WHERE j.reponses->>'contractVersion' IS NOT NULL
        AND NOT (j.reponses->>'contractVersion'
                 = ANY(ARRAY['agenda-alimentaire-v1'])))      AS version_non_lue,
     (SELECT count(*) FROM public.agenda_alimentaire_jours j
      LEFT JOIN public.agenda_alimentaire_jours p ON p.id = j.supersedes_jour_id
      WHERE j.supersedes_jour_id IS NOT NULL
        AND (p.id IS NULL
             OR p.id_patient    <> j.id_patient
             OR p.id_assignation <> j.id_assignation
             OR p.date_jour     <> j.date_jour))              AS chainage_fautif;
   -- attendu : 0 | 0 | 0
   ```

   La liste `versions_lues` est tenue à la ligne 36 du fichier de contrat : si
   elle y change, la reporter ici.

## Ce que le pilote va rencontrer

Six manques sont connus et non corrigés (handoff
`docs/claude/handoffs/2026-08-05-0638-agenda-alimentaire-lot-04.md`). Trois se
verront tout de suite :

- **la correction est bornée à J et J-1** — une journée fausse à J-5 n'est
  corrigible par aucun chemin ;
- **les prises espacées de 15 minutes se recouvrent à l'écran**, et le hit-test
  tactile n'est prouvé nulle part : c'est le seul manque qui porte sur ce que le
  doigt touche ;
- **passé `dateDebut + 20`, rien ne se ferme d'observable** : l'assignation reste
  ouverte côté praticien, le serveur refuse simplement d'écrire.

## Lire le recueil — le seul chemin

Aucun écran praticien ne lit `agenda_alimentaire_jours`. Les 21 journées se
relisent par `execute_sql`, en lecture seule :

```sql
SELECT date_jour, canal, soumis_le, reponses
FROM agenda_alimentaire_jours
WHERE id_assignation = '<id>'
ORDER BY date_jour, soumis_le;
```

C'est le matériau de calibration de `LOT-05`, et il n'a pas d'autre porte.

## Retour arrière

Retirer la variable (ou lui donner une valeur autre que `true`) **puis**
redéployer. `Q_ALI_09` disparaît de la bibliothèque et du hub patient, et la
route agenda refuse en `409 unavailable`. Les journées déjà notées restent en
base.
