import random, os, json

W, H = 36, 58
PAL = {
    'K': '#15121a', 'H': '#2e2a38', 'S': '#e2ab8c', 's': '#b97f66', 'M': '#4a352f',
    'W': '#f4f1ea', 'w': '#b9bdc6', 'T': '#0c0c10', 'J': '#2a2e38', 'j': '#3a3f4c',
    'k': '#1b1e26', 'G': '#b8bcc6', 'P': '#17171d', 'p': '#262630', 'B': '#08080a',
    'b': '#5c5c69', 'e': '#cfd3dc', 'O': '#fff1ea', 'R': '#ff2a2a', 'C': '#33e0ff',
    'm': '#7a3b34',
    # the Minister
    'A': '#8d919b', 'a': '#5f636d', 'N': '#d9d2c5', 'n': '#b0a898', 'X': '#000000',
    # the helper (Easter egg): long dark hair, green eyes, grey oversized hoodie, ripped denim shorts
    'L': '#34241e', 'l': '#563b2f', 'E': '#8aa07a', 'Y': '#7d828e', 'y': '#5a5f6b',
    'D': '#b4c6d6', 'd': '#7f95ab', 'Z': '#b8736c',
    # the cover artist: navy backpack, forearm tattoo
    'F': '#232b4a', 'Q': '#3b4670', 'f': '#4a4a5c',
    # gold (the Minister's trim, the guard's badge)
    'g': '#e0b84a', 'q': '#b8902e',
}


def new():
    return [[None] * W for _ in range(H)]


