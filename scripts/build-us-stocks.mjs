// Build public/data/stocks-us.json = SEC company_tickers.json (10k) + popular ETFs.
// Run: node scripts/build-us-stocks.mjs
import fs from "node:fs";

const UA = "Mozilla/5.0 eloan-backtest contact@eloan.kr";
const secRes = await fetch(
  "https://www.sec.gov/files/company_tickers.json",
  { headers: { "User-Agent": UA } },
);
if (!secRes.ok) throw new Error(`SEC HTTP ${secRes.status}`);
const raw = await secRes.json();
const secItems = Object.values(raw)
  .map((v) => ({ t: v.ticker, n: v.title }))
  .filter((x) => /^[A-Z][A-Z0-9.\-]*$/.test(x.t));

// Popular ETFs not covered by SEC (funds file separately).
const EXTRA_ETFS = [
  ["TQQQ", "ProShares UltraPro QQQ (3x Long)"],
  ["SQQQ", "ProShares UltraPro Short QQQ (3x Inverse)"],
  ["QQQM", "Invesco NASDAQ 100 ETF"],
  ["UPRO", "ProShares UltraPro S&P500 (3x Long)"],
  ["SPXU", "ProShares UltraPro Short S&P500 (3x Inverse)"],
  ["SPXL", "Direxion Daily S&P 500 Bull 3X"],
  ["SPXS", "Direxion Daily S&P 500 Bear 3X"],
  ["TNA", "Direxion Daily Small Cap Bull 3X"],
  ["TZA", "Direxion Daily Small Cap Bear 3X"],
  ["FAS", "Direxion Daily Financial Bull 3X"],
  ["FAZ", "Direxion Daily Financial Bear 3X"],
  ["YINN", "Direxion Daily FTSE China Bull 3X"],
  ["YANG", "Direxion Daily FTSE China Bear 3X"],
  ["SOXL", "Direxion Daily Semiconductor Bull 3X"],
  ["SOXS", "Direxion Daily Semiconductor Bear 3X"],
  ["LABU", "Direxion Daily S&P Biotech Bull 3X"],
  ["LABD", "Direxion Daily S&P Biotech Bear 3X"],
  ["NAIL", "Direxion Daily Homebuilders & Supplies Bull 3X"],
  ["DFEN", "Direxion Daily Aerospace & Defense Bull 3X"],
  ["NUGT", "Direxion Daily Gold Miners Bull 2X"],
  ["DUST", "Direxion Daily Gold Miners Bear 2X"],
  ["JNUG", "Direxion Daily Junior Gold Miners Bull 2X"],
  ["JDST", "Direxion Daily Junior Gold Miners Bear 2X"],
  ["GUSH", "Direxion Daily S&P Oil & Gas E&P Bull 2X"],
  ["DRIP", "Direxion Daily S&P Oil & Gas E&P Bear 2X"],
  ["UCO", "ProShares Ultra Bloomberg Crude Oil"],
  ["SCO", "ProShares UltraShort Bloomberg Crude Oil"],
  ["BOIL", "ProShares Ultra Bloomberg Natural Gas"],
  ["KOLD", "ProShares UltraShort Bloomberg Natural Gas"],
  ["UVXY", "ProShares Ultra VIX Short-Term Futures"],
  ["SVXY", "ProShares Short VIX Short-Term Futures"],
  ["VIXY", "ProShares VIX Short-Term Futures"],
  ["UVIX", "2x Long VIX Futures ETF"],
  ["SVIX", "1x Short VIX Futures ETF"],
  ["TMF", "Direxion Daily 20+ Year Treasury Bull 3X"],
  ["TMV", "Direxion Daily 20+ Year Treasury Bear 3X"],
  ["TLT", "iShares 20+ Year Treasury Bond"],
  ["IEF", "iShares 7-10 Year Treasury Bond"],
  ["SHY", "iShares 1-3 Year Treasury Bond"],
  ["HYG", "iShares iBoxx High Yield Corporate Bond"],
  ["JNK", "SPDR Bloomberg High Yield Bond"],
  ["LQD", "iShares iBoxx Investment Grade Corporate Bond"],
  ["BND", "Vanguard Total Bond Market"],
  ["AGG", "iShares Core U.S. Aggregate Bond"],
  ["TIP", "iShares TIPS Bond"],
  ["SCHP", "Schwab U.S. TIPS"],
  ["VOO", "Vanguard S&P 500"],
  ["VTI", "Vanguard Total Stock Market"],
  ["VT", "Vanguard Total World Stock"],
  ["VXUS", "Vanguard Total International Stock"],
  ["IVV", "iShares Core S&P 500"],
  ["SCHD", "Schwab U.S. Dividend Equity"],
  ["VIG", "Vanguard Dividend Appreciation"],
  ["VYM", "Vanguard High Dividend Yield"],
  ["DGRO", "iShares Core Dividend Growth"],
  ["JEPI", "JPMorgan Equity Premium Income"],
  ["JEPQ", "JPMorgan Nasdaq Equity Premium Income"],
  ["HDV", "iShares Core High Dividend"],
  ["IEMG", "iShares Core MSCI Emerging Markets"],
  ["VWO", "Vanguard FTSE Emerging Markets"],
  ["FXI", "iShares China Large-Cap"],
  ["EWJ", "iShares MSCI Japan"],
  ["INDA", "iShares MSCI India"],
  ["EWZ", "iShares MSCI Brazil"],
  ["MCHI", "iShares MSCI China"],
  ["KWEB", "KraneShares CSI China Internet"],
  ["TAN", "Invesco Solar"],
  ["URA", "Global X Uranium"],
  ["LIT", "Global X Lithium & Battery Tech"],
  ["ARKK", "ARK Innovation"],
  ["ARKG", "ARK Genomic Revolution"],
  ["ARKQ", "ARK Autonomous Tech & Robotics"],
  ["ARKW", "ARK Next Generation Internet"],
  ["ARKF", "ARK Fintech Innovation"],
  ["ARKX", "ARK Space Exploration"],
  ["SOXX", "iShares Semiconductor"],
  ["SMH", "VanEck Semiconductor"],
  ["XLK", "Technology Select Sector SPDR"],
  ["XLF", "Financial Select Sector SPDR"],
  ["XLE", "Energy Select Sector SPDR"],
  ["XLV", "Health Care Select Sector SPDR"],
  ["XLY", "Consumer Discretionary Select Sector SPDR"],
  ["XLP", "Consumer Staples Select Sector SPDR"],
  ["XLI", "Industrial Select Sector SPDR"],
  ["XLU", "Utilities Select Sector SPDR"],
  ["XLB", "Materials Select Sector SPDR"],
  ["XLRE", "Real Estate Select Sector SPDR"],
  ["XLC", "Communication Services Select Sector SPDR"],
  ["VNQ", "Vanguard Real Estate"],
  ["IYR", "iShares U.S. Real Estate"],
  ["GLD", "SPDR Gold Shares"],
  ["SLV", "iShares Silver Trust"],
  ["IAU", "iShares Gold Trust"],
  ["BITO", "ProShares Bitcoin ETF"],
  ["BITX", "2x Bitcoin Strategy ETF"],
  ["USO", "United States Oil Fund"],
  ["UNG", "United States Natural Gas Fund"],
  ["DBA", "Invesco DB Agriculture"],
  ["DBC", "Invesco DB Commodity Index"],
];

const have = new Set(secItems.map((x) => x.t));
let added = 0;
for (const [t, n] of EXTRA_ETFS) {
  if (!have.has(t)) {
    secItems.push({ t, n });
    have.add(t);
    added++;
  }
}
console.log(`SEC: ${secItems.length - added}, +ETF: ${added}, total: ${secItems.length}`);

fs.writeFileSync("public/data/stocks-us.json", JSON.stringify(secItems));
console.log("size:", fs.statSync("public/data/stocks-us.json").size);
