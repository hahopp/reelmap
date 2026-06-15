import { describe, it, expect } from 'vitest'
import { normalizeInstagramUrl } from './instagram'

describe('normalizeInstagramUrl', () => {
  const cases: [string, string | null][] = [
    ['https://www.instagram.com/p/CabcD_1-2/', 'CabcD_1-2'],
    ['https://instagram.com/reel/XYZ123/?igsh=abc123', 'XYZ123'],
    ['https://www.instagram.com/someuser/reel/XYZ123/', 'XYZ123'],
    ['https://www.instagram.com/someuser/p/Abc123/', 'Abc123'],
    ['https://instagram.com/tv/AbC/', 'AbC'],
    ['http://instagram.com/p/Abc', 'Abc'],
    ['https://www.instagram.com/p/Abc/?utm_source=ig_web_copy_link', 'Abc'],
    ['https://instagr.am/p/Abc/', 'Abc'],
    ['https://m.instagram.com/reels/Zzz9/', 'Zzz9'],
    ['  https://www.instagram.com/p/Trimmed/  ', 'Trimmed'],
    ['https://example.com/p/NotInsta/', null],
    ['https://www.instagram.com/justprofile/', null],
    ['not a url', null],
    ['', null],
  ]

  it.each(cases)('%s', (input, expected) => {
    expect(normalizeInstagramUrl(input)?.postId ?? null).toBe(expected)
  })

  it('shortcode 대소문자를 보존한다', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/p/AbCdEf/')?.postId).toBe('AbCdEf')
  })

  it('다른 게시물은 다른 id 를 준다', () => {
    const a = normalizeInstagramUrl('https://www.instagram.com/p/AAA/')?.postId
    const b = normalizeInstagramUrl('https://www.instagram.com/p/BBB/')?.postId
    expect(a).not.toBe(b)
  })
})
