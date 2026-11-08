import { describe, expect, it } from 'vitest';

import { INDICATIONS_BIOLOGIE_V1 } from '@/lib/biology-library/indicationsBiologieV1';
import { FICHES_USAGE_BESOIN2_V1 } from '@/lib/fiches-usage/ficheUsageBesoin2V1';
import {
  CONFLITS_DOSSIERS_CLOS_ECARTES_V1,
  CONFLITS_SOURCES_ECARTES_V1,
  CONFLITS_SOURCES_METADATA,
  CONFLITS_SOURCES_SHA256,
  CONFLITS_SOURCES_V1,
} from './conflitsSourcesV1';
import { evaluerConflitsSources } from './conflitsSourcesEngine';
import { CONTRADICTIONS_RULES_V1 } from './contradictionsV1';
import { sha256 } from './corpusSyntheseV1';

const cle = (c: { claimId: string; versionClaim: string }) => `${c.claimId}@${c.versionClaim}`;
const publies = () => CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee');

// Ce banc garde le registre des conflits déclarés sur trois points : la
// cohérence de `claimsSource` avec ce que les conflits épinglent, la forme de
// chaque déclaration, et le VERDICT `DC-29` — la forme `CONVERGENCE` reste
// vide, et rien ne doit pouvoir l'ouvrir par distraction.
//
// LE VERROU DE SIGNATURE EST GARDÉ AILLEURS, dans
// `conflitsSourcesService.test.ts` : il vit chez `contradictionsService`, seul
// endroit d'où il soit éprouvable (voir le commentaire du module).

describe('registre des conflits — signature complète ou pas de signature', () => {
  // ÉCRIT POUR LE JOUR DE LA SIGNATURE, pas contre lui — corrigé en revue.
  //
  // La première rédaction épinglait `validationExterne === false` sans
  // condition : le praticien qui signe aurait dû SUPPRIMER une assertion dans
  // le même commit, sans que rien n'oriente vers la bonne réécriture. C'est
  // l'idiome de `gatePopulationV1.guard.test.ts` qui vaut ici — ou bien rien
  // n'est signé, ou bien la signature est complète et cohérente.
  //
  // Ce que le banc garde vraiment : on ne peut pas signer À MOITIÉ. Une
  // `validationExterne` posée sans date ni SHA laisserait un verrou fermé pour
  // une raison que personne ne verrait.
  it('non signé, ou signé aux trois termes et sur le périmètre relu', () => {
    if (!CONFLITS_SOURCES_METADATA.validationExterne) {
      expect(CONFLITS_SOURCES_METADATA.dateValidation).toBeNull();
      expect(CONFLITS_SOURCES_METADATA.shaPerimetre).toBeNull();
      expect(CONFLITS_SOURCES_METADATA.empreintesEntrees).toBeNull();
      return;
    }
    const dateValidation = CONFLITS_SOURCES_METADATA.dateValidation;
    expect(dateValidation).not.toBeNull();
    // ISO canonique — une date mal formée FERME le verrou, et un banc qui
    // l'accepterait laisserait croire à une signature qui n'ouvre rien.
    expect(new Date(dateValidation as string).toISOString()).toBe(dateValidation);
    // LE TERME QUI COMPTE : le périmètre signé est celui qui est là.
    expect(CONFLITS_SOURCES_METADATA.shaPerimetre).toBe(CONFLITS_SOURCES_SHA256);
    // [[D-452]] §4 : chaque entrée publiée a son empreinte relue, et rien d'autre.
    // Une entrée retouchée change d'empreinte ; l'arbitrage qui l'attestait se
    // lit alors « à relire » ([[D-439]] A3).
    const attendues = Object.fromEntries(publies().map(c => [c.id, sha256(JSON.stringify(c))]));
    expect(CONFLITS_SOURCES_METADATA.empreintesEntrees).toEqual(attendues);
  });
});

