### Outillage : lecteur scripté de la revue PR-Agent sur la tête (D-393 §2, H93) (2026-10-28)

- `node scripts/wn-revue-pr-agent.mjs <N>`, en lecture seule, rend une à une
  les quatre conditions de D-393 §2 : (a) dernier run `pull_request` de
  `pr_agent.yml` sur la tête, conclu `success` ; (b) « returning full diff »,
  jamais « pruning diff » ; (c) commentaire persistant écrit pendant le run,
  bloc d'état unique à la tête sans fichier exclu, ou sans bloc ; (d) liste
  fermée des commentaires à côté, et aucune commande postée après le début.
- Codes : `0` preuve tenue, `1` preuve absente ou défaut, `2` lecture
  impossible (jamais lue comme un `0`), `3` usage.
- Plus strict que la lettre, jamais plus ouvert : journal qui nomme la PR
  seule ; fichier écarté sans compression refusé ; pied « Review coverage »
  ou « Chunked review » refusé (seule trace d'une revue rognée sans
  remarque) ; avis et en-tête qui nomment la tête ; revues et commentaires
  en ligne lus ; tout run sur commentaire actif pendant le run qui a lancé
  une commande refusé.
- L'étape 6 de `wn-merge` l'appelle à la place de la lecture à la main ; la
  règle 1.6 le nomme. Banc sur API simulée, enregistré dans
  `bancs-outillage-check`.
