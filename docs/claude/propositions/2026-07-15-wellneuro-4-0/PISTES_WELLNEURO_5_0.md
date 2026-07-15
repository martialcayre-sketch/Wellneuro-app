# WellNeuro 5.0 — La Spirale (pistes, non cadrées)

> Réflexion prospective du 2026-07-15, en réponse à la question « quelle serait
> l'interface 5.0, quelles innovations ? ». Rien ici n'est un engagement : ce
> sont des pistes à trier, chacune avec ses prérequis honnêtes. La 4.0 rend le
> cycle **visible** ; la 5.0 proposerait un cycle qui **apprend**.

## Le concept : de la Boucle à la Spirale

La Boucle 4.0 est plate : chaque tour (données → décision → actions → suivi →
réévaluation) recommence au même niveau. La Spirale ajoute la dimension
verticale : **chaque tour enrichit le suivant**. Trois mécanismes :

1. **Le présumé devient mesuré** — les estimations issues des questionnaires
   (ratio ω6/ω3, signal métabolique, indice ω-3) sont des hypothèses que la
   biologie confirme ou infirme au tour suivant.
2. **Le décidé devient appris** — chaque protocole clos (avec son momentum,
   son adhésion, sa tolérance) nourrit la préparation des décisions futures.
3. **L'épisode devient trajectoire** — le patient qui revient après 12 mois
   retrouve sa spirale, pas un dossier vierge.

## Les huit pistes

### 1. Réconciliation questionnaire ↔ biologie (la marche déjà posée en v3)

La fiche affiche « estimé » et « mesuré » côte à côte, avec l'écart commenté.
Un ratio ω6/ω3 estimé à 12:1 et mesuré à 6:1 est une information clinique en
soi (déclaratif optimiste ou pessimiste, biais de recueil…). *Prérequis :
HDS (stockage de résultats), règles de dérivation cadrées.*

### 2. Copilote de consultation

Préparation automatique avant chaque créneau de l'agenda : résumé de ce qui a
changé depuis la dernière consultation, **discordances inter-instruments**
détectées (plaintes sommeil 8/10 mais domaine Sommeil déclaré satisfaisant →
question à poser), points d'adhésion à ouvrir. Pendant la consultation :
notes structurées (dictée possible), plan d'actions pré-rempli **à relire** —
le principe existant des synthèses IA reste la loi : l'IA propose, le
praticien décide, rien ne part sans validation. *Prérequis : branchement
cockpit C2A, cadre de responsabilité documenté.*

### 3. Signaux d'adhésion précoces

Le décrochage se voit avant le jalon J21 : rendez-vous de suivi en retard,
journal alimentaire silencieux, tonalité des check-ins. Côté praticien : un
signal discret « adhésion à risque » dans la file de décisions. Côté patient :
**jamais d'alarme** — une reformulation du plan minimal (« une semaine
difficile est prévue par le protocole »), fidèle au langage de construction.
*Prérequis : C2A/C2B livrés, définition clinique du signal.*

### 4. Questionnaires adaptatifs (prolongement QX)

Les micro-lots QX réduisent déjà la charge de saisie ; l'étape suivante est
l'adaptativité (arrêter un questionnaire quand la précision suffit, router
vers l'instrument pertinent selon les réponses). **Gate absolu inchangé** :
aucune adaptativité sur les instruments certifiés sans validation
psychométrique — pilotes bornés aux familles auditées. *Prérequis : corpus de
réponses suffisant, validation méthodologique.*

### 5. Mémoire longitudinale inter-épisodes

L'identité patient durable (magic link + passkeys, déjà au registre comme
prérequis de la messagerie) débloque la trajectoire pluri-annuelle :
comparaison épisode 1 vs épisode 2 sur les mêmes instruments, spirale
visualisée. *Prérequis : auth patient inter-assignations — le même
déclencheur que la messagerie.*

### 6. Cabinet apprenant

Bibliothèque d'issues anonymisées du cabinet : « sur les profils comparables,
ce type de protocole a produit tel momentum médian ». Aide à la décision
fondée sur la pratique réelle — jamais prédictive individuelle, jamais
substituée au jugement. *Prérequis : volume d'épisodes clos, gouvernance des
données stricte, anonymisation vérifiable.*

### 7. Réseau de soin

Les courriers médecins (C3) deviennent des fils de correspondance sécurisés :
le médecin traitant répond, la pièce jointe biologique revient par ce canal.
*Prérequis : HDS, messagerie activée — c'est l'extension confrères du module
Échanges.*

### 8. Interface ambiante

L'interface anticipe l'étape au lieu d'attendre la navigation : le matin,
l'accueil ouvre sur l'agenda du jour préparé ; dix minutes avant un créneau,
le mode consultation se propose pré-chargé ; à la clôture, le composeur de
documents s'ouvre avec la décision du jour. Zéro navigation pour le flux
nominal — le rail reste pour tout le reste. *Prérequis : agenda activé
(différé) + copilote (piste 2).*

## Ce qui ne change pas en 5.0

- Le praticien décide ; l'IA prépare et propose, toujours relu avant envoi.
- Lexique réglementaire inchangé (recommandation, protocole personnalisé).
- Côté patient : construction, jamais dégradation ; aucun score brut anxiogène.
- Patients fictifs pour toute démo : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Chaque piste passera par le cadrage de campagne (frontières, gates) — la
  Spirale est une direction, pas un lot.

## Ordre de dépendances suggéré

```text
HDS ──────────────┬─→ biologie réelle (1) ─→ réconciliation
identité patient ─┼─→ messagerie ─→ réseau de soin (7)
                  └─→ mémoire longitudinale (5)
C2A/C2B ─→ signaux d'adhésion (3) ─→ copilote (2) ─→ interface ambiante (8)
corpus QX ─→ adaptativité (4)        épisodes clos ─→ cabinet apprenant (6)
```

Deux fondations débloquent presque tout : **l'hébergement HDS** et
**l'identité patient durable**. Ce sont les investissements 5.0 à instruire
en premier — avant toute interface.
