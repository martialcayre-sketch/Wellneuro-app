// Export PDF du dossier patient (D-252) — le CORPUS du masqueur : l'oracle.
//
// Il réunit, en deux tables, tous les cas adverses des deux passes de revue du
// lot (1re passe : constats 0 à 8, 20, 26, 27 ; 2e passe : NF0, NF1, N0 à N5,
// N8, N11 à N13). Un cas fermé ne se rouvre pas sans faire rougir ce banc.
//
// (a) FUITES. Un texte libre passe par le VRAI point d'entrée (anamnèse d'une
//     consultation, note d'une synthèse), puis par `versWinAnsi` (jeu
//     Helvetica) : ce que le PDF dessinera. Lu en lettres et chiffres latins
//     seuls, casse et accents effacés, le rendu ne doit plus contenir aucune
//     forme de l'identité. Témoin : sans masque, le même rendu la contient.
// (b) FIDÉLITÉ. Un texte clinique — dose, apport, mesure, date clinique,
//     locution qui ressemble à un nom — ressort INTACT, au caractère près.
//
// Limites écrites, hors de ces tables (le préambule du PDF prévient qu'« un
// identifiant écrit autrement n'est pas détecté ») :
// - un nom stocké soudé cité découpé : « Le Petit » pour « Lepetit », « N'Diaye »
//   pour « Ndiaye » — le chercher effacerait « le petit-déjeuner » ;
// - une date de naissance compacte sur six chiffres (« 140385 ») — elle
//   effacerait des mesures ; seules les huit chiffres exacts sont cherchés ;
// - des séparateurs de plus de trois signes entre deux chiffres, blancs fusionnés
//   (« 06 . . 12 ») ;
// - une adresse citée dans un autre ordre que celui du dossier (« Lyon 69001 »
//   pour « 69001 Lyon »), ou sans code postal avec une ville en plusieurs mots.
//
// Identités de fixture : Sophie Nicola, Jennifer Martin, Dr Michel Dogné ; noms
// d'emprunt manifestement fictifs pour les graphies étrangères et les noms qui
// sont aussi des mots (Petrović, Lepetit, Simon…). Aucun ne désigne un patient.

import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { creerMasqueur, masquerConsultation, masquerPassation, masquerSynthese, plier } from './masquage';
import type { ConsultationExport, PassationExport, PatientExport, SyntheseExport } from './modele';
import { versWinAnsi } from './pdf';

const DOSSIER: PatientExport = {
  idPatient: 'PAT030',
  prenom: 'Sophie',
  nom: 'Nicola',
  dateNaissance: '1985-03-14',
  email: 'sophie.nicola@example.test',
  telephone: '06 12 34 56 78',
  adresse: '12 rue des Lilas 75011 Paris',
  nir: '2 85 03 69 123 456 78',
  medecinTraitantNom: 'Dr Michel Dogné',
  medecinTraitantCoordonnees: 'Cabinet du parc, 01 23 45 67 89, cabinet.parc@example.test',
  actif: true,
  suiviClotureLe: null,
  accessTokenRevoked: false,
  createdAt: new Date('2026-09-01T10:00:00Z'),
};

type Fuite = {
  origine: string;
  dossier?: Partial<PatientExport>;
  texte: string;
  /** Formes de l'identité, en lettres et chiffres latins minuscules seuls. */
  identite: string[];
};

type Fidelite = { origine: string; dossier?: Partial<PatientExport>; texte: string };

// ── (a) FUITES ─────────────────────────────────────────────────────────────

