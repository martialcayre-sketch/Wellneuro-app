# Handoff — 2026-09-29 — Fiches d'assiette : l'e-mail neutre (lot 11)

## 1. Branche et état Git

`feat/fiches-assiette-lot11-email`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`2089e8f2` (#1248, lot 10). Pas de migration. Un merge à la fois.

## 2. Objectif

Lot 11 de `D-251` : l'e-mail neutre du §9, sous `WN_FICHES_ASSIETTE_LECTURE`
fermé. Avec lui, le P2-2 de la revue du lot 10 : la route des lectures ne
résout plus le protocole servi.

## 3. Décisions prises

Arbitrages du responsable, consignés dans l'amendement de `D-251` du
2026-09-29 (suite) :

1. L'e-mail part seulement espace de lecture ouvert.
2. Un par clic qui remet au moins une fiche, après le commit.
3. Gabarit `document_remis@1`, né validé (texte choisi puis phrase corrigée).
4. Document TRUST sur l'IA : dans le dépôt seulement, sans lien depuis la
   fiche.
5. Contre-revue adverse : Codex, lancée par le responsable.
6. Priorité : finir les fiches, puis la phase « Actions » (cadrage en
   mémoire de session : plafond 7, catalogue, dose sourcée modifiable,
   complétion IA relue ; décision propre à venir).

Choix de mise en œuvre : un accès au portail révoqué ne reçoit rien, et la
trace `Non_envoye` le dit.

## 4. Fichiers modifiés

- `lib/correspondance/registreGabarits.ts` : `document_remis@1` ;
  `lib/correspondance/patient.ts` : le type `document_remis`.
- `lib/consultation/email.ts` : `sendDocumentRemisEmail`, par le triplet
  `envoyerAccesTrace` (journalisé).
- `lib/fiches-assiette/annonce.ts` (neuf) : `annonceDue`,
  `annoncerDocumentRemis` — ne lève jamais.
- `app/api/praticien/protocoles/diffusion/route.ts` : l'annonce après le
  commit, et `annonceFiches` dans la réponse.
- `lib/fiches-assiette/servicePatient.ts` : tronc commun et `fichesALire` ;
  `app/api/portail/lectures/route.ts` l'emprunte.
- `lib/fiches-assiette/drapeau.ts` (commentaire), `docs/FEATURE_FLAGS.md`
  (cinquième surface), `docs/DECISIONS.md`, changelog, ce handoff,
  SESSION_LOG.

## 5. Validations exécutées

- Bancs : registre (hash-lock, liste, interdits de contenu, texte validé au
  caractère près), envoi, annonce, route de diffusion (commit AVANT annonce,
  double clic, drapeau fermé, aperçu périmé, échec d'envoi), service
  (`fichesALire` sans protocole), route des lectures.
- **18 mutants joués** (script hors dépôt), tous tués.
- **Revue `wn-reviewer` : GO**, aucun P0 ni P1. Verdicts :
  - P2-1, compte désactivé non vérifié avant l'envoi : **corrigé** (`actif`
    lu, même trace que la révocation) ;
  - P2-2, panne de lecture du dossier sans trace : **corrigé** (trace
    `Erreur` si la panne précède l'envoi, jamais deux traces) ;
  - P2-3, envoi dans le temps de la requête : **écarté**, schéma de
    `notifierObjectifPropose` ; un nouveau clic est refusé (409) sans double
    envoi ;
  - P2-4, e-mail pour une fiche devenue indisponible : **écarté**, le clic ne
    remet que des fiches qui viennent de passer les contrôles sous verrou.
- T1 et T2 verts sur l'état final (221 E2E).

**Constat de production du 2026-09-29, lecture seule par conteneur.** Premier
clic « Valider pour diffusion » de la production, sur le dossier de test
`PAT032` (11:38:25 UTC). L'approbation est posée, et aucune fiche n'est
remise : la seule action porte `ASSIETTE_DOPAMINERGIQUE`, dont la fiche n'est
pas validée (seule `WN-SRC-0297`, épargne digestive, l'est). C'est le
comportement attendu.

## 6. Problèmes ouverts

- **Le constat par le comportement** du drapeau d'émission reste à confirmer
  par le responsable : la section des fiches a-t-elle paru dans la sous-vue
  Diffusion, avec « ne part pas » pour la fiche non validée ?
- **Six fiches sur sept** attendent la relecture du responsable. Valider la
  fiche dopaminergique, puis recliquer sur PAT032, remettrait la première
  fiche de la production (sans e-mail tant que la lecture est fermée).
- **Aucun E2E** ne parcourt l'envoi : il est sous drapeau fermé en E2E.

## 7. Prochaine action exacte

Le lot du document TRUST sur l'usage de l'IA : rédigé par Claude, validé par
le responsable, versé au dépôt, sans lien depuis la fiche. Il nomme Anthropic
(rédaction) et OpenAI (contre-lecture). Ensuite, les affirmations à réfuter de
la contre-revue Codex, puis l'ouverture de la lecture si le §10 est rempli.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- `WN_FICHES_ASSIETTE_LECTURE` reste fermé jusqu'aux conditions du §10 : sept
  fiches validées, espace de lecture constaté, document TRUST versé,
  contre-revue adverse.
- Les dossiers de test se lisent par identifiant, jamais par nom.
