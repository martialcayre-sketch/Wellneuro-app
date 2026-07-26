### Agenda du sommeil interactif — 21 nuits (Q_SOM_09) (2026-07-25)

Nouvel outil d'évaluation patient : un **agenda du sommeil interactif**, non
anxiogène et non chronophage, qui remplace le recueil rétrospectif par une
saisie quotidienne d'une minute le matin, pendant 21 nuits.

**Côté patient.** Un composant dédié (jamais le rendu générique de
questionnaire) : steppers d'heures ±15 min, endormissement en classes (jamais de
minutes exactes — aucune incitation à regarder l'horloge la nuit), qualité en
emoji, détails facultatifs en accordéon. Le patient voit une **frise sans aucun
chiffre** — pas de durée, pas de score, pas de moyenne, pas de tendance (réserve
R1) ; une nuit non notée reste un trou visible, jamais un 0 ni un reproche. Le
recueil passe uniquement par la session portail (le lien e-mail legacy oriente
sans écrire). Aucune relance : la doctrine anti-relance est respectée.

**Côté praticien.** À la clôture (par le patient une fois les 21 nuits atteintes,
ou par le praticien à tout moment), les nuits sont agrégées en une
`QuestionnaireReponse` standard — durée de sommeil, efficacité, latence médiane,
réveils, **régularité** (écart-type du milieu de sommeil) — qui apparaît
automatiquement dans le tableau des réponses, l'inbox et la mini-synthèse. Un
panneau « Agenda du sommeil » du poste de pilotage montre le détail nuit par
nuit **avec** chiffres (chronogramme coucher→lever). Les durées se calculent en
horloge murale (traversée de minuit gérée) sans conversion de fuseau ; la
bascule heure d'été/hiver introduit au pire ±60 min sur une seule nuit.

**Scoring et « Mon équilibre » — changement de logique clinique.** L'agenda
devient une **3e source du besoin 5** « Mouvement, fonctions corporelles et
repos », en complément du PSQI et de l'activité physique (indice composite /100,
niveau de preuve **B**). Il alimente donc l'indice global et, par lui, le
momentum aux jalons — sans momentum sommeil dédié ; côté patient, le momentum
reste une tendance, jamais un chiffre. **`VERSION_SCORE_EQUILIBRE` passe de v2 à
v3** : conformément à la doctrine « deux `versionScore` différents ne se
soustraient jamais », un épisode de mesure figé en v2 ne se compare pas à un
épisode v3 — la comparaison de jalons momentum reprend au premier couple
d'épisodes v3.

**Barème validé cliniquement le 2026-07-26.** Le barème /100 (quatre sous-indices
— durée, efficacité, continuité, régularité) reste une **construction WellNeuro**
(pas un instrument psychométriquement validé), mais ses seuils ont été relus et
confirmés par le praticien : les deux ancrages à fort poids diagnostique
(efficacité ≥ 85 %, durée 7–9 h) suivent les seuils de référence ; les deux plus
souples (réveils comptés, écart-type du milieu de sommeil) sont assumés et
recalibrables à la lumière des premières distributions patient.

Migration `agenda_sommeil_v1` (table `agenda_sommeil_nuits`, purement additive,
append-only chaînée ; entrée dans l'effacement RGPD IDP2).
