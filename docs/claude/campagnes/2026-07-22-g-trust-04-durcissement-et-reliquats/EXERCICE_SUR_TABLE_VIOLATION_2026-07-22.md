# Exercice sur table — violation de données (2026-07-22)

> Exécution de l'exercice prévu au §8.4 de
> `docs/PROCEDURE_VIOLATION_DONNEES.md` — exigence 6 de G-TRUST-04, campagne
> `2026-07-22-g-trust-04-durcissement-et-reliquats`, chantier 2 (PR-6).
>
> **Tout est fictif.** Le patient (Michel Dogné) est l'un des trois patients
> fictifs autorisés par `CLAUDE.md` ; les horodatages, le numéro de fiche et
> la référence CNIL sont inventés. Une fiche réelle vivrait **hors du dépôt**
> (§7 de la procédure) — celle-ci ne peut figurer ici que parce qu'aucun de
> ses faits n'existe.

## Méthode

Dérouler la procédure §2→§8 sur un scénario unique, en vérifiant à chaque
étape que le geste demandé est **réellement exécutable** avec les outils du
dépôt et de la production (routes, RUNBOOK, base). Les points où la
procédure, le RUNBOOK ou l'application ne suivent pas sont numérotés EX-1,
EX-2… et repris en fin de document.

## Scénario

Michel Dogné a transféré l'e-mail contenant son **lien portail permanent**
(`/portail/[token]`) à un proche « pour lui montrer ». Le proche connaît
l'adresse e-mail de Michel (second facteur du portail) ; il ouvre le lien,
franchit la vérification, et lit les réponses de deux questionnaires —
des **données de santé** (art. 9). Michel s'en inquiète le lendemain et le
signale depuis son portail via le parcours « incident de confidentialité »
du canal trust (`POST /api/portail/trust/signalement`), qui notifie le
praticien par un e-mail générique sans donnée sensible.

Chronologie fictive (UTC) :

| Repère | Horodatage | Événement |
| --- | --- | --- |
| J0 | 2026-07-08 18:30 | Michel transfère l'e-mail au proche |
| J0 | 2026-07-08 19:10 | Le proche ouvre le portail, lit 2 questionnaires |
| J1 | 2026-07-09 08:45 | Michel dépose le signalement trust |
| J1 | 2026-07-09 09:12 | **Prise de connaissance** par le praticien (lecture de la notification) — l'horloge des 72 h démarre |
| J1 | 2026-07-09 09:20 | Fiche 2026-EX1 ouverte, endiguement lancé |
| J1 | 2026-07-09 09:25 | Révocation effective (jeton + sessions + liens en vol) |
| J1 | 2026-07-09 11:40 | Qualification : risque élevé |
| J2 | 2026-07-10 10:00 | Notification CNIL (initiale) |
| J2 | 2026-07-10 10:30 | Information de Michel + nouveau lien |

## Déroulé

### §2 — Prise de connaissance

- **Canal joué** : signalement patient. Le parcours « incident de
  confidentialité » existe bien
  (`web/src/app/api/portail/trust/signalement/route.ts`) et notifie le
  praticien sans donnée sensible dans l'e-mail. ✓
- La prise de connaissance est horodatée à la **lecture** de la notification
  (J1 09:12), pas à son envoi : c'est le moment où le responsable a un degré
  raisonnable de certitude.
- Fiche ouverte au registre (modèle de l'annexe). ✓
- Rien n'est détruit : la ligne `trust_signalements`, les logs Vercel et la
  ligne `portail_connexions_google` éventuelle sont les preuves. ✓
- **EX-2** : les autres canaux cités par la procédure (« logs de sécurité
  Vercel, `EVENT_CODES` du domaine SECURITY ») existent
  (`web/src/lib/observability/eventCodes.ts`) mais sont des **logs
  consultables, pas des alertes** : personne n'est prévenu si personne ne
  les lit. Dans ce scénario, sans le signalement de Michel, la violation
  serait passée inaperçue.

### §3 — Endiguement

- Geste requis : couper l'accès portail de Michel. La procédure renvoie au
  RUNBOOK « Révocation accès patient ».
- **EX-1** : ce RUNBOOK était **inexécutable tel qu'écrit** — il demandait
  d'« invalider `Patient.portailToken` », champ qui **n'existe pas** dans
  `web/prisma/schema.prisma` (les champs réels : `accessToken`,
  `accessTokenRevoked`, `sessionsInvalidesAvant`), et ignorait l'outil
  applicatif prévu pour exactement ce cas :
  `DELETE /api/praticien/token?idPatient=...` (bouton de révocation du
  panneau patients), qui ferme **les trois portes en une transaction** —
  jeton permanent (`accessTokenRevoked`), sessions ouvertes
  (`sessionsInvalidesAvant`), liens magiques encore en vol (datés
  `consommeLe`). Corrigé dans cette PR.
- Une fois le RUNBOOK corrigé, l'endiguement est un clic praticien,
  exécutable en minutes. ✓ (joué à J1 09:25)

### §4 — Qualification (< 24 h : tenu, ~2 h 30)

- **Faits** : divulgation par transfert volontaire du lien permanent, lecture
  par un tiers non autorisé, exposition ~14 h (J0 18:30 → J1 09:25).
- **Données** : réponses de questionnaires = données de santé (art. 9).
- **Personnes** : 1 dossier (`PAT_EX_MICHEL` — identifiant synthétique
  fictif).
- **Risque** : confidentialité + données de santé → **risque élevé présumé**.
  L'exception « données rendues inintelligibles » ne s'applique pas : le
  jeton permanent est **en clair** dans l'URL et en base (contrairement aux
  liens magiques, hachés — `empreinteJeton`,
  `web/src/lib/portail/lienMagique.ts`). Verdict : **élevé** → notification
  CNIL **et** information de la personne.

