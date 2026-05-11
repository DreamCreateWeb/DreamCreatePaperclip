import { readableForeground, relativeLuminance } from "./brand";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("dark color returns white foreground", () => {
  const darkColor = "#0a3d2e";
  const fg = readableForeground(darkColor);
  assert(fg === "#ffffff", `expected #ffffff, got ${fg}`);
  const lum = relativeLuminance(darkColor);
  assert(lum <= 0.179, `luminance ${lum} should be <= 0.179`);
});

test("mid-brightness color returns dark foreground", () => {
  const midColor = "#5588cc";
  const fg = readableForeground(midColor);
  assert(fg === "#0b0b0c", `expected #0b0b0c, got ${fg}`);
  const lum = relativeLuminance(midColor);
  assert(lum > 0.179, `luminance ${lum} should be > 0.179 (threshold)`);
});

test("light color returns dark foreground", () => {
  const lightColor = "#e8e8f8";
  const fg = readableForeground(lightColor);
  assert(fg === "#0b0b0c", `expected #0b0b0c, got ${fg}`);
  const lum = relativeLuminance(lightColor);
  assert(lum > 0.179, `luminance ${lum} should be > 0.179`);
});
