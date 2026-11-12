# PAT-4 — Préalables documentaires et constats avant le code

Date : 2026-11-12. Base des relevés : main@470700859 ; fichiers PAT-4
inchangés à main@50b0e4cf. Documentation seule, aucune mise en œuvre.

## 1. Arbitrages du prototype repris sans les reposer

Q1b, Q2d, Q3b, Q4a, Q5b, Q6a, Q7a, Q8a, Q9a, Q10a, Q11b.
Sources : Questions.md et Registre-textes.md du prototype PAT-4, itération 2,
lus dans Chrome ; collection questions de la liste commune, lignes
20261112-1840-d à 1849-d et 20261112-2114-d, relues.

| Préalable | Résultat documentaire | Réalisation |
|---|---|---|
| Sécurité Q1b, réserve Q11b | [[D-506]], amendement de D-277 §1 et retour explicite sur PAT-2 Q7a | PAT-4, entrée comprise pour ce seul correctif ; mesures produit et téléphone réel dues |
| Brouillon sur l'appareil Q5b | [[D-507]] ; quatre modalités arbitrées ici ; fiche propre | lot Q5b séparé ; ne pas le réaliser dans PAT-4 |
| Textes T-40 à T-44, T-48 | tous acceptés mot pour mot ; [[D-488]], DOC-7 | PAT-4 |
| T-36, emplacement Q6a | extension inscrite dans [[D-488]], DOC-7 ; 401 et retour établis ci-dessous | PAT-4 |

T-41a : refus initial, puis correction directe du responsable
« t41a retirer l'émoji » ; verdict final accepté sans tasse. Aucun refus final.
T-45 sans objet ; T-46/T-47 libres. T-49 et T-50 ajoutés pour Q5b après
acceptations distinctes, chacun mot pour mot.

## 2. T-36 : où le 401 existe et où mène la reconnexion

Tous les chemins ci-dessous sont sous web/src/. Démontré dans le code,
sans occurrence observée ; aucune connexion réelle ni consultation de production.

| Surface | Preuve du refus | Conséquence pour PAT-4 |
|---|---|---|
| GenericQuestionnaire | components/patient/GenericQuestionnaire.tsx:186-198, appel POST /api/patient/submit ; app/api/patient/submit/route.ts:95 | retenir le statut HTTP pour montrer T-36 seulement sur 401 |
| PlaintesForm | components/patient/PlaintesForm.tsx:86-99, même route | même règle |
| Sommeil, enregistrement | components/patient/agenda-sommeil/AgendaSommeilJournal.tsx:91-99 ; app/api/portail/agenda-sommeil/route.ts:174-175 ; lib/agenda-sommeil/portail.ts:27 | un 401 existe ; T-36 sous son erreur |
| Sommeil, clôture-transmission | AgendaSommeilJournal.tsx:116-123 ; app/api/portail/agenda-sommeil/cloture/route.ts:26-27 ; même autorisation | un 401 existe ; T-36 sous son erreur |
| Alimentaire, enregistrement/correction | components/patient/agenda-alimentaire/AgendaAlimentaireJournal.tsx:220-236 ; app/api/portail/agenda-alimentaire/route.ts ; lib/agenda-alimentaire/portail.ts:117-125 | un 401 existe ; T-36 sous son erreur |

Ne pas déduire le statut de la seule phrase d'erreur : les composants
conservent aujourd'hui le texte, pas un état dédié au 401.
Une saisie non enregistrée d'agenda reste en mémoire ; partir vers la
connexion peut la perdre (Q7a, pas de brouillon ajouté).

**Chaîne de retour depuis le lien Q6a :**

1. Lien /portail/connexion, même onglet, navigation pleine page comme PAT-2.
2. Google : app/portail/google/retour/route.ts:238 redirige vers
   /portail/<idPatient>.
3. Nouveau lien demandé depuis la connexion : DemandeLienForm.tsx:34-38
   envoie seulement l'adresse e-mail, aucune assignation à retrouver.
   app/portail/lien/[jeton]/route.ts:173-174 appelle cheminApresLien ;
   lib/portail/lienMagique.ts:239-251 n'admet que « conditions » comme
   destination spéciale, sinon revient à /portail/<idPatient>.
4. L'entrée relit ses gardes habituelles. Pour une entrée déjà terminée,
   DoneScreen (app/portail/[token]/page.tsx:660-684) propose
   « Accéder à mon parcours » vers /portail/<idPatient>/questionnaires.
5. Le patient rouvre son questionnaire depuis ce hub. Aucun retour direct
   à l'assignation en cours n'est implémenté par le parcours de connexion.

Le brouillon de questionnaire en localStorage peut être repris sur ce
navigateur après reconnexion, sous réserve de sa validité et de l'absence
d'effacement. Un lien reçu par e-mail peut s'ouvrir dans un autre onglet ;
Q6a fixe l'onglet du départ vers la connexion, pas le comportement du client mail.
Ne pas modifier l'authentification pour fabriquer un retour direct dans PAT-4.

## 3. Réception à reprendre dans PAT-4

- Q1b/Q11b : appliquer [[D-506]] à l'entrée et aux questionnaires. Mesurer
  le vrai message au téléphone à 200 % et en confort 112,5 %, Chromium et
  WebKit, puis téléphone réel ; revenir au responsable en cas de dépassement.
  Le prototype mesure 1 754 px pour une fenêtre de 844 px ; le produit n'a
  pas été mesuré dans cette session documentaire.
  Précision clinique acceptée après revue : une fois à chaque apparition,
  récapitulatif compris, sans rappel au fil des rendus ni quand le patient
  s'éloigne du message. Les deux hauteurs du prototype sont des relevés bruts,
  sans unité vérifiée ; mesurer le produit et son viewport dans la même
  unité (px CSS), avec le zoom effectif consigné.