describe('registre des conflits — la liste curée des fiches ([[D-439]] A2, [[D-452]] §2)', () => {
  // LA RÈGLE DU RESPONSABLE (2026-11-06) : la liste vaut EXACTEMENT les fiches
  // de la structure signée qui épinglent l'un des deux claims. Une fiche qui
  // quitte la structure, ou qui cesse d'épingler le claim, rougit ce banc : la
  // liste se re-signe avec elle.
  it('chaque conflit publié porte les fiches qui épinglent l’un de ses claims, ni plus ni moins', () => {
    for (const conflit of publies()) {
      const siens = new Set(conflit.claims.map(cle));
      const attendues = FICHES_USAGE_BESOIN2_V1.fiches
        .filter(f => f.claims.some(c => siens.has(cle(c))))
        .map(f => f.id)
        .sort();
      expect([...conflit.fichesUsage], conflit.id).toEqual(attendues);
      expect(attendues.length, `${conflit.id} : une liste vide fermerait l’arbitrage`).toBeGreaterThan(0);
    }
  });

  // [[D-439]] §4 : un conflit des dossiers clos n'entre au registre que si ses
  // DEUX claims sont épinglés par une fiche signée. `CS-BIO-01`, antérieur, en
  // est exempté nommément : `WN-CL-0387-013` n'est épinglé par aucune fiche.
  it('hors `CS-BIO-01`, les deux claims de chaque conflit publié sont épinglés par une fiche', () => {
    const epingles = new Set(FICHES_USAGE_BESOIN2_V1.fiches.flatMap(f => f.claims.map(cle)));
    for (const conflit of publies().filter(c => c.id !== 'CS-BIO-01')) {
      for (const claim of conflit.claims) expect(epingles.has(cle(claim)), `${conflit.id} ${cle(claim)}`).toBe(true);
    }
  });
});

describe('registre des conflits — publier n’est pas déclencher ([[D-439]] A1)', () => {
  // LA SEULE SOURCE DU DÉCLENCHEMENT est `claimsCitesParLaPropositionBilan`,
  // qui ne lit que les `justificationClaims` des règles d'indications de
  // biologie. Le littéral de chaque entrée doit dire ce que ce calcul rend.
  it('`declenchableParBilan` vaut : un claim du conflit est cité par une règle d’indication', () => {
    const cites = new Set(INDICATIONS_BIOLOGIE_V1.flatMap(r => r.justificationClaims.map(cle)));
    for (const conflit of publies()) {
      expect(conflit.declenchableParBilan, conflit.id).toBe(conflit.claims.some(c => cites.has(cle(c))));
    }
  });

  it('`CS-BIO-01` reste déclenchable ; aucun conflit des dossiers clos ne l’est', () => {
    expect(publies().filter(c => c.declenchableParBilan).map(c => c.id)).toEqual(['CS-BIO-01']);
  });

  // LE BANC D'A1, SUR LE MOTEUR RÉEL : nourri de TOUS les claims que la
  // proposition de bilan peut citer — le pire cas —, il ne fait sortir que les
  // conflits déclenchables. Les onze conflits des dossiers clos n'atteignent
  // pas le cockpit, quel que soit le dossier.
  it('nourri de tout ce que la proposition peut citer, le moteur ne sort que les déclenchables', () => {
    const claimsCites = [
      ...new Map(INDICATIONS_BIOLOGIE_V1.flatMap(r => r.justificationClaims).map(c => [cle(c), c])).values(),
    ];
    const sortis = evaluerConflitsSources({ claimsCites }).map(c => c.id);
    expect(sortis).toEqual(publies().filter(c => c.declenchableParBilan).map(c => c.id));
  });

  it('un conflit neuf déclenchable atteint le cockpit ; le même, non déclenchable, n’y apparaît pas', () => {
    const [bilan] = INDICATIONS_BIOLOGIE_V1.flatMap(r => r.justificationClaims);
    const neuf = publies().find(c => c.id === 'CS-ZINC-02');
    expect(neuf).toBeDefined();
    const declenchable = { ...neuf!, id: 'CS-TEST-01', claims: [bilan, neuf!.claims[1]] as const };
    const claimsCites = [bilan];
    expect(evaluerConflitsSources({ claimsCites, conflits: [declenchable] }).map(c => c.id)).toEqual(['CS-TEST-01']);
    expect(evaluerConflitsSources({ claimsCites, conflits: [neuf!] })).toEqual([]);
  });
});

