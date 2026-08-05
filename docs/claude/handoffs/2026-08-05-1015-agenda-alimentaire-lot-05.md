# Handoff — Agenda alimentaire, LOT-05 (dossier de contrôle et lecteur praticien)

- Date : 2026-08-05, 10:15
- Campagne : `docs/claude/campagnes/2026-08-04-agenda-alimentaire/`
- Lot : `lots/LOT-05-dossier-de-controle-et-lecteur-praticien.md` — **livré**
- Décision posée : **D-027**
- Fragments de changelog : `changelog.d/2026-08-05-agenda-alimentaire-dossier-controle.md`, `changelog.d/2026-08-05-agenda-alimentaire-lecteur-praticien.md`

## Où en est la campagne

Le recueil pilote a démarré le 2026-08-05 à 07:03 UTC sur le dossier du
praticien (`PAT006`, assignation `ASS_Ip45TpzqWujWgkOdEex-wxRj`), une journée
notée. Ce lot le **constate** et le rend **lisible au dossier**. Reste `LOT-06`,
le barème — pas avant un recueil suffisant pour calibrer, c'est-à-dire la
clôture des 21 jours.

## La renumérotation, et pourquoi elle n'était pas cosmétique

`LOT-05` est désormais ce lot, le barème est `LOT-06`. Un `LOT-04b` semblait
naturel : `scripts/wn-campaign-audit.mjs` extrait l'ordinal par `/^LOT-\d{2}/`,
qui aurait rendu `LOT-04` — déjà pris, campagne `en_cours`, donc
`duplicate_lot_ordinal` en sévérité **erreur** et un CI rouge. Le barème n'ayant
jamais eu de fichier, la bascule n'a coûté aucun renommage.

## Les cinq choses à savoir avant de toucher à ce code

1. **`perimetre_jsonb` ne prouve que le premier niveau.** `jsonb_object_keys`
   ne traverse pas les objets de `prises` : un `grammes` écrit à l'intérieur
   d'une prise ne serait attrapé par aucune des trois assertions du runbook. La
   frontière y tient par la liste blanche de `ensureJourReponses`, pas par le
   contrat SQL. Le `0` est vrai ; sa portée est bornée, et c'est écrit partout
   où le chiffre apparaît.
2. **`chainage_fautif` est encore vacue.** Aucune ligne ne porte de
   `supersedes_jour_id`. Le zéro ne prouve rien tant qu'aucune correction
   n'existe — il redevient mordant à la première, ou à la clôture.
3. **La lecture praticien n'est pas gardée par `WN_AGENDA_ALI`** (`D-027`).
   L'absence de garde est délibérée et porte un test qui la nomme : sans lui, un
   relecteur futur « corrigerait » ce qu'il prendrait pour un oubli. Elle est
   gardée par deux verrous plus forts — session praticien, puis
   `verifierAppartenancePatient` **avant** la première lecture Prisma, qui écrit
   aussi le journal d'accès dossier.
4. **`statut` n'est pas le décalque du sommeil.** La branche `cloture` est
   **morte** pour `Q_ALI_09` : les deux seuls écrivains de
   `statutReponses: 'verrouille'` sont `patient/submit`, qui refuse `Q_ALI_09`
   nommément avant toute écriture, et la clôture du sommeil, gardée par son
   propre identifiant. L'état atteignable est `statut = 'Annulée'`, et il prime.
5. **Les agrégats sont `null` sous sept journées** (`MIN_JOURS_AGREGATS`). Le
   panneau doit le dire — « couverture insuffisante — N/7 » — et jamais laisser
   un vide : un vide non expliqué est le même signal trompeur que `D-025`
   reproche déjà à la bibliothèque. Le pilote est exactement dans ce cas.

## Ce qui reste ouvert, nommé et non corrigé

- **Aucune bannière ne dit que le recueil est fermé.** Le panneau ne lit pas le
  drapeau — c'est le sens de `D-027`. L'état vide a cessé de nommer un geste
  impossible (« Assignez l'instrument » n'existe nulle part drapeau éteint),
  mais rien ne distingue encore « pas assigné » de « recueil fermé ».
- **Le déverrouillage praticien retire silencieusement l'annulabilité.** Un
  `PUT /api/praticien/assignations` posant `deverrouille` sur un `Q_ALI_09` fait
  refuser l'annulation en 409 pendant que le patient continue d'écrire. Non
  atteignable par l'écran, atteignable par appel direct.
- **Le tiroir tait `canal`, `soumisLe` et `supersedesJourId`.** Le taux de
  correction, dont `LOT-06` aura besoin, se lit encore par `execute_sql`.
- **`charger` n'a ni `AbortController` ni jeton de génération** : un `fetch`
  lent du patient précédent peut écraser un agenda correctement chargé. Défaut
  du patron, partagé avec le panneau du sommeil.
- **Le test de correspondance libellé ↔ champ ne détecte qu'un échange
  adjacent.** Quatre rendus pour cinq champs : aucune fixture ne peut fermer ce
  trou. Limite structurelle, à connaître.

## Validation au moment du handoff

T1 vert. **T3 complet vert** — 3 882 tests Vitest sur deux positions de drapeau,
**112 E2E passés, aucun échec**. Deux passes T2 antérieures avaient échoué sur
deux tests **différents** du portail patient (`portail-parcours:281`, puis
`portail-lien-magique:48` sur la base **sans** ce lot) : aucun recouvrement,
aucun chemin causal depuis un lot qui ne touche que des surfaces praticien —
instabilité locale, confirmée par le T3 vert.

Deux passes adversariales `wn-reviewer` sur le temps B : **dix** constats, puis
**cinq** sur les correctifs eux-mêmes, tous traités. La seconde passe n'a trouvé
aucun défaut de code — cinq réserves textuelles, dont un commentaire qui
affirmait un universel (« annulable à tout moment ») que le chemin
`deverrouille` dément.

**Un piège d'outillage, payé ici.** `suite > log 2>&1; echo "X=$?" >> log` rend
le statut du `echo`, pas celui de la suite : la notification de tâche de fond a
annoncé « exit code 0 » sur un T2 **rouge**. Lire le fichier, jamais le code de
retour de la commande composée.
