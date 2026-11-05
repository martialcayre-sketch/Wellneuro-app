// Lecture d'une décision du registre par les bancs (D-418 §5).
//
// Depuis D-418, une décision vit dans `docs/decisions/D-NNN.md` (archivée :
// `docs/decisions/archivees/D-NNN.md`), première ligne `# D-NNN — <titre>`.
// Les bancs qui relisent un texte opposable dans le registre passent par ici :
// une décision introuvable LÈVE, jamais une chaîne vide qui ferait passer un
// `toContain` négatif ou un découpage vide.
//
// Réservé aux tests : lecture disque, chemins relatifs au dépôt. Aucun code
// applicatif ne lit le registre.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPERTOIRE = path.resolve(__dirname, '../../../../docs/decisions');
const ARCHIVES = path.join(REPERTOIRE, 'archivees');
const NOM = /^D-(\d{3,})\.md$/;

const nomDecision = (n: number) => `D-${String(n).padStart(3, '0')}`;

/** Le numéro d'un identifiant `D-418` ou `418`, sinon lève. */
function numeroDe(id: string): number {
  const m = /^(?:D-)?(\d+)$/i.exec(id.trim());
  if (!m) throw new Error(`identifiant de décision illisible : ${id}`);
  return Number.parseInt(m[1], 10);
}

/** Le texte d'une décision, active ou archivée ; lève si elle est absente. */
export function lireDecision(id: string): string {
  const nom = `${nomDecision(numeroDe(id))}.md`;
  for (const dossier of [REPERTOIRE, ARCHIVES]) {
    const chemin = path.join(dossier, nom);
    if (existsSync(chemin)) return readFileSync(chemin, 'utf8');
  }
  throw new Error(`${nomDecision(numeroDe(id))} absente de docs/decisions/`);
}

/**
 * Toutes les décisions, du plus récent au plus ancien ; lève si le registre
 * est introuvable ou vide.
 */
export function lireToutesDecisions(): { id: string; texte: string }[] {
  if (!existsSync(REPERTOIRE)) throw new Error('docs/decisions/ introuvable');
  const lire = (dossier: string) =>
    existsSync(dossier)
      ? readdirSync(dossier)
          .map(nom => [nom, NOM.exec(nom)] as const)
          .filter(([nom, m]) => m !== null && `${nomDecision(Number.parseInt(m[1], 10))}.md` === nom)
          .map(([nom, m]) => ({
            numero: Number.parseInt(m![1], 10),
            id: nomDecision(Number.parseInt(m![1], 10)),
            texte: readFileSync(path.join(dossier, nom), 'utf8'),
          }))
      : [];
  const toutes = [...lire(REPERTOIRE), ...lire(ARCHIVES)].sort((a, b) => b.numero - a.numero);
  if (toutes.length === 0) throw new Error('aucune décision lue dans docs/decisions/');
  return toutes.map(({ id, texte }) => ({ id, texte }));
}
