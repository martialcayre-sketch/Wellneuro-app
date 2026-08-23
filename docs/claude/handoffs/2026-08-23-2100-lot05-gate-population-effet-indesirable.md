# LOT-05 — une gate qui n'avait pas de sujet, et une règle qui était inapplicable

Campagne « Doctrine exécutable », décision [[D-101]], branche
`doctrine/lot05-gates-population`.

## Ce que la mesure d'ouverture a trouvé, et qui a changé le lot

La fiche prévoyait de curer les 95 `neCouvrePas` du registre d'interventions,
puis de poser la gate. Deux constats l'ont rendue inapplicable telle quelle.

**La gate n'avait pas de sujet.** Le seul objet réellement classé à l'exécution
est une **règle de priorité** — deux règles publiées, des *axes de travail*,
pas des interventions. `neCouvrePas` vit sur 95 **documents sources** d'un
registre d'audit dont les seuls consommateurs sont un script de vérification —
qui ne lit même pas ce champ — et un commentaire. **Aucun chemin d'exécution ne
relie un candidat classé à une entrée de ce registre.** Curer les 95 aurait
produit une donnée que rien ne lit, et la gate n'aurait rien eu à filtrer.

**Des neuf critères de `DC-43`, aucun n'était lisible comme état courant.**
« Grossesse / post-partum » n'existe que comme facteur déclenchant — un
antécédent ; les pathologies rénale et hépatique sont absentes des douze
domaines d'antécédents ; `chirurgies` est un textarea libre, que le fichier
lui-même déclare inutilisable en déclencheur ; végétalisme et maladie cœliaque
n'existent nulle part.

**`DC-42` n'était pas « non appliquée », elle était INAPPLICABLE.** La capture
existe depuis le 2026-07-16 et elle est complète, mais l'association qu'exige
la règle n'y était pas : `produit_libelle` est du texte libre,
`debut_prise`/`debut_symptomes` sont des `TEXT` que rien ne contraint, et
aucune clé ne pointait un protocole. Aucune requête ne pouvait établir ce que
la règle demande.

## Les quatre arbitrages, et ce qu'ils ont produit

1. **La gate livre son mécanisme et son aveu, pas sa curation.** Table vide et
   **déclarée vide** ; chaque candidat repart avec « exclusions non curées ».
2. **Section « État actuel » dans l'anamnèse patient**, sept critères, trois
   réponses chacun — « Je ne sais pas » écrit.