def px(g, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = c


def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(g, x, y, c)


def sr(g, x0, y0, x1, y1, c):
    rect(g, x0, y0, x1, y1, c)
    rect(g, W - 1 - x1, y0, W - 1 - x0, y1, c)


def spx(g, x, y, c):
    px(g, x, y, c)
    px(g, W - 1 - x, y, c)


def disc(g, cx, cy, rx, ry, c, hair=None):
    for y in range(H):
        for x in range(W):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                px(g, x, y, c)
                if hair is not None:
                    hair.add((x, y))


def build(expr):
    g = new()
    rng = random.Random(3)
    # pants
    sr(g, 10, 44, 17, 46, 'P')
    sr(g, 17, 45, 17, 46, 'p')
    for y in range(47, 53):
        t = (y - 47) // 2
        sr(g, 9 - t, y, 16, y, 'P')
    sr(g, 13, 47, 13, 52, 'p')
    # shoes
    sr(g, 6, 53, 16, 54, 'B')
    sr(g, 5, 55, 16, 55, 'B')
    sr(g, 8, 53, 10, 53, 'b')
    sr(g, 7, 54, 7, 54, 'b')
    # jacket body
    sr(g, 8, 31, 17, 44, 'J')
    for y in range(33, 43):
        for x in range(8, 17):
            if rng.random() < 0.12:
                spx(g, x, y, 'j')
    sr(g, 8, 43, 17, 44, 'k')
    for x in range(8, 17, 2):
        spx(g, x, 43, 'j')
    # neck, collar, shirt, tie
    sr(g, 15, 28, 17, 29, 's')
    sr(g, 11, 29, 14, 31, 'J')
    sr(g, 11, 29, 14, 29, 'k')
    sr(g, 12, 30, 13, 30, 'j')
    sr(g, 15, 30, 17, 31, 'W')
    for r in range(32, 38):
        xl = 14 + (r - 32) // 2
        sr(g, xl, r, 17, r, 'W')
        spx(g, xl, r, 'w')
    sr(g, 17, 32, 17, 37, 'T')
    sr(g, 16, 36, 17, 37, 'T')
    spx(g, 17, 34, 'H')
    # zipper
    sr(g, 17, 38, 17, 44, 'k')
    px(g, 18, 38, 'G')
    for r in range(39, 44, 2):
        px(g, 18, r, 'e')
    # sleeves with three stripes
    for y in range(32, 47):
        x0 = 4 if y == 32 else 3 if y == 33 else 2
        sr(g, x0, y, 7, y, 'J')
    for y in range(34, 45):
        for x in (2, 4, 6):
            spx(g, x, y, 'G')
    sr(g, 7, 32, 7, 46, 'k')
    sr(g, 2, 45, 6, 46, 'k')
    for x in (3, 5):
        spx(g, x, 45, 'j')
    sr(g, 3, 47, 6, 49, 'S')
    sr(g, 6, 47, 6, 49, 's')
    sr(g, 3, 49, 5, 49, 's')
    # hair (back mass + curls)
    hair = set()
    disc(g, 17.5, 11, 11.5, 8, 'K', hair)
    for (cx, cy, r) in [(9, 10, 2.4), (10.5, 6.5, 2.6), (14, 4.2, 2.5), (17.5, 3.2, 2.4),
                        (21, 4.2, 2.5), (24.5, 6.5, 2.6), (26, 10, 2.4), (8, 13, 2), (27, 13, 2)]:
        disc(g, cx, cy, r, r, 'K', hair)
    for y in range(14, 19):
        for x in (8, 9, 26, 27):
            px(g, x, y, 'K')
            hair.add((x, y))
    # face
    disc(g, 17.5, 19.5, 8.3, 9.3, 'S')
    sr(g, 11, 24, 17, 28, 'S')
    # ears + hoops
    sr(g, 8, 19, 9, 23, 'S')
    sr(g, 8, 21, 8, 21, 's')
    for (x, y) in [(8, 24), (7, 25), (8, 26), (9, 25)]:
        spx(g, x, y, 'e')
    # fringe curls
    for x in range(10, 26):
        bottom = 10 + ((x * 7) % 3)
        for y in range(9, bottom + 1):
            px(g, x, y, 'K')
            hair.add((x, y))
    # sideburns
    sr(g, 10, 17, 10, 21, 'M')
    # stubble + mustache
    for y in range(24, 29):
        for x in range(W):
            if g[y][x] == 'S' and (x + y) % 2 == 0:
                g[y][x] = 's'
    sr(g, 14, 24, 17, 24, 'M')
    # nose
    sr(g, 17, 22, 17, 23, 's')
    # glasses
    for cx in (12.5, 22.5):
        for y in range(H):
            for x in range(W):
                d = ((x - cx) ** 2 + (y - 19.5) ** 2) ** 0.5
                if 2.8 <= d <= 3.9:
                    px(g, x, y, 'K')
    sr(g, 17, 18, 17, 18, 'K')
    sr(g, 8, 17, 9, 17, 'K')
    # hair texture
    for (x, y) in hair:
        if g[y][x] == 'K' and (x * 3 + y * 5) % 7 == 0:
            g[y][x] = 'H'
    # expressions
    if expr in ('neutral', 'glitch'):
        sr(g, 10, 14, 12, 14, 'K')
        sr(g, 13, 15, 14, 15, 'K')
    if expr == 'neutral':
        sr(g, 11, 19, 14, 19, 's')
        sr(g, 11, 20, 14, 20, 'W')
        sr(g, 12, 20, 13, 20, 'K')
        sr(g, 15, 26, 17, 26, 'm')
    elif expr == 'glitch':
        sr(g, 11, 18, 14, 21, 'R')
        for i in range(4):
            spx(g, 11 + i, 18 + i, 'K')
            spx(g, 14 - i, 18 + i, 'K')
        for i, x in enumerate(range(14, 22)):
            px(g, x, 26 + (i % 2), 'm')
    elif expr == 'surprised':
        sr(g, 11, 18, 14, 21, 'W')
        sr(g, 12, 19, 13, 20, 'K')
        sr(g, 10, 13, 13, 13, 'K')
        sr(g, 16, 26, 17, 28, 'm')
        sr(g, 17, 27, 17, 27, 'K')
    elif expr == 'win':
        for (x, y) in [(11, 20), (12, 19), (13, 19), (14, 20)]:
            spx(g, x, y, 'K')
        sr(g, 10, 13, 13, 13, 'K')
        sr(g, 14, 25, 17, 25, 'm')
        sr(g, 15, 26, 17, 26, 'W')
        sr(g, 16, 27, 17, 27, 'm')
    elif expr == 'sad':
        # brows rising toward the centre, eyes down, one tear, mouth turned down
        sr(g, 10, 15, 11, 15, 'K')
        sr(g, 12, 14, 14, 14, 'K')
        sr(g, 11, 18, 14, 19, 's')
        sr(g, 11, 20, 14, 21, 'W')
        sr(g, 12, 21, 13, 21, 'K')
        px(g, 11, 24, 'C')
        px(g, 11, 25, 'C')
        sr(g, 16, 26, 17, 26, 'm')
        spx(g, 15, 27, 'm')
    elif expr in ('angry', 'shout'):
        # heavy brows falling toward the centre
        sr(g, 10, 13, 11, 13, 'K')
        sr(g, 11, 14, 13, 14, 'K')
        sr(g, 13, 15, 15, 15, 'K')
        if expr == 'angry':
            sr(g, 11, 18, 14, 18, 's')
            sr(g, 11, 19, 14, 19, 'K')
            sr(g, 11, 20, 14, 20, 'W')
            sr(g, 12, 20, 13, 20, 'K')
            sr(g, 11, 21, 14, 21, 's')
            sr(g, 14, 26, 17, 27, 'm')
            sr(g, 15, 26, 17, 26, 'W')
        else:
            sr(g, 11, 18, 14, 21, 'W')
            sr(g, 12, 19, 13, 20, 'K')
            sr(g, 14, 25, 17, 28, 'm')
            sr(g, 15, 26, 17, 27, 'K')
            sr(g, 15, 25, 17, 25, 'W')
    return g


def build_minister(expr):
    """The villain: a filthy-rich dandy. Top hat, black tailcoat, white gloves, gold buttons,
    watch chain and cane, a cigar, and a censorship bar where the eyes should be.
    Battle poses (boss fight): 'attack' raises the cane, 'hurt' loses the top hat."""
    g = new()
    # trousers and patent shoes
    sr(g, 10, 44, 17, 52, 'P')
    sr(g, 13, 46, 13, 52, 'p')
    sr(g, 7, 53, 16, 55, 'B')
    sr(g, 8, 53, 10, 53, 'b')
    # tailcoat with wide shoulders, sleeves, white gloves
    sr(g, 5, 28, 17, 30, 'T')
    sr(g, 7, 31, 17, 44, 'T')
    sr(g, 3, 30, 6, 46, 'T')
    sr(g, 7, 32, 7, 46, 'p')
    sr(g, 7, 44, 17, 44, 'p')
    sr(g, 3, 45, 6, 46, 'e')
    sr(g, 3, 47, 6, 49, 'W')
    sr(g, 6, 47, 6, 49, 'w')
    # shirt front, satin lapels, red bow tie, gold buttons and watch chain
    for r in range(28, 37):
        xl = 13 + (r - 28) // 2
        sr(g, xl, r, 17, r, 'W')
        spx(g, xl - 1, r, 'p')
    sr(g, 15, 29, 17, 30, 'R')
    sr(g, 17, 29, 17, 30, 'q')
    for y in (34, 37, 40):
        px(g, 17, y, 'g')
        px(g, 18, y, 'g')
    for x in range(10, 15):
        px(g, x, 38, 'g')
    px(g, 10, 36, 'g')
    px(g, 10, 33, 'e')  # pocket square
    px(g, 11, 33, 'e')
    if expr == 'attack':
        # the right arm goes up and the cane comes down on you
        for y in range(35, 50):
            for x in range(29, 33):
                g[y][x] = None
        rect(g, 29, 21, 32, 34, 'T')
        rect(g, 29, 21, 29, 34, 'p')
        rect(g, 29, 18, 32, 20, 'W')
        rect(g, 30, 2, 31, 3, 'g')
        rect(g, 30, 4, 30, 17, 'B')
        rect(g, 31, 2, 31, 17, 'q')
    else:
        # gold-topped cane in the right hand
        rect(g, 30, 40, 31, 41, 'g')
        rect(g, 30, 42, 30, 55, 'B')
        rect(g, 31, 40, 31, 55, 'q')
    # neck, plump pale head, top hat
    sr(g, 15, 24, 17, 27, 'n')
    disc(g, 17.5, 15, 8, 10, 'N')
    sr(g, 9, 13, 9, 17, 'N')
    sr(g, 17, 17, 17, 19, 'n')
    sr(g, 12, 23, 17, 25, 'n')
    if expr == 'hurt':
        # the top hat flies off
        rect(g, 25, 0, 33, 2, 'T')
        rect(g, 25, 2, 33, 2, 'R')
        rect(g, 23, 3, 35, 3, 'T')
    else:
        sr(g, 10, 0, 17, 4, 'T')
        sr(g, 12, 1, 12, 3, 'p')
        sr(g, 10, 4, 17, 4, 'R')
        sr(g, 6, 5, 17, 6, 'T')
    if expr == 'calm':
        rect(g, 6, 11, 29, 15, 'X')
        sr(g, 15, 21, 17, 21, 'K')
        rect(g, 18, 21, 23, 21, 'M')  # cigar
        px(g, 24, 21, 'R')
        sr(g, 13, 19, 14, 19, 'w')  # waxed moustache
    else:
        # bar broken into an angry V, mouth open, cigar dropped
        for x in range(6, 18):
            off = (x - 6) // 4
            for y in range(10 + off, 15 + off):
                spx(g, x, y, 'X')
        sr(g, 14, 20, 17, 22, 'K')
        sr(g, 13, 22, 13, 23, 'K')
        sr(g, 16, 22, 17, 22, 'R')
        sr(g, 13, 19, 14, 19, 'w')
        if expr == 'hurt':
            # the censorship bar cracks
            for x, y in ((9, 11), (10, 12), (11, 13), (24, 13), (25, 14), (26, 15), (17, 12), (18, 13)):
                px(g, x, y, 'R')
    return g


def build_girl(expr):
    """The helper (Easter egg): long dark hair, green eyes, silver bracelets, a pomegranate
    tattoo (red) on the right forearm. Outfit: elegant athleisure, echoing Mars's own: a fitted
    black track jacket with two silver sleeve stripes over a white top, high-waist black
    wide-leg track trousers with a silver side stripe, chunky white sneakers."""
    g = new()
    # hair behind the head and shoulders
    disc(g, 17.5, 13, 9.5, 11, 'L')
    sr(g, 7, 10, 10, 26, 'L')
    # chunky white sneakers
    sr(g, 7, 55, 16, 57, 'W')
    sr(g, 7, 57, 16, 57, 'G')
    sr(g, 9, 55, 11, 55, 'w')
    sr(g, 13, 56, 15, 56, 'w')
    # high-waist wide-leg track trousers, silver side stripe
    sr(g, 9, 39, 17, 54, 'P')
    sr(g, 8, 50, 17, 54, 'P')
    sr(g, 17, 41, 17, 54, 'p')
    sr(g, 9, 40, 9, 54, 'G')
    sr(g, 9, 39, 17, 40, 'p')
    # fitted cropped track jacket: shoulders, zipper, white top underneath
    sr(g, 9, 28, 17, 28, 'P')
    sr(g, 8, 29, 17, 39, 'P')
    sr(g, 8, 29, 8, 39, 'p')
    sr(g, 13, 28, 17, 31, 'W')
    sr(g, 14, 32, 17, 33, 'W')
    sr(g, 17, 29, 17, 39, 'e')
    sr(g, 13, 28, 13, 31, 'p')
    sr(g, 17, 34, 17, 34, 'G')
    # sleeves with two silver stripes (Mars wears three)
    sr(g, 3, 29, 8, 40, 'P')
    sr(g, 4, 30, 4, 40, 'G')
    sr(g, 6, 30, 6, 40, 'G')
    sr(g, 3, 41, 8, 42, 'p')
    # hands and silver bracelets; right sleeve pushed up to show the tattoo
    sr(g, 4, 43, 7, 46, 'S')
    sr(g, 4, 43, 7, 43, 'e')
    rect(g, 28, 38, 31, 42, 'S')
    rect(g, 27, 36, 32, 37, 'p')
    rect(g, 29, 39, 30, 41, 'R')
    px(g, 30, 40, 'K')
    # neck, thin silver chain and head
    sr(g, 15, 23, 17, 26, 's')
    sr(g, 15, 27, 17, 27, 'e')
    px(g, 17, 29, 'e')
    disc(g, 17.5, 16, 6.7, 8.3, 'S')
    # fringe, face-framing locks, highlights, a small silver hair clip
    rect(g, 10, 8, 25, 10, 'L')
    sr(g, 10, 11, 11, 21, 'L')
    sr(g, 12, 11, 12, 12, 'L')
    for (x, y) in ((14, 9), (15, 8), (21, 9), (12, 9)):
        px(g, x, y, 'l')
    px(g, 11, 10, 'e')
    # eyes: heavy brows, green iris
    brow_y = 10 if expr == 'surprised' else 11
    sr(g, 12, brow_y, 15, brow_y, 'K')
    sr(g, 11, brow_y + 1, 11, brow_y + 1, 'K')
    sr(g, 12, 14, 15, 15, 'W')
    sr(g, 13, 14, 14, 15, 'E')
    sr(g, 13, 15, 14, 15, 'K')
    sr(g, 12, 13, 15, 13, 'K')  # lid line: slightly bored
    if expr == 'wink':
        rect(g, 12, 14, 15, 15, 'S')
        rect(g, 12, 15, 15, 15, 'K')
    if expr == 'surprised':
        sr(g, 12, 13, 15, 13, 'S')
        sr(g, 12, 12, 15, 12, 'K')
    # nose and mouth
    sr(g, 17, 17, 17, 18, 's')
    if expr in ('happy', 'wink'):
        sr(g, 15, 21, 17, 21, 'W')
        sr(g, 15, 22, 17, 22, 'Z')
        sr(g, 14, 20, 14, 20, 'Z')
    elif expr == 'surprised':
        sr(g, 16, 21, 17, 22, 'K')
    else:
        sr(g, 16, 21, 17, 21, 'Z')
    # long hair in front of the shoulders, kept short enough to show the jacket
    sr(g, 8, 24, 10, 35, 'L')
    sr(g, 9, 33, 10, 37, 'L')
    sr(g, 8, 28, 8, 31, 'l')
    return g


def build_grafico(expr):
    """The cover artist (from img_yyybrid): short tousled dark hair, brown eyes, small stud
    earring, black tee, navy backpack with a red/white stripe, forearm tattoo, phone in hand."""
    g = new()
    # backpack behind the left shoulder (viewer's left), with its red stripe
    rect(g, 2, 30, 8, 46, 'F')
    rect(g, 3, 31, 4, 45, 'Q')
    rect(g, 2, 36, 2, 44, 'R')
    # jeans and white sneakers
    sr(g, 10, 44, 17, 52, 'J')
    sr(g, 17, 46, 17, 52, 'k')
    sr(g, 7, 53, 16, 55, 'W')
    sr(g, 7, 55, 16, 55, 'G')
    sr(g, 9, 53, 11, 53, 'w')
    # black tee, short sleeves
    sr(g, 9, 29, 17, 29, 'T')
    sr(g, 8, 30, 17, 44, 'T')
    sr(g, 8, 30, 8, 44, 'P')
    sr(g, 12, 33, 12, 40, 'P')
    sr(g, 3, 30, 7, 36, 'T')
    # left arm hangs (tattoo), right arm bent holding the phone
    rect(g, 3, 37, 6, 46, 'S')
    for (x, y) in ((4, 39), (5, 41), (4, 42), (6, 43), (4, 44), (5, 45), (3, 40)):
        px(g, x, y, 'f')
    rect(g, 3, 46, 6, 47, 'S')
    rect(g, 29, 37, 32, 41, 'S')
    rect(g, 26, 39, 31, 43, 'S')
    rect(g, 26, 31, 29, 40, 'B')
    rect(g, 27, 32, 28, 38, 'e')
    rect(g, 26, 40, 27, 43, 'S')
    # backpack strap across the left shoulder
    for y in range(29, 40):
        px(g, 10 + (y - 29) // 3, y, 'F')
        px(g, 11 + (y - 29) // 3, y, 'Q')
    # neck and head
    sr(g, 14, 25, 17, 29, 'S')
    sr(g, 14, 28, 17, 29, 's')
    disc(g, 17.5, 17, 7.6, 9.2, 'S')
    # ears and the stud on the viewer's left
    sr(g, 9, 16, 10, 20, 'S')
    px(g, 9, 21, 'e')
    px(g, 9, 22, 'e')
    # hair: short, tousled, swept over the forehead
    hair = set()
    disc(g, 17.5, 10, 9.2, 5.6, 'K', hair)
    for x in range(9, 27):
        bottom = 9 + ((x * 5) % 3)
        for y in range(7, bottom + 1):
            px(g, x, y, 'K')
            hair.add((x, y))
    sr(g, 9, 11, 10, 13, 'K')
    for (x, y) in hair:
        if g[y][x] == 'K' and (x * 3 + y * 5) % 7 == 0:
            g[y][x] = 'H'
    # nose, light stubble
    sr(g, 17, 18, 17, 20, 's')
    for y in range(22, 26):
        for x in range(W):
            if g[y][x] == 'S' and (x * 2 + y) % 5 == 0:
                g[y][x] = 's'
    # eyes: heavy brows, brown iris, bored lids
    brow_y = 12 if expr == 'surprised' else 13
    sr(g, 11, brow_y, 14, brow_y, 'K')
    sr(g, 12, 15, 14, 16, 'W')
    sr(g, 13, 15, 14, 16, 'M')
    px(g, 14, 16, 'K')
    px(g, 21, 16, 'K')
    if expr in ('neutral', 'happy'):
        sr(g, 12, 15, 14, 15, 's')
    if expr == 'surprised':
        sr(g, 12, 14, 14, 17, 'W')
        sr(g, 13, 15, 14, 16, 'K')
    if expr == 'wink':
        rect(g, 21, 15, 23, 16, 'S')
        rect(g, 21, 16, 23, 16, 'K')
    # mouth
    if expr in ('happy', 'wink'):
        sr(g, 15, 23, 17, 23, 'W')
        sr(g, 15, 24, 17, 24, 'm')
        spx(g, 14, 22, 'm')
    elif expr == 'surprised':
        sr(g, 16, 23, 17, 24, 'K')
    else:
        sr(g, 15, 23, 17, 23, 'm')
    return g


def build_quiete(expr):
    """The Ministry's servile guard (QUIETE.SYS): navy uniform, peaked cap with a badge,
    mirrored shades, baton, and a smile that never changes.
    Battle poses (boss fight): 'attack' raises the baton, 'hurt' cracks the shades."""
    g = new()
    # legs and boots
    sr(g, 10, 44, 17, 52, 'F')
    sr(g, 13, 46, 13, 52, 'k')
    sr(g, 8, 53, 16, 55, 'B')
    sr(g, 9, 53, 11, 53, 'b')
    # uniform: body, sleeves, gloves, belt and buckle, chest badge
    sr(g, 8, 30, 17, 43, 'F')
    for y in range(32, 40):
        spx(g, 9, y, 'Q')
    sr(g, 4, 31, 7, 44, 'F')
    sr(g, 4, 31, 6, 32, 'e')  # shoulder patch
    sr(g, 4, 45, 6, 47, 'T')
    sr(g, 8, 41, 17, 42, 'B')
    px(g, 17, 41, 'g')
    px(g, 18, 41, 'g')
    rect(g, 10, 34, 11, 36, 'g')
    px(g, 11, 36, 'q')
    # white collar and black tie
    sr(g, 15, 29, 17, 30, 'W')
    sr(g, 17, 31, 17, 36, 'T')
    if expr == 'attack':
        # the right arm goes up, baton over the head
        for y in range(35, 48):
            for x in range(28, 32):
                g[y][x] = None
        rect(g, 28, 21, 31, 34, 'F')
        rect(g, 29, 18, 31, 20, 'T')
        rect(g, 30, 3, 31, 17, 'B')
        rect(g, 30, 3, 30, 6, 'b')
    else:
        # baton in the right hand
        rect(g, 30, 36, 31, 47, 'B')
        rect(g, 30, 36, 30, 38, 'b')
    # neck and head
    sr(g, 15, 25, 17, 29, 's')
    disc(g, 17.5, 17, 7.6, 9, 'S')
    sr(g, 9, 16, 10, 20, 'S')
    # peaked cap with a badge
    sr(g, 9, 4, 17, 10, 'F')
    sr(g, 9, 9, 17, 9, 'Q')
    sr(g, 6, 11, 17, 12, 'B')
    px(g, 17, 7, 'e')
    px(g, 18, 7, 'e')
    px(g, 17, 6, 'g')
    px(g, 18, 6, 'g')
    # nose and shades
    sr(g, 17, 18, 17, 20, 's')
    if expr in ('smile', 'attack'):
        rect(g, 10, 14, 25, 16, 'K')
        spx(g, 12, 14, 'b')
        sr(g, 14, 22, 17, 22, 'W')
        sr(g, 14, 23, 17, 23, 'm')
        spx(g, 13, 21, 'm')
    else:
        # error: lenses glow red, the smile is gone
        rect(g, 10, 14, 25, 16, 'R')
        for i in range(3):
            spx(g, 11 + i, 14 + i, 'K')
            spx(g, 13 - i, 14 + i, 'K')
        sr(g, 14, 22, 17, 22, 'm')
        rect(g, 8, 18, 27, 18, 'R')
        if expr == 'hurt':
            # mouth open, a lens cracked
            sr(g, 14, 22, 17, 23, 'K')
            for i in range(3):
                px(g, 21 + i, 14 + i, 'W')
    return g


def outline(g):
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] is None:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and g[yy][xx] is not None:
                        out[y][x] = 'O'
                        break
    return out


def glitch(g):
    out = new()
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c and c != 'O':
                for dx, col in ((3, 'R'), (-3, 'C')):
                    xx = x + dx
                    if 0 <= xx < W and out[y][xx] is None:
                        out[y][xx] = col
    for y in range(H):
        sh = 3 if 17 <= y <= 22 else -3 if 36 <= y <= 39 else 2 if 49 <= y <= 50 else 0
        for x in range(W):
            if g[y][x]:
                xx = x + sh
                if 0 <= xx < W:
                    out[y][xx] = g[y][x]
    for (x, y, w, h) in [(0, 8, 5, 1), (29, 30, 6, 1), (1, 41, 4, 2), (30, 12, 5, 2), (26, 52, 7, 1)]:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if out[yy][xx] is None:
                    out[yy][xx] = 'R'
    return out


def rects(g):
    out = []
    active = {}
    for y in range(H + 1):
        runs = []
        if y < H:
            x = 0
            while x < W:
                c = g[y][x]
                if c is None:
                    x += 1
                    continue
                x0 = x
                while x < W and g[y][x] == c:
                    x += 1
                runs.append((x0, x - x0, c))
        keys = set(runs)
        for k in list(active):
            if k not in keys:
                out.append((k[0], active[k], k[1], y - active[k], k[2]))
                del active[k]
        for k in runs:
            if k not in active:
                active[k] = y
    return out



# ---------------------------------------------------------------------------
# Writes src/sprites.js: every character sprite as a list of pixel rects.
#   mars-<expr>      neutral, glitch, surprised, win, sad, angry, shout
#   ministro-<expr>  calm, angry, attack, hurt, ko      quiete-<expr>  smile, error, attack, hurt, ko
# Edit build() / build_minister() above (hair, outfit, faces), then run:  npm run sprites
# ---------------------------------------------------------------------------
import os

MARS_EXPRESSIONS = ("neutral", "glitch", "surprised", "win", "sad", "angry", "shout")
MINISTER_EXPRESSIONS = ("calm", "angry", "attack", "hurt")
GIRL_EXPRESSIONS = ("neutral", "happy", "wink", "surprised")
QUIETE_EXPRESSIONS = ("smile", "error", "attack", "hurt")
GRAFICO_EXPRESSIONS = ("neutral", "happy", "wink", "surprised")


def sprite_rects(expr):
    g = outline(build(expr))
    if expr == "glitch":
        g = glitch(g)
    return [[x, y, w, h, c] for (x, y, w, h, c) in rects(g)]


def minister_rects(expr):
    return [[x, y, w, h, c] for (x, y, w, h, c) in rects(outline(build_minister(expr)))]


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "sprites.js")
    data = {"mars-" + e: sprite_rects(e) for e in MARS_EXPRESSIONS}
    data.update({"ministro-" + e: minister_rects(e) for e in MINISTER_EXPRESSIONS})
    data.update({"quiete-" + e: [[x, y, w, h, c] for (x, y, w, h, c) in rects(outline(build_quiete(e)))] for e in QUIETE_EXPRESSIONS})
    # knocked out (boss fight): the hurt pose, torn apart like Mars's glitch
    data["ministro-ko"] = [[x, y, w, h, c] for (x, y, w, h, c) in rects(glitch(outline(build_minister("hurt"))))]
    data["quiete-ko"] = [[x, y, w, h, c] for (x, y, w, h, c) in rects(glitch(outline(build_quiete("hurt"))))]
    data.update({"girl-" + e: [[x, y, w, h, c] for (x, y, w, h, c) in rects(outline(build_girl(e)))] for e in GIRL_EXPRESSIONS})
    data.update({"grafico-" + e: [[x, y, w, h, c] for (x, y, w, h, c) in rects(outline(build_grafico(e)))] for e in GRAFICO_EXPRESSIONS})
    lines = [
        "// GENERATED by tools/make_sprites.py (npm run sprites). Do not edit by hand.",
        "// Each sprite is a list of [x, y, width, height, paletteKey] pixel rects on a %dx%d grid." % (W, H),
        "export const SPRITE_W = %d;" % W,
        "export const SPRITE_H = %d;" % H,
        "export const PALETTE = %s;" % __import__("json").dumps(PAL),
        "export const SPRITES = {",
    ]
    for e, rs in data.items():
        lines.append("  %s: %s," % (__import__("json").dumps(e), __import__("json").dumps(rs, separators=(",", ":"))))
    lines += [
        "};",
        "",
        "// Paints each sprite into a Phaser canvas texture named after its key,",
        "// e.g. 'mars-sad' or 'ministro-calm'.",
        "export function registerMars(scene) {",
        "  for (const [key, rects] of Object.entries(SPRITES)) {",
        "    if (scene.textures.exists(key)) continue;",
        "    const tex = scene.textures.createCanvas(key, SPRITE_W, SPRITE_H);",
        "    const ctx = tex.getContext();",
        "    for (const [x, y, w, h, c] of rects) {",
        "      ctx.fillStyle = PALETTE[c];",
        "      ctx.fillRect(x, y, w, h);",
        "    }",
        "    tex.refresh();",
        "  }",
        "}",
        "",
    ]
    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print("wrote", os.path.normpath(out), os.path.getsize(out), "bytes")
