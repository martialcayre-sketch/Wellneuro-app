### Modifié

- **Les badges praticien disent « Scoring vérifié » au lieu de « Certifié »**
  (bibliothèque et colonne « Qualité » de la fiche patient). D-034 avait retiré
  la revendication de validation psychométrique de la consigne système de
  synthèse — seule surface du **runtime** à l'affirmer — mais nommait ce qu'il
  laissait dû : le mot circulait encore sans son sens là où un praticien le lit.
  Un badge vert « Certifié » se lit comme « instrument validé » ; ce que la
  donnée dit est « le scoring reproduit fidèlement la règle de la source ».
- **Toute la famille des libellés suit, pas seulement les trois badges verts.**
  « Non certifié » se lit tout aussi bien comme « non validé
  psychométriquement » : `Certifié` → `Scoring vérifié`, `Certification
  ambiguë` → `Scoring ambigu`, `Certification à vérifier` → `Scoring à
  vérifier`, `Non certifié` → `Scoring non vérifié`, `Certifié Drive` →
  `Scoring vérifié (Drive)`, `Drive ambigu` → `Scoring ambigu (Drive)`,
  `Certifié manuel EORTC` → `Scoring vérifié (manuel EORTC)`, `À vérifier` →
  `Scoring à vérifier`, `Cabinet — non certifié` → `Cabinet — scoring non
  vérifié`. **Le critère n'est pas la présence du mot mais la cohérence de
  l'échelle** — « Drive ambigu » et « À vérifier » ne portaient pas le mot et ont
  changé quand même, parce qu'une échelle mi-« Scoring », mi-autre chose ne se
  lit pas. `Non scoré`, `Statut inconnu` et `Historique` restent : ils ne portent
  pas le mot **et** se lisent sans friction à côté des nouveaux.
- **Trois proses en ligne** du rayon Questionnaires, qui employaient le même mot
  à quelques lignes d'un badge renommé : `BibliothequePanel.tsx:369`
  (description du tiroir d'édition) et `:1215` (pied de l'éditeur) disaient
  toutes deux « jamais certifié automatiquement », `:1405` (pied de la
  relecture) disait « Il reste non certifié ». La quatrième — « jamais
  certifiés », prose du tiroir des instruments du cabinet — n'est pas de ce
  compte : elle est devenue la constante `TEXTE_INSTRUMENTS_CABINET`, comptée
  ci-dessous avec les littéraux d'écran.
- **La source de la règle scorée reste nommée** : le moteur EORTC suit le manuel
  officiel, les autres la grille Drive. Les deux libellés verts diffèrent —
  les fondre aurait fait perdre à la fiche ce qui distingue les deux
  vérifications.

### Ajouté

- **D-036** — l'arbitrage : renommer le libellé plutôt qu'ajouter une infobulle
  ou un lien. Une infobulle native ne survit pas au tactile et
  `UX_WELLNEURO_3_0.md` la remplace explicitement par un bouton d'information ;
  un lien fait quitter l'écran. Le libellé, lui, dit ce que la donnée dit sans
  rien exiger du lecteur.
- `web/src/lib/certification-libelles.ts` — les deux mappers, jusqu'ici locaux
  et non exportés dans leurs composants, plus les deux littéraux d'écran qui ne
  passaient par aucun mapper. **Aucun banc ne pouvait asserter ce qu'ils
  rendaient** ; c'est la raison du déplacement, pas un rangement.
- `web/src/lib/certificationLibelles.guard.test.ts` — table de libellés écrite à
  la main, exhaustivité **par le typage** (`Record<StatutCertificationRuntime,…>`
  ne compile pas si un état est ajouté sans attendu), attendus **épinglés au mot
  près** pour les deux littéraux d'écran, refus de `/certifi/i` sur les valeurs
  rendues, et auto-test du motif sur les dix anciens libellés.
- `web/src/components/BibliothequePanel.test.tsx` — badge du catalogue dans ses
  **quatre** états, badge cabinet, prose du tiroir. Il n'existait aucun banc sur
  ce composant : `app/dashboard/bibliotheque/page.test.tsx` le **mocke**, et
  l'E2E ne touchait que le badge cabinet — la surface qui porte les 64
  instruments n'avait donc aucun rendu asséré.
- Une assertion de **rendu** sur la colonne « Qualité »
  (`FichePatientPanel.test.tsx`), avec son contrôle négatif : un mapper renommé
  qu'un composant n'appellerait pas laisserait l'ancien libellé à l'affichage.

**Six mutations vérifiées, six rouges** — les deux dernières trouvées par la
revue adversariale, et ce sont les plus instructives :

| Mutation | Rouge |
|---|---|
| libellé nu remis dans le module | 5 tests |
| motif remplacé par `/xyzzy/i` | 10 tests |
| ancien libellé réintroduit dans un composant | 1 test |
| source de la règle scorée effacée (EORTC → Drive) | 1 test |
| **sens de la prose cabinet inversé, sans le mot interdit** | 1 test |
| **libellé nu posé directement dans le badge du catalogue** | 6 tests |

Les deux dernières passaient **vertes** avant correction : un garde qui interdit
un mot n'épingle pas une affirmation (« leur scoring **est** vérifié par
WellNeuro » ne porte pas `certifi`), et un contrôle de source ne prouve pas un
affichage.

### Mesuré, et nommé comme dette

- **Le badge est muet pour 21 des 65 instruments — production comprise.** Mesuré
  le 2026-08-08 sur le catalogue résolu : **38 `certifie`, 21 `inconnu`, 6
  `ambigu`**. Les 21 ne déclarent aucune `certification` (`questionnaires/sommeil.ts`,
  `gerontologie.ts` n'en portent pas une), donc « Statut inconnu » à la
  bibliothèque et « Historique » sur la fiche, **partout**. PSQI (`Q_SOM_01`) et
  MMSE (`Q_GEO_04`) sont du nombre, que le registre couvre pourtant. Ce lot traite
  le badge qui rassure à tort ; celui qui ne dit rien reste.
- **Rien ne relie le libellé au barreau dont il emprunte le nom.** « Scoring
  vérifié » reproduit `scoring_verifie` de `instrument_registry.json` mais lit
  `def.scoring.certification.status`, écrit à la main dans le catalogue de code ;
  `verifier_registre_instruments.js` ne compare jamais les deux. Avant ce lot, une
  divergence rendait un mot vague faux ; désormais elle rend une affirmation
  vérifiable fausse.
- **Le seed omet une clé que le moteur produit.** Les moteurs propagent la
  métadonnée et `api/patient/submit` la persiste, mais les 14 blocs `scoresJson`
  de `prisma/seed.ts` n'en portent aucune — alors que les quatre instruments de
  Sophie Nicola la déclarent au catalogue. Aucun E2E n'assère donc les libellés de
  passation : il manque **une assertion, pas une possibilité**.

### Non modifié, et c'est le point

**Le vocabulaire du dossier garde le mot** : `instrument_registry.json`, le type
`StatutCertificationRuntime`, la valeur `'certifie'`, le corpus. Aucune valeur de
donnée, aucun nom de champ ne change — seul l'écran change. L'écart écran/dossier
qui en résulte est le prix assumé de D-036, écrit là plutôt que découvert plus
tard. C'est aussi pourquoi le garde porte sur les **valeurs rendues** et non sur
le source des composants : un `/certifi/i` appliqué au source rougirait sur ces
identifiants légitimes et devrait creuser une exception — or une échappatoire
taillée pour un cas légitime est réutilisable par le défaut.