const FUITES: Fuite[] = [
  // Témoins ordinaires.
  { origine: 'témoin', texte: 'Je suis Sophie Nicola, suivie par le Dr Michel Dogné.', identite: ['sophie', 'nicola', 'dogne'] },
  { origine: 'témoin', texte: 'SOPHIE nicola, sophie, NICOLA.', identite: ['sophie', 'nicola'] },
  { origine: 'témoin', texte: 'Écrire à Sophie.Nicola@Example.test.', identite: ['sophie', 'nicola'] },

  // 1re passe, constats 0 et 26 : lettres accentuées hors du français.
  { origine: '1re #0', dossier: { prenom: 'Ana', nom: 'Petrović' }, texte: 'le Dr Petrović m’a adressée', identite: ['petrovic'] },
  { origine: '1re #0', dossier: { prenom: 'Ana', nom: 'Petrović' }, texte: 'PETROVIĆ, Petrovic', identite: ['petrovic'] },
  { origine: '1re #0', dossier: { prenom: 'Thị Hương', nom: 'Nguyễn' }, texte: 'Chère Madame Nguyễn Thị Hương', identite: ['nguyen', 'huong'] },
  { origine: '1re #26', dossier: { prenom: 'Ivana', nom: 'Kovačević' }, texte: 'Je suis Ivana Kovačević, KOVAČEVIĆ.', identite: ['ivana', 'kovacevic'] },
  // « ł » s'imprime « ? » : le lecteur lit « Wa?esa ».
  { origine: '1re #26', dossier: { prenom: 'Ewa', nom: 'Wałęsa' }, texte: 'Je suis Ewa Wałęsa, WAŁĘSA, Walesa.', identite: ['waesa', 'walesa'] },
  { origine: '1re #26', dossier: { prenom: 'Ana', nom: 'Tănase' }, texte: 'Mme Tănase, TĂNASE', identite: ['tanase'] },
  { origine: '1re #26', dossier: { prenom: 'Pál', nom: 'Erdős' }, texte: 'Je suis Pál Erdős, ERDŐS.', identite: ['erdos'] },
  { origine: '1re #0', dossier: { prenom: 'Łukasz', nom: 'Dvořák-Černý' }, texte: 'Dr Dvořák-Černý et Łukasz', identite: ['dvorak', 'cerny', 'ukasz'] },

  // 1re passe, constats 1 et 20 : ce que le rendu efface ou recompose.
  { origine: '1re #1', texte: 'Copie : So\u{AD}phie Ni\u{AD}cola ; Sop\u{200B}hie', identite: ['sophie', 'nicola'] },
  { origine: '1re #1', dossier: { prenom: 'Joffrey', nom: 'Lafitte' }, texte: 'M. La\u{FB01}tte et Jo\u{FB00}rey', identite: ['lafitte', 'joffrey'] },
  { origine: '1re #1', texte: 'Laetitia, Ｎｉｃｏｌａ', identite: ['nicola'] },
  { origine: '1re #20', texte: 'suivie par le Dr Do\u{200B}gné', identite: ['dogne'] },
  { origine: '1re #20', texte: 'Nico\u{200D}la, Dog\u{FEFF}né, Ni\u{200F}cola', identite: ['nicola', 'dogne'] },
  { origine: '1re #20', texte: 'joignable au 06\u{2011}12\u{2011}34\u{2011}56\u{2011}78', identite: ['612345678'] },
  { origine: '1re #20', texte: 'née le 14\u{2011}03\u{2011}1985', identite: ['14031985'] },
  { origine: '1re #20', texte: 'NIR 2\u{2011}85\u{2011}03\u{2011}69\u{2011}123\u{2011}456\u{2011}78', identite: ['285036912345678'] },
  { origine: '1re #20', texte: 'au ０６ １２ ３４ ５６ ７８', identite: ['612345678'] },

  // 1re passe, constats 2, 8 et 27 : téléphones.
  { origine: '1re #2', dossier: { telephone: '0612345678 - 0123456789' }, texte: 'rappeler au 06 12 34 56 78', identite: ['612345678'] },
  { origine: '1re #2', dossier: { telephone: '0612345678 - 0123456789' }, texte: 'fixe 01.23.45.67.89', identite: ['123456789'] },
  { origine: '1re #2', texte: 'tél +33 (0)6 12 34 56 78', identite: ['612345678'] },
  { origine: '1re #2', texte: 'tél 06/12/34/56/78, (+33) 6 12 34 56 78', identite: ['612345678'] },
  { origine: '1re #8', dossier: { telephone: '+33 (0)6 12 34 56 78' }, texte: 'Joignable au +33 (0)6 12 34 56 78', identite: ['612345678'] },
  { origine: '1re #8', dossier: { telephone: '06/12/34/56/78' }, texte: 'Joignable au 06 12 34 56 78', identite: ['612345678'] },
  { origine: '1re #8', dossier: { medecinTraitantCoordonnees: 'Cabinet, tél. 04/78/00/00/00' }, texte: 'Mon médecin : 04 78 00 00 00', identite: ['478000000'] },
  { origine: '1re #27', dossier: { telephone: '06 12 34 56 78 - 04 78 99 88 77' }, texte: 'Portable 0612345678, fixe 0478998877', identite: ['612345678', '478998877'] },
  { origine: '1re #27', dossier: { medecinTraitantCoordonnees: 'Cabinet, Lyon 69006\n04 78 00 11 22' }, texte: 'Médecin au 0478001122, ou 04.78.00.11.22', identite: ['478001122'] },
  { origine: '1re #27', dossier: { medecinTraitantCoordonnees: '04 78 00 11 22\n12 avenue Foch 69006 Lyon' }, texte: 'Médecin au 0478001122', identite: ['478001122'] },

  // 1re passe, constat 3 : date de naissance, année courte, espaces.
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12/03/80', identite: ['120380'] },
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12.03.80', identite: ['120380'] },
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12 mars 80', identite: ['12mars80'] },
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12 03 1980', identite: ['12031980'] },
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12 / 03 / 1980', identite: ['12031980'] },
  { origine: '1re #3', dossier: { dateNaissance: '1980-03-12' }, texte: 'née le 12-mars-1980', identite: ['12mars1980'] },

  // 1re passe, constat 4, et 2e passe, N4 : adresses.
  { origine: '1re #4', texte: 'j’habite au 12 rue des Lilas', identite: ['lilas'] },
  { origine: '1re #4', texte: 'installée à 75011 Paris', identite: ['75011'] },
  { origine: 'N4', texte: 'au 12, rue des Lilas, 75011 Paris', identite: ['lilas', '75011'] },
  { origine: 'N4', dossier: { adresse: '12 rue des Lilas Paris' }, texte: 'j’habite au 12 rue des Lilas', identite: ['lilas'] },
  { origine: 'N4', dossier: { adresse: '12 rue des Lilas 75011 Paris Cedex 11' }, texte: 'à 75011 Paris', identite: ['75011'] },
  { origine: 'N4', dossier: { adresse: '75011 Paris 12 rue des Lilas' }, texte: 'au 12 rue des Lilas, à 75011 Paris', identite: ['lilas', '75011'] },
  { origine: 'N4', dossier: { medecinTraitantCoordonnees: 'Cabinet 3 avenue Foch Lyon' }, texte: 'Médecin au 3 avenue Foch', identite: ['foch'] },

  // 1re passe, constat 5, et 2e passe, NF0 : e-mail du médecin et sa ponctuation.
  { origine: '1re #5', dossier: { medecinTraitantCoordonnees: 'Tél 01 23 45 67 89. Mail : cabinet.tilleuls@example.fr.' }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },
  { origine: '1re #5', dossier: { medecinTraitantCoordonnees: 'mail:cabinet.tilleuls@example.fr' }, texte: 'écrire à CABINET.TILLEULS@EXAMPLE.FR.', identite: ['tilleuls'] },
  { origine: 'NF0', dossier: { medecinTraitantCoordonnees: "Mail : 'cabinet.tilleuls@example.fr'" }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },
  { origine: 'NF0', dossier: { medecinTraitantCoordonnees: "Mail:'cabinet.tilleuls@example.fr'" }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },
  { origine: 'NF0', dossier: { medecinTraitantCoordonnees: 'Mail : cabinet.tilleuls@example.fr.Tél 01 23 45 67 89' }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },
  { origine: 'NF0', dossier: { medecinTraitantCoordonnees: 'Mail : cabinet.tilleuls@example.fr-Tél 01 23 45 67 89' }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },
  { origine: 'NF0', dossier: { medecinTraitantCoordonnees: 'mél.cabinet.tilleuls@example.fr' }, texte: 'Le Dr m’a écrit à cabinet.tilleuls@example.fr hier', identite: ['tilleuls'] },

  // 1re passe, constat 6 : forme soudée d'un nom stocké avec particule.
  { origine: '1re #6', dossier: { prenom: 'Awa', nom: "N'Diaye" }, texte: 'Mme Ndiaye, NDiaye', identite: ['diaye'] },
  { origine: '1re #6', dossier: { prenom: 'Luca', nom: "D'Angelo" }, texte: 'M. Dangelo', identite: ['angelo'] },
  { origine: '1re #6', dossier: { nom: 'Du Pont' }, texte: 'Mme Dupont dort mal', identite: ['dupont'] },
  { origine: '1re #6', dossier: { prenom: 'Zoé', nom: 'de La Fontaine' }, texte: 'Mme LAFONTAINE', identite: ['fontaine'] },

  // 2e passe, N0 : séparateurs larges, que le composeur réduit à un espace.
  { origine: 'N0', texte: 'tél 06    12    34    56    78', identite: ['612345678'] },
  { origine: 'N0', texte: 'tél 06  -  12  -  34  -  56  -  78', identite: ['612345678'] },
  { origine: 'N0', texte: 'tél 06\u{A0}\u{A0}-\u{A0}\u{A0}12\u{A0}\u{A0}-\u{A0}\u{A0}34\u{A0}\u{A0}-\u{A0}\u{A0}56\u{A0}\u{A0}-\u{A0}\u{A0}78', identite: ['612345678'] },
  { origine: 'N0', texte: 'NIR 2  -  85  -  03  -  69  -  123  -  456  -  78', identite: ['285036912345678'] },
  { origine: 'N0', texte: 'NIR 2    85    03    69    123    456    78', identite: ['285036912345678'] },
  { origine: 'N0', dossier: { telephone: '06    12    34    56    78' }, texte: 'tél 06 12 34 56 78', identite: ['612345678'] },

  // 2e passe, N1 : nom collé à un pictogramme texte ou à une autre écriture.
  { origine: 'N1', texte: 'Merci♥Sophie', identite: ['sophie'] },
  { origine: 'N1', texte: 'Bisous☺Nicola', identite: ['nicola'] },
  { origine: 'N1', texte: 'Photo©Nicola', identite: ['nicola'] },
  { origine: 'N1', texte: 'Nicola™Sophie', identite: ['nicola', 'sophie'] },
  { origine: 'N1', texte: 'appel☎Nicola', identite: ['nicola'] },
  { origine: 'N1', texte: 'Merci❤\u{FE0F}Sophie', identite: ['sophie'] },
  { origine: 'N1', texte: '我的医生是Dogné医生', identite: ['dogne'] },
  { origine: 'N1', texte: 'Nicolaさん', identite: ['nicola'] },
  { origine: 'N1', texte: 'докторDogné', identite: ['dogne'] },
  { origine: 'N1', texte: 'شكراSophie', identite: ['sophie'] },

  // 2e passe, N8 : pictogramme entre deux mots, que le rendu translittère.
  { origine: 'N8', texte: 'Sophie➡Nicola', identite: ['sophie', 'nicola'] },
  { origine: 'N8', texte: 'maman➡Sophie', identite: ['sophie'] },
  { origine: 'N8', texte: 'Sophie↔Nicola', identite: ['sophie', 'nicola'] },
  { origine: 'N8', texte: 'Sophie✖Nicola, Sophie☑Nicola', identite: ['sophie', 'nicola'] },
  { origine: 'N8', texte: 'Sophie✔Nicola, Sophie↕Nicola', identite: ['sophie', 'nicola'] },
  { origine: 'N8', texte: 'Sophie😀Nicola', identite: ['sophie', 'nicola'] },
  { origine: 'N8', texte: 'Dogné➡Bellecour', identite: ['dogne'] },

  // 2e passe, N11 : pictogramme ou invisible entre le nom et un mot voisin.
  { origine: 'N11', texte: 'Appeler Sophie↔RDV', identite: ['sophie'] },
  { origine: 'N11', texte: 'Sophie➡kiné', identite: ['sophie'] },
  { origine: 'N11', texte: 'RDV☎Nicola', identite: ['nicola'] },
  { origine: 'N11', texte: 'Mme Nicola©2024', identite: ['nicola'] },
  { origine: 'N11', texte: 'le▶Sophie', identite: ['sophie'] },
  { origine: 'N11', texte: 'x☑Nicola', identite: ['nicola'] },
  { origine: 'N11', texte: 'Mme\u{200B}Nicola', identite: ['nicola'] },
  { origine: 'N11', texte: 'Sophie😀merci', identite: ['sophie'] },
  { origine: 'N11', texte: 'Sophie👩\u{200D}⚕\u{FE0F}merci', identite: ['sophie'] },
  { origine: 'N11', texte: 'Nicola👍🏽merci, Sophie🇫🇷Nicola', identite: ['sophie', 'nicola'] },

  // 2e passe, N2 et N12 : les dates de naissance, séparateur exigé.
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'née le 1/5/00', identite: ['1500'] },
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'née le 01/05/2000', identite: ['01052000'] },
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'née le 01052000', identite: ['01052000'] },
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'née le 1er mai 2000', identite: ['1ermai2000'] },
  { origine: 'N2', dossier: { dateNaissance: '1985-03-07' }, texte: 'née le 7/3/85, le 07031985', identite: ['7385', '07031985'] },
  { origine: 'N2', texte: 'née le 14•03•85, le 14 mars, 1985', identite: ['140385', '14mars1985'] },
  { origine: 'N2', dossier: { dateNaissance: '1975-02-05' }, texte: 'née le 5 févr. 1975', identite: ['5fevr1975'] },
];

