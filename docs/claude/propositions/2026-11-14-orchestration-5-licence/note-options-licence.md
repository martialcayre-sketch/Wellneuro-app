# Licence du dépôt — note d'options (lot `orchestration-5`)

Aide à la décision. **Rien n'est décidé ici, et aucun fichier `LICENSE` n'est posé.**
La décision revient au responsable, et l'avis juridique se prend hors session.
Cette note n'est pas un conseil juridique. Elle rapporte l'état du dépôt, constaté
le 2026-11-14 sur `origin/main` (af70261c), et les effets usuels de chaque licence,
tels qu'ils se lisent dans leurs textes.

Origine : réponse du responsable à `20261113-2205-d` (« rester public pour
l'instant ; licence open source à évaluer »).

## 1. État réel du dépôt

| Constat | Valeur |
|---|---|
| Visibilité GitHub | `PUBLIC` (`gh repo view` : `licenseInfo: null`) |
| Fichier de licence à la racine | **aucun** (ni `LICENSE`, ni `COPYING`, ni `NOTICE`) |
| `package.json` (racine et `web/`) | `"private": true`, **aucun champ `license`** |
| Mention « tous droits réservés » ou de licence du projet | **aucune** (README, docs, code) |
| Fichiers de licence versionnés | trois, tous de contenus tiers : `.claude/skills/{frontend-design,ui-ux-pro-max,webapp-testing}/LICENSE.txt` |
| `node_modules` | non versionné (`.gitignore`) : le dépôt ne redistribue aucune dépendance |

**En droit, l'absence de licence signifie que tous les droits sont réservés**
(code de la propriété intellectuelle, art. L.111-1 et L.122-4 ; convention de Berne).
Les conditions d'utilisation de GitHub accordent seulement aux autres utilisateurs
le droit de voir le dépôt et de le *forker* sur GitHub. Elles n'accordent ni l'usage,
ni la modification, ni le déploiement.

### Contenus tiers versionnés, qu'aucune licence du projet ne peut couvrir

C'est le constat le plus lourd de la note, et il vaut **pour les cinq options**.
Une licence ne s'applique qu'à ce dont le responsable détient les droits :

- **Textes d'instruments cliniques tiers**, sous `web/src/lib/questionnaires/*.ts` :
  par exemple `Q_CAN_01` (QLQ-C30, EORTC) ou `Q_SOM_01` (PSQI). Huit de ces instruments
  sont classés « sous licence tierce » au dossier de certification
  (`docs/claude/propositions/2026-07-29-certification-montee/licences-tierces.md`),
  et un commentaire de `pediatrie.ts` rappelle « © MHS ».
- **Skills tiers** sous `.claude/skills/` et `.agents/skills/`, avec leurs propres
  licences (MIT et autres).
- **Référentiels publics importés** (CIQUAL, NABM, Compl'Alim) : Licence Ouverte v2.0
  quand elle est énoncée. Ils sont lus par des importeurs ; une copie versionnée
  reste à inventorier.

Conséquence : quelle que soit l'option retenue, le fichier de licence doit **exclure
nommément ces contenus** (une section « Contenus tiers » ou un `NOTICE`). Sinon, il
semblerait accorder sur eux des droits que le responsable ne détient pas. Une
question voisine, hors de ce lot, est à poser à l'avocat : la visibilité publique
actuelle de ces textes d'instruments est-elle couverte par leurs ayants droit ?

### Licences des dépendances (`web/package.json` et `package-lock.json`)

Il y a 21 dépendances directes de production et 16 de développement, soit 953 paquets
au total dans le fichier de verrouillage.

- **Directes de production** : MIT (`next`, `react`, `pg`, `@anthropic-ai/sdk`,
  `@sentry/nextjs`, `recharts`, `pdf-lib`…), Apache-2.0 (`prisma`,
  `@prisma/client`, `@prisma/adapter-pg`, `pdfjs-dist`, `sharp`), ISC (`next-auth`,
  `lucide-react`, `saxes`), BSD-2-Clause (`dotenv`), MIT-0 (`nodemailer`).
- **Transitives de production** : principalement MIT (356), Apache-2.0 (59) et ISC (37).
  Quelques licences atypiques :
  - LGPL-3.0-or-later : les binaires `@img/sharp-libvips-*`, chargés dynamiquement par `sharp` ;
  - FSL-1.1-MIT : `@sentry/cli`, l'outil de build de Sentry, à source disponible, qui
    devient MIT au bout de deux ans ;
  - EPL-2.0 : `elkjs`, apporté par l'outillage `prisma` ;
  - CC-BY-4.0 : un paquet ;
  - licence non déclarée : `seq-queue`, apporté par `mysql2` via `prisma`, mais MIT
    dans son fichier `LICENSE`.
- **Développement** : MIT, MPL-2.0 (`axe-core`, `lightningcss`) et Apache-2.0.
- **Aucune dépendance GPL ni AGPL.** Rien n'oblige donc le dépôt à prendre une
  licence copyleft.
- Le dépôt ne redistribue aucune dépendance (`node_modules` est ignoré). En
  revanche, l'application déployée en redistribue une partie : elle livre au
  navigateur un bundle (React, Next.js, Recharts…), sous des licences
  permissives qui exigent de **conserver leurs mentions**. Une image ou un paquet
  construit relèverait du même examen, à mener dans le lot de pose (réserve de
  l'avis Codex).

## 2. Les options

Chaque option est lue sur cinq axes : réutilisation par un tiers, offre SaaS,
contributions, données de santé et dépendances.

### A. Aucune licence (état actuel), rendue explicite ou non

- **Réutilisation par un tiers** : interdite en droit, mais lisible et copiable en fait.
  Le dépôt est « public mais pas ouvert ». La protection dépend de la capacité à
  constater une copie et à agir.
- **Offre SaaS** : le responsable garde tous les droits. Il peut, plus tard,
  vendre, concéder ou ouvrir sous la licence de son choix.
- **Contributions** : aucune licence entrante. Une contribution externe ne
  pourrait être intégrée qu'avec un accord écrit (une CLA). Il n'y en a pas
  aujourd'hui : seules les sessions et le responsable écrivent.
- **Données de santé** : sans effet. Le dépôt n'en contient aucune (règle de
  `CLAUDE.md`), et aucune licence n'en régit.
- **Dépendances** : aucun conflit. Les licences permissives admettent un usage
  propriétaire.
- **Réversibilité** : **totale**. C'est la seule option qui ne concède rien
  d'irrévocable. Une licence ouverte accordée sur une version publiée ne se
  retire plus pour cette version.
- **Variante explicite** : poser une mention « Tous droits réservés » qui exclut
  les contenus tiers. Elle lève l'ambiguïté sans rien concéder.

### B. AGPL-3.0 (open source, copyleft réseau)

- **Réutilisation par un tiers** : libre, y compris commerciale, à condition de
  garder la licence et de publier les modifications.
- **Offre SaaS** :
  - un concurrent **peut** exploiter un SaaS concurrent. L'article 13 l'oblige
    seulement à offrir le code source modifié à ses utilisateurs réseau. Le
    copyleft dissuade, il n'interdit pas ;
  - le responsable, seul titulaire, n'est pas lié par sa propre licence. Il peut
    donc garder une version privée, mais seulement tant qu'il détient **tous** les
    droits.
- **Contributions** : par défaut, une contribution arrive sous AGPL. Le
  responsable perd alors la liberté de relicencier, sauf CLA ou cession.
- **Données de santé** : l'article 13 vise le **code**, jamais les données. Un
  tiers qui héberge un fork avec des données patients répond seul de l'HDS et
  du RGPD, et il devient l'éditeur de son déploiement.
- **Dépendances** :
  - MIT, ISC, BSD et Apache-2.0 sont compatibles avec la GPLv3 et l'AGPLv3 ;
  - la LGPL de libvips est liée dynamiquement, ce qui convient ;
  - la MPL-2.0 (développement) est compatible ;
  - l'EPL-2.0 d'`elkjs` ne l'est qu'avec une « licence secondaire » déclarée,
    mais elle n'est ni distribuée ni liée au code applicatif.
- **Label** : approuvée par l'OSI, c'est la seule des cinq options qui soit
  « open source » au sens strict.

### C. BSL 1.1 (Business Source License, à source disponible)

- **Réutilisation par un tiers** :
  - lecture, modification et usage hors production sont permis ;
  - l'usage **en production** est interdit, sauf ce qu'autorise un « Additional
    Use Grant » rédigé par le concédant (par exemple : « usage interne par un
    praticien pour ses propres patients, sauf offre à des tiers ») ;
  - chaque version devient automatiquement une licence ouverte compatible GPL
    (Apache-2.0 par exemple) à une « Change Date », au plus tard quatre ans
    après sa publication.
- **Offre SaaS** : c'est le modèle conçu pour ce cas. Le concédant vend
  l'offre, et un concurrent ne peut pas la reproduire avant la Change Date.
- **Contributions** : rares en pratique. Une CLA est usuelle pour pouvoir changer
  les paramètres d'une version à l'autre.
- **Données de santé** : sans effet direct.
- **Dépendances** : aucun conflit. La BSL ne s'applique qu'au code du dépôt, et
  les dépendances gardent leur licence.
- **Label** : **pas open source** au sens de l'OSI. Il ne faut donc pas la
  présenter comme telle.
- **Variante plus courte** : la FSL (Functional Source License), qui interdit
  l'usage concurrent pendant deux ans puis passe en MIT ou Apache-2.0. C'est la
  licence de `@sentry/cli`, déjà présent dans l'arbre.

### D. PolyForm Noncommercial 1.0.0 (à source disponible)

- **Réutilisation par un tiers** :
  - permise seulement à des fins **non commerciales** : usage personnel, recherche,
    enseignement, organismes à but non lucratif ou publics ;
  - **un praticien libéral qui l'utiliserait pour ses consultations ferait un
    usage commercial**, ce qui est interdit ;
  - il n'y a pas de conversion programmée vers une licence ouverte.
- **Offre SaaS** : le responsable garde le monopole commercial. Toute exploitation
  commerciale par un tiers demande une licence négociée, ce qui rejoint l'option E.
- **Contributions** : même remarque que pour la BSL.
- **Données de santé** : sans effet.
- **Dépendances** : aucun conflit.
- **Label** : pas open source. La frontière « commercial / non commercial » se
  discute au cas par cas, et c'est un point à soumettre à l'avocat.
- **Variante** : PolyForm Shield, qui interdit seulement la concurrence et admet
  l'usage commercial non concurrent.

### E. Double licence (AGPL-3.0 publique et licence commerciale)

- **Réutilisation par un tiers** : sous AGPL comme dans l'option B, ou sous une
  licence commerciale payante pour qui refuse les obligations de l'AGPL (par
  exemple un éditeur qui veut intégrer sans publier son code).
- **Offre SaaS** : le responsable exploite librement. La licence commerciale est
  une source de revenu possible.
- **Contributions** : il faut un accord d'apport, par une CLA ou une cession de
  droits. Sans accord, une seule contribution externe interdit de vendre la
  licence commerciale sur la partie contribuée.
- **Données de santé** : comme pour l'option B.
- **Dépendances** : comme pour l'option B (toutes compatibles), avec un point de
  plus : la licence commerciale ne peut pas porter sur les contenus tiers.
- **Coût** : rédiger et tenir la licence commerciale et la CLA. Il faut aussi un
  avocat.

## 3. Points communs, à porter à l'avis juridique

1. **Contenus tiers.** Il faut les exclure nommément, quelle que soit l'option
   (§1). Leur visibilité publique actuelle est une question distincte.
2. **Titularité des droits.** Une grande partie du code est écrite par des
   sessions d'IA sous la direction du responsable. La protection d'un code
   produit avec l'IA dépend de l'apport créatif humain : c'est une question
   ouverte en droit français et européen. Toute licence et toute vente
   supposent des droits établis. **C'est la première question à poser à
   l'avocat.**
3. **Marque.** Une licence de droit d'auteur ne couvre pas le nom « Wellneuro ».
   Un fork pourrait le reprendre si aucune politique de marque ne l'en empêche.
4. **Responsabilité clinique.** Toutes les options excluent la garantie. Un tiers
   qui déploie un fork auprès de patients en répond seul. La qualification
   éventuelle en dispositif médical ne dépend pas de la licence.
5. **Irréversibilité.** Les options B à E concèdent des droits irrévocables sur
   les versions publiées. Seule l'option A se révise sans perte.

## 4. Lecture comparée

| | A. Aucune | B. AGPL | C. BSL / FSL | D. PolyForm NC | E. Double |
|---|---|---|---|---|---|
| Un tiers peut exploiter en production | non | oui (code publié) | non, jusqu'à la date | non commercial seul | oui (AGPL) ou payant |
| Un concurrent peut lancer un SaaS | non (en droit) | oui, s'il publie | non, jusqu'à la date | non | oui, s'il publie |
| Le responsable garde la liberté de relicencier | totale | sans contribution | avec CLA | avec CLA | CLA indispensable |
| « Open source » (OSI) | non | **oui** | non | non | oui (pour la part AGPL) |
| Réversible | **oui** | non | non | non | non |
| Conflit avec les dépendances | aucun | aucun | aucun | aucun | aucun |

## 5. Ce qui reste à faire, et où

- La question est au guichet de la liste commune (file D), avec ses options et
  l'avis Codex joint. Elle porte sur une licence, ce qui ne relève pas de la
  technique réversible : l'accord session-Codex de D-505 §6 ne s'applique donc
  pas, et la réponse revient au responsable.
- Après la réponse et l'avis juridique, un lot posera le fichier retenu. Il
  comprendra la section « Contenus tiers », le champ `license` des deux
  `package.json` (en gardant `private: true`) et, si l'option l'exige, la CLA.
