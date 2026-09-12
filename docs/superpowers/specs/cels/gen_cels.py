#!/usr/bin/env python3
"""Generate the three machine cels (static backdrop art) at the board's
600x720 logical size. The renderer draws pins, windmills, tulips, pockets,
attacker, reels, balls, lamps and effects ON TOP of these. The cel holds only
static art: background, decoration, marquee, printed copy, and the static
part of the center gadget.

Run:  python3 gen_cels.py   (writes hana-fan.svg, big-wave.svg, raijin.svg here)
"""
import math, os

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 600, 720


def sunburst(cx, cy, n, r_in, r_out, color, op):
    out = []
    for i in range(0, n, 2):
        a0 = 2 * math.pi * i / n
        a1 = a0 + math.pi / n
        p = [(cx + r_in * math.cos(a0), cy + r_in * math.sin(a0)),
             (cx + r_out * math.cos(a0), cy + r_out * math.sin(a0)),
             (cx + r_out * math.cos(a1), cy + r_out * math.sin(a1)),
             (cx + r_in * math.cos(a1), cy + r_in * math.sin(a1))]
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in p) + "Z"
        out.append(f'<path d="{d}" fill="{color}" opacity="{op}"/>')
    return "\n".join(out)


def peony(cx, cy, r, petal, center, n=8):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        px, py = cx + r * 0.55 * math.cos(a), cy + r * 0.55 * math.sin(a)
        out.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r*0.5:.1f}" ry="{r*0.28:.1f}" '
                   f'transform="rotate({math.degrees(a):.0f} {px:.1f} {py:.1f})" fill="{petal}" opacity=".9"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.28:.1f}" fill="{center}"/>')
    return "\n".join(out)


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n'
            f'<defs>{defs}</defs>\n{body}\n</svg>\n')


