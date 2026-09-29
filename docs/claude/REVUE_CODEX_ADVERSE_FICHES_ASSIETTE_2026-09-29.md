# Contre-revue adverse — la fiche d'assiette (D-251, lots 1 à 11)

Date : 2026-09-29. Cible : `712a62bc` (le code n'a pas bougé jusqu'à la tête
de la PR #1251 ; seul un commentaire de `drapeau.ts` a changé). Énoncé :
`PROMPT_CONTRE_REVUE_CODEX_FICHES_ASSIETTE_2026-09-29.md`, **dans sa première
version** (`8b47d495`) — avant les trois corrections de la revue Copilot de la
PR #1251. Deux traces le montrent : A1 est jugée invérifiable parce qu'`archive/`
était hors périmètre, et aucune mutation n'a été jouée parce que l'énoncé
autorisait la mutation dans la copie de travail, que le contre-relecteur a
refusée à bon droit.

Contre-revue jouée par Codex, lancée par le responsable. Ce fichier reproduit
son verdict, puis la vérification de chaque trouvaille par l'auteur du code,
dans l'arbre, et la suite donnée.

**Verdict du contre-relecteur : BLOQUER.** Aucun P0 confirmé ; une affirmation
réfutée, six affaiblies, quatre trouvailles P1.

## 1. Tableau des verdicts (contre-relecteur)

| Affirmation | Verdict | Preuve |
|---|---|---|
| A1 | `NON VÉRIFIABLE` | Le texte canonique n'est pas accessible et `archive/` est exclu du périmètre alors que l'affirmation couvre tout le dépôt et son historique. |
| A2 | `RÉFUTÉE` | `protocoles/diffusion/route.ts:430,624,676,713,735` journalise directement `error.message` ; `ingest/route.ts:25` journalise l'objet d'erreur brut. |
| A3 | `RÉSISTE` | `registreGabarits.ts:546-567` ne porte que `prenom` et `connexion` ; `email.ts:249-267` utilise une URL de connexion non secrète. |
| B1 | `RÉSISTE` | Recalcul et comparaison du jeton dans la transaction : `diffusion/route.ts:312-365` ; verrous par fiche : `remise.ts:60-70`. |
| B2 | `AFFAIBLIE` | La route rejoue les contrôles, mais le trigger SQL de M2 (`:180-256`) vérifie seulement dossier, empreinte, action/assiette, référence et idempotence. Un autre écrivain peut remettre une référence dont les contrôles applicatifs échouent. |
| B3 | `RÉSISTE` | Verrou de chaîne avant les verrous de fiches : `diffusion/route.ts:313-360` ; idempotence sous verrou : M2 `:229-256`. |
| B4 | `RÉSISTE` | Drapeau fermé, le payload clinique additionnel n'est pas sélectionné (`diffusion/route.ts:192-205`) et la branche historique reprend à `:390`. |
| B5 | `AFFAIBLIE` | Le clic verrouille et vérifie le dossier (`diffusion/route.ts:123-130,320-329`), mais le trigger M2 ne vérifie ni `actif`, ni la clôture du suivi. |
| C1 | `RÉSISTE` | Identité issue exclusivement de la session (`portailAuth.ts:13-34`) ; remises filtrées par cet `idPatient` (`servicePatient.ts:84-104`). |
| C2 | `RÉSISTE` | `remisesEnCours` ne conserve que le plus grand `ordre` par fiche (`ficheServie.ts:83-89`). |
| C3 | `RÉSISTE` | Seul le contenu des versions contrôlables est chargé ; retrait et échec donnent `retiree` ou `indisponible` sans motif (`servicePatient.ts:108-144`). |
| C4 | `AFFAIBLIE` | Les nouvelles requêtes sont coupées, mais un onglet déjà chargé conserve son état ; le drapeau est lu avant le commit (`diffusion/route.ts:363`) et n'est pas relu avant le SMTP (`:376-377`). |
| C5 | `RÉSISTE` | Consignation montée seulement avec un contenu (`FicheRemiseLecture.tsx:69-103`) ; le POST recalcule les objets servis (`lectures/route.ts:266-295`). |
| C6 | `RÉSISTE` | Titres, précautions et paragraphes sont des enfants React ; aucun rendu HTML brut (`FicheRemiseLecture.tsx:69-87`). |
| D1 | `AFFAIBLIE` | Un seul envoi après commit tient en régime stable, mais une fermeture du drapeau entre `annonceDue` et `annoncerDocumentRemis` laisse partir l'e-mail. |
| D2 | `RÉSISTE` | Trace `Non_envoye` créée dans la transaction (`annonce.ts:46-61`), toute panne d'envoi ou de mise à jour absorbée (`:73-109`). |
| D3 | `AFFAIBLIE` | État du compte vérifié à `annonce.ts:88-95`, puis SMTP à `:98` : une révocation concurrente entre ces étapes n'est ni verrouillée ni revérifiée. |
| E1 | `RÉSISTE` | Append-only et RLS dans M1 et M2 ; suppression ordonnée dans `effacement.ts:70-76,144-146` ; article 9 au `DOSSIER_RGPD.md:225`. |
| E2 | `AFFAIBLIE` | L'ingestion ne crée aucun acte et la décision a sa route. Mais la base accepte tout INSERT portant un `validateur` non vide, `relecture_integrale = true` et la bonne empreinte : elle ne prouve pas le caractère humain du geste. |

## 2. Trouvailles, vérification, suite

### P1-1 — Messages d'erreur bruts au journal (A2) — `CONFIRMÉE`

**Contre-relecteur.** `diffusion/route.ts:430` et suivantes écrivent le message
brut d'exceptions ; identifiants, arguments Prisma ou détails inattendus
peuvent atteindre les journaux.

**Vérification.** Exact, six appels :

| Ligne (`712a62bc`) | Origine | Portée |
|---|---|---|
| `diffusion/route.ts:430` | 2026-07-18 | `catch` du POST, qui englobe depuis le lot 8 la transaction des remises |
| `diffusion/route.ts:622` | 2026-09-16 | protocole approuvé illisible (GET) |
| `diffusion/route.ts:674` | 2026-09-16 | version active illisible (GET) |
| `diffusion/route.ts:711` | 2026-09-28, lot 8 | aperçu des fiches illisible (GET) |
| `diffusion/route.ts:735` | 2026-07-18 | `catch` du GET |
| `ingest/route.ts:25` | 2026-09-26, lot 4 | objet d'erreur brut, sous un commentaire qui l'interdit |

Le message d'une erreur Prisma peut recopier les arguments de l'appel ; c'est
précisément pourquoi le reste du chantier ne journalise que la classe et le
code. `logger.*` (route des lectures) n'est pas en cause : il passe l'erreur
par `sanitizeError`.

**Suite : corrigé** — classe et code seulement (`classeEtCode` dans la route
de diffusion). Deux bancs, éprouvés par mutation (le code de `937fd897`
remis en place les fait rougir) :

- `lib/fiches-assiette/journaux.guard.test.ts` : dans les fichiers du
  chantier, aucun `console.*` ne reçoit le paramètre d'un `catch` nu, un
  `.message`, un `.stack` ou un `String(<erreur>)` — rouge sur les six appels ;
- trois tests de comportement (POST et GET de diffusion, configuration de
  l'ingestion) : une erreur au message synthétique n'en laisse rien au
  journal — rouges tous trois.

Au passage, le banc d'ingestion existant sérialisait le journal par
`JSON.stringify`, qui rend `{}` pour une `Error` (son message n'est pas
énumérable) : un objet d'erreur journalisé brut y passait. Il lit désormais
les arguments par `String`.

### P1-2 — Le trigger de remise ne rejoue ni les contrôles, ni le dossier clos (B2, B5) — `CONFIRMÉE`, bornée

**Vérification.** Le trigger `fiches_assiette_remises_avant_insertion` refuse
bien : une approbation ou un protocole d'un autre dossier ; une empreinte
recopiée fausse ; une action du protocole approuvé qui ne porte pas cette
assiette ; toute version qui n'est pas la **référence** de sa fiche (la plus
récente dont le dernier acte est `validee` — donc ni non validée, ni retirée) ;
une remise identique à la remise en cours. Il ne rejoue **pas** les contrôles
de contenu (applicatifs, inexprimables en SQL) et ne lit ni `actif` ni
`suivi_cloture_le`.

B2 affirmait « ni par un autre écrivain » pour les trois cas : la moitié
« contrôles rejoués » est fausse. B5 ne parlait que du clic, qui tient.

**Suite : garantie bornée à la route** (arbitrage du responsable, 2026-09-29,
amendement de `D-251`). Aucune migration. Le seul autre écrivain en production
est une migration relue et approuvée (`D-087`) ; le service patient masque
d'ailleurs une remise dont la version échoue aux contrôles (`indisponible`).

### P1-3 — Gardes non atomiques avant l'e-mail (C4, D1, D3) — drapeau `ÉCARTÉE`, compte `AFFAIBLIE`

**Volet drapeau — écarté.** `lectureFichesOuverte()` lit
`WN_FICHES_ASSIETTE_LECTURE` dans l'environnement du processus, qui ne change
pas pendant sa vie : sur Scalingo, refermer le drapeau exige `env-unset` puis
`restart`, qui **remplace** les conteneurs. Une relecture juste avant le SMTP
rendrait la même valeur. Ce qui reste vrai : une requête en vol sur un
conteneur en cours de remplacement finit sous l'ancienne valeur — la fermeture
est effective au remplacement des conteneurs, pas à l'`env-unset`. Et un
onglet déjà chargé garde ce qu'il a reçu : la fermeture coupe les requêtes
nouvelles, pas le passé d'un navigateur.

**Volet compte — affaibli, qualifié.** L'état du compte est déjà relu à la
frontière de l'envoi (`annonce.ts:88-95`, puis `:98`). Reste la durée de
l'appel SMTP : une révocation qui tombe dedans laisse partir un e-mail neutre
(ni assiette, ni lien secret) vers une porte déjà close. La fermer
demanderait de tenir une transaction ouverte pendant un appel réseau — refusé.
D3 est qualifiée « non atomique ».

### P1-4 — La base enregistre une déclaration de relecture, pas un acte humain (E2) — `CONFIRMÉE`, bornée

**Vérification.** Exact, et inhérent : aucune contrainte SQL ne distingue un
humain d'un écrivain qui déclare `relecture_integrale = true`. Ce qui tient :
la route d'ingestion ne crée aucun acte, et la route des actes exige une
session praticien, dont elle tire le validateur (`actes/route.ts:85-89`).

**Suite : garantie bornée au chemin applicatif** (même amendement). Une
garantie inter-écrivains demanderait une identité d'auteur opposable, hors du
périmètre de `D-251`.

## 3. Limites

- **Aucune mutation jouée** : les bancs n'ont pas été éprouvés par un tiers.
  Seconde passe décidée (arbitrage du 2026-09-29) : mutations seules, dans un
  worktree jetable, sur l'énoncé corrigé.
- **A1** : le texte canonique vit en base HDS, hors d'atteinte du
  contre-relecteur. Constat de l'auteur, après correction de l'énoncé :
  aucune occurrence de « Fiche MY » ni de « fiche(s) d'assiette » dans
  `archive/`.
- Aucun accès à la production ; aucune identité réelle.