### §5 — Notification CNIL (72 h : tenu, ~25 h)

Jouée à J2 10:00 sur le téléservice, contenu art. 33.3 : nature
(divulgation d'un accès portail à un tiers), 1 personne / 2 enregistrements,
point de contact (responsable du traitement), conséquences probables
(lecture de données de santé par un proche), mesures (révocation trois
portes, nouveau lien, information de la personne). Référence fictive :
`CNIL-2026-EX-000000`. Le mode « en deux temps » n'a pas été nécessaire. ✓

### §6 — Information de la personne

Jouée à J2 10:30, e-mail en français, langage clair — nature de l'incident,
point de contact, conséquence probable (lecture par le tiers), conseil
(« ne suivez plus aucun ancien lien reçu par e-mail ; un nouveau lien
vous a été envoyé — il est personnel et ne doit jamais être transféré »).
Le **nouveau lien est émis après révocation** (`POST /api/praticien/token`),
conformément au principe « information sans rétablissement d'accès n'est
pas une remédiation ». La réémission ne rouvre pas les sessions du proche :
`sessionsInvalidesAvant` survit à la réémission (délibéré, commentaire de la
route DELETE). ✓

### §7 — Registre

La fiche réelle irait au registre **hors dépôt**, avec les pièces RGPD de la
phase de test. **EX-3** : la procédure décrit cet emplacement par renvoi
(« au même endroit que les autres pièces RGPD ») mais son existence n'est
pas vérifiable depuis le dépôt — le responsable doit confirmer que le
registre existe physiquement **avant** le premier incident réel, pas
pendant.

### §8 — Après l'incident

- **Cause racine** : le jeton permanent est un secret **transférable et
  durable** — dans l'URL, en clair, sans expiration ; le second facteur
  (e-mail du dossier) ne protège pas contre un proche, qui la connaît.
- **Mesures correctives** (fictives, mais les vraies existent déjà) :
  structurellement, c'est le remplacement du jeton permanent par les liens
  magiques à usage unique, hachés — déjà engagé (`portail_magic_links`
  « remplace progressivement le jeton permanent », schema.prisma) et dont
  l'achèvement est le lot IDP2 LOT-04, gaté sur le renvoi des invitations
  aux 12 patients (décision humaine en attente).
- Mise à jour du RUNBOOK : faite dans cette PR (EX-1).
- Report checklist : l'exigence 6 sera mise à jour en clôture de campagne
  (PR-11), conformément au lot.

## Fiche remplie

```text
FICHE DE VIOLATION — n° 2026-EX1 (EXERCICE — ENTIÈREMENT FICTIF)
Prise de connaissance (UTC) : 2026-07-09 09:12
Détecté par / canal : signalement patient, parcours « incident de
  confidentialité » du canal trust (notification praticien J1 08:45)
Faits : e-mail contenant le lien portail permanent transféré par le patient
  à un proche le 2026-07-08 18:30 ; ouverture du portail par le tiers à
  19:10 (second facteur e-mail connu de lui) ; lecture de 2 questionnaires ;
  exposition close le 2026-07-09 09:25 (~14 h)
Données concernées : réponses de questionnaires — données de santé : OUI
Personnes concernées : 1 (PAT_EX_MICHEL)
Endiguement : DELETE /api/praticien/token (révocation trois portes :
  jeton, sessions, liens en vol) — effectif le 2026-07-09 09:25
Évaluation du risque : ÉLEVÉ — confidentialité + données de santé, jeton
  en clair (exception « inintelligible » inapplicable)
Notification CNIL : OUI — 2026-07-10 10:00, réf. CNIL-2026-EX-000000
  (délai : ~25 h < 72 h)
Information des personnes : OUI — 2026-07-10 10:30, e-mail du dossier,
  nature + conseil + nouveau lien émis après révocation
Sous-traitant impliqué : aucun
Cause racine : jeton permanent transférable, en clair, sans expiration ;
  second facteur inopérant face à un proche
Mesures correctives : RUNBOOK « Révocation accès patient » corrigé (cette
  PR) ; achèvement du remplacement par liens magiques = IDP2 LOT-04 (gaté,
  décision humaine)
Clôture : 2026-07-10 (exercice — sans signature)
```

## Constats et écarts

| # | Constat | Suite donnée |
| --- | --- | --- |
| EX-1 | RUNBOOK « Révocation accès patient » inexécutable : champ `portailToken` inexistant, route applicative `DELETE /api/praticien/token` (trois portes, une transaction) ignorée, ni `sessionsInvalidesAvant` ni réémission de lien mentionnés | **Corrigé dans cette PR** (`docs/RUNBOOK.md`) |
| EX-2 | Détection passive : les événements SECURITY sont des logs, pas des alertes — sans signalement patient ou consultation manuelle, une violation peut courir sans borne | Consigné. Une alerte active est une surface nouvelle — décision hors périmètre de ce lot |
| EX-3 | L'emplacement physique du registre des violations (hors dépôt) n'est pas confirmable depuis le dépôt | Action humaine : le responsable confirme l'existence du registre avant tout incident réel |

## Verdict

**La procédure est exécutable en 72 h par une seule personne** — une fois
EX-1 corrigé. Sur ce scénario : endiguement en minutes (un clic praticien),
qualification en ~2 h 30, notification à ~25 h. Les points durs ne sont pas
dans la procédure mais autour d'elle : la **détection** (EX-2 — le délai ne
démarre qu'à la prise de connaissance, et rien ne la force) et la
**préparation matérielle** (EX-3 — le registre doit préexister à
l'incident). La confirmation juridique de la procédure reste une dette
ouverte (D-TRUST-02) : cet exercice valide l'exécutabilité, pas la
conformité.
