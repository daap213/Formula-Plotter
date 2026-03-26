export function parseExcelFormula(formula: string): string {
  let f = formula.replace(/\s+/g, '');
  f = f.replace(/^y=/, '');
  f = f.replace(/,/g, '.');
  
  // Replace ^ with **
  f = f.replace(/\^/g, '**');
  
  // Handle scientific notation E or e: 3E-06 -> 3*10**(-06)
  // Do this before Euler's 'e' to avoid conflicts like 3e-06x
  // Added (?!\.) to ensure the exponent is an integer and not part of a decimal number (e.g., 2e-0.2x)
  f = f.replace(/(\d+\.?\d*|\.\d+)[eE]([+-]?\d+)(?!\.)/g, '$1*10**($2)');
  
  // Handle exponential: e-0.2x -> Math.exp(-0.2*x), ex -> Math.exp(x), e-x -> Math.exp(-x)
  // Allow E in the exponent for scientific notation
  f = f.replace(/e([+-]?)(\d+(?:\.\d+)?(?:[E][+-]?\d+)?)?x/g, (match, sign, num) => {
    const s = sign || '';
    const n = num || '';
    return n ? `Math.exp(${s}${n}*x)` : `Math.exp(${s}x)`;
  });
  
  // Handle natural log: ln(x) -> Math.log(x)
  f = f.replace(/ln\(/g, 'Math.log(');
  
  // Replace standalone 'e' with Math.E (e.g., e^x -> Math.E**x)
  // Do this after other 'e' replacements to avoid breaking Math.exp
  f = f.replace(/\be\b/g, 'Math.E');
  
  // Handle powers: x2 -> x**2, x3 -> x**3
  f = f.replace(/x(?!\*\*)(\d+)/g, 'x**$1');
  
  // Handle implicit multiplication: 0.31x -> 0.31*x, 17Math -> 17*Math, )x -> )*x
  const numberRegex = /((?:\d+\.?\d*|\.\d+))/g;
  f = f.replace(new RegExp(numberRegex.source + 'x', 'g'), '$1*x');
  f = f.replace(new RegExp(numberRegex.source + 'Math', 'g'), '$1*Math');
  f = f.replace(/\)x/g, ')*x');
  
  return f;
}

export function compileFormula(formula: string): { fn: ((x: number) => number) | null, error: string | null, parsed: string | null } {
  try {
    const parsed = parseExcelFormula(formula);
    const fn = new Function('x', `return ${parsed};`) as (x: number) => number;
    // Test it with x=1 to see if it throws
    fn(1);
    return { fn, error: null, parsed };
  } catch (e: any) {
    return { fn: null, error: e.message, parsed: null };
  }
}
