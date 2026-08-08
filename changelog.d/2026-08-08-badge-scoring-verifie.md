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
  vérifié`. `Non scoré`, `Statut inconnu` et `Historique` ne portaient pas le
  mot et ne changent pas.
- Les **trois proses** du tiroir des instruments du cabinet, qui employaient le
  même mot trois lignes sous le badge renommé (« jamais certifiés », « jamais
  certifié automatiquement », « Il reste non certifié »).
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
  ne compile pas si un état est ajouté sans attendu), refus de `/certifi/i` sur
  les valeurs rendues, et auto-test du motif sur les dix anciens libellés.
  Quatre mutations vérifiées, quatre rouges : libellé nu remis dans le module
  (3 tests), motif cassé (10), ancien libellé réintroduit dans un composant (1),
  source de la règle effacée (le banc de rendu).
- Une assertion de **rendu** sur la colonne « Qualité »
  (`FichePatientPanel.test.tsx`), avec son contrôle négatif : un mapper renommé
  qu'un composant n'appellerait pas laisserait l'ancien libellé à l'affichage.

### Non modifié, et c'est le point

**Le vocabulaire du dossier garde le mot** : `instrument_registry.json`, le type
`StatutCertificationRuntime`, la valeur `'certifie'`, le corpus. Aucune valeur de
donnée, aucun nom de champ ne change — seul l'écran change. L'écart écran/dossier
qui en résulte est le prix assumé de D-036, écrit là plutôt que découvert plus
tard. C'est aussi pourquoi le garde porte sur les **valeurs rendues** et non sur
le source des composants : un `/certifi/i` appliqué au source rougirait sur ces
identifiants légitimes et devrait creuser une exception — or une échappatoire
taillée pour un cas légitime est réutilisable par le défaut.
