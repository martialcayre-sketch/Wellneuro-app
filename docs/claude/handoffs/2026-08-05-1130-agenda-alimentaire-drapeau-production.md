# Handoff — Agenda alimentaire, position du drapeau (hors lot)

- Date : 2026-08-05, 11:30
- Campagne : `docs/claude/campagnes/2026-08-04-agenda-alimentaire/`
- Lot : aucun — **arbitrage d'exploitation**, sans code
- Décision posée : **D-024** (amende le point 2 de D-022)
- Fragment de changelog : `changelog.d/2026-08-05-agenda-alimentaire-drapeau-production.md`
- Runbook : `docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md`

## Où en est la campagne

Les cinq lots écrits sont livrés. `LOT-05` — le barème — reste à écrire, et **ce
qui le bloque n'est pas une attente, c'est un geste** : la production compte 0
journée *et* 0 assignation de `Q_ALI_09` sur 113. L'agenda n'a jamais été
distribué à personne.

`D-024` lève ce qui l'empêchait de l'être. Le geste qui suit est de la main du
praticien, au panneau Vercel, et il n'appelle aucune PR.

## Ce que ce lot a changé, et ce qu'il n'a pas changé

Quatre fichiers documentaires, aucun code. Le drapeau reste **éteint** : cette PR
autorise l'allumage, elle ne l'exécute pas.

## Les quatre choses à savoir avant de toucher à ce sujet

1. **La Preview n'est pas un environnement de test ici.** Elle lit la base de
   production (D-022 le consigne), et le praticien ne peut pas s'y connecter :
   SSO Vercel sur `*.vercel.app`, callback OAuth sur `app.wellneuro.fr`. Le
   précédent G4 tranchait déjà — « Production seule — jamais Preview ».
2. **Le seul chemin d'auto-assignation est le pack.** `assignPackToPatient` part
   de l'onboarding portail, donc sans clic praticien, et n'écarte que
   `IDS_SUSPENDUS`. Rien ne valide les `qids` d'un pack contre cette liste : la
   requête de prérequis du runbook est le seul filet.
3. **Aucun patient de graine ne peut porter le recueil.** Leur adresse
   `@fictif.wellneuro.fr` n'existe pas, et le lien d'entrée au portail part par
   e-mail — l'interface ne l'affiche pas. La règle est celle du gate G4 : « la
   précaution qui compte n'est pas "un patient fictif", c'est **aucune boîte d'un
   tiers** ».
4. **Le contrat SQL ne se rejoue pas tel quel.** `agenda_alimentaire_v1.sql` est
   un bloc `DO $$` que le garde MCP refuse deux fois. Le runbook porte les trois
   assertions de données transcrites en `SELECT`, vérifiées exécutables contre la
   production.

## Ce qui reste ouvert, nommé et non corrigé

- **Aucun lecteur praticien des journées.** Les seuls consommateurs de
  `agendaAlimentaireJour` sont le hub patient, la persistance et l'effacement
  RGPD. La calibration de `LOT-05` passera par `execute_sql`, et rien d'autre.
- **L'interface ne dira pas « pilote ».** Faute de `sections` et de bloc
  `certification`, la bibliothèque affichera « 0 questions » et « Statut
  inconnu » — un signal trompeur, pas une absence de signal.
- **Rien n'empêche `Q_ALI_09` d'entrer dans un pack** : `POST`/`PUT
  /api/praticien/packs` ne valident pas les `qids`.
- **La graine ment sur le pack par défaut** : `web/prisma/seed.ts` déclare quatre
  identifiants sous le commentaire « reflète le pack `parDefaut` réel », quand la
  production en porte cinq (`Q_SOM_09` ajouté depuis). Hors périmètre.
- **Les six manques du recueil** listés au handoff `LOT-04` ne sont pas corrigés,
  et le pilote sera recueilli sous eux.

## Validation au moment du handoff

`npm run check` vert (code 0), audit de campagnes vert, anti-secrets vert. Diff
documentaire seul — pas de T2/T3, aucun parcours touché.

Deux passes adversariales `wn-reviewer` : **NO-GO** puis, après correctifs,
**GO sous réserve** dont les neuf constats sont traités. Les deux passes ont
attrapé la même classe : **un geste prescrit sans avoir été exécuté**. La première
sur les patients de graine, la seconde sur une requête `jsonb` posée contre une
colonne `text[]` et sur un contrat SQL que le garde MCP refuse. Les trois
assertions transcrites ont été exécutées contre la production avant d'être écrites.
