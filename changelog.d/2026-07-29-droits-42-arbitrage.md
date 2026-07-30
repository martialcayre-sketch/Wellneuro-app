### Droits — l'arbitrage des 42 est appliqué au registre

Décisions du praticien du 2026-07-29, prises sur le dossier `droits-42-instruments.md`
(#462) et appliquées ici. Le dossier ne décidait de rien ; ce lot exécute.

**1. Les deux déclarations couvrent les instruments tiers reproduits dans les
supports SIIN.** Périmètre retenu : **les 42**, c'est-à-dire tout instrument extrait
d'un support de formation du SIIN, que le support nomme l'origine (Burckhardt,
Tinetti, Dubois, Karasek…) ou qu'il ne porte que son propre pied de page. Les 42
entrées passent de `a_verifier` à `permission_obtenue`, avec la date du 2026-07-29.

**C'est un renversement de la correction du matin, et il est assumé.** Le
2026-07-29, sept instruments avaient été **rétrogradés** de `permission_obtenue`
précisément parce que leur source ne portait qu'une attribution tierce ; la
frontière tracée alors — « le pied de page du SIIN dit qui a reproduit, pas qui
détient » — était l'hypothèse prudente, et le dossier la présentait comme une
hypothèse. Le praticien l'a tranchée dans l'autre sens. Les sept remontent.

**Ce que le renversement annule est daté ; ce qu'il n'annule pas reste debout.**
Deux corrections successives ont été nécessaires, la seconde imposée par la revue.

Le premier jet posait le nouveau fondement à la suite de l'ancien sans y toucher :
les 42 entrées disaient `permission_obtenue` pendant que leur `detail` affirmait
toujours « les droits de l'échelle d'origine restent entiers et NON INSTRUITS », et
sept portaient en outre la « CORRECTION DU 2026-07-29 » qui les rétrogradait.
Chaque entrée se contredisait elle-même.

Le deuxième jet a marqué les deux phrases comme supersédées — **et c'était trop.**
« Les droits de l'échelle d'origine restent entiers et NON INSTRUITS » est encore
**vrai** après l'arbitrage : une déclaration du praticien n'éteint aucun droit
détenu par un tiers, et aucune démarche n'a été engagée. L'annuler aurait fait
lire une levée de réserve là où il n'y en a pas. Seule la **conclusion
opérationnelle** — « Statut maintenu à `a_verifier` » — est caduque, et c'est elle
seule qui porte désormais le marqueur `[SUPERSÉDÉ le 2026-07-29, voir l'extension
en fin d'entrée]`, sous une forme unique sur les 42. La réserve, elle, est
conservée et assortie d'une phrase qui dit pourquoi elle survit.

**Un garde permanent remplace l'affirmation qui n'en était pas une.** Une
rédaction antérieure de ce fragment prétendait qu'« un contrôle vérifie qu'aucune
occurrence n'échappe à son marqueur » : aucun contrôle de ce genre n'existait, et
le seul script qui ait jamais lu `droits.detail` est celui que ce lot supprime.
Le vérificateur du CI exige désormais qu'un statut de droits **dégagé** dise SUR
QUOI il repose — `droits.detail` non vide et substantiel. Sans cela,
`permission_obtenue` + une date suffisaient à franchir le barreau avec un champ
vide, c'est-à-dire à faire autorité sans rien produire à l'appui ; c'est
exactement ce que ce lot fait 42 fois, sur une déclaration et non sur une pièce
signée. Six cas de banc le prouvent, dont un anti-sur-filtrage.

**Ce que le registre écrit, et pourquoi c'est dans le registre.** Chaque entrée
porte désormais le fondement en clair : *« FONDEMENT : déclaration du praticien,
non une pièce signée de l'ayant droit — `permission_obtenue` se lit ici
"permission tenue pour acquise sous la déclaration du 2026-07-29", et c'est sur
cette base que le barreau `droits_verifies` est franchi »*. Cette phrase est dans
le champ `detail` de chacune des 42, pas dans un document annexe : c'est le
registre qu'on relira dans six mois.

Le périmètre d'usage déclaré reste inchangé — administration aux patients du
cabinet, scoring, restitution, indexation dans le corpus RAG interne. Il **ne
couvre pas** la rediffusion hors cabinet, la publication du verbatim, ni la cession
à un tiers.

**2. Fermeture des instruments sans usage NI nom d'auteur.** `Q_TAB_04`
(consommation de cannabis) et `Q_PNE_01` (qualité de vie BPCO) passent en
`actif: false` + `statutCertification: suspendu` ; `Q_FIB_03` (ELFE) l'était déjà.

**Le motif n'est pas le droit — le praticien vient de le couvrir — c'est la
documentation.** Le critère est double, et la revue a montré qu'il devait l'être :
**ni le registre ni la source** ne nomme d'origine. Le registre est muet
(`instrument.auteurs` nul, référence `a_completer`) **et** le banc n'a relevé dans
le document d'extraction aucune mention hors du pied de page du SIIN. Le critère
écrit dans une première rédaction ne portait que sur le registre — appliqué aux 42
il sélectionnait **quatre** identifiants, dont `Q_NEU_12`, qui n'est pas fermé.
C'est sa source qui l'excepte : elle nomme trois œuvres amont (Terman & Williams,
le Prime-MD de Spitzer & Williams, le *Seasonal Pattern Assessment Questionnaire*
de Rosenthal, Bradt & Wehr). Un instrument dont la source nomme son origine reste
instruisable ; celui dont rien ne la nomme, non. La distinction est écrite dans le
`detail` des deux fermés. Un instrument dont on ne sait pas dire ce qu'il est ne peut pas être
certifié, quelle que soit la couverture de droits. Ils ne portent ni assignation ni
réponse — vérifié par `execute_sql` sur les quatre candidats, zéro ligne : la
fermeture ne coûte rien. La distinction est écrite dans leur `detail`,
sans quoi le lot se lirait comme incohérent — accorder la permission et fermer dans
le même geste.

**Ce que ça déplace sur l'échelle de certification** : **38 instruments montent à
`droits_verifies`**. Les 42 moins les quatre en état terminal — deux déjà
`suspendu`, deux fermés ici. Aucun n'ira plus loin dans ce lot : les 42 sont toutes
en `statutContenu: a_auditer`, et le barreau suivant l'exige. Le verrouillage du
contenu est mécanique (la description se dérive d'`empreinte-servie.json`) et reste
à faire ; **15 des 42 portent en outre au moins une divergence critique au banc**,
qui les arrêtera à `contenu_verrouille` quoi qu'il arrive.

**Le registre est reclassé CODE dans le classificateur de périmètre du CI**, et
c'est le défaut le plus grave que la revue ait trouvé sur ce lot. En retirant le
banc du dossier — la seule étape **non gatée par `docs_only`** qui lisait
`instrument_registry.json` — je laissais le fichier sans aucun filet : les deux
autres étapes qui le lisent sont gatées, et le fichier vit sous `docs/`. Une PR ne
touchant que lui obtenait donc `verify` vert **sans qu'aucun contrôle du registre
ne s'exécute** — et deux merges de l'historique ont exactement cette forme, dont un
qui éditait des statuts de droits. Le correctif suit le précédent déjà en place
pour `questionnaires-drive-mapping.md` : une ligne, et le registre redevient du
code aux yeux du CI.

**Le banc du dossier des 42 est retiré, selon sa propre procédure.**
`scripts/dossier_droits_42.test.mjs`, écrit le matin même, assertait 42 entrées
`a_verifier` : il rougit dès la première ligne de ce lot, et c'est exactement le cas
pour lequel son en-tête décrivait un retrait. Le geste prescrit était : *archiver le
dossier avec sa date, retirer le banc ET son étape de CI dans la même PR que la
décision, et le dire au changelog.* C'est fait — le fichier et l'étape
`.github/workflows/ci.yml` partent ensemble, le retrait du `package.json` compris.
Le dossier reste au dépôt, daté : il rend compte de l'état sur lequel la décision a
été prise, et il n'a pas à décrire l'état d'après.

Rafistoler ses chiffres pour faire passer le CI aurait été le contraire de ce qu'il
sert : un instantané d'arbitrage qui suit la décision qu'il a fondée ne prouve plus
rien.

**Ce qui n'est PAS couvert :**

- **Aucune démarche auprès d'un ayant droit n'est engagée par ce lot.** Les 42 sont
  couvertes par déclaration, pas par autorisation écrite. Les quatre démarches du
  dossier `demarches-ayants-droit.md` portent sur les **huit sous licence tierce
  explicite**, qui ne relèvent pas des déclarations SIIN et restent inchangées.
- **Le lien `droits.statut` → assignabilité est désormais gardé — par #466, pas par
  ce lot.** Cette réserve, nommée à la clôture de #465, a été fermée entre-temps :
  un instrument `licence_requise` ne peut plus rester assignable en silence. Ce lot
  en dépend directement, puisqu'il fait passer 42 entrées à `permission_obtenue` :
  sans cette garde, une instruction ultérieure qui ramènerait l'une d'elles à
  `licence_requise` la laisserait servie.
- **`Q_NEU_12` reste une définition sans entrée de rayon** — invisible à l'écran,
  acceptée par appel direct. Position que HAD vient de quitter, non arbitrée.