# ------------------------------------------------------------------ Hana Fan
def hana_fan():
    cx, cy = 320, 240
    defs = '''
      <radialGradient id="cel" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#fff6d6"/><stop offset="1" stop-color="#f0d494"/></radialGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bdbdbd"/><stop offset=".5" stop-color="#f2f2f2"/><stop offset="1" stop-color="#9a9a9a"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#cel)"/>']
    b.append(sunburst(cx, cy, 36, 60, 700, "#d8352b", 0.16))
    b.append(f'<circle cx="{cx}" cy="{cy}" r="200" fill="none" stroke="#c9a24a" stroke-width="16" opacity=".3"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="250" fill="none" stroke="#d8352b" stroke-width="4" opacity=".3"/>')
    b.append(peony(95, 150, 50, "#e0574a", "#f4c542"))
    b.append(peony(545, 170, 44, "#e0574a", "#f4c542"))
    b.append(peony(90, 600, 40, "#3a8f5c", "#f4c542", n=6))
    b.append(peony(555, 610, 48, "#e0574a", "#f4c542"))
    for i in range(7):
        b.append(f'<path d="M{60+i*75} 690 q35 -70 70 -18" stroke="#2f6f9f" stroke-width="5" fill="none" opacity=".3" stroke-linecap="round"/>')
    # rail channel (static art; physics has its own geometry)
    b.append('<path d="M20 720 L20 120 Q20 60 80 60 L200 60" stroke="url(#rail)" stroke-width="22" fill="none"/>')
    # marquee + copy (no stroke on titles: Chromium paints fallback CJK glyphs stroke-only when both are set;
    # subtitle sits below the rail band y 49..71, which spans x<=200)
    b.append(f'<text x="{cx}" y="44" font-family="Impact, Arial Black, sans-serif" font-size="40" fill="#b3261e" text-anchor="middle" letter-spacing="4">花扇 HANA FAN</text>')
    b.append(f'<text x="{cx}" y="84" font-family="Georgia, serif" font-size="13" fill="#5a2b12" text-anchor="middle" letter-spacing="5">DELUXE • 13 BALLS PER WIN • 1976</text>')
    # spinning-flower gadget (static petals; hub glows via renderer lamp)
    b.append(f'<circle cx="{cx}" cy="{cy}" r="82" fill="#fff3c4" stroke="#c9a24a" stroke-width="5"/>')
    for i in range(10):
        b.append(f'<ellipse cx="{cx}" cy="{cy-52}" rx="16" ry="32" fill="{"#e0574a" if i%2 else "#f4c542"}" stroke="#7a1a12" stroke-width="1" transform="rotate({36*i} {cx} {cy})"/>')
    b.append(f'<circle cx="{cx}" cy="{cy}" r="24" fill="#b3261e" stroke="#c9a24a" stroke-width="3"/>')
    b.append(f'<text x="{cx}" y="{cy+7}" font-family="Arial Black, sans-serif" font-size="18" fill="#ffd86b" text-anchor="middle">777</text>')
    # reel bezel (reels drawn by renderer inside 250,340,140,40)
    b.append('<rect x="244" y="334" width="152" height="52" rx="6" fill="#3a1a0a" stroke="#c9a24a" stroke-width="3"/>')
    b.append(f'<text x="{cx}" y="412" font-family="Georgia, serif" font-size="12" fill="#5a2b12" text-anchor="middle" letter-spacing="3">リーチ • REACH</text>')
    # printed labels near catchers and attacker (footer at 684: renderer's pocket row covers y 698..714)
    b.append('<text x="320" y="592" font-family="Arial Black, sans-serif" font-size="14" fill="#7a1a12" text-anchor="middle" letter-spacing="3">大当り FEVER</text>')
    b.append('<text x="320" y="684" font-family="Georgia, serif" font-size="11" fill="#5a2b12" text-anchor="middle" letter-spacing="4">DHG 遊技機 • NAGOYA</text>')
    return svg("\n".join(b), defs)


# ------------------------------------------------------------------ Big Wave
def big_wave():
    cx = 320
    lx, ly, lw, lh = 200, 150, 240, 180
    defs = '''
      <linearGradient id="cel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b3d8a"/><stop offset=".55" stop-color="#0a6fb5"/><stop offset="1" stop-color="#083a6b"/></linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#c9971f"/><stop offset="1" stop-color="#8a6410"/></linearGradient>
      <linearGradient id="lcd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12c2e9"/><stop offset="1" stop-color="#0b3d8a"/></linearGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6410"/><stop offset=".5" stop-color="#fff2b0"/><stop offset="1" stop-color="#8a6410"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#cel)"/>']
    for i in range(6):
        y = 120 + i * 110
        b.append(f'<path d="M0 {y} q50 -26 100 0 t100 0 t100 0 t100 0 t100 0 t100 0" stroke="#7fdcff" stroke-width="3" fill="none" opacity=".3"/>')
    for (bx, by, br) in [(90,220,8),(120,300,5),(520,240,7),(500,460,10),(100,500,6),(540,640,5),(160,680,8),(420,690,5)]:
        b.append(f'<circle cx="{bx}" cy="{by}" r="{br}" fill="none" stroke="#bff3ff" stroke-width="1.5" opacity=".55"/>')
    for (fx, fy, flip) in [(110, 580, 1), (520, 540, -1), (120, 260, -1), (500, 120, 1)]:
        b.append(f'<g transform="translate({fx} {fy}) scale({flip} 1)"><ellipse rx="24" ry="12" fill="#ff8a3d"/><path d="M-20 0 l-14 -10 l0 20z" fill="#ff8a3d"/><circle cx="12" cy="-3" r="2.5" fill="#111"/><path d="M-6 -10 q7 10 0 20" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/></g>')
    b.append('<path d="M20 720 L20 120 Q20 60 80 60 L200 60" stroke="url(#rail)" stroke-width="22" fill="none"/>')
    # marquee
    b.append(f'<rect x="{cx-180}" y="14" width="360" height="42" rx="21" fill="#061a3a" stroke="#ffd23f" stroke-width="3"/>')
    b.append(f'<text x="{cx}" y="44" font-family="Impact, Arial Black, sans-serif" font-size="28" fill="#ffd23f" text-anchor="middle" letter-spacing="4">大海 BIG WAVE ∞</text>')
    # gold gadget frame + LCD (reels drawn by renderer inside 220,200,200,90)
    b.append(f'<rect x="{lx-22}" y="{ly-22}" width="{lw+44}" height="{lh+70}" rx="22" fill="url(#gold)" stroke="#5a4310" stroke-width="2"/>')
    b.append(f'<path d="M{lx-22} {ly-6} q{lw/2+22} -50 {lw+44} 0" fill="#ffd23f" stroke="#5a4310" stroke-width="1.5"/>')
    b.append(f'<text x="{cx}" y="{ly-12}" font-family="Arial Black, sans-serif" font-size="13" fill="#5a4310" text-anchor="middle" letter-spacing="3">SUPER REACH</text>')
    b.append(f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="6" fill="url(#lcd)"/>')
    b.append(f'<path d="M{lx} {ly+lh-40} q40 -28 80 0 t80 0 t80 0 L{lx+lw} {ly+lh} L{lx} {ly+lh}z" fill="#0b6fb5" opacity=".8"/>')
    b.append(f'<text x="{cx}" y="{ly+30}" font-family="Impact, Arial Black, sans-serif" font-size="20" fill="#fff" text-anchor="middle" letter-spacing="4">リーチ!! REACH</text>')
    b.append(f'<text x="{cx}" y="{ly+lh-12}" font-family="Arial, sans-serif" font-size="12" fill="#bff3ff" text-anchor="middle" letter-spacing="3">確変 KAKUHEN 1/8 • 右打ち →</text>')
    # (no START label under the LCD: the renderer's electric tulip at 320,372 sits there and carries its own "S" tag)
    # attacker label (attacker itself is on the RIGHT: 430..570 x 600)
    b.append('<text x="500" y="590" font-family="Impact, Arial Black, sans-serif" font-size="16" fill="#ffd23f" text-anchor="middle" letter-spacing="3">大当り ATTACKER</text>')
    b.append('<text x="320" y="684" font-family="Arial Black, sans-serif" font-size="11" fill="#ffd23f" text-anchor="middle" letter-spacing="4">DHG AMUSEMENT • SMART PACHINKO</text>')
    return svg("\n".join(b), defs)


# ------------------------------------------------------------------ Raijin
def raijin():
    cx, cy = 320, 260
    defs = '''
      <radialGradient id="cel" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3a0a0a"/><stop offset="1" stop-color="#0a0505"/></radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#d4a017"/><stop offset="1" stop-color="#7a5a08"/></linearGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5a08"/><stop offset=".5" stop-color="#fff0a8"/><stop offset="1" stop-color="#7a5a08"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#cel)"/>']
    b.append(sunburst(cx, cy, 48, 90, 720, "#d4a017", 0.14))
    for row in range(4):
        for col in range(9):
            sx = col * 80 + (40 if row % 2 else 0)
            sy = 640 + row * 22
            b.append(f'<path d="M{sx-40} {sy} a40 40 0 0 1 80 0" fill="none" stroke="#c9302c" stroke-width="2" opacity=".4"/>')
    b.append('<path d="M70 80 l50 100 l-30 6 l66 116 l-33 4 l46 84" stroke="#ffe600" stroke-width="5" fill="none" filter="url(#glow)" opacity=".85"/>')
    b.append('<path d="M540 90 l-44 92 l27 6 l-60 110 l30 5 l-40 78" stroke="#ffe600" stroke-width="5" fill="none" filter="url(#glow)" opacity=".85"/>')
    b.append('<path d="M20 720 L20 120 Q20 60 80 60 L200 60" stroke="url(#rail)" stroke-width="22" fill="none"/>')
    # title has no stroke (Chromium paints fallback CJK glyphs stroke-only when both are set); subtitle clears the rail band y 49..71
    b.append(f'<text x="{cx}" y="48" font-family="Impact, Arial Black, sans-serif" font-size="46" fill="url(#gold)" text-anchor="middle" letter-spacing="6">雷神 RAIJIN</text>')
    b.append(f'<text x="{cx}" y="84" font-family="Arial, sans-serif" font-size="12" fill="#ffd75e" text-anchor="middle" letter-spacing="6">THUNDER GOD • MAX TYPE • 1/16</text>')
    # kabuki mask gadget
    b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="96" ry="108" fill="url(#gold)" stroke="#2a0404" stroke-width="3"/>')
    b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="76" ry="88" fill="#fff3e0"/>')
    b.append(f'<path d="M{cx-50} {cy-50} q50 -34 100 0" stroke="#c9302c" stroke-width="8" fill="none" stroke-linecap="round"/>')
    b.append(f'<path d="M{cx-62} {cy-20} l36 13 M{cx+62} {cy-20} l-36 13" stroke="#2a0404" stroke-width="6" stroke-linecap="round"/>')
    b.append(f'<path d="M{cx-56} {cy+2} q16 -24 42 -6 M{cx+56} {cy+2} q-16 -24 -42 -6" stroke="#c9302c" stroke-width="5" fill="none"/>')
    b.append(f'<circle cx="{cx-26}" cy="{cy-4}" r="7" fill="#111"/><circle cx="{cx+26}" cy="{cy-4}" r="7" fill="#111"/>')
    b.append(f'<path d="M{cx-24} {cy+44} q24 24 48 0" stroke="#c9302c" stroke-width="7" fill="none" stroke-linecap="round"/>')
    # reel bezel (reels drawn by renderer inside 240,372,160,44)
    b.append('<rect x="232" y="364" width="176" height="60" rx="8" fill="#111" stroke="#d4a017" stroke-width="3"/>')
    b.append(f'<text x="{cx}" y="450" font-family="Impact, Arial Black, sans-serif" font-size="18" fill="#ffe600" text-anchor="middle" letter-spacing="5" filter="url(#glow)">激アツ REACH</text>')
    b.append('<text x="320" y="592" font-family="Impact, Arial Black, sans-serif" font-size="16" fill="#ffd75e" text-anchor="middle" letter-spacing="4">大当り JACKPOT</text>')
    b.append('<text x="320" y="684" font-family="Impact, Arial Black, sans-serif" font-size="11" fill="#d4a017" text-anchor="middle" letter-spacing="5">DHG LABS • 遊技機 • TYPE R</text>')
    return svg("\n".join(b), defs)


if __name__ == "__main__":
    for name, fn in [("hana-fan", hana_fan), ("big-wave", big_wave), ("raijin", raijin)]:
        path = os.path.join(HERE, f"{name}.svg")
        with open(path, "w") as f:
            f.write(fn())
        print("wrote", path)
