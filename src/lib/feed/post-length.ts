/** Count Unicode code points consistently on the client and server. */
export const POST_MAX_LENGTH = 280;
export function postLength(text: string): number {
  return Array.from(text).length;
}
export function limitPostText(text: string): string {
  return Array.from(text).slice(0, POST_MAX_LENGTH).join("");
}