// ── (b) FIDÉLITÉ ───────────────────────────────────────────────────────────

const FIDELITE: Fidelite[] = [
  // N2 et N12 : doses, apports et mesures qui partagent les chiffres de la naissance.
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: '1500 mg de magnésium le soir' },
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'objectif 1500 kcal' },
  { origine: 'N12', dossier: { dateNaissance: '2000-05-01' }, texte: 'pause de 15 00 min' },
  { origine: 'N12', dossier: { dateNaissance: '2000-02-01' }, texte: '1200 kcal par jour' },
  { origine: 'N12', dossier: { dateNaissance: '2000-02-01' }, texte: '1 200 kcal' },
  { origine: 'N12', dossier: { dateNaissance: '1980-02-01' }, texte: '1280 kcal, 12 80' },
  { origine: 'N12', texte: '14385 pas' },
  { origine: 'N2', dossier: { dateNaissance: '1985-03-07' }, texte: 'Poids actuel : 73,85 kg' },
  { origine: 'N2', dossier: { dateNaissance: '1985-03-07' }, texte: 'Poids 73.85 kg' },
  { origine: 'N2', dossier: { dateNaissance: '1980-03-12' }, texte: 'Plaquettes 120380 /mm3' },
  { origine: 'N2', dossier: { dateNaissance: '1990-01-01' }, texte: 'Note 11/90' },
  { origine: 'N2', dossier: { dateNaissance: '1990-07-04' }, texte: '4790 pas/jour' },

  // Dates cliniques : D-252 §2 les garde.
  { origine: '1re #3', texte: 'en 1985, puis le 15/03/1985 et le 14/03/1986' },
  { origine: 'N2', dossier: { dateNaissance: '2003-01-02' }, texte: 'Bilan du 21/03/2026, revu le 21/03' },
  { origine: 'N2', dossier: { dateNaissance: '2005-06-01' }, texte: 'Rendez-vous le 16/05/2026' },
  { origine: 'N2', dossier: { dateNaissance: '2004-01-01' }, texte: 'Consultation du 11/04/2026' },
  { origine: 'N12', texte: 'IMC 25 kg/m², 72.5 kg, 10/20 en 2020' },

  // N3 et N13 : un nom stocké soudé ne se cherche jamais découpé.
  { origine: 'N3', dossier: { nom: 'Lepetit' }, texte: 'Je saute le petit-déjeuner' },
  { origine: 'N13', dossier: { prenom: 'Simon' }, texte: 'je ne sais pas si mon traitement convient' },
  { origine: 'N13', dossier: { nom: 'Lebas' }, texte: 'douleurs dans le bas du dos' },
  { origine: 'N13', dossier: { nom: 'Dupain' }, texte: 'du pain complet au dîner' },
  { origine: 'N3', dossier: { nom: 'Legrand' }, texte: 'le grand-père paternel était diabétique' },
  { origine: 'N3', dossier: { nom: 'Leblanc' }, texte: 'préfère le blanc de poulet' },
  { origine: 'N3', dossier: { nom: 'Lecoeur' }, texte: 'le cœur bat vite la nuit' },
  { origine: 'N3', dossier: { nom: 'Laporte' }, texte: 'laisse la porte ouverte' },
  { origine: 'N3', dossier: { nom: 'Dubois' }, texte: 'chauffage du bois, toux le matin' },
  { origine: 'N13', dossier: { nom: 'Leboeuf' }, texte: 'il mange le bœuf haché' },
  { origine: 'N13', dossier: { nom: 'Lebon' }, texte: 'ce n’est pas le bon moment' },
  { origine: 'N13', dossier: { nom: 'Delage' }, texte: 'fatigue à cause de l’âge' },
  { origine: 'N13', dossier: { nom: 'Lenfant' }, texte: 'l’enfant ne mange pas de légumes' },
  { origine: 'N13', dossier: { prenom: 'Jeanne' }, texte: 'Jean ne mange pas' },
  { origine: 'N13', dossier: { nom: 'Lamarche' }, texte: 'la marche quotidienne' },
  { origine: 'N13', dossier: { nom: 'Leveau' }, texte: 'le veau et le poulet' },
  { origine: '1re #6', dossier: { prenom: 'Anne' }, texte: 'un an ne suffit pas' },
  { origine: '1re #6', dossier: { nom: 'Delafontaine' }, texte: 'de la fatigue, la fontaine' },
  { origine: '1re #6', dossier: { nom: 'de La Fontaine' }, texte: 'de la fatigue, des réveils' },
  { origine: 'N3', texte: 'pain blanc au petit-déjeuner' },

  // Civilités, fonctions et mots qui contiennent le nom sans frontière.
  { origine: '1re #28', texte: 'Madame, Monsieur, Docteur, Dr, Pr' },
  { origine: '1re #28', texte: 'Sophiestication, Nicolas, Michelle, Dognéville' },
  { origine: '1re #28', texte: 'Sophie2 et 2Sophie' },
  { origine: '1re #28', dossier: { medecinTraitantNom: 'Dr Michel Dogné, médecin généraliste' }, texte: 'À évoquer avec le médecin traitant ou un généraliste.' },

  // Numéros voisins du téléphone ou du NIR, sans l'être.
  { origine: '1re #2', texte: 'réf. 06123456789' },
  { origine: '1re #2', dossier: { telephone: '1234567' }, texte: 'code 1234567' },
  { origine: '1re #2', dossier: { nir: '123456789' }, texte: 'lot 123456789' },

  // Adresses voisines de celle du dossier.
  { origine: 'N4', dossier: { adresse: '12 rue des Lilas' }, texte: 'au 12 rue des Roses' },
  { origine: 'N4', texte: 'je travaille rue des Roses' },
  { origine: '1re #4', dossier: { adresse: 'Lyon' }, texte: 'Né à Lyon' },
  { origine: 'NF0', texte: 'écrire à cabinet.autre@example.fr' },

  // Signes et pictogrammes cliniques, sans identité à côté.
  { origine: 'N9', texte: 'Vitamine D ✅, magnésium ❌, lactose 🚫' },
  { origine: 'N9', texte: '3➕4, recotation 1↔4, 2↔3' },
  { origine: '1re #21', texte: 'axe intestin ↔ cerveau, score ⩾ 3' },
  { origine: '1re #21', texte: 'T° 38,5 ; lymphocytes 1,2 × 10⁹/L ; dose ⅓ comprimé' },
  { origine: '1re #22', texte: '☑ fait, √ fait, ✖ arrêté' },
  { origine: 'témoin', texte: 'Fatigue le matin, sommeil fragmenté ; « score 12 » — 21 jours. Ｅｔ \u{FB01}n\u{AD}.' },
];

