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
production du jour (conteneur one-off, agrégats seuls, [[D-125]]) : **8
générations automatiques — 6 au premier rideau sur 5 dossiers, 2 au second sur 2
dossiers — dont 4 rejetées**, contre 2 rejets sur 55 générations manuelles. Soit
50 % contre 3,6 %. Un agrégat ne dit pas pourquoi on rejette, et 8 lignes sur 5
dossiers est un échantillon court.

**L'ordre des gestes est l'inverse de celui d'une pose.** Le drapeau a été retiré
de la production **d'abord** — `env-unset`, conteneurs web recréés à **20:49:15**
alors qu'ils tournaient depuis 19:25:44 —, le code ensuite. Pour une extinction
c'est le sens sûr : un code retiré devant un drapeau encore allumé ne change
rien, un drapeau retiré devant du code encore présent ferme déjà la porte.

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

Attendu : `0`. Les 8 brouillons déjà produits restent au dossier avec leur
marqueur — rien n'est effacé ni requalifié.

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
