import { randomBytes } from "crypto";

// Short, copy-paste-friendly invite token. Some email clients (or providers
// that strip HTML down to plain text) wrap long URLs across lines, which breaks
// BOTH auto-linking and copy-paste — the student ends up pasting a truncated
// token and hits "invitation required". So keep the token short and use only
// unambiguous alphanumerics (no - or _, and no look-alike 0/O/1/l/I). The
// resulting /invite/<token> URL is ~42 chars, short enough to stay on one line.
// 14 chars from a 56-char alphabet ≈ 81 bits of entropy — unguessable.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 14;

export function generateInviteToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
