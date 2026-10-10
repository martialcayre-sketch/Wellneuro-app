# Contre-revue adverse — BIO-INGEST, passe sur lecture (2026-10-10)

Date : 2026-10-10. Cible : `e78a9c6d` (copie propre, tête détachée). Énoncé :
`PROMPT_CONTRE_REVUE_CODEX_2026-10-10.md`, dans ce dossier. Jouée par Codex,
lancée par le responsable. Ce fichier reproduit son verdict. Il donne ensuite,
pour chaque trouvaille, la vérification de l'auteur du code dans l'arbre, puis
la suite.

**Verdict du contre-relecteur : NO-GO.** Il réfute trois affirmations (B2, C2,
C3), juge D4 non vérifiable, et conclut à trois P1 et aucun P0. Il n'a trouvé
aucune écriture de résultat sans geste humain. **Aucune mutation n'a été
jouée** : la passe est restée en lecture seule. Les bancs restent à éprouver
par la seconde passe (`PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md`).

**Après vérification : C2 est réfutée et sa trouvaille confirmée, à corriger
(PR #1385). B2 est AFFAIBLIE : l'affirmation est fausse sur la colonne, juste
sur le sens. Sa trouvaille P1 est écartée. C3 résiste : sa trouvaille est
écartée par l'expérience.**

## 1. Tableau des verdicts (contre-relecteur)

| ID | Verdict | Preuve citée |
|---|---|---|
| A1 | `RÉSISTE` | `decisions.ts:305-324` ; trois écrivains seulement (`decisions.ts`, `resultats/route.ts:463`, `resultats/bilan/route.ts:200`) |
| A2 | `RÉSISTE` | `decisions.ts:257-336` ; trigger de ligne, migration `20261007100000_…:209-269` |
| A3 | `RÉSISTE` | `lancerExtraction.ts:177-205` ; `extraction.ts:243-289` |
| A4 | `RÉSISTE` | `decisions.ts:249-251` ; `resultats/route.ts:432-489` ; `resultats/bilan/route.ts:164-216` |
| A5 | `RÉSISTE` | chaîne canonique passée à `Prisma.Decimal` sur les trois voies |
| B1 | `RÉSISTE` | `import/extraction/route.ts:45-70` ; seul appelant : `extraction.ts:320` |
| B2 | **`RÉFUTÉE`** | `lancerExtraction.ts:87-133` ; `purge.ts:64-69` ; `verrou.ts:8-14` |
| B3 | `RÉSISTE` | `decisions.ts:349-365` ; `ecart.ts:67-91` ; `purge.ts:38-69` ; trigger `avant_purge` |
| B4 | `RÉSISTE` | `extraction.ts:270-288` ; migration `20261005210000_…:27-34` |
| B5 | `RÉSISTE` | `depot.ts:43-66,94-125`, sur les deux routes de dépôt |
| B6 | `RÉSISTE` | `lancerExtraction.ts:90-176` ; `decisions.ts:291-303` |
| C1 | `RÉSISTE` | `portail/comptes-rendus/route.ts:48-68` ; `transmission.ts:125-153` |
| C2 | **`RÉFUTÉE`** | `portail/comptes-rendus/route.ts:78-104` ; `transmission.ts:99-114` |
| C3 | **`RÉFUTÉE`** | `portail/comptes-rendus/route.ts:87-104` |
| C4 | `RÉSISTE` | `featureFlag.ts:105-139` |
| C5 | `RÉSISTE` | `ecart.ts:47-91` ; `decisions.ts:291-304` ; triggers de la migration de transmission |
| C6 | `RÉSISTE` | CHECK origine/auteur ; `retrait.ts:45-54` ; `effacement.ts:191-203` |
| D1 | `RÉSISTE` | tous les `console.*` du périmètre : classe et code seulement |
| D2 | `RÉSISTE` | `effacement.ts:188-211` ; aucun trigger ne refuse DELETE |
| D3 | `RÉSISTE` | `import/document/route.ts:33-64` ; `garde.ts` |
| D4 | `NON VÉRIFIABLE` | modèle et version consignés ; sous-traitant et rétention des sauvegardes hors dépôt |

## 2. Trouvailles, vérification, suite

### P1-2 (C2) — un dossier clos pendant l'envoi reçoit le document — `CONFIRMÉE`, à corriger

**Contre-relecteur.** La route juge le dossier ouvert (`route.ts:83`) avant de
lire le corps. `deposerTransmission` ne rejuge ensuite que les plafonds sous
son verrou (`transmission.ts:99-114`). Une clôture qui arrive pendant l'envoi
n'empêche donc pas l'insertion.

**Vérification.** Exact. Le verrou consultatif du dépôt ne sérialise que les
dépôts d'un même dossier : la clôture du suivi ne le prend pas. La fenêtre est
large. Elle couvre tout le téléversement du corps (jusqu'à 10 Mo depuis un
téléphone), qui a lieu après le jugement du dossier. Le dépôt a déjà le
correctif type : la diffusion des fiches relit l'état du dossier `FOR SHARE`
dans sa transaction (`protocoles/diffusion/route.ts`,
`lireDossierVerrouille`, constat de revue du lot 8 de `D-251`). Une clôture
concurrente attend alors le commit.

**Suite.** Correctif minimal en PR séparée : relire `actif` et
`suivi_cloture_le` `FOR SHARE` sous le verrou du dépôt, puis refuser avec la
même raison et le même message que le contrôle d'en-tête. Le banc doit rougir
si l'on retire cette relecture.

L'accusé `usage_ia`, cité avec le dossier, n'est **pas** concerné. Sa version
courante est une constante du registre, fixe pendant la vie du processus, et
un accusé n'est jamais retiré. Aucune écriture concurrente ne peut
l'invalider pendant l'envoi.

### P1-1 (B2) — import abandonné durablement `en_cours` — affirmation `AFFAIBLIE`, trouvaille P1 `ÉCARTÉE`

**Contre-relecteur.** Un conteneur tué laisse l'import `en_cours`. Sans
relance, seul le cron le clôt, à l'échéance de 30 jours. L'état affiché
resterait donc « en cours ».

**Vérification.** Le fait est exact pour la colonne. La conséquence est
fausse. La péremption est **paresseuse** par conception (`verrou.ts:9-13` :
« réputé abandonné »), et aucun lecteur ne prend un import périmé pour une
lecture active :

- l'écran (`ImportCompteRenduPanel.tsx`, `interrompu`, via `lecture.ts:171`)
  affiche « La lecture semble interrompue : relancez-la. », cesse de relire,
  et rouvre la relance, l'écart et le retrait ;
- la relance (`lancerExtraction.ts:100-112`), l'écart (`ecart.ts:75-81`), le
  retrait (`retrait.ts:62-66`) et la purge à échéance (`purge.ts:41-51`)
  closent l'import périmé en `echec`/`delai_depasse` sous le verrou du
  document, avant d'agir ;
- `purgerSiDecide` (`decisions.ts:358`) compte les imports `en_cours` sans
  âge. Cela ne peut pas bloquer la purge d'une décision. Les lignes décidables
  sont celles de l'import courant, qui n'est pas `en_cours`. Un import
  abandonné plus récent rend l'ancien non décidable. Toute relance clôt les
  imports périmés avant d'en créer un.

Les deux garanties qui comptent tiennent. Aucune extraction ne se superpose à
une autre : la borne de 240 s et la transaction de 20 s restent sous les
5 min. Le document se purge au plus tard à 30 jours (`D-258`), import
abandonné ou non. **B2 est donc `AFFAIBLIE`, et non réfutée ni intacte.** Sa
branche « ne reste jamais `en_cours` au-delà de la péremption » est fausse pour
la colonne, comme l'admet la vérification ci-dessus. Le fond tient : aucun
lecteur ne prend l'import périmé pour une lecture active. La faute est dans la
formulation de l'énoncé. La trouvaille P1 (« l'état affiché reste en cours »)
est écartée : l'écran affiche l'inverse. Un balayage périodique n'ajouterait
rien d'observable. Pas de correctif. Au lot de clôture, la garantie s'inscrit
sous sa forme exacte : « réputé abandonné au-delà de 5 min, clos au geste
suivant ou à l'échéance ».

