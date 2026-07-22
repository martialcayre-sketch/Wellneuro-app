# Procédure de violation de données personnelles

> Écrite le 2026-07-22 pour fermer le manque relevé par l'exigence 6 de
> G-TRUST-04 (« Aucune procédure de violation de données ») —
> `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`.
>
> **Alerte, pas avis juridique.** Ce document est rédigé par l'assistant, dont
> la connaissance a une date de coupure et qui n'est pas juriste. Les articles
> cités (RGPD art. 4.12, 33, 34) doivent être **confirmés par un conseil
> qualifié** avant que cette procédure soit tenue pour conforme — la revue
> juridique externe est déjà une dette nommée (`DETTE_TRUST.md`).

## Rôles

- **Responsable du traitement** : le praticien Wellneuro
  (`martialcayre@wellneuro.fr`) — qualification G-TRUST-02. Pas de DPO
  désigné : le point de contact est le responsable lui-même.
- **Sous-traitants réels** (liste G-TRUST-02) : Vercel, Supabase, Anthropic,
  fournisseur SMTP, Google (OAuth). En cas de violation chez l'un d'eux,
  c'est **à lui** de notifier le responsable sans délai indu (art. 33.2) —
  mais la découverte peut venir de notre côté, et la procédure s'applique
  alors à l'identique.

## 1. Ce qui est une violation

Toute atteinte, accidentelle ou illicite, à la **confidentialité**
(divulgation ou accès non autorisé), à l'**intégrité** (altération) ou à la
**disponibilité** (destruction, perte) de données personnelles (art. 4.12).
Les trois comptent : une base perdue sans sauvegarde est une violation même
si personne n'a rien lu.

Exemples concrets pour cette application :

- e-mail portail envoyé au **mauvais destinataire** ;
- **lien portail** (jeton permanent ou lien magique) exposé — URL collée
  publiquement, `Referer`, historique d'un poste partagé ;
- fuite d'un secret donnant accès à la base (`DATABASE_URL`, clé service
  Supabase) ;
- accès à un dossier patient par une personne non autorisée (y compris un
  autre patient) ;
- perte ou corruption de la base sans sauvegarde restaurable ;
- incident chez un sous-traitant touchant nos données (annoncé par lui ou
  découvert par la presse).

## 2. Prise de connaissance — l'horloge démarre ici

Canaux de détection : logs de sécurité Vercel (`EVENT_CODES` du domaine
SECURITY), alertes Supabase, signalement d'un patient (canal trust,
`POST /api/portail/trust/signalement`), constat direct du praticien,
notification d'un sous-traitant.

Dès qu'une **suspicion** existe :

1. **Horodater la prise de connaissance** (date + heure, UTC). Le délai de
   72 h de l'art. 33 court à partir du moment où le responsable a
   connaissance de la violation avec un degré raisonnable de certitude.
2. Ouvrir une **fiche de violation** (modèle en annexe) dans le registre.
3. Ne rien détruire : les logs et éléments de preuve servent la
   qualification.

## 3. Endiguement immédiat

En parallèle de la qualification, couper ce qui doit l'être — les procédures
existent déjà dans `docs/RUNBOOK.md` :

- secret compromis → « Suspicion fuite secret » (révoquer les clés dans les
  services) ;
- accès patient compromis → « Révocation accès patient », et couper les
  sessions ouvertes via `sessionsInvalidesAvant` (IDP2 LOT-02) ;
- compte praticien compromis → révoquer la session Google et les
  autorisations OAuth du compte `@wellneuro.fr` ;
- si l'application elle-même est le vecteur → envisager la mise hors ligne
  temporaire (Vercel : désactiver le déploiement), en pesant la perte de
  disponibilité contre la fuite en cours.

## 4. Qualification et évaluation du risque (viser < 24 h)

Établir, sur la fiche :

- **les faits** : quoi, quand, comment, vecteur, durée d'exposition ;
- **les données concernées** : les réponses aux questionnaires et tout
  contenu clinique sont des **données de santé** (art. 9, catégorie
  particulière) ;
