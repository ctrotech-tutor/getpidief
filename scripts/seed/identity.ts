import { createHash } from "node:crypto";

/** Stable IDs allow future fixtures to refer to a known demo account or post. */
export function fixtureId(kind: string, index: number): string {
  const bytes = createHash("sha256").update(`getpidief-local-seed-v1:${kind}:${index}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const names = [
  "Amara Okafor", "David Mensah", "Aisha Bello", "Chidi Nwosu", "Zara Ahmed", "Kofi Owusu", "Maya Chen", "Daniel Kim", "Fatima Yusuf", "Leo Martins",
  "Nia Williams", "Samuel Adeyemi", "Leila Hassan", "Amina Diallo", "Noah Patel", "Grace Mwangi", "Mina Park", "Tariq Ali", "Lena Fischer", "Ife Adebayo",
  "Mateo Silva", "Hana Ito", "Sofia Rossi", "Omar Farouk", "Chloe Martin", "Thandi Mokoena", "Ethan Brown", "Anika Shah", "Kwame Boateng", "Nora Ibrahim",
  "Priya Rao", "Lucas Costa", "Abena Asante", "Yara Haddad", "Kenji Sato", "Zainab Musa", "Diego Cruz", "Mariam Kamara", "Eva Mensah", "Arjun Mehta",
  "Layla Said", "Emeka Obi", "Lina Nguyen", "Njeri Wanjiku", "Jonah Reed", "Ibrahim Sani", "Ava Thompson", "Tomi Akin", "Elena Petrova", "Sana Rahman",
];
export function account(index: number) {
  const number = String(index + 1).padStart(2, "0");
  return { id: fixtureId("user", index), email: `learner${number}@example.test`, username: `demo_learner${number}`, name: `${names[index]} (Demo)` };
}
