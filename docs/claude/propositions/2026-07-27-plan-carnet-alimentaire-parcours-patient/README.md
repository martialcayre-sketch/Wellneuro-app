---
id: "2026-07-27-plan-carnet-alimentaire-parcours-patient"
titre: "Confrontation de l'audit externe du 2026-07-27 et plan révisé — carnet alimentaire et parcours patient"
statut: "proposition — arbitrages ouverts, aucun code modifié"
créé_le: "2026-07-27"
base_auditée: "main @ 8cf474e"
---

# Confrontation de l'audit externe et plan révisé

Un troisième document d'audit a été apporté le 2026-07-27, portant sur l'état de
`main` après les PR #398 et #408. Ce rapport le confronte au dépôt — ce qu'il
établit justement, ce qu'il affirme à tort, ce qu'il manque — puis en tire un
plan de développement révisé pour le carnet alimentaire et le parcours patient.

Méthode identique aux deux audits précédents : chaque affirmation contestée ou
confirmée porte un `fichier:ligne` rouvert, et rien n'est retenu sur la seule
lecture d'un commentaire.

## 1. Ce que l'audit externe établit justement

### 1.1 Son point principal est juste, et c'est le plus important du document

**`Q_ALI_01` reste le risque clinique résiduel n° 1.** Vérifié :

- `constants.ts:89` — besoin 1 ← `Q_ALI_01`, `max: 42`, source unique ;
- `constants.ts:71` — `BESOINS_FONDATIONS_CRITIQUES = [1, 2, 4, 5, 9]` : le
  besoin 1 en fait partie ;
- `score.ts:142-152` — sous `SEUIL_EFFONDREMENT = 0.34`, le score global est
  plafonné à 50 ;
- `alimentaire.ts:63-66` — les quatre bandes concluent toujours
  (« Alimentation de haute qualité nutritionnelle », « … déséquilibrée »,
  « … très déséquilibrée ») et portent toujours un `protocol:`.

Un dépistage court de 14 items, dont le code lui-même déclare les seuils
« PROVISOIRES, SOURCE NON CERTIFIÉE » (`alimentaire.ts:48-60`), pilote donc une
fondation critique et peut plafonner l'indicateur global d'un patient. **Le
commentaire d'avertissement ne protège ni le calcul, ni la restitution.**
L'analyse est exacte et la conclusion — il faut un geste exécutable, pas un
commentaire — est la bonne.

Nuance à ajouter : le `protocol:` des bandes **n'atteint pas le modèle de
synthèse**, filtré par `scoresPourPrompt` (`CLES_CONDUITE`). Il atteint en
revanche la fiche praticien. Le risque est donc de restitution, pas
d'hallucination IA.

### 1.2 Autres constats vérifiés et confirmés

| Affirmation | Verdict | Preuve |
|---|---|---|
| Besoin 2 correctement non évalué, la fatigue retirée | **exact** | `constants.ts:92` (tableau vide) |
| Le plafonnement ne se déclenche pas sur une couverture nulle | **exact, non affirmé par l'audit — vérifié ici** | `score.ts:145`, `couverture !== null && …` |
| Besoin 3 sans aucune source | **exact** | `constants.ts:93` |
| Épisode du carnet fabriqué en dur, fenêtre 7 jours | **exact** | `PatientFoodObservationPanel.tsx:44-66` |
| Saisie patient en `sessionStorage` | **exact** | `PatientFoodObservationPanel.tsx:97, 124, 133` |
| Étiquette `versionScore` figée, valeurs recalculées | **exact** | `constants.ts:24-36`, `depuisPrisma.ts:88-107` |
| `Q_ALI_01` contient un item de rythme (`AL12`, nombre de repas) | **exact** | `alimentaire.ts:40-41` |

Le diagnostic d'ensemble — « le dépôt a corrigé ce qu'il ne devait plus
affirmer, il n'a pas encore construit ce qu'il devra mesurer » — est juste, et
c'est une bonne formulation du moment où en est le projet.

## 2. Ce que l'audit externe affirme à tort

### 2.1 La couverture du carnet ne rend aucun verdict de suffisance — mais un autre le fait, et c'est pire

L'audit écrit (§4.3) que la couverture est « calculée à partir du nombre de
traces et du budget hebdomadaire » et que « trois traces prises le même lundi
peuvent donc être considérées comme une couverture suffisante ».

