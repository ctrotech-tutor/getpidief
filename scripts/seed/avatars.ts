import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Copy bundled CC0 stock portraits into the ignored local-only public fixture directory. */
export async function writeAvatars(count: number) {
  const targetDir = path.join(process.cwd(), "public", "seed-assets", "avatars");
  await mkdir(targetDir, { recursive: true });
  for (let i = 1; i <= count; i++) {
    const name = `${String(i).padStart(2, "0")}.jpg`;
    const source = await readFile(path.join(process.cwd(), "scripts", "seed", "avatars", name));
    const target = path.join(targetDir, name);
    try { await writeFile(target, source, { flag: "wx" }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!source.equals(await readFile(target))) throw new Error(`Existing file ${target} differs from the fixture. It was not overwritten.`);
    }
  }
}
export function seedAvatarUrl(index: number) {
  return `/seed-assets/avatars/${String(index + 1).padStart(2, "0")}.jpg`;
}
