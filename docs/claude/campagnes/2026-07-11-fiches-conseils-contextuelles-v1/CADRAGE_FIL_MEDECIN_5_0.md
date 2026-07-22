# Cadrage — Fil de correspondance médecin (C3, recadrage 5.0)

> Ouvert le 2026-07-22 sur décision de l'utilisateur, pour instruire le
> bloqueur C3 de `.wn/state.json`. **Arbitré le même jour** — voir
> « Décisions actées » en fin de document. Aucun code n'accompagne ce
> cadrage.

## Ce qui est déjà acté, et contraint le cadrage

- **Le recadrage 5.0 de C3** (`PROGRAMME_WELLNEURO_5_0.md:58`) : les documents
  contextuels deviennent un **fil de correspondance** où la réponse du médecin
  traitant s'inscrit dans le fil — **sans pièces jointes biologiques**,
  précisément pour ne pas aggraver la question HDS.
- **La V1 est livrée** (campagne `2026-07-11-fiches-conseils-contextuelles-v1`,
  6 lots en prod) : documents par destinataire (patient, médecin traitant,
  praticien) avec chaîne d'états. Le fil est la couche *retour* qui manque.
- **Les refus sont portés par les routes**, pas par l'écran (précédent #181,
  décision D5 d'IDP2).
- **G-TRUST-04 n'est pas levé** : orientation arbitrée le 2026-07-22 — rester
  sur l'hébergement actuel et **borner la phase de test au 2026-10-21**. Le
  texte d'une correspondance clinique est une donnée de santé même sans pièce
  jointe : toute activation du fil avec de vraies personnes vit sous la même
  dérogation bornée, et doit être réexaminée avec elle.
- **La séparation stricte des rôles** (IDP2 LOT-03b, garde testée) : un
  médecin n'est ni un praticien `@wellneuro.fr`, ni un patient. Toute option
  qui lui ouvre une session doit dire dans quelle surface d'authentification
  elle vit — et le précédent IDP2 refuse d'empiler deux populations dans le
  même NextAuth.

## Arbitrage 1 — comment le médecin traitant est identifié

Le médecin n'a pas de compte, et le praticien connaît son adresse (elle figure
déjà sur les documents V1 qui lui sont destinés).

| Option | Description | Pour | Contre |
| --- | --- | --- | --- |
| **A. Lien signé à usage borné** | Chaque message au médecin part avec un lien haché, expirant, à usage unique — le modèle G4 déjà en production pour les patients (`portail_magic_links`) — ouvrant un formulaire de réponse sans compte | Réutilise une infra livrée, éprouvée et tracée ; aucun mot de passe ; identité = contrôle de la boîte mail professionnelle, ce que le courrier médical fait déjà | L'e-mail reste un canal non maîtrisé ; usurpation possible si la boîte du médecin est compromise ; il faut décider ce que « usage unique » veut dire pour un fil (un lien par message ?) |
| **B. Compte médecin léger** | Un troisième rôle authentifié (e-mail + code à usage unique, ou OIDC), avec sa propre surface — **jamais** dans le NextAuth praticien | Identité plus forte, sessions révocables, piste d'audit native | Coût le plus élevé ; troisième population à isoler structurellement ; friction forte pour un médecin qui répondra deux fois par an — risque réel de non-adoption |
| **C. Transcription par le praticien** | Le médecin répond par ses canaux habituels (courrier, e-mail au cabinet) ; le praticien transcrit la réponse dans le fil, datée et attribuée | Zéro surface d'authentification nouvelle ; livrable immédiatement ; c'est ce que fait déjà un dossier papier | La fidélité repose sur le praticien ; pas de trace opposable de l'original ; le médecin ne voit jamais le fil lui-même |

Ces options ne s'excluent pas dans le temps : **C peut être la V1 du fil**
(aucune décision d'identité à prendre), **A la V2** quand le volume le
justifie, B restant l'option de dernier recours si un besoin d'opposabilité
apparaît.

## Arbitrage 2 — combien de temps la correspondance est conservée

| Option | Description | Conséquence |
| --- | --- | --- |
| **1. Alignée sur le dossier patient** | La correspondance est une pièce du dossier : clôture de suivi = lecture seule, effacement = effacement | Une seule politique de cycle de vie (IDP2 D3/D4) ; rien de nouveau à décider ni à outiller au-delà de l'effacement |
| **2. Durée propre** | Péremption indépendante (n années après le dernier message) | Deuxième horloge à justifier et à outiller ; utile seulement si une obligation externe l'impose |

Quel que soit le choix : **l'effacement du dossier doit effacer la
correspondance** — le résidu D6 (année de naissance, prénom, trois lettres) ne
couvre pas un texte clinique. Même exigence que pour la trace des connexions
Google, qu'`effacerDossier` efface nommément avec un test qui échoue si on
l'oublie (`effacement.test.ts`) ; le fil devra suivre le même patron.

## Ce que ce cadrage écarte d'office

- **Pièces jointes biologiques** — hors périmètre par décision de programme
  (c'est le mur HDS).
- **Réponse du médecin dans le NextAuth praticien** — la garde des rôles
  (IDP2 03b) l'interdit structurellement.
- **Tout envoi automatique au médecin** sans geste explicite du praticien.

## Décisions actées (2026-07-22, propriétaire produit)

| # | Décision | Motif |
| --- | --- | --- |
| FM-1 | **Identité du médecin : C puis A.** La V1 du fil est la **transcription par le praticien** (option C) — aucune surface d'authentification nouvelle. Quand le volume le justifiera, la V2 passera au **lien signé** (option A), réutilisant l'infra G4 (`portail_magic_links` : haché, expirant, usage unique, rejeu tracé) | C livre le fil sans rien décider d'irréversible sur l'identité ; A réutilise une infra en production et éprouvée plutôt que d'en créer une troisième. B (compte médecin) reste l'option de dernier recours si un besoin d'opposabilité apparaît |
| FM-2 | **Conservation : alignée sur le dossier patient.** La correspondance est une pièce du dossier — clôture de suivi = lecture seule, effacement = effacement complet | Une seule politique de cycle de vie (IDP2 D3/D4), rien de nouveau à outiller. Le résidu D6 ne couvre pas un texte clinique : `effacerDossier` devra effacer la correspondance nommément, avec un test qui échoue si on l'oublie — le patron de la trace des connexions Google (`effacement.test.ts`) |

Le déclencheur de la bascule C → A n'est **pas fixé** : c'est un constat
d'usage (volume de correspondance réel), pas une échéance.

## Prochaine étape

Compiler le lot V1 (transcription praticien) dans la campagne
`2026-07-11-fiches-conseils-contextuelles-v1`, qui porte déjà C3 :
spécification d'abord, puis plan technique en mode Plan avant toute édition.
