import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { guides } from "./content";

/** Generate original short guides locally; no third-party document is copied. */
export async function writeGuides(): Promise<number[]> {
  const dir = path.join(process.cwd(), "public", "seed-assets");
  await mkdir(dir, { recursive: true });
  const sizes: number[] = [];
  for (const [index, guide] of guides.entries()) {
    const pdf = await PDFDocument.create();
    pdf.setCreationDate(new Date("2025-01-01T00:00:00Z")); pdf.setModificationDate(new Date("2025-01-01T00:00:00Z"));
    pdf.setTitle(guide.title); pdf.setSubject("Local development fixture, not a verified publication");
    const page = pdf.addPage([595, 842]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText("GETPIDIEF / LOCAL DEMO", { x: 50, y: 790, size: 10, font: bold, color: rgb(.18, .4, .28) });
    page.drawText(guide.title, { x: 50, y: 750, size: 19, font: bold });
    page.drawText("An original practice note for development and review.", { x: 50, y: 720, size: 11, font: regular });
    guide.lines.forEach((line, i) => page.drawText(`${i + 1}. ${line}`, { x: 50, y: 675 - i * 35, size: 11, font: regular, maxWidth: 495 }));
    page.drawText("Further reading (external source):", { x: 50, y: 495, size: 11, font: bold });
    page.drawText(guide.source, { x: 50, y: 475, size: 9, font: regular, maxWidth: 495 });
    page.drawText("Demo content. Read the original source for authoritative details.", { x: 50, y: 60, size: 9, font: regular, color: rgb(.35, .35, .35) });
    const data = await pdf.save(); sizes.push(data.length);
    const target = path.join(dir, `guide-${String(index + 1).padStart(2, "0")}.pdf`);
    try { await writeFile(target, data, { flag: "wx" }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await readFile(target);
      if (!Buffer.from(data).equals(existing)) throw new Error(`Existing file ${target} differs from the fixture. It was not overwritten.`);
    }
  }
  return sizes;
}