describe('registre des conflits — la forme des déclarations', () => {
  it('le registre porte au moins un conflit publié', () => {
    expect(CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee').length).toBeGreaterThan(0);
  });

  it('chaque conflit oppose deux claims DISTINCTS', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      const [premier, second] = conflit.claims;
      expect(`${premier.claimId}@${premier.versionClaim}`).not.toBe(
        `${second.claimId}@${second.versionClaim}`,
      );
    }
  });

  it('chaque conflit porte objet, positions, hypothèses, action et limitations', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      expect(conflit.objet.trim()).not.toBe('');
      expect(conflit.positions[0].trim()).not.toBe('');
      expect(conflit.positions[1].trim()).not.toBe('');
      expect(conflit.hypotheses.length).toBeGreaterThan(0);
      expect(conflit.actionSuggeree.trim()).not.toBe('');
      // `DC-14`, `DC-25`, `DC-28` : ce que le constat NE dit pas s'écrit.
      expect(conflit.limitations.length).toBeGreaterThan(0);
    }
  });

  // Les positions se lisent à la suite de « soutient que » dans la phrase
  // composée : une position rédigée comme une phrase autonome — majuscule
  // initiale ou point final — produirait un texte bancal à l'écran.
  it('les positions se lisent à la suite de « soutient que »', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      for (const position of conflit.positions) {
        expect(position).not.toMatch(/^[A-ZÀ-Ý]/);
        expect(position).not.toMatch(/[.!?]$/);
        // L'ÉLISION. La première rédaction de `CS-BIO-01` commençait par « un
        // bilan », et l'écran servait « soutient que un bilan ». Le connecteur
        // est figé dans le moteur : c'est donc à la position de commencer par
        // une consonne. Un `qu'` conditionnel dans le moteur aurait été une
        // règle de grammaire de plus à tenir, sur un chemin qui n'en veut pas.
        expect(position).not.toMatch(/^[aàâeéèêiîoôuùûyh]/i);
      }
    }
  });

  // `DC-23` : les niveaux de priorité ne se hissent pas par confort. Un conflit
  // de sources n'est pas un signal de sécurité, et lui donner le niveau le plus
  // haut brouillerait la hiérarchie le jour où un vrai red flag arrive.
  it('aucun conflit ne se hisse au niveau des signaux de sécurité', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      expect(conflit.importance).not.toBe('critical_for_decision');
    }
  });
});

