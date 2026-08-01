### Certification — une réserve écrite au registre devient opposable (2026-08-01)

Le barreau `scoring_verifie` tenait à une seule condition :
`verdictScoring.divergencesCritiques === 0`.

**Le trou, mesuré en rejouant le code d'avant ce lot** — chaque instrument monté à
`scoring_verifie` pour voir ce qui rougissait. Une première rédaction annonçait
« quatre des cinq » sur le seul compteur : c'est vrai du compteur et **faux du
verrou**. Le trou réel était de **deux**.

| Instrument | Avant ce lot |
|---|---|
| `Q_SOM_09` | **passait** — rien ne l'arrêtait |
| `Q_GEO_04` | **passait** — rien ne l'arrêtait |
| `Q_TAB_04` | arrêté (`actif: false` ⟹ terminal, contenu `a_auditer`) |
| `Q_PED_03` | arrêté (idem) |
| `Q_FIB_03` | arrêté (idem, plus `divergencesCritiques` = 2) |

`Q_PED_03`, que cette rédaction désignait comme « le cas vivant que rien
n'arrêtait », était arrêté **deux fois**. Surestimer le trou d'un facteur deux
dans la pièce qui explique pourquoi la garde existe, c'était refaire ici la faute
que cette campagne attaque partout ailleurs — croire un compteur avant de lire ce
qu'il compte. Corrigé après revue.

**Ce qui fonde la garde n'en est pas affaibli.** Sur les deux instruments
réellement libres, ce qui les retenait n'existait qu'en français dans
`verdictScoring.revision.notes` — « la montée reste refusée », « barreau ramené à
`contenu_verrouille` » — et aucun code ne le lisait. Pour les trois autres, la
réserve ne mord pas aujourd'hui : elle vivra **à la réactivation** — moment où
l'**un** des deux gardes préexistants cesse de les tenir, l'autre
(`statutContenu: a_auditer`) leur survivant. Le détail est plus bas.

- **Champ `verdictScoring.reserve`** (`{ date, plafond, motif }`) : `plafond` est
  un barreau de l'échelle, `motif` dit sur quoi la réserve repose (≥ 40
  caractères, même exigence que `droits.detail`). Un statut au-dessus de son
  propre plafond est refusé — quel que soit le compteur de divergences.
- **Contrôlée partout, pas seulement là où elle mord** : une réserve mal formée
  inscrite sous son plafond deviendrait vraie le jour de la montée.
- **`publie` est refusé comme plafond**, et c'est la moitié du correctif de revue.
  Il est dans l'échelle, donc bien formé — mais c'est le **sommet** : une réserve
  qui y plafonne ne contraint rien tout en restant visiblement en place, motif
  intact. Le diff tient alors en **un jeton**, et un relecteur qui vérifie « la
  réserve est-elle toujours là ? » répond oui.
- **Les cinq réserves sont épinglées au banc, contre le registre réel** — l'autre
  moitié, et la plus importante. Une première rédaction se reposait sur
  « supprimer un bloc est une ligne de diff qu'une revue voit » : l'argument ne
  tenait pas. L'ancrage ferme d'un coup la famille entière — suppression, `null`,
  renommage (`reserves`), déplacement d'un niveau (`revision.reserve`) et plafond
  au sommet, **tous silencieusement inertes** jusque-là. Cinq mutations le
  vérifient. La `date` de chaque réserve y est épinglée avec son plafond. Elle
  ferme un geste de plus — **re-dater une réserve dans le registre seul**, pour la
  faire paraître courante, est désormais rouge. Elle ne ferme pas le relèvement de
  plafond : « relever un plafond exige alors de re-dater » était faux, et c'est une
  mutation qui l'a établi — un test statique n'a pas d'historique, il ne compare
  qu'à une valeur qu'on peut lui donner. Ce qu'elle apporte là, c'est que la date
  de chaque décision devient lisible au banc, donc qu'un plafond relevé sous une
  date ancienne se voit à l'œil nu, à côté du motif qu'il contredit. **Trou résiduel assumé** : relever un plafond de façon cohérente
  dans les deux fichiers reste possible, et c'est alors une décision écrite deux
  fois — ce qui reste opposé à ce geste est une revue, pas une garde.
- **Les états terminaux (`suspendu`, `remplace`) sont hors comparaison, pas hors
  forme.** La réserve n'y dort pas : elle mordra à la réactivation, sans qu'aucun
  barreau de reprise soit imposé — le contrôle voisin interdit seulement de
  *rester* terminal. Mesuré, pour ne pas surestimer ce qu'elle ajoute : sur les
  trois suspendus, la réserve n'apporte quelque chose **dès** la réactivation que
  pour `Q_TAB_04`, dont le plafond est sous `contenu_verrouille`. Pour `Q_PED_03`
  et `Q_FIB_03`, la garde `statutContenu: a_auditer` continue de les tenir seule,
  et la réserve devient porteuse le jour où leur contenu sera audité.
- **Cinq réserves inscrites** : `Q_SOM_09` (`droits_verifies`), `Q_GEO_04`,
  `Q_PED_03` et `Q_FIB_03` (`contenu_verrouille`), `Q_TAB_04` (`source_obtenue`).
  Trois reprennent le motif que leurs propres notes portaient déjà. **Les deux
  autres non, et leur entrée le dit** : `Q_FIB_03` n'a aucun bloc `revision` — son
  motif est corroboré par les deux codes critiques du comparateur, et sa lecture
  de production est jointe ; `Q_TAB_04` porte un jugement neuf, assumé comme tel.
- **Le banc du vérificateur entre dans T1** : `npm run registry-check` rejoint la
  chaîne `check`. Le registre réel y était déjà contrôlé via `scoring-check` ;
  c'est le banc **du garde** qui ne tournait qu'en CI — un garde redevenu muet
  restait donc vert en local.

**Ce que cette garde ne couvre pas**, écrit dans son commentaire : elle ne détecte
pas une réserve **jamais écrite** — un instrument certifié sans que personne n'ait
vu le problème lui échappe entièrement — et elle lit une **déclaration**, pas le
code. La suppression, elle, est désormais couverte par l'ancrage. Le remède au dernier point est nommé et laissé à un lot dédié : faire
écrire au banc la **couverture** de sa comparaison et refuser un verdict vacueux.
Rétro-remplir les 59 certifiés aujourd'hui écrirait 59 affirmations invérifiées,
leurs rapports hors dépôt étant antérieurs à deux reconstructions du 2026-07-31.
