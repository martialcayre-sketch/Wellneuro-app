import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  getDocumentCourant,
  getVersion,
  REGISTRE_DOCUMENTS_TRUST,
  VERSION_CONSENTEMENT_COURANTE,
} from './registre';

describe('registre des documents TRUST', () => {
  it('verrouille le hash de chaque version publiée — modifier un texte sans créer de version casse ce test', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      const recalcule = canonicalSha256({
        key: doc.key,
        version: doc.version,
        titre: doc.titre,
        resume: doc.resume,
        sections: doc.sections,
      });
      expect(recalcule, `${doc.key}@${doc.version}`).toBe(doc.hash);
    }
  });

  it('expose les vingt documents attendus', () => {
    const cles = REGISTRE_DOCUMENTS_TRUST.map(d => `${d.key}@${d.version}`);
    expect(cles).toEqual([
      'cadre_accompagnement@v1',
      'limites_securite@v1',
      'donnees_confidentialite@v1',
      'donnees_confidentialite@v2',
      'donnees_confidentialite@v3',
      // Append-only : la v4 s'ajoute derrière la v3, qui garde sa place.
      'donnees_confidentialite@v4',
      'donnees_confidentialite@v5',
      'donnees_confidentialite@v6',
      // `D-167` — le rôle d'Anthropic s'élargit à la proposition de priorité.
      'donnees_confidentialite@v7',
      // Le dossier administratif : adresse, NIR, médecin traitant. Première
      // version de confidentialité à EXIGER un accusé depuis la v2 — les v3
      // à v7 décrivaient sans rien recueillir de neuf.
      'donnees_confidentialite@v8',
      // `D-222` amendé — la phrase qui promettait une garde que personne
      // n'avait posée devient exacte, et l'exception d'adressage est nommée.
      'donnees_confidentialite@v9',
      // `D-168` — le rôle d'Anthropic nomme aussi « Ce que j'ai compris de vous ».
      'donnees_confidentialite@v10',
      // `D-256` A4 — le compte rendu biologique déposé part entier chez Anthropic.
      'donnees_confidentialite@v11',
      'usage_ia@v1',
      // `D-167` — la v1 disait « le seul usage actuel » ; il y en a deux.
      'usage_ia@v2',
      // `D-251` (2026-09-30) — la v2 était fausse sur trois points.
      'usage_ia@v3',
      // `D-256` A4 — le relevé des comptes rendus biologiques, déclaré avant activation.
      'usage_ia@v4',
      'droits_patient@v1',
      'consentement_suivi@v2',
      // Même correction, dans le texte du consentement lui-même — l'occurrence
      // que `D-222` §3 n'avait pas vue.
      'consentement_suivi@v3',
    ]);
  });

  it('chaque version porte un résumé, au moins une section et une date de publication', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      expect(doc.resume.length).toBeGreaterThan(10);
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('getDocumentCourant retourne la version la plus récemment publiée et getVersion retrouve une version exacte', () => {
    expect(getDocumentCourant('consentement_suivi').version).toBe('v3');
    expect(getVersion('consentement_suivi', 'v3')?.hash).toBe(
      getDocumentCourant('consentement_suivi').hash,
    );
    expect(getVersion('consentement_suivi', 'v99')).toBeNull();
    expect(() => getDocumentCourant('inconnu' as never)).toThrow();
  });

  it('la version de consentement courante est celle du document consentement_suivi', () => {
    expect(VERSION_CONSENTEMENT_COURANTE).toBe('v3');
  });

  it("aucun document n'utilise le lexique interdit ni ne promet une surveillance", () => {
    const texte = JSON.stringify(REGISTRE_DOCUMENTS_TRUST).toLowerCase();
    for (const interdit of ['ordonnance', 'prescription', 'diagnostic médical établi', 'neuroscore', 'surveillance 24']) {
      expect(texte).not.toContain(interdit);
    }
    // « diagnostic » n'apparaît que dans des négations (« hors diagnostic », « pas de diagnostic »).
    const occurrences = texte.match(/[^«»]{30}diagnostic/g) ?? [];
    for (const contexte of occurrences) {
      expect(/n['’]établit pas|hors diagnostic|pas un diagnostic|ne constitue pas/.test(contexte)).toBe(true);
    }
  });

  it('le document servi ne nie plus la connexion patient par Google', () => {
    // LE DÉFAUT : la v3 écrivait « Google — connexion sécurisée du praticien
    // uniquement (jamais des patients) ». C'est une négation explicite, et elle
    // était fausse depuis le 2026-07-22 — la porte Google patient est ouverte
    // en production, relue par `env-get` le 2026-09-07.
    const courant = getDocumentCourant('donnees_confidentialite');
    // La version courante avance à chaque publication ; ce banc ne porte pas
    // sur son numéro mais sur ce que le document servi dit — l'assertion de
    // version n'est là que pour qu'un oubli de publication se voie.
    expect(courant.version).toBe('v11');
    const points = courant.sections.flatMap(sec => sec.points ?? []);
    expect(points.some(p => p.includes('jamais des patients'))).toBe(false);
    expect(points.some(p => p.includes('si vous le choisissez, votre propre connexion'))).toBe(true);
  });

  it('la v5 nomme Sentry, dit ce qu’il reçoit ET ce qu’il ne reçoit jamais', () => {
    // NOMMER UN PRESTATAIRE SANS DIRE CE QU'IL REÇOIT laisserait le patient
    // supposer le pire — ou le meilleur. Le dépôt refuse les deux :
    // `DOSSIER_RGPD.md:194` posait l'écart depuis le 2026-08-07, « soit il ne
    // traite aucune donnée personnelle et cela s'écrit, soit la liste patient
    // est incomplète et se corrige ». Elle se corrige.
    const courant = getDocumentCourant('donnees_confidentialite');
    const sentry = courant.sections.flatMap(s => s.points ?? []).find(p => p.startsWith('Sentry'));
    expect(sentry, 'Sentry absent de la liste des prestataires').toBeTruthy();
    expect(sentry).toContain('Union européenne');
    expect(sentry).toContain('jamais vos réponses');

    // Et la localisation est dite, pas seulement le nom.
    const hebergement = courant.sections.find(s => s.titre === 'Où sont hébergées vos données');
    expect(hebergement?.paragraphes.some(p => p.includes('région européenne'))).toBe(true);
  });

  it('À DATE ÉGALE, c’est la DERNIÈRE DÉCLARÉE qui est servie', () => {
    // Le piège que ce cas ferme : `getDocumentCourant` comparait avec `>=` et
    // gardait donc la PLUS ANCIENNE à date égale. Deux versions publiées le
    // même jour laissaient le patient sur le document périmé, sans signal.
    //
    // CE CAS A FAILLI S'ÉTEINDRE SANS BRUIT. Il s'écrivait « la v5 est servie
    // bien qu'elle partage sa date avec la v4 » — et la v6, publiée le
    // 2026-09-09, a pris la date maximale à elle seule : la paire à égalité
    // n'était plus sur le chemin de `getDocumentCourant`, le cas restait vert
    // en ne prouvant plus rien. Antidater la v6 pour le garder vivant aurait
    // été mentir sur la date de publication d'un document patient.
    //
    // Il est donc réécrit en PROPRIÉTÉ, vraie quel que soit le nombre de
    // versions : le document servi est le dernier déclaré parmi ceux qui
    // portent la date la plus récente. L'attente se dérive du registre, jamais
    // d'une copie de la comparaison qu'elle vérifie.
    const versions = REGISTRE_DOCUMENTS_TRUST.filter(d => d.key === 'donnees_confidentialite');
    const dateMax = [...versions].sort((a, b) => a.publieLe.localeCompare(b.publieLe)).at(-1)?.publieLe;
    const attendue = versions.filter(d => d.publieLe === dateMax).at(-1);
    expect(getDocumentCourant('donnees_confidentialite').version).toBe(attendue?.version);

    // La paire à égalité reste en place comme pièce à conviction : c'est elle
    // qui a révélé le défaut, et elle rougirait encore si `>=` revenait un jour
    // où la date maximale est partagée.
    const v4 = getVersion('donnees_confidentialite', 'v4');
    const v5 = getVersion('donnees_confidentialite', 'v5');
    expect(v4?.publieLe).toBe(v5?.publieLe);
    expect(versions.filter(d => d.publieLe === v4?.publieLe).at(-1)?.version).toBe('v5');
  });

  it('la v5 nomme le prestataire d’envoi et dit ce que les emails transportent', () => {
    // NOMMER LE PRESTATAIRE SANS DIRE CE QUE LES E-MAILS PORTENT aurait
    // fabriqué une nouvelle fausseté : `/portail/connexion` affirme « seule
    // votre adresse email est transmise — aucune donnée de santé », vrai de la
    // CONNEXION, et les deux surfaces se seraient lues ensemble comme
    // « Google, aucune donnée de santé ». Or le bilan validé part par ce relais.
    const points = getDocumentCourant('donnees_confidentialite').sections.flatMap(s => s.points ?? []);
    const envoi = points.find(p => p.startsWith('Google Workspace'));
    expect(envoi).toBeTruthy();
    expect(envoi).toContain('les documents que votre praticien vous adresse');
  });

  it('la v4 dit que les connexions sont enregistrées, là où elle invite à les signaler', () => {
    // Le document invitait à signaler « une connexion que vous ne reconnaissez
    // pas » sans dire nulle part que les connexions étaient enregistrées.
    const paragraphes = getDocumentCourant('donnees_confidentialite').sections.flatMap(s => s.paragraphes ?? []);
    expect(paragraphes.some(p => p.includes('enregistrées pendant douze mois'))).toBe(true);
  });

  it('les v3 à v7 ne redemandaient AUCUN accusé, et c’était la règle', () => {
    // LE PIÈGE QUE CET ITEM GARDE. `AvantDeCommencer` ne s'ajoute pas : il
    // REMPLACE la page. Exiger un accusé remet quatre écrans devant tous les
    // patients en cours — y compris celui qui note sa quatorzième nuit sur
    // vingt et une. Les v3 à v7 s'en dispensaient toutes pour le même motif :
    // elles DÉCRIVAIENT — un prestataire de plus, une catégorie déjà
    // recueillie, un usage qui s'élargit — sans rien recueillir de neuf.
    for (const version of ['v3', 'v4', 'v5', 'v6', 'v7']) {
      const doc = getVersion('donnees_confidentialite', version);
      expect(doc?.requiresAcknowledgement, version).toBe(false);
    }
  });

  it('les v8 ET v9 EXIGENT un accusé, pour deux motifs distincts', () => {
    // LA v8 NE DÉCRIT PAS, ELLE RECUEILLE. Trois données nouvelles entrent au
    // dossier — adresse postale, numéro de sécurité sociale, médecin traitant —
    // dont un NIR. Le mur d'écran que les cinq versions précédentes refusaient
    // d'ériger se justifie quand ce qui change n'est pas la description du
    // traitement mais son ASSIETTE. Arbitrage du responsable, 2026-09-16.
    expect(getVersion('donnees_confidentialite', 'v8')?.requiresAcknowledgement).toBe(true);

    // LA v9 NE RECUEILLE RIEN — elle corrige ce que le patient CROYAIT que son
    // refus produisait. C'est plus engageant, pas moins : il avait lu qu'aucun
    // partage n'aurait lieu sans son choix explicite, et c'était faux.
    // Arbitrage du responsable, 2026-09-17.
    expect(getVersion('donnees_confidentialite', 'v9')?.requiresAcknowledgement).toBe(true);
  });

  it('la v10 EXIGE un accusé, pour ne pas effacer celui de la v9 encore dû', () => {
    // LA v10 NE FAIT QUE DÉCRIRE — comme les v3 à v7, elle s'en serait
    // dispensée. Mais seule la version COURANTE réclame un accusé : une v10
    // sans accusé aurait effacé celui de la v9, que 23 dossiers actifs sur 28
    // devaient encore au 2026-09-30. Arbitrage du responsable, 2026-09-30.
    expect(getVersion('donnees_confidentialite', 'v10')?.requiresAcknowledgement).toBe(true);
  });

  it('la v10 nomme les trois usages d’Anthropic, et ni les fiches ni OpenAI parmi les prestataires', () => {
    // Lu sur la v10 elle-même : la v11 en ajoute un quatrième, que son banc garde.
    const points = getVersion('donnees_confidentialite', 'v10')?.sections.flatMap(s => s.points ?? []) ?? [];
    const anthropic = points.find(p => p.startsWith('Anthropic — '));
    expect(anthropic).toContain('préparation des synthèses');
    expect(anthropic).toContain('priorité de votre objectif');
    expect(anthropic).toContain('« Ce que j’ai compris de vous »');
    // L'adaptation des fiches ne traite aucune donnée personnelle : elle n'a
    // rien à faire dans la liste des prestataires qui en traitent.
    expect(points.some(p => p.startsWith('OpenAI'))).toBe(false);
  });

  it('la v3 du document IA dit les quatre usages, ses deux fournisseurs, et ne promet plus un usage « à venir » déjà servi', () => {
    // LE DÉFAUT QUE CE BANC FERME : la v2 présentait la proposition de priorité
    // ([[D-167]]) comme « avant sa mise en service », ignorait « Ce que j'ai
    // compris de vous » ([[D-168]]) et les fiches d'assiette ([[D-251]]), et
    // disait « Le fournisseur est Anthropic ».
    // Lu sur la v3 elle-même, et non sur le courant : la v4 l'a remplacée, et
    // ce banc doit continuer de prouver ce qu'elle corrigeait.
    const courant = getVersion('usage_ia', 'v3');
    expect(courant).not.toBeNull();
    if (!courant) return;
    const texte = courant.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texte).not.toContain('AVANT sa mise en service');
    expect(texte).not.toContain('Tant qu’il n’est pas ouvert');
    expect(texte).toContain('brouillon de la synthèse');
    expect(texte).toContain('priorité de votre objectif');
    expect(texte).toContain('« Ce que j’ai compris de vous »');
    expect(texte).toContain('fiches d’assiette');
    expect(texte).toContain('Anthropic rédige l’adaptation et OpenAI la relit');
    expect(texte).toContain('Aucune de vos données n’est utilisée pour cela');
    // Ce que l'IA ne fait jamais ne change pas.
    const jamais = (v: string) =>
      getVersion('usage_ia', v)?.sections.find(s => s.titre === 'Ce que l’IA ne fait jamais ici');
    expect(jamais('v3')).toEqual(jamais('v2'));
    // Document descriptif, non présenté par la séquence : aucun accusé.
    expect(courant.requiresAcknowledgement).toBe(false);
  });

  it('`D-256` A4 : les deux documents servis déclarent le compte rendu biologique transmis ENTIER à Anthropic', () => {
    // LA CONDITION DE SORTIE DU LOT-02 DE BIO-INGEST : l'envoi d'un compte rendu
    // au sous-traitant IA est déclaré AVANT toute activation, et le document
    // ENTIER, identité comprise (arbitrage du 2026-10-01). Une mutation qui
    // retire « vous identifient » de l'un des deux textes rougit ici.
    const usageIa = getDocumentCourant('usage_ia');
    expect(usageIa.version).toBe('v4');
    const texteIa = usageIa.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texteIa).toContain('compte rendu que vous lui avez remis');
    expect(texteIa).toContain('aucune n’entre à votre dossier sans cette validation');
    expect(texteIa).toContain('y compris votre nom et les autres mentions qui vous identifient');
    expect(texteIa).toContain('Pour les quatre premiers usages, le fournisseur est Anthropic');
    expect(texteIa).not.toContain('trois premiers usages');
    // L'ORDRE PORTE LE SENS : « les quatre premiers usages » désigne ceux qui
    // envoient une donnée à Anthropic. Le relevé déplacé après les fiches
    // laisserait tous les `toContain` verts et donnerait les fiches à Anthropic seul.
    const ou = usageIa.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? [];
    expect(ou[3]).toMatch(/^Le relevé des résultats/);
    expect(ou[4]).toMatch(/^Les fiches d’assiette/);
    // Formulation durable : rien qui pourrisse à l'activation (le défaut de la v2).
    expect(texteIa).not.toContain('AVANT sa mise en service');
    expect(texteIa).not.toContain('Tant qu’il n’est pas ouvert');
    const jamais = (v: string) =>
      getVersion('usage_ia', v)?.sections.find(s => s.titre === 'Ce que l’IA ne fait jamais ici');
    expect(jamais('v4')).toEqual(jamais('v3'));
    expect(usageIa.requiresAcknowledgement).toBe(false);

    const donnees = getDocumentCourant('donnees_confidentialite');
    const texteDonnees = donnees.sections.flatMap(s => s.paragraphes).join(' ');
    // La phrase de la v6 qui devenait fausse ne survit pas.
    expect(texteDonnees).not.toContain('Ces résultats sont saisis par votre praticien');
    expect(texteDonnees).toContain('déposer le compte rendu dans votre dossier');
    expect(texteDonnees).toContain('Le compte rendu déposé est conservé dans votre dossier');
    expect(texteDonnees).toContain('y compris votre nom et les autres mentions qui vous identifient, à Anthropic');
    const anthropic = donnees.sections.flatMap(s => s.points ?? []).find(p => p.startsWith('Anthropic — '));
    expect(anthropic).toContain('préparation des synthèses');
    expect(anthropic).toContain('priorité de votre objectif');
    expect(anthropic).toContain('« Ce que j’ai compris de vous »');
    expect(anthropic).toContain('comptes rendus de vos analyses biologiques');
    // Le banc v10 lit désormais la v10 seule : c'est ici que la ligne COURANTE
    // reste gardée contre les fiches, qui ne traitent aucune donnée personnelle.
    expect(anthropic).not.toContain('fiches');
    // Même motif que la v10 : sans accusé, celui de la v10 encore dû s'effaçait.
    expect(donnees.requiresAcknowledgement).toBe(true);
  });

  it('la v9 RETIRE la promesse que le logiciel ne tenait pas, et NOMME l’exception', () => {
    // LE DÉFAUT QUE CE BANC FERME, et il a coûté huit versions : « Aucun
    // partage avec un tiers (par exemple votre médecin traitant) n'a lieu sans
    // un choix explicite de votre part » était écrit depuis la v1 et repris par
    // composition. `D-222` §3 l'a nommé sans le toucher.
    //
    // UNE MUTATION QUI FERAIT ROUGIR CE BANC : réintroduire la phrase d'origine
    // dans une v10 par copie de la v8, ou publier l'exception sans la nommer.
    const texte = getDocumentCourant('donnees_confidentialite')
      .sections.flatMap(s => s.paragraphes ?? [])
      .join(' ');

    expect(texte).not.toContain('Aucun partage avec un tiers');
    expect(texte).not.toContain('Rien ne lui est adressé sans un choix explicite');

    // Ce que le logiciel fait, et ce qu'il ne fait pas.
    expect(texte).toContain('L’application n’envoie rien à un tiers');
    expect(texte).toContain('aucun canal vers un médecin');
    // L'exception, nommée — un texte qui la tairait re-promettrait la garde.
    expect(texte).toContain('votre sécurité lui impose d’écrire à un médecin malgré votre refus');
    expect(texte).toContain('Il vous en informe alors');
  });

  it('la v3 du consentement porte la MÊME correction — l’occurrence que D-222 §3 n’avait pas vue', () => {
    // `D-222` §3 ne nommait que les huit versions de « Vos données
    // personnelles » et l'écran « Mes choix ». Le texte du consentement portait
    // la même promesse — et c'est le plus engageant des trois, puisque c'est
    // celui que le patient lit AU MOMENT où il consent.
    const texte = getDocumentCourant('consentement_suivi')
      .sections.flatMap(s => s.paragraphes ?? [])
      .join(' ');
    expect(texte).not.toContain('ni partagées avec un tiers sans un choix explicite');
    expect(texte).toContain('L’application ne les partage avec aucun tiers');
    expect(texte).toContain('il peut s’en écarter lorsque votre sécurité l’exige');

    // PAS D'ACCUSÉ PROPRE, et c'est délibéré : la séquence « Avant de
    // commencer » ne présente pas ce document. L'accusé de la v9 couvre le
    // fait, qui est un seul. Exiger un accusé ici ferait boucler le patient —
    // `avantDeCommencer.ts` porte le piège en toutes lettres.
    expect(getDocumentCourant('consentement_suivi').requiresAcknowledgement).toBe(false);
  });

  it('la v8 NOMME les trois renseignements, et dit qu’ils sont facultatifs', () => {
    // UN ACCUSÉ SUR UN TEXTE QUI NE DIT PAS CE QUI CHANGE N'EST QU'UNE
    // FORMALITÉ. Le patient doit lire les trois données en toutes lettres, et
    // lire aussi qu'il peut les refuser — sans quoi « exiger un accusé »
    // revient à faire cliquer sur une porte fermée.
    const paragraphes = getDocumentCourant('donnees_confidentialite').sections.flatMap(
      s => s.paragraphes ?? [],
    );
    const texte = paragraphes.join(' ');
    expect(texte).toContain('adresse postale');
    expect(texte).toContain('numéro de sécurité sociale');
    expect(texte).toContain('médecin traitant');
    expect(texte).toContain('n’est obligatoire');
    // Noter un médecin n'est pas lui écrire : la confusion serait grave.
    expect(texte).toContain('ne veut pas dire lui écrire');
  });

  it('la v6 nomme les résultats d’analyses ET dit ce qui n’en est pas fait', () => {
    // POURQUOI CETTE VERSION EXISTE. `WN_CB_RESULTS_ENABLED` a été posé en
    // production le 2026-09-09 : le dossier peut désormais porter des résultats
    // biologiques chiffrés. Or `DOSSIER_RGPD.md` §2 conditionnait cette
    // ouverture à la mise à jour PRÉALABLE de ce document et du registre des
    // traitements — condition écrite là et nulle part ailleurs, ni dans
    // `FEATURE_FLAGS.md`, ni dans `D-122` §2 qui décrit pourtant le geste. Elle
    // a été manquée ; le drapeau est resté posé et le retard se comble ici.
    //
    // Nommer la catégorie ne suffit pas : un patient qui lit « résultats
    // d'analyses » suppose qu'on en tire quelque chose. Le document dit donc
    // aussi la limite que l'écran tient réellement ([[D-157]]) — la plage est
    // POSÉE À CÔTÉ de la mesure, aucun calcul ne la qualifie.
    const courant = getDocumentCourant('donnees_confidentialite');
    const paragraphes = courant.sections.flatMap(s => s.paragraphes ?? []);

    const recueil = paragraphes.find(p => p.includes('exploration biologique'));
    expect(recueil, 'la catégorie « exploration biologique » est absente du document patient').toBeTruthy();
    expect(recueil).toContain('la valeur mesurée, son unité et la date du prélèvement');

    const limite = paragraphes.find(p => p.includes('Aucun calcul'));
    expect(limite, 'le document ne dit pas ce qui n’est PAS fait des résultats').toBeTruthy();
    expect(limite).toContain('le travail de votre praticien');

    // La conclusion de la section « Quelles données » reste la conclusion : les
    // deux phrases neuves s'insèrent AVANT elle, jamais après.
    const section = courant.sections.find(s => s.titre === 'Quelles données sont recueillies ?');
    expect(section?.paragraphes.at(-1)).toContain('uniquement les informations nécessaires');
  });
});
