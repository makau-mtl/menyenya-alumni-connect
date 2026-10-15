// Human-readable references (SPEC §5.4). Pledges: MSA-YYYY-NNNNNN. Donations: MSA-D-YYYY-NNNNNN.
// The pledge reference is what the giver types as the Paybill account number.
// In the database these come from a Postgres sequence, so they never repeat.

export function pledgeReference(year: number, sequence: number): string {
  return `MSA-${year}-${pad(sequence)}`;
}

export function donationReference(year: number, sequence: number): string {
  return `MSA-D-${year}-${pad(sequence)}`;
}

function pad(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new RangeError("Sequence must be a whole number from 1 to 999999");
  }
  return sequence.toString().padStart(6, "0");
}

const PATTERN = /^MSA-(D-)?\d{4}-\d{6}$/;

export function isReference(value: string): boolean {
  return PATTERN.test(value);
}
