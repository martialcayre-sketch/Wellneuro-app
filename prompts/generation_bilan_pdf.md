# Prompt — génération booklet patient Wellneuro

Gabarit réservé à la génération de booklets patients. Ne jamais committer de bilan réel,
de donnée patient identifiable ou de contenu clinique individualisé issu d'une consultation réelle.

## Objectif

Transformer une synthèse IA validée par le praticien en document patient lisible, prudent et utile
pour préparer la consultation ou le suivi.

Le booklet n'est pas un diagnostic médical. Il ne doit jamais être envoyé automatiquement :
l'envoi est manuel et réservé au praticien après validation humaine.

## Entrées attendues

- `patient_nom` : nom affichable du patient, fictif en environnement de test.
- `date_document` : date de validation praticien, ou date de génération si la validation n'est pas disponible.
- `narratif_patient` : texte patient issu de la synthèse validée.
- `axes_prioritaires` : trois axes maximum, déjà validés par le praticien.
- `points_de_vigilance` : points à discuter, sans dramatisation.
- `notes_praticien` : message ou correction du praticien.

## Structure du booklet

1. Page de garde : titre, patient, date, mention Wellneuro / wellneuro.fr.
2. Résumé patient accessible : ce que les réponses suggèrent, en langage clair.
3. Profil neuronutritionnel : axes principaux, maximum trois priorités.
4. Ce que les questionnaires suggèrent : hypothèses à explorer, pas de diagnostic.
5. Points de vigilance : éléments à confirmer en consultation.
6. Prochaines étapes : objectifs du mois ou axes de travail, formulés prudemment.
7. Message du praticien : uniquement si une note validée existe.
8. Mention finale : document généré après validation du praticien.

## Ton éditorial

- Français clair, professionnel et accessible.
- Ton constructif, non alarmiste.
- Formulations recommandées :
  - « vos réponses suggèrent » ;
  - « un axe à explorer » ;
  - « à confirmer avec votre praticien » ;
  - « une priorité possible pour la consultation ».
- Formulations à éviter :
  - « vous souffrez de » ;
  - « vous avez un déficit » ;
  - « il faut prendre » ;
  - « traitement » ;
  - « protocole obligatoire ».

## Règles cliniques

- Ne pas inventer de seuil clinique.
- Ne pas inventer de protocole SIIN.
- Ne pas proposer de dosage précis.
- Ne pas transformer un score de questionnaire en diagnostic.
- Ne pas masquer l'incertitude : les résultats orientent l'entretien clinique.
- Toujours rappeler que le praticien reste décisionnaire.
- Ne pas générer de booklet si la synthèse validée est illisible ou ne contient aucun narratif, axe prioritaire ou point de vigilance exploitable.

## Contraintes de sécurité

- Ne jamais inclure de clé API, identifiant Google, `SHEET_ID`, token ou secret.
- Ne jamais inclure de données patient réelles dans ce fichier.
- En test, utiliser uniquement les patients fictifs autorisés par le projet.
- Ne jamais envoyer automatiquement le booklet au patient.
- Exiger une confirmation explicite de relecture de la prévisualisation avant l'envoi manuel, vérifiée côté interface et côté serveur.
- Journaliser les envois manuels avec le minimum nécessaire : synthèse, patient, email masqué, statut, opération, relecture confirmée, erreur courte neutralisée.
- Afficher au praticien si le booklet a déjà été envoyé, avec date et email masqué.
- Demander une confirmation renforcée avant tout renvoi d'un booklet déjà envoyé.

## Mention finale obligatoire

```text
Document généré après validation par votre praticien. Ce bilan ne constitue pas un diagnostic médical.
```