// ── Le banc ────────────────────────────────────────────────────────────────

// Jeu WinAnsi d'une police standard : ce que le PDF saura dessiner.
let jeu: ReadonlySet<number>;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  jeu = new Set(police.getCharacterSet());
});

/** Ce qu'un lecteur du PDF lirait, réduit aux lettres et chiffres latins, casse et accents effacés. */
function lu(texte: string): string {
  return plier(versWinAnsi(texte, jeu)).plie.replace(/[^a-z0-9]/g, '');
}

function consultation(texte: string): ConsultationExport {
  return {
    idConsultation: 'CONS_1',
    statut: 'validee',
    motif: null,
    createdAt: new Date('2026-08-01T09:00:00Z'),
    dateValidation: null,
    consentement: 'donne',
    consentementHorodatage: null,
    consentementVersion: 'v1',
    finaliteConsentement: null,
    ficheSignaletique: null,
    anamnese: { motif_principal: texte },
  };
}

function synthese(texte: string): SyntheseExport {
  return {
    idSynthese: 'SYN_1',
    statut: 'Validee_Praticien',
    dateGeneration: new Date('2026-09-15T09:00:00Z'),
    dateValidation: null,
    modele: 'modele-ia-fictif',
    syntheseJson: { resume_praticien: texte },
    notesPraticien: texte,
    avertissementMesureRetiree: null,
  };
}

