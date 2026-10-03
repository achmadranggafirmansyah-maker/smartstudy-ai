const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, exp: Math.exp,
  round: Math.round, floor: Math.floor, ceil: Math.ceil
};
const CONSTS = { pi: Math.PI, e: Math.E };

export function evaluate(expr) {
  const src = String(expr || '').replace(/\s+/g, '');
  if (!src) throw new Error('Ekspresi kosong.');
  if (!/^[0-9a-zA-Z+\-*/^().,%]+$/.test(src)) throw new Error('Karakter tidak diizinkan.');
  let i = 0;
  const eat = (c) => { if (src[i] === c) { i++; return true; } return false; };

  function parseExpr() {
    let v = parseTerm();
    while (i < src.length) {
      if (eat('+')) v += parseTerm();
      else if (eat('-')) v -= parseTerm();
      else break;
    }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (i < src.length) {
      if (eat('*')) v *= parseFactor();
      else if (eat('/')) v /= parseFactor();
      else if (eat('%')) v %= parseFactor();
      else break;
    }
    return v;
  }
  function parseFactor() {
    let base = parseUnary();
    if (eat('^')) base = Math.pow(base, parseFactor());
    return base;
  }
  function parseUnary() {
    if (eat('-')) return -parseUnary();
    if (eat('+')) return parseUnary();
    return parsePrimary();
  }
  function parsePrimary() {
    if (eat('(')) {
      const v = parseExpr();
      if (!eat(')')) throw new Error('Tanda kurung tidak seimbang.');
      return v;
    }
    const numMatch = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (numMatch) { i += numMatch[0].length; return parseFloat(numMatch[0]); }
    const idMatch = /^[a-zA-Z_]\w*/.exec(src.slice(i));
    if (idMatch) {
      const name = idMatch[0].toLowerCase();
      i += idMatch[0].length;
      if (name in CONSTS) return CONSTS[name];
      if (name in FUNCS) {
        if (!eat('(')) throw new Error(`Fungsi ${name} butuh tanda kurung.`);
        const arg = parseExpr();
        if (!eat(')')) throw new Error('Tanda kurung tidak seimbang.');
        return FUNCS[name](arg);
      }
      throw new Error(`Nama tidak dikenal: ${name}`);
    }
    throw new Error('Ekspresi tidak valid.');
  }

  const result = parseExpr();
  if (i !== src.length) throw new Error('Karakter tak terduga di posisi ' + i);
  if (!Number.isFinite(result)) throw new Error('Hasil bukan angka valid.');
  return result;
}

export const FORMULAS = [
  { name: 'Luas lingkaran',      expr: 'pi * r^2',         vars: ['r'] },
  { name: 'Keliling lingkaran',  expr: '2 * pi * r',       vars: ['r'] },
  { name: 'Luas segitiga',       expr: '0.5 * a * t',      vars: ['a','t'] },
  { name: 'Teorema Pythagoras c',expr: 'sqrt(a^2 + b^2)',  vars: ['a','b'] },
  { name: 'Rata-rata',           expr: 'sum / n',          vars: ['sum','n'] },
  { name: 'Konversi C ke F',     expr: 'c * 9 / 5 + 32',   vars: ['c'] },
  { name: 'Energi kinetik',      expr: '0.5 * m * v^2',    vars: ['m','v'] },
  { name: 'Bunga sederhana',     expr: 'p * r * t / 100',  vars: ['p','r','t'] }
];

export function runFormula(formula, values) {
  let expr = formula.expr;
  for (const v of formula.vars) {
    const val = Number(values[v]);
    if (!Number.isFinite(val)) throw new Error(`Nilai ${v} tidak valid.`);
    expr = expr.replace(new RegExp(`\\b${v}\\b`, 'g'), `(${val})`);
  }
  return evaluate(expr);
}
