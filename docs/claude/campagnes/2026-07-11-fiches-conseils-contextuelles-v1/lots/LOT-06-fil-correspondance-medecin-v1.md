---
id: "LOT-06"
titre: "Fil de correspondance médecin V1 — transcription praticien"
statut: "livré — #252 (migration, vérifiée en prod) + #255 (routes + écran), 2026-07-22"
dépend_de: "FM-1/FM-2 arbitrées (CADRAGE_FIL_MEDECIN_5_0.md) ✓"
---

# LOT-06 — Fil de correspondance médecin V1 (transcription praticien)

> Compilé le 2026-07-22, après les arbitrages **FM-1** (identité : C puis A —
> la V1 est la transcription par le praticien) et **FM-2** (conservation
> alignée sur le dossier patient) du `CADRAGE_FIL_MEDECIN_5_0.md`. Reprend le
> reliquat « fil bidirectionnel médecin » du handoff C3 LOT-04, cadré par
> `docs/claude/propositions/2026-07-18-c3-fil-correspondance-medecin/CADRAGE_FIL_CORRESPONDANCE_MEDECIN.md` :
> ses questions Q1 et Q3 sont tranchées par FM-1/FM-2, Q2 est déjà acquise par
> construction pour le sortant, Q4 et Q5 sont réglées ci-dessous.

## But

Donner au praticien un **fil de correspondance** par patient : consigner ce
qui a été envoyé au médecin traitant, transcrire sa réponse — datée,
attribuée — pour que l'échange confraternel cesse d'exister uniquement dans
une boîte mail ou un tiroir.

## Résultat observable

Sur le dossier d'un patient, le praticien voit le fil : « envoyé au
Dr Martin le … (document de suivi) », « réponse du Dr Martin, transcrite
le … ». Il peut consigner un envoi et transcrire une réponse. Le médecin
n'accède à rien (FM-1 : il répond par ses canaux habituels) ; le patient ne
voit pas ce fil en V1 — surface praticien seule, comme tout C3.

## Réponses aux questions restées ouvertes du cadrage de 2026-07-18

- **Q4 — persistance : oui.** FM-2 fait de la correspondance une pièce du
  dossier ; une pièce du dossier se conserve. Donc une table, donc **gate
  migration** (confirmation explicite, PR de migration seule — le patron
  SP-SPI #209).
- **Q5 — rattachement : au patient.** C'est le dossier qui fait foi
  (FM-2 : le fil suit sa clôture et son effacement). Référence *optionnelle*
  à la synthèse validée dont le document sortant est issu — les documents
  composés ne sont pas persistés (`lib/documents` recompose à la demande),
  la synthèse l'est.

## Périmètre — deux PR, dans cet ordre

### PR 1 — migration seule (gate à confirmation explicite)

Modèle `CorrespondanceMedecin` (table `correspondances_medecin`), minimisation
stricte :

- `id`, `idPatient` (FK Patient), `sens` (`sortant` | `entrant`),
  `medecinLibelle` (texte libre « Dr Martin » — **aucune adresse e-mail, aucun
  RPPS** : la V1 n'a pas besoin d'identifier le médecin, seulement de le
  nommer), `texte`, `idSynthese` (nullable), `echangeLe` (date réelle de
  l'échange, nullable), `consigneLe`, `praticienEmail` (attribution — « datée,
  attribuée », patron `relecture_notes` ; constat AC-2 de la revue).
  *(Noms définitifs actés à la livraison de la PR 1 — AC-3 : `echangeLe` /
  `consigneLe` reprennent le patron deux-dates SP-TT, à la place des
  `dateEchange`/`creeLe` de la première rédaction.)*
- RLS deny-all, index `(idPatient, consigneLe)`.
- **Dans la même PR** : `effacerDossier` efface la table nommément — la garde
  structurelle d'`effacement.test.ts` (qui dérive du schéma toute table
  portant `id_patient`) échoue sinon, et c'est voulu. Patron #226.

