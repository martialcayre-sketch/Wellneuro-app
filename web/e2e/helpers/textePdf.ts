// Le texte d'un dossier exporté (`src/lib/export-dossier/pdf.ts`), tel qu'il
// est dessiné — sans `pdftotext`, absent du CI.
//
// pdf-lib compresse les flux de page et range les objets en flux d'objets :
// rien ne se lit dans les octets bruts. Le rendu n'emploie que les polices
// standard, qui écrivent chaque fragment en chaîne hexadécimale WinAnsi
// (`<4C61…> Tj`) après son `Tm`. Les fragments de même ordonnée forment une
// ligne : le libellé gras et la valeur d'un champ sont deux fragments.
//
// Lecteur volontairement étroit : une chaîne littérale `(…) Tj` ou un `TJ`
// n'est pas lu. Si le rendu en produisait un jour, le texte attendu manquerait
// et le test rougirait — jamais un faux vert.
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

const WIN_ANSI = new TextDecoder('windows-1252');
const OPERATION = /(?:[-\d.]+\s+){5}([-\d.]+)\s+Tm|<([0-9A-Fa-f]*)>\s*Tj/g;

/** Lignes dessinées, page après page, dans l'ordre du dessin. */
export async function lignesPdf(octets: Uint8Array): Promise<string[]> {
  const pdf = await PDFDocument.load(octets, { updateMetadata: false });
  const lignes: string[] = [];
  for (const page of pdf.getPages()) {
    const contenu = page.node.Contents();
    const flux = contenu instanceof PDFArray ? contenu.asArray() : contenu ? [contenu] : [];
    let y: string | null = null;
    let courante: { y: string | null; texte: string } | null = null;
    for (const f of flux) {
      const brut = pdf.context.lookup(f);
      if (!(brut instanceof PDFRawStream)) continue;
      const operations = Buffer.from(decodePDFRawStream(brut).decode()).toString('latin1');
      for (const m of operations.matchAll(OPERATION)) {
        if (m[1] !== undefined) {
          y = m[1];
          continue;
        }
        const fragment = WIN_ANSI.decode(Buffer.from(m[2], 'hex'));
        if (courante && courante.y === y) courante.texte += fragment;
        else {
          if (courante) lignes.push(courante.texte);
          courante = { y, texte: fragment };
        }
      }
    }
    if (courante) lignes.push(courante.texte);
  }
  // Rien de lu : le rendu a changé de forme (chaînes littérales, `TJ`…). Le
  // dire ici plutôt que de laisser le test échouer sur un texte vide.
  if (lignes.length === 0) {
    throw new Error('Aucun texte lu dans le PDF : le rendu n’écrit plus de chaînes hexadécimales `Tj` (voir textePdf.ts).');
  }
  return lignes;
}
