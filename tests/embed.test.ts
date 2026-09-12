import { describe, it, expect } from 'vitest';
// @ts-expect-error -- plain .mjs build script, no declaration file
import { collapseSvg } from '../tools/embed-cels.mjs';

const fixture = `<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 10 10">
  <!-- comment   dropped -->
  <rect x="1"   y="2"
        width="3" height="4"/>
  <text x="1" y="2">a  b</text>
  <g xml:space="preserve">  keep   me <tspan>x  y</tspan> </g>
  <g>
    <text>c
d</text>
  </g>
</svg>
`;

describe('embed-cels collapseSvg', () => {
  const out = collapseSvg(fixture) as string;
  it('keeps the double space inside <text>', () => {
    expect(out).toContain('<text x="1" y="2">a  b</text>');
    expect(out).toContain('<text>c\nd</text>');
  });
  it('keeps whitespace under xml:space="preserve", including nested children', () => {
    expect(out).toContain('<g xml:space="preserve">  keep   me <tspan>x  y</tspan> </g>');
  });
  it('collapses runs between tags and inside attribute runs, drops comments', () => {
    expect(out).toContain('<rect x="1" y="2" width="3" height="4"/>');
    expect(out).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect');
    expect(out).not.toContain('comment');
    expect(out).not.toMatch(/\n(?!d<\/text>)/);   // the only newline left is the one inside <text>
  });
});
