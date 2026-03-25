export function parseExcelFormula(formula: string): string {
  let f = formula.replace(/\s+/g, '');
  f = f.replace(/^y=/, '');
  f = f.replace(/,/g, '.');
  
  // Replace ^ with **
  f = f.replace(/\^/g, '**');
  
  // Handle exponential: e-0.2x -> Math.exp(-0.2*x)
  f = f.replace(/e([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)x/g, 'Math.exp($1*x)');
  
  // Handle natural log: ln(x) -> Math.log(x)
  f = f.replace(/ln\(/g, 'Math.log(');
  
  // Handle powers: x2 -> x**2, x3 -> x**3
  f = f.replace(/x(?!\*\*)(\d+)/g, 'x**$1');
  
  // Handle implicit multiplication: 0.31x -> 0.31*x, 17Math -> 17*Math
  const numberRegex = /((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  f = f.replace(new RegExp(numberRegex.source + 'x', 'g'), '$1*x');
  f = f.replace(new RegExp(numberRegex.source + 'Math', 'g'), '$1*Math');
  
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