### PR 2 — routes et écran

- Routes praticien (garde d'appartenance `verifierAppartenancePatient`,
  refus portés par les routes — D5) : lister le fil, consigner un envoi,
  transcrire une réponse.
- UI sur le dossier patient (dashboard praticien), textes en français,
  registre confraternel non prescriptif (« explorations à discuter » —
  jamais « prescription »).
- Articulation TRUST **tranchée le 2026-07-22 (décision utilisateur) :
  indicateur seul, pas de garde bloquante.** Le partage a lieu hors
  application, par les canaux du praticien : bloquer la consignation
  n'empêcherait pas le partage, cela rendrait seulement le dossier aveugle.
  Le GET expose l'état du choix `partage_medecin_traitant` (dernier événement
  fait foi, `lib/trust/consentementPartage.ts`) et l'écran l'affiche — la
  responsabilité déontologique reste au praticien, informé.

## Hors périmètre

- **Tout accès médecin** (lien signé = V2 / FM-1 option A ; déclenchée par un
  constat d'usage, pas une échéance).
- **Toute visibilité patient** du fil (décision distincte, non prise).
- **Tout envoi automatique** vers le médecin (l'envoi reste un geste hors
  application en V1 ; l'app consigne, elle n'expédie pas).
- Le sortant lui-même : le rendu médecin des documents est livré (C3 V1).

## Interdits

- Pas de secret ; pas de donnée patient réelle (fixtures : Sophie Nicola,
  Jennifer Martin, Michel Dogné).
- **Texte seul, par construction** : aucun champ de pièce jointe dans le
  modèle ni dans les types — la garantie Q2 du sortant (`ContenuBloc` ne
  porte que du texte) s'étend au fil entrant à l'identique. Pas de champ
  fichier qu'une politique devrait ensuite interdire.
- **Aucune donnée d'identification du médecin** au-delà du libellé libre
  (minimisation — le médecin est un tiers dont on ne collecte rien).
- Aucune absorption de contenu clinique source (frontière A2 : le fil
  transporte des échanges, il ne possède ni score, ni décision, ni
  protocole).
- Aucune migration sans confirmation explicite dans la session qui la porte.
- Pas de refactor hors lot.

## Étapes

- [x] **Plan technique en mode Plan** approuvé le 2026-07-22 avant toute
      édition.
- [x] PR 1 : migration seule + effacement nommément + garde structurelle
      verte — **#252**, revue adversariale `wn-reviewer` GO avant merge,
      **vérifiée en production** par `execute_sql` après (1 tentative,
      requête inverse vide, 9 colonnes, RLS deny-all 0 policy, FK, index).
- [x] PR 2 : routes (12 tests d'autorisation), écran, textes relus — **#255**
      (36 tests nouveaux au total).
- [x] Articulation TRUST tranchée et consignée plus haut : **indicateur
      seul** (décision utilisateur du 2026-07-22).
- [x] Validations : T1 à chaque phase, **T3 `test:worktree` sur les deux PR**
      (migrate deploy éphémère, drift check vide, 69 E2E).

## Tests

- Unitaires : domaine du fil (tri, sens, attribution).
- Routes : appartenance praticien (401/403), refus sur dossier clos si la
  clôture l'exige (FM-2 : clôture = lecture seule — la consignation sur
  dossier clos est **refusée par la route**).
- Garde structurelle : `effacement.test.ts` couvre la nouvelle table.
- Composant : fil vide, fil mixte sortant/entrant, formulaire de
  transcription.

## Définition de done

- Le praticien consigne et transcrit ; rien n'est envoyé par l'application.
- Un dossier effacé n'a plus de correspondance ; un dossier clos n'en reçoit
  plus.
- Aucun champ de fichier nulle part ; aucun identifiant médecin au-delà du
  libellé.
- CI verte (`verify`), textes UI en français.
