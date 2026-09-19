### La synthèse ne se produit plus qu'à la demande du praticien (2026-09-17)

La génération automatique d'un brouillon à la fermeture d'un rideau est retirée,
variable d'abord puis code. Une réponse de patient ne déclenche plus aucune
production ; l'invitation à générer revient à la carte « Synthèse à générer » du
Fil du jour, et à elle seule.

**Le motif n'est pas le coût des appels au modèle — c'est un couplage que
personne n'avait vu.** La carte de demande se tait tant qu'une synthèse existe
plus récente que la dernière lecture du praticien (`cartes.ts`, filtre
`derniereLecture > derniereGeneration`, sur les synthèses **toutes causes
confondues**). Or le brouillon automatique naissait à la soumission du patient,
donc **avant** toute lecture. L'automatisme éteignait ainsi l'invitation qu'il
prétendait rendre inutile : le dossier ne portait plus de carte, et le brouillon
attendait sans que rien ne le signale.

**La mesure a motivé l'examen, elle ne fonde pas la décision.** Lecture de
production corrigée le 2026-09-19 (conteneur one-off, agrégats seuls, [[D-125]]) :
**9 générations automatiques sur 5 dossiers — 6 au premier rideau, 3 au second —
dont 4 rejetées**, contre 6 rejets sur 60 générations manuelles. Soit **44 %
contre 10 %**, là où la lecture de la veille annonçait « 8 » et « 50 % contre
3,6 % ». Un agrégat ne dit pas pourquoi on rejette, et un écart qui se déplace
ainsi en deux jours dit surtout que l'échantillon est court.

**L'ordre des gestes est l'inverse de celui d'une pose.** Le drapeau a été retiré
de la production **d'abord** — `env-unset`, conteneurs web recréés à **18:49:15 UTC**
(20:49:15 heure locale) alors qu'ils tournaient depuis 17:25:44 UTC —, le code ensuite. Pour une extinction
c'est en principe le sens sûr : un code retiré devant un drapeau encore allumé
ne change rien, tandis qu'un drapeau retiré devrait déjà fermer la porte.
**Sauf qu'ici il ne l'a pas fermée** — voir plus bas.

**Aucune sonde ne constate cette extinction, et il faut le dire.** Le drapeau
gardait un travail de fond sans surface publique — contrairement à
`WN_ADRESSAGE_COURRIER`, dont la route rend `400` ouvert et `503` fermé. Le
constat disponible est la variable absente de `env` plus la recréation des
conteneurs. Le constat comportemental se lit ainsi, après la prochaine réponse de
questionnaire :

```sql
SELECT count(*) FROM syntheses_ia
WHERE donnees_entree->>'source' LIKE 'auto_rideau_%'
  AND date_generation > timestamp '2026-09-17 18:49:15';  -- UTC
```

Attendu : `0`. Les 9 brouillons déjà produits restent au dossier avec leur
marqueur — rien n'est effacé ni requalifié.

**LE CONSTAT A ÉTÉ FAIT LE 2026-09-19, ET IL NE REND PAS `0`.** Une génération
`auto_rideau_second` a eu lieu le 2026-09-17 à **20:39:52 UTC**, soit 1 h 50
après la recréation des conteneurs. La garde du drapeau était pourtant
fail-closed et posée en première ligne : le conteneur qui a servi cette requête
avait donc encore la variable. **Ce qui a réellement fermé la porte est le
retrait du code, déployé à 22:08:04 UTC.** La cause de la non-propagation n'est
pas établie, et le CLI n'expose aucun historique des changements de variables.

Le constat comportemental, lui, n'a toujours aucun témoin : six réponses de
questionnaire sont arrivées le 2026-09-17 entre 20:23:32 et 20:38:09 UTC, et
aucune depuis. « Zéro génération » s'explique par zéro réponse.

Enfin, l'inventaire demandé montre **trois synthèses automatiques validées que
personne n'a envoyées** — invisibles faute de liste inter-patients.

**Ce qui n'est pas tranché.** Le mécanisme n'est pas jugé mauvais dans son
principe. Ce qui est décidé, c'est qu'un brouillon ne doit pas naître **avant**
le geste de lecture qui le rendrait pertinent. Un déclenchement adossé à la
lecture confirmée — et non à l'arrivée d'une réponse — serait une décision
distincte, et elle n'est pas prise.

**Garde posée.** `api/patient/submit/route.test.ts` affirme désormais qu'**aucune**
tâche de fond n'est planifiée sur ce chemin. L'assertion porte sur `after` et ne
nomme aucun module : un second mécanisme la ferait rougir aussi, là où un banc
nommant `genererSiRideauFerme` serait resté vert. Vérifiée par mutation le jour
même — un `after()` réintroduit fait tomber ce banc, et lui seul.

Amende [[D-174]] ; voir [[D-226]]. Le dossier RGPD § 2 bis porte la cessation du
traitement, et la rubrique 5 du registre est à mettre à jour.