**La première moitié est fausse.** `describeCoverage`
(`restitution.ts:41-49`) rend une phrase délibérément nue — « X traces sur un
budget de Y cette semaine » — et son commentaire précise « sans
pourcentage-seuil, sans code couleur, sans qualificatif ». Un garde
`assertNeutre` lève une exception si un terme non neutre s'y glisse. Le module
**refuse** de qualifier. De même, `buildPublishedJaFeasibility`
(`feasibility.ts:75-86`) ne publie que des comptes de faits, assortis de deux
limitations explicites (« aucune causalité n'est déduite »).

**Mais la seconde moitié est vraie, ailleurs, et plus gravement.**
`PatientFoodObservationPanel.tsx:193` :

```ts
const silenceUtile = traces.length >= budget ? buildSilenceUtileMessage() : null;
```

Trois traces prises le même lundi atteignent `budget = 3`, et le **patient** lit
alors : « **Rien à noter aujourd'hui, nous en savons assez.** »
(`labels.ts:70`). Un verdict de suffisance, adressé au patient à la première
personne du pluriel, rendu sur un simple comptage aveugle au temps.

L'audit a donc le bon instinct et le mauvais fichier ; la version corrigée du
constat est plus sévère que la sienne. C'est **la même famille que tout le
reste de cette semaine** : un comptage d'observations pris pour une connaissance
de la chose observée.

### 2.2 Sa recommandation d'architecture vise un mécanisme qui n'a jamais tourné

L'audit consacre son §5 au gel des valeurs historiques et recommande de figer,
« à la clôture d'un épisode », un `inputSnapshot`, un `scoreSnapshot`, un
`coverageSnapshot`, etc.

Relevé en production le 2026-07-27, en lecture seule :

| Table | Lignes |
|---|---|
| `assessment_episodes` | **0** |
| `protocol_drafts` | **0** |
| `protocol_checkins` | **0** |
| `protocol_diffusion_approvals` | **0** |
| `protocol_review_flags` | **0** |

**Aucun épisode n'a jamais été clôturé, ni même ouvert.** Aucun protocole n'a
jamais été rédigé. La recommandation porte sur le moment de clôture d'un objet
qui n'existe pas encore une seule fois en base. Elle n'est pas fausse — elle est
prématurée d'un cran : la question préalable est de savoir si le cycle protocole
→ épisode a vocation à servir. Détail dans
`docs/claude/propositions/2026-07-27-audit-chaine-trajectoire/` §2.

### 2.3 Il mélange deux catégories que le garde-fou IA vient précisément de séparer

Son §7 énumère, sous « ce que les trois questionnaires ne suffisent pas à
calculer » : fibres en g/j, protéines en g/kg/j, **mais aussi** index oméga-3,
HOMA-IR, homocystéine, statut inflammatoire, statut antioxydant.

Ces deux groupes ne sont pas de même nature. Les premiers sont des **estimations
d'apport**, atteignables en principe par un questionnaire de fréquence
correctement quantifié, adossé à une table de composition. Les seconds sont des
**dosages biologiques** : aucun questionnaire alimentaire, si complet soit-il,
ne produira jamais une homocystéinémie ou un HOMA-IR.

Le prompt de synthèse v5 interdit désormais explicitement cette confusion
(`anthropic.ts:42`). Les énumérer ensemble comme un horizon de développement
réintroduit au niveau de la feuille de route ce qui vient d'être interdit au
niveau du prompt. La ligne doit rester tracée : **on estime des apports, on dose
un statut.**

## 3. Ce que l'audit externe manque

### 3.1 Le seul défaut vivant du parcours patient

L'audit annonce couvrir le parcours patient. Il ne mentionne pas le défaut qui
s'y trouve aujourd'hui, établi le même jour par sonde exécutée
(`2026-07-27-audit-chaine-trajectoire/` §5, F1 et F7) :

Un patient qui remplit ses questionnaires une fois et ne revient jamais obtient
quatre jalons datés — T0, J21, J42, J90 — tous marqués `mesure: true` à la même
valeur, un momentum « stable, écart 0 », et lit sur son portail :

> « **4 bilans jalonnent votre parcours**, du début à aujourd'hui. »
> « **Stable depuis votre dernier bilan.** »

Il y a eu un bilan, et il n'y a pas de dernier bilan.

Ce défaut est de la même famille que celui de `Q_ALI_01` que l'audit dénonce à
juste titre, mais il porte sur la **surface patient**, qui est vivante, alors
que la chaîne praticien est dormante. Il devrait figurer avant plusieurs des
chantiers proposés.

### 3.2 Sa piste pour le besoin 3 rejouerait le défaut du besoin 2

L'audit suggère (§3) que le besoin 3 « Rythme alimentaire » pourrait être
alimenté par l'item `AL12` de `Q_ALI_01` (nombre de repas structurés) et par le
carnet.

`AL12` existe bien (`alimentaire.ts:40-41`), mais c'est **un item ordinal unique
comptant les repas**. Le besoin 3 s'intitule « Rythme alimentaire
(chronobiologie) » : il suppose des horaires, une heure de première prise, une
durée de jeûne nocturne, une variabilité entre jours. `AL12` n'en mesure aucun.

Le brancher reproduirait **exactement** le défaut qui vient d'être retiré du
besoin 2 : prendre un item vaguement apparenté pour la mesure d'une construction
qu'il ne mesure pas. Deuxième objection, indépendante : `AL12` est déjà compté
dans le total /42 qui alimente le besoin 1 — il serait compté deux fois dans
deux besoins distincts.

**Le besoin 3 doit rester non mesuré** jusqu'à ce qu'un instrument de rythme
existe. C'est le carnet, correctement structuré par journée, qui peut le
produire — pas un item de fréquence.

## 4. Le désaccord de méthode : quatorze domaines

L'audit propose (§8, étape 1) une matrice de **14 domaines** : hydratation,
végétaux, fibres, qualité glucidique, ultra-transformés, protéines, qualité
lipidique, ALA, EPA-DHA, polyphénols, profil inflammatoire présumé, rythme,
vulnérabilités micronutritionnelles, contraintes.

L'audit du 2026-07-26 avait examiné et **écarté** une proposition voisine (§5.4,
15 domaines), avec cet argument : les items servis n'en discriminent que 5 ou 6,
et les autres afficheraient « non documenté » dès le premier jour. Le nouveau
document ne discute pas cet argument — il le contourne en reproposant la même
structure à une unité près.

