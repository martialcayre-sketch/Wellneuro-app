# 09 — Documents et booklets multi-destinataires

## Intention

Transformer la génération documentaire en système modulaire :

- patient ;
- praticien ;
- médecin ;
- laboratoire ;
- suivi J21 ;
- protocole ;
- alimentation ;
- compléments ;
- biologie.

Même contenu clinique, formats différents selon destinataire.

## Documents possibles

```text
- Synthèse initiale patient courte
- Bilan détaillé praticien
- Protocole personnalisé J1-J21
- Fiche biologique à discuter avec médecin
- Liste de courses
- Fiches aliments vedettes
- Fiche complément
- Fiche routine
- Bilan J21
- Plan J42
- Courrier médecin
```

## Destinataires

### Patient

Objectif : compréhension, adhésion, réassurance.

Style :

- court ;
- pédagogique ;
- non anxiogène ;
- actionnable.

### Médecin

Objectif : clarté, hiérarchisation, prudence.

Style :

- synthétique ;
- non commercial ;
- non prescriptif ;
- niveau de priorité ;
- zone de validation.

### Praticien

Objectif : traçabilité et décision.

Style :

- complet ;
- niveaux de preuve ;
- signaux convergents/discordants ;
- historique.

## Objet conceptuel

```text
document_bundle
- id
- patient_id
- bundle_type
- target_audience: patient | médecin | praticien | laboratoire
- source_objects[]
- generated_sections[]
- validation_status
- exported_at
```

```text
document_section
- id
- title
- audience
- source
- content_status: statique | généré_ia | validé
- required_validation
```

## Structure booklet patient

```text
1. Où vous en êtes
2. Votre priorité actuelle
3. Ce que nous proposons pendant 21 jours
4. Vos actions simples
5. Vos fiches conseils
6. Quand signaler une difficulté
```

## Structure document médecin

```text
1. Contexte
2. Signaux rapportés
3. Explorations à discuter
4. Priorisation niveaux 1/2/3
5. Zone validation médecin
```

## Structure bilan praticien

```text
1. Synthèse clinique
2. Scores questionnaires
3. Mon équilibre
4. Hypothèses fonctionnelles
5. Protocole proposé
6. Points à surveiller
7. Sources / niveaux de preuve
```

## Innovation : documents adaptatifs

### Patient anxieux

Version courte et rassurante.

### Patient expert

Version plus détaillée.

### Médecin sceptique

Version sobre, factuelle, structurée.

### Suivi J21

Version comparative :

```text
Avant / Après
Ce qui progresse
Ce qui résiste
Décision proposée
```

## Règles IA

- Toute section générée par IA a un statut.
- Toute diffusion patient nécessite validation.
- Le document doit citer ses sources internes quand possible.
- Le document ne doit pas inventer de résultat biologique.
- Les exemples utilisent uniquement patients fictifs.

## Critères d’acceptation

- Un même protocole peut générer plusieurs documents.
- Les sections sont réutilisables.
- La validation praticien est visible.
- Les documents sont adaptés au destinataire.
- Aucun document ne formule de diagnostic.

## Prompt agent dev

```text
Conçois le système documentaire WellNeuro multi-destinataires. Il doit générer des booklets patient, bilans praticien, documents médecin et fiches conseils depuis des sources validées : questionnaires, Mon équilibre, protocole, biologie, nutrition, compléments. Prévois sections modulaires, statuts de génération/validation, adaptation au destinataire, garde-fous réglementaires et critères d’acceptation.
```

## Questions ouvertes

- Le moteur documentaire doit-il être séparé du protocole builder ?
- Faut-il exporter PDF dès V1 ou commencer en HTML imprimable ?
- Quels templates prioritaires ?
