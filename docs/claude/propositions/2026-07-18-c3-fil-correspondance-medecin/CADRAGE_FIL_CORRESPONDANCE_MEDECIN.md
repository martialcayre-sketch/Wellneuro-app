# Cadrage — Fil de correspondance médecin (discordance 5.0, report C3)

> Ouvre le cadrage du **fil bidirectionnel médecin** reporté au handoff **C3
> LOT-04**. **Périmètre : documentaire — aucun code, aucune migration,
> `schema.prisma` et `web/prisma/migrations/` intacts.** Ce document **pose** le
> problème et les pistes ; **il ne tranche rien** — les décisions sont renvoyées à
> une revue future (accès/identité médecin et régime de conservation à arbitrer).

## Constat d'exécution (2026-07-20, clôture de la Vague 2)

La Vague 2 devait livrer ce reliquat « sans pièces jointes ». Vérification faite
dans le code, **le volet sortant est déjà livré et déjà sans pièces jointes —
non par précaution, mais par construction** :

- `ContenuBloc` (`web/src/lib/documents/types.ts`) ne porte que du **texte**, par
  destinataire. Il n'existe **aucun champ de pièce jointe** dans le modèle
  documentaire, et aucune notion de fichier dans tout `web/src/lib/documents/`.
- `renderDocumentHtml(document, 'medecin', …)` (`rendu.ts`) échappe chaque
  contenu (`escapeHtml`) et n'émet que du HTML autonome.
- Le rendu médecin est **atteignable** depuis le cockpit praticien
  (`DocumentsPanel.tsx`, `DocumentComposer.tsx`, destinataire `'medecin'`).

Autrement dit, la garantie technique demandée en **question ouverte Q2** est
déjà acquise pour le sortant : ajouter une pièce jointe exigerait d'étendre le
type `ContenuBloc`, ce qu'aucun code ne fait. Ce n'est pas une politique qu'on
peut contourner par erreur — c'est une absence de chemin.

**Ce qui reste non livré est exactement le fil entrant** : recevoir et conserver
la réponse du médecin. Et cela reste bloqué sur deux verrous distincts, dont
aucun ne se lève par la mention « sans pièces jointes » :

1. **Une migration Prisma** — un fil persisté est une nouvelle table, donc un
   gate à confirmation explicite (garde-fou déjà posé plus bas dans ce
   document).
2. **Un arbitrage humain sur Q1 et Q3** — identité/accès du médecin, et
   conservation (durée, base légale, effacement, journalisation). Ces réponses
   engagent les données personnelles d'un tiers, le médecin, en plus de celles
   du patient. Elles ne se déduisent d'aucun élément du dépôt.

Décider ces points « au fil de l'implémentation » reviendrait à choisir une
durée de conservation et un mode d'authentification par défaut d'arbitrage —
c'est-à-dire à trancher sans le dire. Le reliquat reste donc **ouvert**, et la
Vague 2 le referme comme tel plutôt que de livrer une demi-réponse.

## Audit express : livré vs théorique

- **Livré (C3 V1, sans migration).** Le **rendu médecin sortant** : un document
  composé à partir de blocs validés, en registre « explorations à discuter » (non
  prescriptif), imprimable en HTML. `renderDocumentHtml(document, 'medecin', …)`.
- **Théorique.** Le **fil bidirectionnel** : le médecin **répond** dans un fil
  rattaché au patient/parcours. Jamais exercé : C3 V1 n'a ni identité médecin, ni
  canal de réception, ni conservation d'échanges.

## Le vrai point dur : recevoir une réponse crée une nouvelle surface de données

- **C3 ne possède aucun contenu clinique source** (frontière **A2**) : il *compose*
  des blocs déjà validés. Un fil qui **stocke des messages** médecin est une
  **nouvelle surface de données** (des échanges), distincte des blocs sources.
- **Discordance 5.0** : le programme recadre le volet médecin en « fil de
  correspondance » — réponse médecin **dans le fil, sans pièces jointes biologiques
  = sans HDS**. Le « sans HDS » est un **garde-fou de périmètre**, pas une solution :
  il faut encore décider *qui* accède, *comment*, et *combien de temps* on conserve.
- Trois inconnues structurelles : **identité/authentification médecin**,
  **conservation** des échanges (durée, base légale), **rattachement** (au patient,
  au document, au protocole).

## Concepts à explorer (à comparer, non à trancher ici)

### 1. Qu'est-ce qu'un « fil » cliniquement et réglementairement ?
- Un échange **confraternel** rattaché à un document sortant : le praticien envoie,
  le médecin **répond en texte** (pas de pièces biologiques → hors HDS).
- **Écarté** : transformer le fil en messagerie de santé générale ; y faire transiter
  des résultats biologiques (basculerait en HDS) ; y déposer du contenu clinique
  source (violerait A2).

### 2. Identité et accès médecin
- Options : (a) **lien signé** à usage unique/limité (pas de compte médecin) ;
  (b) **compte médecin** authentifié (surface d'auth nouvelle) ; (c) relais via le
  praticien (le médecin répond hors app, le praticien consigne).
- **Écarté (pour l'instant)** : ouvrir un espace médecin complet — surdimensionné
  tant que le besoin = une réponse ponctuelle.

### 3. Conservation et base légale
- Durée de conservation, minimisation, effacement ; base légale de l'échange ;
  journalisation d'accès. **À arbitrer avec TRUST** (information/consentement).
- **Écarté** : conservation indéfinie ; stockage de données non nécessaires.

### 4. Modèle et rattachement (si un jour persisté)
- Un message = `{ auteur (médecin), document/patient rattaché, texte, horodatage }`.
  Rattachement au document composite (C3) et/ou au protocole (C2).
- **Toute persistance d'un fil = migration Prisma → gate à confirmation explicite**
  (même régime que les autres gates C2A/C3).

### 5. Frontière A2 réaffirmée
- Le fil **transporte des échanges**, il **n'absorbe pas** de contenu clinique
  source (score, décision, protocole) — qui restent propriété C1/C2/`lib/equilibre`.

## Questions ouvertes à arbitrer

1. **Identité médecin** : lien signé (a) vs compte (b) vs relais praticien (c) ?
2. **Sans HDS** : quelle garantie technique empêche le dépôt de pièces biologiques ?
3. **Conservation** : durée, base légale, effacement, journalisation (avec TRUST) ?
4. **Persistance** : le fil est-il stocké (→ gate migration) ou éphémère/relayé ?
5. **Rattachement** : au document C3, au protocole C2, au patient — lequel fait foi ?

## Garde-fous — ce que ce report refuse

- **Aucune migration sans confirmation humaine explicite et distincte** (la rédaction
  de ce cadrage ne vaut pas confirmation).
- **Aucune pièce jointe biologique** dans le fil (rester hors HDS).
- Aucune absorption de contenu clinique source (frontière A2).
- Aucun espace/authentification médecin construit tant que le besoin réel n'est pas
  arbitré.

## Raccordement

- **Dette reprise** : report « fil bidirectionnel médecin » du **handoff C3 LOT-04**.
- **Consomme** : frontière **A2** (C3 ne possède aucun contenu clinique) et la
  campagne **TRUST** (information/consentement, conservation).
- **Promotion registre différée** : aucune entrée normative nouvelle tant que Q1–Q5
  ne sont pas tranchées — ce dossier reste la source du cadrage.
