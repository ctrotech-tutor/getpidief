/** ROR v2 is an external directory, not a source of affiliation verification. */
import { z } from "zod";

const ROR_ID = /^0[a-hj-km-np-tv-z0-9]{6}[0-9]{2}$/;
const recordSchema = z.object({
  id: z.string().regex(/^https:\/\/ror\.org\/0[a-hj-km-np-tv-z0-9]{6}[0-9]{2}$/),
  status: z.literal("active"),
  types: z.array(z.string()).refine(types => types.includes("education")),
  names: z.array(z.object({ value: z.string().trim().min(1).max(255), types: z.array(z.string()) })),
  locations: z.array(z.object({ geonames_details: z.object({ country_code: z.string().regex(/^[A-Z]{2}$/), country_name: z.string().trim().min(1).max(100) }).nullable() })),
});
export type RorInstitution = { id: string; name: string; country: string; countryCode: string };

function normalize(data: unknown): RorInstitution | null {
  const parsed = recordSchema.safeParse(data);
  if (!parsed.success) return null;
  const display = parsed.data.names.find(n => n.types.includes("ror_display"));
  const location = parsed.data.locations.find(l => l.geonames_details)?.geonames_details;
  if (!display || !location) return null;
  return { id: parsed.data.id.slice("https://ror.org/".length), name: display.value, country: location.country_name, countryCode: location.country_code };
}
async function request(path: string): Promise<unknown> {
  const response = await fetch(`https://api.ror.org/v2/organizations${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(3500),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Institution directory unavailable (${response.status})`);
  return response.json();
}
/** Failures are surfaced to the caller so local results and skipping remain usable. */
export async function searchRor(query: string): Promise<RorInstitution[]> {
  const params = new URLSearchParams({ query: query.slice(0, 100), filter: "types:education" });
  const response = await request(`?${params}`);
  const items = z.object({ items: z.array(z.unknown()).max(100) }).parse(response).items;
  return items.map(normalize).filter((item): item is RorInstitution => item !== null).slice(0, 10);
}
/** Only a validated identifier is used in a fixed-host request; never trust submitted names. */
export async function getRor(id: string): Promise<RorInstitution | null> {
  if (!ROR_ID.test(id)) return null;
  const record = normalize(await request(`/${id}`));
  return record?.id === id ? record : null;
}
