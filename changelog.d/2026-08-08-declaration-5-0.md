### Ajouté

- **Déclaration Wellneuro 5.0** (`docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md`)
  : un verdict par dette de l'audit d'entrée — *fermée* avec sa preuve,
  *arbitrée et reportée* avec sa date de revue, ou *ouverte* avec ce qui la
  porte. **Verdict : 5.0 n'est pas déclarable en bloc** — 3 dettes fermées, 1
  reportée au 2026-10-21, **4 ouvertes**. *(Décompte du jour de la clôture.
  Révisé le même jour par D-034, qui ferme la dette 2 : voir le fragment
  `2026-08-08-d034-non-validation-psychometrique.md`, qui fait foi — **4 fermées,
  1 reportée, 3 ouvertes**.)*

### Ce que la vérification a changé

Aucun verdict n'a été pris sur la prose d'un lot : chaque preuve a été
confrontée à l'artefact — script exécuté et sortie rediffée, code lu, registre
compté. **Quatre verdicts sur huit diffèrent de ce que le lot concerné écrivait
de lui-même** :

- `wn-etat-reel.mjs` ne compare plus qu'**une** dimension sur six, là où le
  LOT-01 en déclare trois — et il ne compare pas du tout le lot courant ;
- aucune **date de retrait** du parcours patient legacy n'existe, alors que le
  LOT-04 coche le critère : la date inscrite est celle de la décision ;
- la journalisation du repli legacy des packs ne couvre **aucun cas observé** ;
- trois moteurs de scoring fermés au LOT-03 sont encore déclarés « ouverts » par
  deux commentaires de `web/src/lib/clinical/`.

### Modifié

- Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0` **close**, huit lots
  livrés. Deux des dix cases « Done de campagne » restent explicitement non
  satisfaites — les nommer était l'objet du lot de clôture.
- `.wn/state.json` passe à `idle` ; `next_action` ne porte plus que ce qui est
  réellement ouvert, avec l'ordre de la prochaine campagne.
- **PR #372 fermée sans merger** — périmètre absorbé par #566/#567, arbitrage
  rendu au LOT-05, geste posé ici. Branche conservée.