- **les personnes** : combien de dossiers, lesquels (identifiants
  synthétiques `id_patient`, jamais de liste nominative dans la fiche si
  elle peut l'éviter) ;
- **le risque** pour les droits et libertés des personnes. Règle de
  prudence : une violation de **confidentialité sur des données de santé se
  présume à risque élevé**, sauf si les données étaient rendues
  inintelligibles (chiffrées, hachées — le cas des liens magiques G4, hachés
  en base, contrairement au jeton permanent en clair).

Trois issues possibles, à motiver par écrit sur la fiche :

| Risque | Notification CNIL (art. 33) | Information des personnes (art. 34) |
| --- | --- | --- |
| Improbable | Non — justification documentée au registre | Non |
| Probable | **Oui, sous 72 h** | Non, sauf aggravation |
| Élevé | **Oui, sous 72 h** | **Oui, sans délai indu** |

## 5. Notification à la CNIL

- **Où** : téléservice de notification de la CNIL (notifications sur
  cnil.fr).
- **Quand** : dans les **72 heures** suivant la prise de connaissance. Si
  tout n'est pas encore établi, notifier **en deux temps** (notification
  initiale puis complément) plutôt que d'attendre — le retard doit être
  motivé.
- **Contenu minimal** (art. 33.3) : nature de la violation ; catégories et
  nombre approximatif de personnes et d'enregistrements concernés ; nom et
  coordonnées du point de contact ; conséquences probables ; mesures prises
  ou proposées pour remédier et atténuer.

## 6. Information des personnes concernées

Si le risque est élevé (art. 34) :

- **sans délai indu**, dans un **langage clair et simple** — et en
  français, comme tout texte destiné aux patients ;
- contenu : nature de la violation, point de contact, conséquences
  probables, mesures prises et conseils (par exemple : « ne suivez plus
  d'ancien lien reçu par e-mail, un nouveau lien vous a été envoyé ») ;
- canal : l'e-mail du dossier — sauf si c'est précisément ce canal qui est
  compromis ; le responsable choisit alors un autre canal, et le consigne ;
- exceptions légales (à motiver) : données rendues inintelligibles avant la
  violation ; mesures ultérieures écartant le risque élevé ; effort
  disproportionné (alors communication publique).

Un patient dont le lien d'accès a été exposé doit **recevoir un nouveau
lien** après révocation de l'ancien — l'information sans rétablissement
d'accès n'est pas une remédiation.

## 7. Registre des violations (art. 33.5)

Toutes les violations, **y compris celles non notifiées**, sont consignées
avec leur justification. Le registre est tenu par le responsable, **hors du
dépôt Git** (il contient des faits nominatifs par nature) — au même endroit
que les autres pièces RGPD (consentements de la phase de test). Le dépôt ne
contient que la présente procédure et le modèle de fiche.

## 8. Après l'incident

1. Cause racine, puis mesures correctives — chacune tracée (PR, ou décision
   consignée).
2. Mise à jour de cette procédure et du `RUNBOOK.md` si l'incident a révélé
   un manque.
3. Report sur `CHECKLIST_ACTIVATION_G_TRUST_04.md` si l'incident touche une
   des sept exigences.
4. **Exercée sur table le 2026-07-22** (scénario fictif : lien portail du
   patient fictif Michel Dogné transféré à un tiers) — déroulé, fiche
   remplie et constats dans
   `docs/claude/campagnes/2026-07-22-g-trust-04-durcissement-et-reliquats/EXERCICE_SUR_TABLE_VIOLATION_2026-07-22.md`.
   Verdict : exécutable en 72 h par une seule personne, après correction du
   RUNBOOK « Révocation accès patient » (constat EX-1). La confirmation
   juridique reste due (D-TRUST-02) : l'exercice valide l'exécutabilité,
   pas la conformité.

## Annexe — modèle de fiche de violation

```text
FICHE DE VIOLATION — n° AAAA-NN
Prise de connaissance (UTC) :
Détecté par / canal :
Faits (quoi, quand, comment, vecteur, durée d'exposition) :
Données concernées (catégories ; données de santé oui/non) :
Personnes concernées (nombre, identifiants synthétiques) :
Endiguement (actions, horodatage) :
Évaluation du risque (improbable / probable / élevé) et motifs :
Notification CNIL (oui/non, date, référence) — si non : justification :
Information des personnes (oui/non, date, canal, contenu) :
Sous-traitant impliqué (lequel, notification reçue le) :
Cause racine :
Mesures correctives (et où elles sont tracées) :
Clôture (date, signature du responsable) :
```