### P1-3 (C3) — `Content-Length` mensonger, corps de plus de 10 Mo en mémoire — `ÉCARTÉE` (réfutée par l'expérience) ; C3 `RÉSISTE`

**Contre-relecteur.** Un client annonce une petite longueur et envoie un corps
bien plus grand. `req.formData()` le matérialise avant le contrôle de
`Blob.size`.

**Vérification.** Le chemin supposé n'existe pas en HTTP/1.1 : le corps d'une
requête **est** la longueur annoncée. Le contre-relecteur l'a marqué
`CONFIRMÉE` sans l'exécuter. L'auteur l'a joué le 2026-10-10 sur Node 22
(`node:http`, le serveur sous `next start`), avec 5 Mo envoyés sur un socket
brut :

```text
serveur: corps lu = 100 octets ; content-length annoncé = 100 ; te = undefined
client err EPIPE                        (Content-Length: 100, 5 Mo envoyés)
client err EPIPE                        (Content-Length: 100 + Transfer-Encoding: chunked)
```

Le serveur lit exactement les 100 octets annoncés. Le surplus est pris pour
une requête suivante, illisible, et la connexion est coupée. La combinaison
`Content-Length` et `chunked` est refusée avant le gestionnaire. Le corps
matérialisé par `formData()` reste donc borné par la longueur annoncée,
elle-même refusée au-delà de 10 Mo plus la marge (`route.ts:87-92`). Pas de
correctif.

### D4 — `NON VÉRIFIABLE`

Le contre-relecteur n'a pu vérifier ni le contrat du sous-traitant, ni la
rétention des sauvegardes : tous deux sont hors dépôt. C'est conforme à
l'énoncé. La survie dans les sauvegardes est un arbitrage consigné (`D-258`).
Le constat relève du lot de clôture, avec la mise à jour du dossier RGPD.

## 3. Ce qui reste

- **Correctif C2** : PR #1385, mergée (`cc3f2f30`) et déployée le
  2026-10-10. Rejouée sur cette cible, la passe sur lecture retire la
  réfutation de C2 ; elle maintient B2 et C3 sans argument neuf, et leur
  traitement ci-dessus reste inchangé.
- **Seconde passe (mutations)** : jouée le 2026-10-10,
  `REVUE_CODEX_MUTATIONS_2026-10-10.md`. M16 et M18 survivaient ; leurs
  bancs sont ajoutés.
- **Lot de clôture** : LOT-12, 2026-10-10 (`lots/LOT-12-cloture.md`). B2 y
  est inscrite sous sa forme exacte (§1). D4 y est constatée, et la rétention
  des sauvegardes établie puis déclarée par `donnees_confidentialite` v14
  (§2).