Or son propre §7 le confirme : les questionnaires actuels ne permettent de
calculer ni les fibres, ni l'index oméga-3, ni les polyphénols, ni le profil
inflammatoire. Sur ses 14 domaines, **8 seraient vides à la livraison**.

La structure qu'il propose — `statut / confiance / sources / limites / action
possible / confirmation requise` — est en revanche excellente, et c'est elle qui
a de la valeur. Le désaccord ne porte pas sur la forme mais sur le nombre : un
profil de 6 domaines réellement documentés vaut mieux qu'un profil de 14 dont
8 disent « non documenté », parce qu'un tableau majoritairement vide se lit
comme une carence de l'application, pas comme une limite de la mesure.

**Recommandation : commencer à 6 domaines, avec la structure proposée, et
n'ouvrir un domaine que lorsqu'un instrument l'alimente.**

## 5. Plan de développement révisé

Ordre imposé par les dépendances, pas par l'importance perçue. Les trois
premiers lots ne demandent aucun nouvel instrument.

### Lot 1 — Arrêter d'affirmer ce qui est faux (aucune dépendance)

1. **`Q_ALI_01` — trancher.** L'option recommandée reste le renommage
   (`WN_ALI_SCREEN_14_v0`), le retrait des quatre bandes conclusives et de leurs
   `protocol:`, et **la sortie du besoin 1 des fondations critiques** tant
   qu'aucune source validée ne l'alimente. Restaurer les 57 items SIIN est un
   chantier de semaines qui laisse l'instrument en niveau de preuve B : ce n'est
   pas symétrique. ⚠️ Bump `VERSION_SCORE_EQUILIBRE` v4 → v5, `CHANGELOG.md`,
   demande explicite du praticien.
2. **Le « silence utile » cesse d'être rendu sur un comptage** (§2.1). Soit le
   message disparaît, soit il est conditionné à une couverture temporelle réelle
   — jamais à `traces.length >= budget`.
3. **Distinguer « pas de nouvelle mesure » de « mesure stable »** (§3.1) : une
   lecture n'est émise à un jalon que si une réponse nouvelle est arrivée depuis
   le précédent. Fait tomber F1, F1-bis et F7 ensemble. ⚠️ Même bump que le 1.

### Lot 2 — Rendre le carnet réellement partagé

4. **Brancher l'écriture patient.** `POST /api/portail/ja/observations` est
   complet, authentifié et testé ; aucun client ne l'appelle. ⚠️ Décision de
   gouvernance avant implémentation : donnée alimentaire patient en base sous
   hébergement non-HDS, gate `G-TRUST-04` non levé, phase de test bornée au
   2026-10-21.
5. **L'épisode cesse d'être un gabarit.** Hypothèse, action et fenêtre viennent
   du dossier, pas de `buildEpisode`. Fenêtre alignée sur `J7 | J14 | J21`
   (`persistence.ts:42`), pas 7 jours en dur.
6. **Trancher le sort du cycle protocole → épisode** (§2.2). Zéro ligne en base :
   décider s'il sert, avant de figer des instantanés à sa clôture.

### Lot 3 — Structurer l'observation par type de journée

7. **Taxonomie de journées** (poste matin / poste après-midi / repos / week-end),
   **plan d'échantillonnage**, **moteur de couverture raisonnant sur les types
   manquants**, **capture structurée par journée**. Aucun de ces quatre objets
   n'existe ; le `TrialTrace` actuel (occasion / faisable / issue / friction) ne
   peut pas représenter une journée repère.
8. C'est **ce lot**, et non un item de fréquence, qui rend le besoin 3 mesurable
   (§3.2).

### Lot 4 — Le profil, à six domaines

9. Diversité végétale, fibres probables, qualité glucidique, ultra-transformés,
   qualité lipidique, rythme — chacun avec `statut / confiance / sources /
   limites / action possible / confirmation requise`. Aucun domaine sans
   instrument. Les huit autres domaines du document externe s'ouvrent quand un
   instrument les alimente, pas avant.
10. `Q_ALI_02` : deux objets distincts, `MEDAS14_SOURCE` (fidèle à PREDIMED,
    pour la mesure d'adhérence) et un profil méditerranéen Wellneuro sans bonus
    alcool — la seconde ne portant jamais le nom de la première tant qu'elle
    n'est pas validée. Sur ce point, l'audit externe a raison et sa
    recommandation est reprise telle quelle.
11. `Q_ALI_03` : décider entre sortie du pack de base, restriction à certains
    patients, ou transformation en module protéique semi-quantitatif rigoureux.
    En l'état il est honnête et cliniquement faible.

### Lot 5 — Calibrage et validation terrain

12. Le plus gros chantier, dépendant de tout ce qui précède. Le questionnaire
    déclare, le carnet vérifie et contextualise, la biologie confirme quand c'est
    nécessaire, le praticien arbitre, l'IA explique. Cette séquence, proposée par
    l'audit externe, est la bonne — elle suppose seulement que les quatre lots
    précédents existent.

## 6. Questions au praticien

Elles s'ajoutent aux quatre du rapport du 2026-07-26 (dont la première est
tranchée) et aux quatre du rapport trajectoire.

1. **`Q_ALI_01`** : renommage et sortie des fondations critiques, ou maintien en
   l'état jusqu'à ce qu'un instrument validé le remplace ? C'est la décision qui
   commande tout le lot 1.
2. **Le « silence utile »** : retirer le message, ou le conditionner à une
   couverture temporelle ? Il est aujourd'hui rendu au patient sur un comptage.
3. **Le cycle protocole → épisode** a-t-il vocation à servir en consultation ?
   Zéro ligne en base après six lots de développement.
4. **Six domaines ou quatorze** : préférez-vous un profil restreint et plein, ou
   large et majoritairement vide ?

## 7. Conclusion

L'audit externe est juste sur son constat central — `Q_ALI_01` est le risque
résiduel n° 1, et un commentaire d'avertissement ne protège personne. Il est
juste aussi sur le diagnostic d'ensemble : le dépôt a retiré ce qu'il ne devait
plus affirmer, il n'a pas construit ce qu'il devra mesurer.

Il se trompe sur un point de fait — la couverture du carnet ne rend aucun verdict
de suffisance, elle refuse explicitement de le faire — mais le verdict qu'il
croyait y trouver existe ailleurs, adressé au patient, et il est pire que décrit.

Il manque le seul défaut vivant du parcours patient, propose pour le besoin 3
une source qui rejouerait le défaut qu'on vient de retirer du besoin 2, et
réintroduit dans sa feuille de route une confusion entre apport estimé et statut
biologique que le garde-fou IA vient d'interdire.

Le plan du §5 retient tout ce qui tient et écarte le reste. Son premier lot ne
crée aucun instrument : il arrête trois affirmations fausses. C'est encore, à ce
stade, le meilleur rapport entre effort et sécurité clinique.
