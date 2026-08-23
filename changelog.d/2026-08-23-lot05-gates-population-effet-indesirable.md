### La gate de population dit ce qu'elle ignore, et l'effet indésirable reçoit son association (2026-08-23)

LOT-05 de « Doctrine exécutable », décision `D-101`. **La production ne change
pas au merge** : aucun candidat n'est écarté, aucune interruption ne mord, et
le seul effet visible est ce que le cockpit **dit de plus**.

- **La mesure d'ouverture a changé la forme du lot.** La gate n'avait pas de
  sujet : le seul objet réellement classé est une **règle de priorité** — un
  axe de travail, pas une intervention —, et `neCouvrePas` vit sur 95
  **documents sources** d'un registre d'audit qu'aucun chemin d'exécution ne
  relie à un candidat classé. Curer les 95 aurait produit une donnée que rien
  ne lit. Le lot livre donc le **mécanisme** et son **aveu**, pas la curation.
- **« Exclusions non curées », écrit noir sur blanc.** La table de curation est
  vide et **déclarée vide** ; chaque candidat repart avec le motif servi au
  praticien. C'est `DC-35`, et c'est ce qui empêche « ouvert par défaut » de
  devenir « aveugle par défaut ».
- **Une section « État actuel » dans l'anamnèse patient**, distincte des
  facteurs déclenchants et des antécédents : sept critères, chacun à trois
  réponses — « Je ne sais pas » **écrit**. Une case non cochée ne distingue pas
  « je ne suis pas concerné » de « je n'ai pas répondu », et sur une gate de
  sécurité cette confusion est le fail-open exact que `DC-24` interdit.
- **Trois critères de `DC-43` sont volontairement absents** : l'âge (aucune
  borne n'a de provenance — un pivot serait un seuil inventé), la
  polymédication (le compte existe, le nombre qui qualifie n'a aucune source),
  l'allergie/intolérance (déjà déclarée deux champs plus haut).
- **`DC-42` cesse d'être inapplicable.** Une migration ajoute l'association
  d'un signalement d'effet indésirable à un protocole et deux dates typées ;
  les deux champs libres restent, avec les mots du patient. Le patient
  **déclare** que le produit fait partie de son programme, le serveur résout
  lequel — aucune ressemblance de libellé n'est calculée.
- **Une seule consultation fait foi.** Deux sélections coexistaient et
  rendaient parfois deux lignes différentes : la synthèse pouvait nommer un
  signal que le cockpit ne voyait pas, sur le chemin même du rang `vigilance`.
  Sept appelants passent désormais par une sélection partagée.
- **Un défaut de rendu fermé au passage** : les limitations d'un candidat
  entraient dans l'empreinte de la carte, arrivaient au navigateur et
  n'étaient affichées par personne — la classe de défaut exacte que la revue du
  LOT-04 avait trouvée sur les motifs d'abstention.
- **Ce qui reste ouvert, nommé** : `DC-42` et `DC-43` **ne basculent pas** ; la
  règle d'interruption est écrite, **non signée**, derrière un drapeau
  `WN_EI_INTERRUPTION` neuf et éteint ; et ce que fait la gate sur un état
  **inconnu** est un arbitrage nommé, non rendu — la branche est inatteignable
  tant que la table est vide.
