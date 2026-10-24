export function sanitizePlainText(value: string, maxLength = 500): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && code >= 32 && code !== 127;
    })
    .slice(0, maxLength)
    .join('');
}
