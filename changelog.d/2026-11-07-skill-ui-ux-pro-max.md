### Skill tiers `ui-ux-pro-max`, réduit à la relecture d'interface (2026-11-07)

Le responsable demande les relectures avec ce skill et choisit le périmètre projet, par PR. Il avait été écarté le 2026-09-06 (`SESSION_LOG.md`) parce qu'il « génère une identité là où le dépôt en a une » : la copie retire donc de son `SKILL.md` la génération de système de design, et `scripts/search.py` refuse les options et les domaines correspondants.

**Contrôle `/wn-tiers` du 2026-11-07 : SOUS RÉSERVE**, sur `nextlevelbuilder/ui-ux-pro-max-skill` au commit `b7d5353e0130feb8c5574ef1251f8a1db1873ccb` (v2.15.0, MIT), sans lancer aucun script. Lus en entier : `SKILL.md`, `references/`, `search.py`, `core.py`, `design_system.py`, `reasoning_contract.py`. Ces scripts n'importent que la bibliothèque standard, sans réseau ni sous-processus ; leur seule écriture est sous `--persist`. `data/` n'est contrôlé que par motifs.

Réserves appliquées :

- copie de 46 fichiers amont (empreinte `b3485272` de leurs sommes SHA-256, relevée avant l'adaptation) et du texte de la licence ; ni `cli/`, ni `npx`, ni plugin, ni `scripts/tests/`, ni `validate_data.py` ;
- `SKILL.md` diffère de l'amont : description restreinte à la relecture, chemin `${CLAUDE_PLUGIN_ROOT}` remplacé (cette variable n'existe qu'en installation plugin), `python3 -B` pour n'écrire aucun `__pycache__` ;
- `scripts/search.py` diffère de l'amont par une garde de 9 lignes, ajoutée après la revue de PR : elle refuse `--design-system`, `--persist`, `--force` et les autres options de génération, les domaines d'identité, et toute recherche sans `--domain` ni `--stack`. Avant elle, l'interdiction n'était qu'une consigne ;
- le dépôt prime sur tout résultat, et le cadre liste les réserves connues : Lucide absent du catalogue `icons`, trois règles de `quick-reference.md`.

Bloqué, non copié : `stack/.claude/settings.json` (`enableAllProjectMcpServers`, `Read(//home/**)`) et `stack/.mcp.json` (`npx -y …@latest`).

`.gitignore` garde `*.csv` et n'ajoute qu'une exception, le catalogue public de ce skill. Écart assumé par rapport à l'amont : `disable-model-invocation` n'est pas posé, pour que l'assistant puisse lancer la relecture, et la description restreinte en limite le déclenchement.

Hors de ce contrôle : une instruction hostile en langage clair dans `data/`, la pertinence des conseils, et la copie déjà posée dans l'environnement cloud. Une nouvelle version se recontrôle.