- Q2d : « N réponses sur M » calculé sur les réponses effectivement
  renseignées en saisie par parties, et non sur le nombre de parties franchies.
- Q3b : garder les emojis qui portent une réponse ; retirer les décoratifs
  hors texte ; appliquer seulement les libellés acceptés dans [[D-488]].
- Q4a : après échec d'écriture du brouillon, aucune confirmation ni heure
  antérieure ; conserver les textes « sur cet appareil » des questionnaires.
- Q6a : T-36 sur le statut HTTP 401, pas sur les autres refus ; même onglet.
- Q7a : « reprise après coupure » sans objet pour la saisie en cours des
  agendas ; les nuits/journées déjà enregistrées restent au serveur.
- Q8a : dates en lettres et en heure locale, en particulier abandon de
  toISOString pour la date visible de l'observation alimentaire ; T-40.
- Q9a : U+00A0 avant ? et : dans T-48a à g ; seule l'apostrophe change
  pour T-48h, valeur gt60 inchangée.
- Q10a : aucun décor ; PAT-4 n'attend pas COM-1.
- Q5b : aucune bascule de stockage dans PAT-4 ; voir le lot séparé.
  La promesse « sur cet appareil » après fermeture d'onglet ne peut être
  déclarée tenue avant sa livraison. Les quatre textes existants ne changent pas.

## 4. Modalités Q5b, trace des questions nouvelles

Questions posées directement le 2026-11-12, faits vérifiés dans le panneau,
l'inventaire et [[D-244]]. L'heure exacte de chaque réponse n'a pas été
relevée ; ne pas en fabriquer une lors du report. Options recommandées
signalées ci-dessous ; toutes ont été retenues.

| Question | Options et conséquences présentées | Réponse directe |
|---|---|---|
| Q5b-a, durée | **30 jours depuis la dernière écriture (recommandé)** : reprise entre visites puis expiration au prochain accès, pas de purge navigateur fermé ; fin du cycle : purge à son constat, cas sans cycle à préciser ; aucune limite : données conservées jusqu'à effacement manuel, déconnexion ou effacement navigateur | 30 jours |
| Q5b-b, transmission | **Effacer les seules notes confirmées (recommandé)** : préserver le non transmis, relecture serveur ; tout conserver 30 jours : copie hors ligne supplémentaire ; tout effacer après succès : perte aussi des notes d'autres périodes | seules notes confirmées |
| Déconnexion, fait déjà tranché | [[D-244]] impose la purge avertie après confirmation serveur ; choix non reposé | règle conservée |
| Q5b-c, appareil partagé | **Rappel près du brouillon (recommandé)** : précaution visible avant de partir ; seul avertissement de déconnexion : aucun texte neuf, il faut penser à se déconnecter | ajout du rappel, puis T-49 accepté séparément mot pour mot |
| Q5b-d, documentation | **Dossier RGPD et information patient (recommandé)** : règle interne et information visible ; dossier seulement : trace interne sans changement d'information ; aucun ajout : décision et inventaire seuls | dossier et information patient, puis T-50 accepté séparément mot pour mot |

Le dernier choix ne publie pas T-50 : le lot Q5b porte cette publication.
Une question clinique complémentaire, issue du P1 de wn-reviewer, a été
posée après cette revue : déclencher une fois à chaque apparition,
récapitulatif compris (**recommandé**, liberté de s'éloigner ensuite) ;
seulement sous la question/liste (pas de défilement au récapitulatif) ;
ou laisser la précision ouverte (code bloqué). Le responsable a retenu
la première option directement dans cette session ; elle complète [[D-506]].
La conservation sur l'appareil a été décidée par le responsable ; aucune
conclusion générale de conformité juridique n'est revendiquée ici.

## 5. Liste commune, boîte et suivi externe

La boîte D a été lue dans l'interface : aucun message non traité destiné
à D lors du relevé. Les onze réponses du prototype ont été retrouvées.
Les nouveaux arbitrages Q5b-a/b/c/d et les acceptations de textes sont
tracés dans cette PR et dans la conversation, **pas encore dans la liste**.

Blocage d'outillage : aucun accès ArtifactData avec if_version dans cette
session. Les pages sont lisibles par Chrome, mais ce canal ne permet pas de
garantir le verrou demandé. Aucune écriture externe n'a été tentée.
La page de suivi patient affichait « Aucun lot enregistré » et « Aucune
entrée pour l'instant » : ne pas inventer un identifiant de fiche ou de journal.

Au report, relire la collection et les identifiants du jour, puis écrire
chaque modalité Q5b avec sa question, les options présentées, leurs
conséquences, la réponse directe et [[D-507]]. Rattacher les acceptations
mot pour mot à DOC-7, et [[D-506]] aux lignes Q1/Q11 déjà répondues.
Mettre PAT-4 à « préalables documentaires préparés ; code non commencé »,
et ajouter une entrée de journal sous un id constaté libre.
**Chaque écriture est épinglée avec if_version**, et la version résultante
doit être relue avant l'écriture suivante. Ne fermer les lignes qu'au merge.

Aucune PR ne peut être déclarée « prête » sans CI concluant et revue
de tête. Le report externe et la lecture de boîte avant déclaration restent
à terminer ; ne pas annoncer cette préparation comme livrée.