/** Le texte, masqué par chacun des points d'entrée d'un texte libre. */
function masques(texte: string, dossier: Partial<PatientExport> = {}): string[] {
  const masquer = creerMasqueur({ ...DOSSIER, ...dossier });
  const c = masquerConsultation(consultation(texte), masquer);
  const s = masquerSynthese(synthese(texte), masquer);
  return [
    String(c.anamnese?.motif_principal),
    String((s.syntheseJson as { resume_praticien: string }).resume_praticien),
    String(s.notesPraticien),
  ];
}

describe('corpus du masqueur — (a) aucune forme de l’identité ne subsiste dans le rendu', () => {
  it('réunit au moins quatre-vingts cas', () => {
    expect(FUITES.length + FIDELITE.length).toBeGreaterThanOrEqual(80);
  });

  it.each(FUITES.map(cas => [cas.origine, cas.texte, cas] as const))('%s — %s', (_origine, _texte, cas) => {
    // Témoin : sans masque, le PDF imprimerait l'identité.
    for (const forme of cas.identite) expect(lu(cas.texte), `témoin ${forme}`).toContain(forme);
    for (const masque of masques(cas.texte, cas.dossier)) {
      for (const forme of cas.identite) expect(lu(masque), `${forme} dans ${JSON.stringify(masque)}`).not.toContain(forme);
    }
  });
});

