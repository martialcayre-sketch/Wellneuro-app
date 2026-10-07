# Agenda du sommeil — synthèse et revue adverse Claude / Codex (2026-10-07)

**Statut** : synthèse entérinée par le responsable le 2026-10-07 (« entérine la
synthèse dans le dépôt, démarre le lot 1 »). Elle fonde la campagne et l'ordre
de ses lots ; elle n'est **pas** une décision clinique — aucun `D-xxx` n'est pris
ici, et chaque lot qui change la mesure en exigera un.

## Le constat de départ

Adhésion jugée faible par le praticien. Retours patients : saisie difficile au
cadran horaire, réponses ambiguës, et souvent **impossibilité de valider en fin
de formulaire**. Deux analyses indépendantes ont été produites (Claude, Codex),
puis confrontées au code et à la doctrine par trois lecteurs adverses (faits du
code et ergonomie ; doctrine clinique ; faisabilité), chacun chargé de réfuter.

**Le taux de réponse n'est pas encore mesuré.** La requête
[`CONSTAT_ADHESION.sql`](CONSTAT_ADHESION.sql) (lecture seule, agrégats sans
identifiant) se joue depuis un conteneur `scalingo run -d`. Le blocage côté
navigateur, lui, n'atteint jamais le serveur : la base ne voit que ceux qui ont
réussi.

## Ce qui est confirmé des deux côtés

- **Le blocage final a un mécanisme prouvé.** Les horaires proposés en pointillé
  valent `undefined` tant qu'ils ne sont pas touchés ; la consigne visible disait
  « Faites glisser les repères » alors qu'un appui suffit ; le bouton était
  `disabled={!complet}` et le message « Il manque un geste » vivait dans le
  gestionnaire de clic — qu'un bouton désactivé ne déclenche jamais. Ce message
  était en outre générique : il ne disait pas *quelle* réponse manquait.
- **Le refus serveur** (ordre des repères) s'affichait en tête de page, sans
  défilement : hors champ sur téléphone. Il n'est possible qu'avec 3 ou 4
  repères (branches « plus tard »).
- **Ambiguïtés de libellés**, dont les précisions existaient déjà en `aria-label`
  sans être affichées (bornes de réveils, portée de l'aide au sommeil).
- **Qualité par emoji sans texte visible.**
- **Aucun rappel automatique** ; la route sommeil ne journalisait aucun refus
  (le jumeau alimentaire, si).
- Coût réel de saisie : **8 réponses obligatoires de base, jusqu'à 10** — le
  commentaire du formulaire annonçait 7.

## Corrections apportées à l'analyse Claude

| Affirmation | Verdict |
|---|---|
| « 7 gestes » | Sous-estimé (8 à 10). |
| « Comme d'habitude » en un geste affaiblirait l'anti-recopie | Réserve surestimée : le principe existe déjà (un appui par repère) ; 2 → 1 appui sur les deux seules ancres suggérées garde la lettre du garde-fou. À tracer au changelog. |
| Rappel matinal (palier 3) | **Conflit doctrinal** : `REGISTRE_FRONTIERES.md` (« aucune tâche planifiée ») — réarbitrage de frontière, pas un simple `D-xxx`. |
| 14 nuits / mode allégé | `MIN_NUITS_INDICE = 14` dont 4 de week-end : sur 14 nuits, 100 % de complétude exigée. Révision des seuils de couverture (`DC-19`). |
| Oubli | « Corriger la nuit d'hier » s'affichait pour une nuit **absente** (vu par Codex). |
| Repères non croisables | Juste, mais à raisonner modulo 1440 (nuit qui traverse minuit). |

## Corrections apportées à l'analyse Codex

| Proposition | Verdict |
|---|---|
| « Commencé à essayer de dormir » à la place de l'extinction | Diagnostic juste, mais **change la mesure** (sens de l'ancre `heureCoucher`, latence, pré-lit, régularité) : contrat v4 + `D-xxx`. |
| Latence et éveil en minutes saisies | **Conflit doctrinal** : `D-091` §2 (classes, pas de montre). Retiré. |
| Grandes cases HH:MM | Seulement quantifiées au quart d'heure (`RE_HEURE`) : sinon refus 400 ou arrondi silencieux contre la réponse du patient. |
| « Je ne sais pas », nuit partielle, nuit blanche | **Change la mesure** : la lecture exige heures, latence et qualité (une ligne partielle ferait échouer tout le GET) ; contrat v4, agrégats, barème, retour sur l'obligatoire v2. |
| Sommeil surtout diurne | Casse `dateNuit` = matin du réveil et la règle des 4 nuits de week-end : `D-xxx`. |
| Rappel à l'heure choisie | Même conflit de frontière. Voie compatible non proposée par les deux : rappel posé par le patient **sur son appareil** (alarme, fichier calendrier), sans envoi serveur. |
| Accès direct, « une estimation suffit », zéro culpabilisation | Déjà livré. |
| Récapitulatif graphique | `FriseNuits` existe, sans chiffres ; l'enrichir d'heures ou de durées heurte la règle anti-orthosomnie. |
| Brouillon persistant | Serveur : migration. Appareil : inventaire `stockageAppareil` + garde, lié à `dateNuit` (sinon nuit recopiée). |
| Tests utilisateurs, abandons par écran | Patients réels : règles de données (`D-075`, `D-125`). Servie patient par patient, la mesure deviendrait un « score de décrochage » interdit : agrégat cabinet, registre RGPD. |
| WCAG 2.5.7 | Recevable : un appui n'accroche une poignée que dans `RAYON_PRISE` ; aucun geste à pointeur unique n'amène une poignée lointaine. |

**Apports Codex retenus** : structure soir / nuit / matin ; « au même moment /
plus tard » qui lève l'ambiguïté **sans seuil** (interface pure) ; confirmation
explicite des horaires ; ancres de qualité visibles ; remplacement du cadran à
terme.

## Ordre des lots

| Lot | Nature | Arbitrage |
|---|---|---|
| LOT-00 | Mesure : jouer `CONSTAT_ADHESION.sql` | aucun (lecture seule) |
| [LOT-01](lots/LOT-01-deblocage-saisie.md) | Interface pure : déblocage de la saisie, libellés, journalisation des refus | aucun `D-xxx` |
| LOT-02 | Re-mesure à trois semaines de LOT-01 | — |
| LOT-03 | Interface : sélecteurs au quart d'heure à la place du cadran, parcours en trois écrans, test patient | aucun `D-xxx` ; règles de données |
| LOT-04 | Instrument : ancre « essayer de dormir », inconnu / nuit partielle / nuit blanche, durée configurable (+ `DC-19`), J-2, redéfinition de l'aide | `D-xxx` + contrat v4 chacun |
| LOT-05 | Rappels | réarbitrage `REGISTRE_FRONTIERES.md` d'abord |

**Arbitrage en attente (non tranché)** : afficher les minutes des classes de
réveil côté patient renverse un choix de conception écrit
(`libelles.ts`, « sans minutes ») — à décider par le responsable, hors LOT-01.
