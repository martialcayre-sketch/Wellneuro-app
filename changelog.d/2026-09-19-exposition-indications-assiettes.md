### Les assiettes indiquées atteignent le praticien, et la carte dit aussi ce qu’elle n’a PAS pu regarder (2026-09-19)

**La table signée avait un verrou ouvert et aucun consommateur.** Deux fonctions
portaient par écrit leur propre condamnation — « si le lot d’exposition ne vient
pas, elle se supprime ». Ce lot est celui-là : un service de lecture, une route
praticien, une carte au cockpit, dans la sous-vue Protocole où se décide le
geste. **Rien ne s’écrit AU DOSSIER CLINIQUE, rien ne s’assigne, rien ne part
vers un patient** : la route n’expose aucun POST et la carte ne porte aucun
bouton. **Une écriture existe pourtant, et la taire serait le défaut** : chaque
lecture servie passe par `verifierAppartenancePatient`, qui écrit une ligne au
journal d’accès. C’est le journal voulu, identique à celui de toute lecture
praticien — et c’est pourquoi le verrou est consulté AVANT : fermé, aucune ligne
n’est écrite pour une lecture qui n’a pas eu lieu. Que l’assiette devienne une
unité d’action est un lot à part, suspendu à deux arbitrages ouverts — le poser
ici les aurait tranchés en passant.

**Le cœur clinique du lot n’est pas le chemin, c’est un vocabulaire.** Le moteur
de déclencheur répondait `null` pour deux raisons que rien ne distinguait : la
donnée a été lue et n’atteint pas la porte, ou **la donnée n’existe pas**. Sur
l’orientation, la confusion ne coûtait rien — une cible non proposée se
repropose. Sur une indication servie au praticien, elle coûte : **une carte vide
se lit « aucune assiette n’est indiquée pour ce patient »**, un constat
clinique, là où la vérité est le plus souvent qu’un instrument n’a pas été
passé. **Huit** formes de lacune entrent donc au moteur — instrument non passé,
passé mais non coté, recueil incomplet, **complétude illisible**, mesure
indisponible, anamnèse absente, âge inconnu, régime non déclaré. **Aucune
n’affirme rien du patient** ; toutes sont des faits sur le dossier.

La huitième est entrée **sur constat de revue**, et elle dit la même faute que
le lot entier combat : un repli sur « 0 item manquant » annonçait au praticien
un **nombre inventé** là où la complétude du recueil est simplement inconnue.
Deux refus, deux causes.

**Le coût est dit plutôt que masqué** : une seule branche lacunaire suffit à
rendre une disjonction non évaluée, si bien qu’une ligne à trois portes paraîtra
souvent non évaluée tant que le recueil est partiel. L’inverse aurait affirmé
sur le patient ce que seule la donnée absente pouvait trancher.

**Le drapeau est neuf et éteint, et il est la seule chose entre la table et
l’écran.** D’ordinaire, un drapeau neuf double un verrou clinique encore fermé.
Ici la signature est **ouverte** depuis le 2026-09-19 : sans drapeau, les sept
lignes publiées seraient arrivées à l’écran **au prochain déploiement**, sur des
dossiers réels, par accident de calendrier. Le jour de mise en service revient
au cabinet.

**Une jointure est tenue pour la première fois.** `cleClaim` existe deux fois au
dépôt — une pour les tables signées, une pour le corpus. Les deux rendent le
même format, mais aucun banc ne les confrontait : si l’une dérivait, le filtre
ne reconnaîtrait plus aucune clé et le service rendrait zéro ligne **en
silence**. Mesuré : faire diverger l’une rougit désormais huit cas.

**Et une prose périmée est corrigée, pour la septième fois sur ce fichier.** Le
chapeau du module signé disait encore le verrou éteint et la table vide. La
signature du 2026-09-19 avait corrigé six blocs sur constat de revue ; celui-ci
a survécu parce qu’il est en commentaire de ligne et non en bloc JSDoc — un
balayage par forme de commentaire ne voit pas l’autre forme.

**Sept constats de revue adversariale ont tenu la réfutation : six sont corrigés
avant la pose du drapeau, le septième est rapporté** — un garde de paquet client
dont le trou est antérieur à ce lot et dont la fermeture est un lot à elle seule.
Les trois premiers disent la même chose sous trois formes. Une ligne publiée que le
corpus retire — un claim désactivé suffit — **disparaissait sans aucun compte** :
la carte annonçait « les N indications en service ont été évaluées ; aucune n’est
retenue » sous le sha du périmètre **entier**, quand plusieurs lignes publiées
n’avaient pas été regardées. Un quatrième compte entre, et la carte le nomme.
Le champ `raccourciAssume` — **prose écrite pour la relecture de signature**,
avec ses identifiants de code — **ne traverse plus** : il paraissait sur la ligne
la plus atteignable de la table, et aucun banc ne le voyait, la fixture le posant
à `null`. Le reformuler périmerait l’attestation ; ce qui manque à l’écran est
donc dit plutôt que réécrit. Enfin le banc du service **annonçait contrôler des
passations sans en fournir une seule** : le recalcul du score, invariant du lot,
n’était éprouvé par rien — deux cas l’exercent désormais, et la mutation qui rend
le score stocké les fait rougir.

Les trois autres sont de la même famille : un **dédoublonnage de claims** que
rien ne gardait — le seul claim cité deux fois n'était inspecté par aucune
assertion, et la mutation dormait dans l'arbre de travail, laissée par un agent
de revue ; un **commentaire faux sur sa propre barrière**, qui annonçait une
casse au build là où c'est un banc unitaire qui tient la frontière ; et une
**recopie manquée** de « rien ne s'écrit », corrigée en quatre endroits et
survivante dans ce fragment même.

**Et une seconde revue a mordu sur le correctif lui-même** : la lacune d’une
porte de zone ne reflétait pas ce que le moteur consulte vraiment. Une feuille
seule servie par un **plancher insuffisant** — recueil partiel, garantie qui
déborde la zone — passait pour « évaluée, non retenue » là où des items
manquaient, et c’est atteignable sur les trois portes du TFD de la table. La
lacune lit désormais ce que la zone lit : un nombre pour une plage, un libellé
ou une couleur pour une bande ; le reste se nomme par les comptes du recueil.
Un cas garde l’inverse — une bande publiée qui ne matche pas reste un **vrai
négatif**, et sur-signaler serait l’autre faute.

**Et une troisième revue a trouvé pire, sur la carte cette fois** : son état
n’était pas daté du dossier. Le jeton de course écarte une réponse en retard,
mais pas le rendu qui suit un changement de patient — React peint d’abord la
nouvelle prop avec l’ancien état. **Le temps d’une image, les indications du
dossier précédent paraissaient sous l’en-tête du suivant.** L’état porte
désormais le dossier qui l’a produit, et rien ne s’affiche tant que la réponse
de CE dossier n’est pas là. Aucun banc unitaire ne voit cette image — c’est dit
dans le composant plutôt que faussement gardé.

Aucune porte biologique n’est ouverte, aucune ligne ni aucun claim n’est touché,
et le périmètre signé reste intact.