describe('corpus du masqueur — (b) le texte clinique ressort intact', () => {
  it.each(FIDELITE.map(cas => [cas.origine, cas.texte, cas] as const))('%s — %s', (_origine, _texte, cas) => {
    for (const masque of masques(cas.texte, cas.dossier)) expect(masque).toBe(cas.texte);
  });
});

// ── Clés de réponses (N5) : hors définition, un texte libre comme un autre ──

describe('corpus du masqueur — clés de réponses hors définition', () => {
  const passation = (rawAnswers: Record<string, unknown>): PassationExport => ({
    idReponse: 'R1',
    idQuestionnaire: 'Q_FICTIF',
    titre: 'Questionnaire fictif',
    dateReponse: new Date('2026-09-10T09:00:00Z'),
    scores: { type: 'sum', rawAnswers },
    scorePrincipal: null,
    interpretation: null,
    statutValidite: 'VALID',
    invalideLe: null,
    motifInvalidation: null,
    nonInterpretable: null,
    definition: {
      id: 'Q_FICTIF',
      titre: 'Questionnaire fictif',
      sections: [{ id: 'A', titre: 'A', questions: [{ id: 'A1', texte: 'Question', type: 'number' }] }],
    },
    definitionRetiree: false,
    courante: true,
  });

  it.each([
    [{ A1: 1, Sophie_Nicola: 1 }, ['sophie', 'nicola']],
    [{ A1: 1, 'Sophie Nicola 06 12 34 56 78': 1 }, ['sophie', 'nicola', '612345678']],
    [{ A1: 1, EXTRA: { 'Sophie Nicola': 1 } }, ['sophie', 'nicola']],
    [{ A1: 1, 'sophie.nicola@example.test': 'x' }, ['sophie', 'nicola']],
  ] as Array<[Record<string, unknown>, string[]]>)('%j', (rawAnswers, identite) => {
    const masquee = masquerPassation(passation(rawAnswers), creerMasqueur(DOSSIER));
    const rendu = JSON.stringify(masquee.scores?.rawAnswers);
    for (const forme of identite) {
      expect(lu(JSON.stringify(rawAnswers)), `témoin ${forme}`).toContain(forme);
      expect(lu(rendu), forme).not.toContain(forme);
    }
    // L'identifiant de question, lui, reste.
    expect(masquee.scores?.rawAnswers).toHaveProperty('A1', 1);
  });
});
