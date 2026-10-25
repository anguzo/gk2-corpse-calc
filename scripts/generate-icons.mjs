import { mkdir, writeFile } from 'node:fs/promises'

// Original 16px pixel illustrations drawn for Corpse Ledger, not traced from game art.
// Copyright (c) 2026 Andrei Gužovski. MIT License (see ../LICENSE).
const outline = '#29251f'
const shapes = {
  skull: [
    '.....######.....', '...##aaaaaa##...', '..#aaabbbbaaa#..', '..#abbbbbbbba#..',
    '.#abbbbbbbbbba#.', '.#abb##bb##bba#.', '.#abb##bb##bba#.', '.#abbbbaabbbba#.',
    '..#abb#bb#bba#..', '...#abbbbbba#...', '....#ababab#....', '....#ababab#....',
    '.....######.....', '................', '................', '................',
  ],
  heart: [
    '.......##.......', '....###ab#......', '...#babba#......', '..#bbbbba##.....',
    '.#bbccbbbaa#....', '#bbccbbbbbba#...', '#bbccbbbbbbba#..', '#bbbbbbaabbba#..',
    '.#bbbbbaabbba#..', '..#bbbbaabba#...', '...#bbbbabba#...', '....#bbaaba#....',
    '.....#aaba#.....', '......#aa#......', '.......##.......', '................',
  ],
  brain: [
    '................', '.....######.....', '...##bbabbc##...', '..#babbabbcba#..',
    '.#bbabbbabbbca#.', '.#babaaabaaaba#.', '#bbabbbabbcbaba#', '#baabababcbabca#',
    '#bbbabbaaabbbba#', '.#bbabbbabbbba#.', '..#aaabaaabaa#..', '...##aaaaaa##...',
    '.....######.....', '................', '................', '................',
  ],
  guts: [
    '................', '..############..', '.#bbbbaaaabbbb#.', '.#b##bb##bb##b#.',
    '.#b#.#b#.#b#.#b#', '.#b###b###b###b#', '.#bbbbbbaabbbbb#', '..###b######b#..',
    '.#bbbbbbaabbbb#.', '.#b##bb##bb##b#.', '.#b#.#b#.#b#.#b#', '.#b###b###b###b#',
    '.#bbbbbaaabbbbb#', '..############..', '................', '................',
  ],
  skin: [
    '................', '..###.....###...', '..#ba##.##ab#...', '...#bbaaabb#....',
    '..#bbbbbbbbb#...', '.#bbccbbbbcbb#..', '#abccbbbbbcbba#.', '#abbbbbbbbbbba#.',
    '.##abbbbbbaa##..', '...#bbbbbbb#....', '...#bbbaabb#....', '..#bbaaabbb#....',
    '..#ba###aab#....', '...##...###.....', '................', '................',
  ],
  bone: [
    '............##..', '...........#bb#.', '..........#bbb#.', '..........#baa#.',
    '.........#bb##..', '........#bb#....', '.......#bb#.....', '......#bb#......',
    '.....#bb#.......', '....#bb#........', '..##bb#.........', '.#bbab#.........',
    '#bbbaa#.........', '#bbaa#..........', '.####...........', '................',
  ],
  flesh: [
    '................', '................', '....#######.....', '..##bbbbbbb##...',
    '.#bbcccccccbba#.', '#bbccbbbbbbcbba#', '#bcbbccbbbcbbba#', '#bcbbbccccbbbba#',
    '#bbcbbbbbbccbba#', '.#bbcccccccbba#.', '..##bbbbbbbaa#..', '....#######a#...',
    '...........#....', '................', '................', '................',
  ],
  body: [
    '................', '................', '..###...........', '.#bba#..........',
    '.#bba#.#####....', '..###.#bcccba#..', '.....#bcccccba#.', '.#####bcccccba#.',
    '#bbbbbbcccbbba#.', '#aaaaabbbbbbaa#.', '.#############..', '...#bb#..#bb#...',
    '...#aa#..#aa#...', '....##....##....', '................', '................',
  ],
  bag: [
    '................', '.....######.....', '....#abbbba#....', '....#a####a#....',
    '..###aaaaaa###..', '.#bbbbbbbbbbba#.', '.#bccccccccbba#.', '.#bcbbbbbbcbba#.',
    '.#bcbbccbbcbba#.', '.#bcbbccbbcbba#.', '.#bcbbbbbbcbba#.', '.#bccccccccbba#.',
    '.#bbbbbbbbbbba#.', '..############..', '................', '................',
  ],
  bottle: [
    '......####......', '.....#aaaa#.....', '.....#bbbb#.....', '......#bb#......',
    '......#bb#......', '.....#bcca#.....', '....#bcccba#....', '...#bccccbba#...',
    '...#bccccbba#...', '...#bbbbbbba#...', '...#bacccaba#...', '...#bacccaba#...',
    '...#bbbbbbba#...', '....#aaaaaa#....', '.....######.....', '................',
  ],
  scroll: [
    '................', '..###########...', '.#bbbbbbbbbba#..', '.#bccbbbbbbba#..',
    '..##bbbbbbba#...', '...#bccccbba#...', '...#bbbbbbba#...', '...#bccccbba#...',
    '...#bbbbbbba#...', '...#bccccbba#...', '...#bbbbbbba#...', '..##bbbbbbba##..',
    '.#bbbbbbbbbbaa#.', '..############..', '................', '................',
  ],
}
const recipes = {
  i_skin: ['skin', '#a75732', '#cf925d', '#ecc78d'],
  i_bone: ['bone', '#978357', '#d2c092', '#f5e5bd'],
  i_skull: ['skull', '#9d845e', '#d8c399', '#f5e6bd'],
  'white-skull': ['skull', '#9d845e', '#e6d9b7', '#fff0cc'],
  'red-skull': ['skull', '#842d28', '#c95c46', '#eb9570'],
  i_heart: ['heart', '#813c32', '#bc5c4d', '#e69676'],
  i_heart_dark: ['heart', '#483945', '#805269', '#c1878b'],
  i_brain: ['brain', '#885555', '#c1878b', '#e4b4a4'],
  i_brain_dark: ['brain', '#493c52', '#835f84', '#b997b6'],
  i_intestine: ['guts', '#9c6448', '#c59168', '#e5b886'],
  i_intestine_dark: ['guts', '#544b38', '#8a8159', '#b8b57b'],
  i_flesh: ['flesh', '#99412d', '#cb6a4f', '#f2b08a'],
  i_body: ['body', '#607052', '#93a477', '#bdc894'],
  i_bag_universal: ['bag', '#68442c', '#a17745', '#c6a66c'],
  i_embalm_white: ['bottle', '#68774c', '#b2c79e', '#e6efc2'],
  i_embalm_white_red: ['bottle', '#8b4f37', '#cda46a', '#e2d4a0'],
  i_organ_improver_white: ['bottle', '#535d72', '#95b8b1', '#d4e9d0'],
  i_scroll_2: ['scroll', '#a48753', '#dec58e', '#8f7549'],
}
const destination = new URL('../static/icons/', import.meta.url)
await mkdir(destination, { recursive: true })
for (const [name, [shape, a, b, c]] of Object.entries(recipes)) {
  const palette = { '#': outline, a, b, c }
  const pixels = shapes[shape].flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.' ? [] : [`<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[pixel]}"/>`]))
  const svg = `<!-- Original Corpse Ledger icon. Copyright 2026 Andrei Gužovski. MIT. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${pixels.join('')}</svg>\n`
  await writeFile(new URL(`${name}.svg`, destination), svg)
}
console.log(`Generated ${Object.keys(recipes).length} original MIT-licensed pixel icons.`)
