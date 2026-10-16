import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOCUMENTS_AVANT_DE_COMMENCER,
  accueilRequis,
  avantDeCommencerRequis,
  documentsRequerantAccuse,
  type AccuseConnu,
} from './avantDeCommencer';
import { getDocumentCourant } from './contenus/registre';

// L'INVARIANT QUI COMPTE : LA SÉQUENCE DOIT POUVOIR SE TERMINER.
//
// Si la porte exige un accusé que la séquence n'enregistre pas, le patient
// boucle sans fin — quatre écrans, une validation, un retour, et les quatre
// écrans à nouveau. Ce n'est pas une gêne d'affichage : c'est un portail
// inaccessible, sur la surface où le patient dépose ses réponses.
//
// Ce fichier éprouve cette terminaison, et garde aussi le défaut qui a produit
// ce module : `requiresAcknowledgement` était un champ MORT — déclaré, posé sur
// treize documents, lu par personne.

function accuseSur(cle: string): AccuseConnu {
  return {
    documentKey: cle,
    documentVersion: getDocumentCourant(cle as never).version,
    type: 'pris_connaissance',
  };
}

describe('avantDeCommencer — la séquence peut toujours se terminer', () => {
  it('poser les accusés que la séquence enregistre SUFFIT à fermer la porte', () => {
    // C'est exactement ce que fait `terminer()` : une boucle sur
    // `documentsRequerantAccuse()`. Si cette assertion tombe, le patient
    // boucle.
    const accuses = documentsRequerantAccuse().map(accuseSur);
    expect(avantDeCommencerRequis(accuses)).toBe(false);
  });

  it('il manque un seul accusé, et la porte se referme', () => {
    const requis = documentsRequerantAccuse();
    expect(requis.length).toBeGreaterThan(0);

    for (const absent of requis) {
      const accuses = requis.filter(c => c !== absent).map(accuseSur);
      expect(avantDeCommencerRequis(accuses), `sans ${absent}`).toBe(true);
    }
  });

  it('un accusé sur une version PÉRIMÉE ne vaut pas pour la courante', () => {
    const accuses: AccuseConnu[] = documentsRequerantAccuse().map(cle => ({
      documentKey: cle,
      documentVersion: 'v0-perimee',
      type: 'pris_connaissance',
    }));
    expect(avantDeCommencerRequis(accuses)).toBe(true);
  });

  it('« présenté » n’est pas « pris connaissance »', () => {
    // `presente` trace qu'un texte a été AFFICHÉ. Le confondre avec une
    // reconnaissance viderait l'accusé de son sens : il suffirait d'ouvrir.
    const accuses: AccuseConnu[] = documentsRequerantAccuse().map(cle => ({
      ...accuseSur(cle),
      type: 'presente',
    }));
    expect(avantDeCommencerRequis(accuses)).toBe(true);
  });
});

