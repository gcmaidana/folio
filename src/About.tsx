import {ArrowUpRight} from 'lucide-react';

export default function About(){
 return <section className="panel about-panel" aria-label="About Folio">
  <div className="about-intro">
   <span className="eyebrow">AN AI-DIRECTED PROJECT</span>
   <h2>Built with AI. Directed by me.</h2>
   <p>Folio is a stock analysis project created with GPT-6 Astra through Codex. I directed AI agents through prompts and feedback to turn a product idea into a working application.</p>
   <p>The purpose of this project is to demonstrate practical AI skills: defining requirements, evaluating generated work, identifying problems, and guiding improvements. The agents wrote the code; I set the direction and reviewed the results.</p>
   <a className="pill" href="https://github.com/gcmaidana/folio" target="_blank" rel="noreferrer">Explore the source on GitHub <ArrowUpRight size={15}/></a>
  </div>
  <div className="about-grid">
   <section><h3>My role</h3><ul>
    <li>Defined feature specifications and the experience I wanted users to have.</li>
    <li>Directed agents through implementation, code review, debugging, and iteration.</li>
    <li>Reviewed local previews, questioned inaccurate results, and gave specific feedback.</li>
   </ul></section>
   <section><h3>What Folio does</h3><ul>
    <li>Retrieves market data from Yahoo Finance through a Cloudflare Worker.</li>
    <li>Provides interactive stock charts, ticker comparisons, and a browser-saved watchlist.</li>
    <li>Includes 30-, 100-, and 200-period simple moving averages, market statistics, and CSV exports.</li>
   </ul></section>
  </div>
  <section className="about-example"><span className="eyebrow">AN EXAMPLE OF THE PROCESS</span><h3>Question the result. Improve the calculation.</h3><p>When the daily percentage looked wrong, I flagged the discrepancy and asked the agent to investigate. The daily chart was measuring from its first intraday bar, missing the overnight move. I directed a correction to use the previous session’s close, then reviewed the updated preview. Regression tests now cover that case.</p></section>
  <div className="about-stack"><span>Built with</span><ul>{['JavaScript','TypeScript','React','Recharts','Cloudflare Workers','Codex · GPT-6 Astra'].map(item=><li key={item}>{item}</li>)}</ul></div>
  <p className="about-footnote">Moving-average periods follow the selected chart interval; daily-data ranges use trading days. Folio is a résumé project for exploring market data.</p>
 </section>;
}