3. **Migration d'association pour l'effet indésirable** ; le patient déclare le
   rattachement, le serveur résout le protocole. **Les trois champs du
   formulaire ne s'affichent que lorsque les colonnes existent** : `GET
   /api/portail/trust/etat` sert `associationEffetIndesirable`, et le
   formulaire n'envoie rien tant qu'il est faux. Sans cela, entre le
   déploiement et la migration, un patient aurait répondu « oui, ce produit
   fait partie de mon programme » et **sa réponse aurait été jetée en
   silence** — précisément ce que le lot existe pour empêcher ailleurs.
4. **Une seule sélection de consultation fait foi** — sept appelants la
   partagent désormais.

## Ce que le lot NE fait pas, et qui doit rester lisible

- **`DC-42` et `DC-43` ne basculent pas.** Aucune exclusion n'est déclarée, donc
  la gate ne mord sur aucun dossier ; la règle d'interruption est écrite, non
  signée, derrière un drapeau neuf et éteint.
- **La production ne change pas au merge.** Le seul effet visible est ce que le
  cockpit **dit de plus**.

## Trois choses apprises, qui valent pour les lots suivants

**Une garde peut être verte pour une raison qu'on n'a pas voulue.** Le banc de
l'ordre a d'abord été écrit pour prouver que le filtre est avant le tri. La
mutation « filtrer juste après le `sort` » l'a laissé **vert** — et à raison :
le rang étant séquentiel sur la liste filtrée, les deux placements sont
strictement indiscernables de l'extérieur. La mutation « filtrer après
l'attribution des rangs », elle, l'a fait rougir. La propriété réellement
gardable est « aucun candidat écarté ne porte de rang », et le banc l'écrit
plutôt que de laisser croire à une garde plus large.

**Le défaut du LOT-04 était en embuscade au même endroit.**
`buildDecisionCard` n'agrège **pas** les limitations des candidats dans
`decisionCard.limitations`, et `DecisionSummaryCard` ne rendait que ces
dernières. Le motif de la gate serait entré dans l'empreinte de la carte, serait
arrivé au navigateur, et n'aurait été affiché par personne — tout le lot
invisible. Réflexe à garder : **après avoir produit un texte destiné au
praticien, chercher le composant qui le rend**, et ne pas s'arrêter au fait
qu'il voyage.

**L'anamnèse est PAGINÉE, et une section ajoutée déplace le bouton d'envoi.**
Le parcours patient E2E traversait « section 6/6 — Traitements et compléments »
en dur ; la septième section a fait expirer l'attente de
`/api/portail/valider`, sur Chromium **et** iPhone 13 — pas le blocage WebKit
connu, une vraie régression du lot. Le compte de sections est donc un
couplage : `anamnese.ts` et `portail-parcours.spec.ts` bougent ensemble, et le
banc le dit désormais en toutes lettres. Le parcours ne remplit **aucun** champ
d'« État actuel » : c'est le cas utile — un dossier qui ne déclare rien doit se
lire comme sept `inconnu`.

**Un import de `prisma` casse des bancs qui n'ont pas de base.**
`runtimeFromPrisma` ne touche pas la base malgré son nom : y poser la lecture
des signalements a fait échouer `jalonDu.test.ts` **au chargement du module**,
avant toute assertion. La séparation `preconditionsT0.ts` /
`preconditionsT0Prisma.ts` existait déjà pour ça ; elle a été reprise
(`effetsIndesirablesPrisma.ts`).

## Ce qui reste ouvert, nommé plutôt qu'oublié

- **Deux gestes praticien, et l'ordre compte.** Poser `WN_EI_INTERRUPTION`
  après que la migration est appliquée **et constatée** ([[D-087]]) — le
  drapeau ouvre la CAPTURE —, puis signer `SAFETY_EI_METADATA` — la signature
  ouvre l'INTERRUPTION. Les inverser inhiberait sur une colonne que personne
  n'a encore remplie.
- **Un arbitrage nommé, non rendu** : ce que fait la gate sur un état
  **inconnu** pour un critère exclu. Le module parle plutôt qu'il n'inhibe ; la
  branche est inatteignable tant que la table est vide, et l'arbitrage se rendra
  avec les exclusions sous les yeux.
- **L'inhibition de `DC-42` sera TOTALE, pas graduée** : un signalement
  rattaché retire tous les candidats du dossier, quel que soit le protocole visé.
  Le seul levier du dépôt est l'objet de sécurité, et il est binaire. Une
  inhibition ciblée supposerait de relier un protocole à un axe candidat, ce que
  rien ne fait.
- **Le motif de la gate n'est pas une donnée signée**, contrairement à ceux de
  l'abstention : il déclare une ignorance, pas un contenu clinique. À revoir le
  jour où une exclusion réelle sera écrite.
- **La lecture de consultation est devenue plus restrictive** : une anamnèse
  saisie mais non validée n'alimente plus la synthèse, l'orientation, les
  contradictions ni la proposition de bilan. Le seul chemin d'écriture
  (`api/portail/valider`) pose `anamnese`, `statut` et `dateValidation` dans le
  même `update`, mais **rien au schéma ne l'impose** — la garde tient au fait,
  pas à l'usage courant. Aucun comptage de production n'a pu être obtenu : les
  conteneurs one-off ne portent pas le client Prisma généré, et la sonde a
  échoué deux fois sur `Cannot find module '.prisma/client/default'`.
- **`DC-11` reste orpheline** : le LOT-05 a livré le mécanisme, les exclusions
  restent sans porteur — il leur faut d'abord un objet d'intervention exécutable.