describe('avantDeCommencer — la liste et les écrans ne divergent pas', () => {
  it('la liste est EXACTEMENT les trois documents que la séquence présente', () => {
    // Épinglée en entier, et dans l'ordre : une assertion « contient » aurait
    // laissé passer aussi bien une clé de trop qu'une clé manquante, et c'est
    // exactement le genre de dérive que ce module existe pour empêcher.
    expect([...DOCUMENTS_AVANT_DE_COMMENCER]).toEqual([
      'cadre_accompagnement',
      'limites_securite',
      'donnees_confidentialite',
    ]);
  });

  it('« Vos données personnelles » est désormais EXIGÉ, et le filtre est le mécanisme', () => {
    // CE BANC A CHANGÉ DE VERDICT AU LOT-05, ET C'EST LE POINT. Au LOT-04, la
    // clé était dans la liste sans être exigée : sa version courante (v7) ne
    // réclamait rien, et le filtre l'écartait TOUT SEUL — sans qu'on ait eu à
    // retirer sa clé de la liste. La v8 réclame un accusé, et elle entre dans
    // le périmètre exigé par le seul fait de sa publication.
    //
    // C'est ce mécanisme-là qu'il faut garder : `DOCUMENTS_AVANT_DE_COMMENCER`
    // dit ce que la séquence PRÉSENTE, jamais ce qu'elle EXIGE. Les deux se
    // rejoignent par `requiresAcknowledgement`, version par version.
    expect(DOCUMENTS_AVANT_DE_COMMENCER).toContain('donnees_confidentialite');
    expect(getDocumentCourant('donnees_confidentialite').requiresAcknowledgement).toBe(true);
    expect(documentsRequerantAccuse()).toEqual([
      'cadre_accompagnement',
      'limites_securite',
      'donnees_confidentialite',
    ]);
  });

  it('aucun document de la liste n’est absent des écrans de la séquence', () => {
    // GARDE DE COHÉRENCE ÉCRAN ↔ ACCUSÉ. Exiger la reconnaissance d'un texte
    // que la séquence ne montre pas demanderait au patient de reconnaître ce
    // qu'il n'a pas vu. Les trois documents ont chacun leur écran ; `usage_ia`,
    // `droits_patient` et `consentement_suivi` n'en ont pas, et sont donc hors
    // liste — ajouter une clé ici oblige à ajouter un écran là-bas.
    const source = readFileSync(
      path.resolve(__dirname, '../../components/patient/trust/AvantDeCommencer.tsx'),
      'utf8',
    );
    // La séquence annonce son propre compte d'écrans ; il doit couvrir les
    // documents exigés plus l'écran de confirmations finales.
    expect(source).toContain('Étape {ecran + 1} sur 4');
    expect(DOCUMENTS_AVANT_DE_COMMENCER.length).toBeLessThanOrEqual(3);

    // Et la séquence lit bien la liste partagée, au lieu d'une copie en dur.
    expect(source).toContain('documentsRequerantAccuse()');
    expect(source).not.toMatch(/\[\s*'cadre_accompagnement',\s*'limites_securite'\s*\]\s*as const/);
  });

  it('les trois clés hors séquence n’y entrent pas par mégarde', () => {
    for (const hors of ['usage_ia', 'droits_patient', 'consentement_suivi']) {
      expect(DOCUMENTS_AVANT_DE_COMMENCER).not.toContain(hors);
    }
  });
});