describe('registre des conflits — les identifiants ne collisionnent pas', () => {
  // LES DEUX TABLES SE RETROUVENT DANS LE MÊME TABLEAU, et leurs `id` y servent
  // de clé d'affichage. Un identifiant partagé rendrait deux constats
  // indiscernables à l'écran, et le praticien qui conteste « la règle C-STR »
  // ne saurait pas laquelle il nomme (`DC-34`). Relevé en revue ; rien ne le
  // gardait, la convention `CS-*` contre `C-*` tenant au seul usage.
  it('aucun conflit ne porte l’identifiant d’une règle de contradiction', () => {
    const reglesContradiction = new Set(CONTRADICTIONS_RULES_V1.map(regle => regle.id));
    expect(reglesContradiction.size).toBeGreaterThan(0);
    for (const conflit of CONFLITS_SOURCES_V1) {
      expect(reglesContradiction.has(conflit.id)).toBe(false);
    }
  });

  it('aucun identifiant n’est déclaré deux fois dans le registre', () => {
    const ids = CONFLITS_SOURCES_V1.map(conflit => conflit.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('registre des conflits — les claims épinglés', () => {
  // ANTI-DÉRIVE. `claimsSource` est ce que le contrat de fraîcheur contrôle sur
  // la production ; s'il divergeait des claims réellement épinglés par les
  // conflits publiés, un conflit s'appuierait sur un claim que rien ne garde.
  it('`claimsSource` est exactement ce que les conflits publiés épinglent', () => {
    const epingles = [
      ...new Set(
        CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee').flatMap(c =>
          c.claims.map(claim => `${claim.claimId}@${claim.versionClaim}`),
        ),
      ),
    ].sort();
    const declares = CONFLITS_SOURCES_METADATA.claimsSource
      .map(claim => `${claim.claimId}@${claim.versionClaim}`)
      .sort();
    expect(declares).toEqual(epingles);
  });

  // Les claims des conflits ÉCARTÉS ne sont pas épinglés : rien ne s'appuie sur
  // eux, et exiger leur fraîcheur bloquerait des releases au nom d'un conflit
  // que le dépôt a justement refusé de déclarer.
  it('les claims des conflits écartés ne sont pas épinglés', () => {
    const declares = new Set(CONFLITS_SOURCES_METADATA.claimsSource.map(c => c.claimId));
    for (const ecarte of CONFLITS_SOURCES_ECARTES_V1) {
      for (const claimId of ecarte.claims) {
        expect(declares.has(claimId)).toBe(false);
      }
    }
  });
});

describe('registre des conflits — ce qui a été écarté', () => {
  // Patron [[D-042]] : un candidat retiré sans motif lisible revient toujours,
  // à l'identique, par la main de quelqu'un qui ignorait pourquoi il est parti.
  it('chaque écarté porte son motif et sa condition de retour', () => {
    expect(CONFLITS_SOURCES_ECARTES_V1.length).toBeGreaterThan(0);
    for (const ecarte of CONFLITS_SOURCES_ECARTES_V1) {
      expect(ecarte.motif.trim().length).toBeGreaterThan(60);
      expect(ecarte.conditionDeRetour.trim()).not.toBe('');
      expect(ecarte.claims[0]).not.toBe(ecarte.claims[1]);
    }
  });
});

describe('les conflits des dossiers clos qui n’entrent pas au registre ([[D-439]] §4, [[D-452]] §1)', () => {
  it('chaque écarté porte son motif et sa condition de retour, une seule fois par dossier', () => {
    expect(CONFLITS_DOSSIERS_CLOS_ECARTES_V1.length).toBeGreaterThan(0);
    const vus = new Set<string>();
    for (const ecarte of CONFLITS_DOSSIERS_CLOS_ECARTES_V1) {
      const id = `${ecarte.dossier} ${ecarte.etiquette}`;
      expect(vus.has(id), id).toBe(false);
      vus.add(id);
      expect(ecarte.motif.trim().length, id).toBeGreaterThan(60);
      expect(ecarte.conditionDeRetour.trim(), id).not.toBe('');
    }
  });

  // Le motif et les claims cités se tiennent : « aucune partie épinglée » ne
  // cite aucun claim ; « une seule partie » en cite au moins un (revue P1).
  it('le motif générique dit vrai sur les claims cités', () => {
    for (const ecarte of CONFLITS_DOSSIERS_CLOS_ECARTES_V1) {
      const id = `${ecarte.dossier} ${ecarte.etiquette}`;
      if (ecarte.motif.startsWith('Aucune des deux parties')) expect(ecarte.claimsEpingles, id).toEqual([]);
      if (ecarte.motif.startsWith('Une seule des deux parties')) expect(ecarte.claimsEpingles.length, id).toBeGreaterThan(0);
    }
  });

  // Les claims cités sont ceux qu'une fiche signée épingle : le dépôt ne garde
  // trace d'aucun autre (forme opaque, [[D-251]] §4).
  it('les claims cités sont épinglés par une fiche signée', () => {
    const epingles = new Set(FICHES_USAGE_BESOIN2_V1.fiches.flatMap(f => f.claims.map(c => c.claimId)));
    for (const ecarte of CONFLITS_DOSSIERS_CLOS_ECARTES_V1) {
      for (const claimId of ecarte.claimsEpingles) {
        expect(epingles.has(claimId), `${ecarte.dossier} ${ecarte.etiquette} ${claimId}`).toBe(true);
      }
    }
  });

  // [[D-461]] : un conflit de dossier est publié OU écarté, jamais les deux.
  // Le rattachement d'une entrée publiée à son conflit de dossier n'est écrit
  // que dans les commentaires du registre ; il est recopié ici pour être tenu.
  // Le contrôle porte sur les CONFLITS, pas sur les claims : un même claim peut
  // servir deux conflits distincts.
  const PUBLIES_PAR_DOSSIER: Record<string, string> = {
    'fer C1': 'CS-FER-01',
    'vitamine_d C1': 'CS-VITD-01',
    'vitamine_d C4': 'CS-VITD-02',
    'vitamine_d grossesse': 'CS-VITD-03',
    'zinc C2': 'CS-ZINC-01',
    'zinc C6': 'CS-ZINC-02',
    'zinc C7': 'CS-ZINC-03',
    'zinc antibiotiques': 'CS-ZINC-04',
    'magnesium C6': 'CS-MAG-03',
    'b9_b12 C8': 'CS-B9B12-01',
    'iode_selenium C8': 'CS-IODSE-01',
  };

  it('aucun conflit publié n’est aussi déclaré écarté', () => {
    const publiesIds = new Set(publies().map(c => c.id));
    for (const [conflit, entree] of Object.entries(PUBLIES_PAR_DOSSIER)) {
      expect(publiesIds.has(entree), `${conflit} → ${entree}`).toBe(true);
    }
    // Et la table est complète : toute entrée publiée, hors `CS-BIO-01`
    // (antérieure aux dossiers), revient à un conflit de dossier.
    expect([...publiesIds].filter(id => id !== 'CS-BIO-01').sort())
      .toEqual(Object.values(PUBLIES_PAR_DOSSIER).sort());
    const ecartes = CONFLITS_DOSSIERS_CLOS_ECARTES_V1.map(e => `${e.dossier} ${e.etiquette}`);
    expect(ecartes.filter(id => id in PUBLIES_PAR_DOSSIER)).toEqual([]);
  });

  // [[D-461]] §5 : l'empreinte des écartés n'est pas stockée par le registre ;
  // la déclaration du responsable l'a nommée. LITTÉRAL FIGÉ (patron [[D-063]]) :
  // une retouche des écartés sans re-signature rougit ici, et la sortie est de
  // re-signer, jamais de mettre le littéral à jour en silence.
  // Re-signés le 2026-11-09 ([[D-465]]) : seul le motif de C7 change.
  it('les écartés sont ceux que la déclaration du 2026-11-09 a signés', () => {
    expect(sha256(JSON.stringify(CONFLITS_DOSSIERS_CLOS_ECARTES_V1)))
      .toBe('94030d5903d73a9ef990067a413e414b3d5fa3743cfbc9e8f72eb6b444e15a70');
  });

  // [[D-461]] : les huit conflits du dossier polyphénols et antioxydants sont
  // tous relus, et tous écartés — aucune entrée publiée ne lui revient.
  it('les huit conflits du dossier polyphénols et antioxydants sont écartés', () => {
    const siens = CONFLITS_DOSSIERS_CLOS_ECARTES_V1
      .filter(e => e.dossier === 'polyphenols_antioxydants')
      .map(e => e.etiquette);
    expect(siens).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']);
    expect(Object.keys(PUBLIES_PAR_DOSSIER).filter(k => k.startsWith('polyphenols_antioxydants '))).toEqual([]);
  });
});

describe('DC-29 — le verdict de la descente de provenance', () => {
  // LA DESCENTE A EU LIEU (2026-08-23, production, 8 224 claims `VALIDE`) et
  // n'a rien rendu : aucune source du corpus certifié ne fonde une graduation
  // par nombre de sources indépendantes. La forme `CONVERGENCE` reste donc
  // VIDE, état légitime.
  //
  // Ce banc est le seul point du dépôt qui empêche de l'ouvrir par distraction :
  // une règle de forme `CONVERGENCE` posée dans la table de contradictions
  // serait ignorée en silence par `contradictionsEngine.ts` (qui refuse toute
  // forme autre que `DISCORDANCE`) — verte, muette, et fausse. Ici, elle rougit.
  it('aucune règle de contradiction n’est de forme CONVERGENCE', () => {
    expect(CONTRADICTIONS_RULES_V1.filter(regle => regle.forme === 'CONVERGENCE')).toEqual([]);
  });

  // Le registre des conflits ne produit que `CONFLIT_SOURCES` : il n'est pas
  // une seconde porte d'entrée vers la graduation que `DC-19` interdit
  // d'inventer.
  it('le registre des conflits n’ouvre aucune convergence', () => {
    const source = CONFLITS_SOURCES_V1.map(c => JSON.stringify(c)).join(' ');
    expect(source).not.toContain('CONVERGENCE');
    expect(source).not.toContain('graduation');
  });
});
