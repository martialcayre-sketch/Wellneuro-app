# Demande à Scalingo — annexe HDS et DPA

Pièce du **LOT-01**. Texte prêt à envoyer, à relire et ajuster par le
responsable de traitement avant émission.

- **Canal** : le ticket ouvert le 2026-08-09, qui a reçu réponse le 2026-08-11.
  À défaut, `support@scalingo.com`.
- **Émetteur** : le responsable de traitement. Ce message ne transite pas par
  l'assistant, et **aucune valeur d'environnement ni secret n'y figure**.
- **Pourquoi ce texte** : la réponse du 2026-08-11 a précisé la *forme* de
  l'accord (DPA + annexe HDS distincte, signature séparée) sans fournir les
  pièces. Ce message demande les pièces elles-mêmes.

---

## Objet : obtention et signature de l'annexe HDS — compte Wellneuro

Bonjour,

Faisant suite à votre réponse du 2026-08-11 sur notre demande du 2026-08-09,
qui a confirmé deux points — la couverture des ressources créées avec
`--hds-resource` en région `osc-fr1` par le certificat LNE n° 38436-2 pour les
six activités du référentiel, et le fait que l'accord de sous-traitance se
compose du DPA et d'une annexe HDS distincte, l'acceptation des conditions
générales seule ne suffisant pas à activer l'option HDS —, je souhaite engager
la signature.

Pouvez-vous m'indiquer :

1. **la procédure exacte** pour obtenir l'annexe HDS applicable à notre compte
   et la faire signer (document à demander, circuit de signature, délai
   habituel) ;
2. **si un préalable existe** côté compte — plan, option à activer, ou
   validation interne — avant que l'annexe puisse être émise ;
3. **la version applicable du DPA** au jour de la signature, afin que nous
   archivions une copie horodatée des deux pièces ;
4. **ce que la signature emporte sur les ressources déjà provisionnées** —
   l'application `wellneuro-staging` et son add-on PostgreSQL, créés en
   `osc-fr1` avec `--hds-resource` : sont-elles couvertes rétroactivement à la
   signature, ou faut-il les recréer une fois l'annexe en vigueur ?

Contexte utile de notre côté : nous exploitons une application de consultation
en neuronutrition traitant des données de santé, aujourd'hui hébergée hors HDS
sous un écart daté et borné, que nous cherchons précisément à refermer. La
signature de l'annexe est la dernière condition contractuelle avant migration
de nos données ; aucune donnée réelle ne sera transférée avant qu'elle soit
signée et archivée.

Deux points annexes, si vous pouvez les préciser dans la même réponse :

5. **la personne habilitée** et le **contact professionnel de santé** que
   l'annexe exige d'identifier, le cas échéant : quelles informations
   attendez-vous de notre part, et sous quelle forme ?
6. **les obligations d'exploitation** que l'annexe met à notre charge une fois
   en vigueur — en particulier sur les modalités d'accès administratif aux
   données par notre équipe.

Je vous remercie par avance,

*[signature du responsable de traitement]*

---

## À faire au retour

1. Signer l'annexe.
2. **Archiver hors dépôt** le DPA et l'annexe signée, avec leur date.
3. Consigner l'archivage dans `docs/DOSSIER_RGPD.md` — rubrique 6 et ligne
   correspondante du tableau §14 — **et seulement alors** : tant que la pièce
   n'est pas produite, la condition (a) de `D-006` reste ouverte. « Une
   souscription inférée n'est pas une preuve produite. »
4. Si la réponse au point 4 impose de **recréer** les ressources, le noter au
   LOT-02 : cela change l'étape 1 du runbook.