describe('avantDeCommencer — un texte n’exige rien pour des champs qui n’existent pas', () => {
  it('« Vos données personnelles » ne peut EXIGER un accusé que si le dossier sait tenir les renseignements qu’il nomme', () => {
    // CE BANC EXISTE POUR UN CONSTAT DE REVUE DU 2026-09-16, et il vaut mieux
    // qu'une note dans une PR — une note ne bloque personne.
    //
    // La v8 de ce document annonce au patient que son praticien tient désormais
    // son adresse postale, son numéro de sécurité sociale et son médecin
    // traitant, et lui fait franchir une porte pour le reconnaître. Publiée
    // avant que la migration n'ajoute les colonnes (LOT-03) et que la fiche ne
    // sache les écrire (LOT-05), cette phrase serait FAUSSE : on aurait fait
    // accuser réception, à chaque patient, d'un traitement qui n'existe pas.
    //
    // Un document de confidentialité qui EXIGE un accusé engage donc ce que
    // l'application fait réellement. Tant que la version courante n'exige rien,
    // ce banc ne demande rien ; dès qu'une version l'exige en nommant ces
    // renseignements, elle doit trouver les colonnes ET la route qui les écrit.
    const courant = getDocumentCourant('donnees_confidentialite');
    const texte = courant.sections.flatMap(s => s.paragraphes ?? []).join(' ');
    // Depuis la v16 (D-284 §2), le texte nomme l'adresse et le médecin
    // traitant, et dit le NIR NON recueilli : il n'engage plus que deux
    // colonnes et leur écriture.
    const nommeLeDossierAdministratif =
      texte.includes('adresse postale') && texte.includes('médecin traitant');

    if (!courant.requiresAcknowledgement || !nommeLeDossierAdministratif) return;

    // BORNÉ AU BLOC `model Patient`, et ce n'est pas du zèle : cherchés dans le
    // schéma entier, « adresse » et « nir » trouvent des commentaires et
    // d'autres modèles, et le banc passerait au vert en n'ayant rien vérifié.
    const schema = readFileSync(path.resolve(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    const blocPatient = /\nmodel Patient \{([\s\S]*?)\n\}/.exec(schema)?.[1] ?? '';
    expect(blocPatient, 'modèle Patient introuvable dans schema.prisma').not.toBe('');
    for (const colonne of ['adresse', 'medecinTraitantNom', 'medecinTraitantCoordonnees']) {
      expect(blocPatient, `colonne ${colonne} absente du modèle Patient`).toContain(colonne);
    }

    const patch = readFileSync(
      path.resolve(__dirname, '../../app/api/praticien/patients/route.ts'),
      'utf8',
    );
    for (const champ of ['adresse', 'medecinTraitantNom']) {
      expect(patch, `le praticien ne peut pas saisir ${champ}`).toContain(champ);
    }
  });

  it('★ un texte qui dit le NIR non recueilli ne cohabite pas avec un écran qui le recueille (D-284 §2)', () => {
    // LE BANC INVERSE. Faire accuser « n'est pas recueilli » pendant qu'un
    // champ le recueille serait le même défaut que celui du banc précédent,
    // retourné.
    const texte = getDocumentCourant('donnees_confidentialite')
      .sections.flatMap(s => s.paragraphes ?? [])
      .join(' ');
    if (!texte.includes('Votre numéro de sécurité sociale, lui, n’est pas recueilli.')) return;

    const route = readFileSync(
      path.resolve(__dirname, '../../app/api/praticien/patients/route.ts'),
      'utf8',
    );
    expect(route).not.toMatch(/'nir'|\bnir\s*[:?]|\.nir\b|verifierNir/);
    const ecran = readFileSync(
      path.resolve(__dirname, '../../components/dossier/FicheAdministrativePanel.tsx'),
      'utf8',
    );
    expect(ecran).not.toMatch(/cle: 'nir'|sécurité sociale/i);
  });
});

describe('accueilRequis — l’accueil sous les conditions d’utilisation (D-292 §3)', () => {
  const ouvert = { conditionsOuvertes: true, statutAge: 'majeur' as const };

  it('drapeau fermé : exactement la porte d’avant', () => {
    expect(accueilRequis([], { ...ouvert, conditionsOuvertes: false })).toBe('trois_textes');
    const accuses = documentsRequerantAccuse().map(accuseSur);
    expect(accueilRequis(accuses, { ...ouvert, conditionsOuvertes: false })).toBeNull();
  });

  it('dossier mineur ou sans date de naissance : la porte d’avant, drapeau ouvert ou non', () => {
    for (const statutAge of ['mineur', 'date_manquante'] as const) {
      expect(accueilRequis([], { conditionsOuvertes: true, statutAge })).toBe('trois_textes');
    }
  });

  it('nouveau patient majeur : les conditions seules — et leur accusé termine l’accueil', () => {
    expect(accueilRequis([], ouvert)).toBe('conditions');
    expect(accueilRequis([accuseSur('conditions_utilisation')], ouvert)).toBeNull();
  });

  it('patient suivi : aucun accueil, quelle que soit la version accusée, ni à une version suivante', () => {
    for (const cle of ['cadre_accompagnement', 'limites_securite', 'donnees_confidentialite', 'usage_ia', 'conditions_utilisation']) {
      const perime: AccuseConnu = { documentKey: cle, documentVersion: 'v0-perimee', type: 'pris_connaissance' };
      expect(accueilRequis([perime], ouvert), cle).toBeNull();
    }
  });

  it('« présenté » ne fait pas un patient suivi', () => {
    const presente: AccuseConnu = { ...accuseSur('cadre_accompagnement'), type: 'presente' };
    expect(accueilRequis([presente], ouvert)).toBe('conditions');
  });
});
