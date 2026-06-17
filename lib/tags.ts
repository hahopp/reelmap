/** "#키즈 #수도권, 풀타프존" → ['키즈','수도권','풀타프존'] (# 제거·공백/콤마 분리·중복 제거) */
export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((s) => s.replace(/^#+/, '').trim())
        .filter(Boolean),
    ),
  )
}
