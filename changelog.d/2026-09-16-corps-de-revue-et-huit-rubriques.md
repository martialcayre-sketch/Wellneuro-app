### Lire l'état d'une revue n'est pas lire la revue, et un handoff écrit à la main n'hérite d'aucun gabarit (2026-09-16)

Deux trous laissés ouverts par `D-214` le soir même, fermés ici.

**Le corps de la revue se lit, pas seulement son état.** Copilot peut conclure
« Approval recommended » avec `comments generated: 0` et loger son constat dans
un bloc « Suppressed comments » **de son propre corps de revue**. `pulls/<N>/comments`
rend alors `[]`. Constaté sur la PR #1161, où le constat ainsi logé était réel.
`gh pr view <N> --json reviews` rend ce corps : §1.1 de
`.claude/rules/pr-revue-et-release-db.md` demande désormais de lire
`.reviews[].body`, et pas de s'arrêter au `state`.

**Les huit rubriques du handoff sont nommées là où un handoff s'écrit.** Le
constat relevé sur #1161 — trois rubriques manquantes — avait été lu comme un
défaut de classe : rien ne contrôlerait le gabarit. Vérification faite,
**c'est faux** : `/wn-handoff` liste les huit. Mais le skill porte
`disable-model-invocation`, donc un handoff **écrit à la main** n'en hérite pas —
et les deux handoffs du 2026-09-16 l'ont été. La revue n'en avait vu qu'un, celui
qu'elle examinait (corrigé dans sa PR) ; le second, mergé à 21 h 54, n'est pas
réécrit. La liste entre donc dans
`.claude/rules/docs-changelog.md`, armé sur `docs/**`, qui se charge quand on
écrit un handoff. Aucun banc ajouté : le gabarit existait, c'est sa portée qui
manquait.
