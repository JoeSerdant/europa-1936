import { useEffect, useRef, useState } from 'react';
import { useUi } from '../store.js';
import { closeConsole, runConsole } from '../actions.js';

/** Konzole s cheaty (klávesa ~ nebo F2): jeden řádek příkazu, šipka nahoru vrací předchozí příkazy, `help` vypíše seznam. */
export function Console() {
  const open = useUi((s) => s.console);
  const [lines, setLines] = useState([{ k: 'msg', t: 'Konzole cheatů. Napište help pro seznam příkazů.' }]);
  const [text, setText] = useState('');
  const hist = useRef([]);
  const hi = useRef(0);
  const input = useRef(null);
  const end = useRef(null);
  useEffect(() => { if (open && input.current) input.current.focus(); }, [open]);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: 'end' }); }, [lines, open]);
  if (!open) return null;
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    hist.current.push(t); hi.current = hist.current.length;
    const msg = runConsole(t);
    setLines((l) => [...l.slice(-60), { k: 'cmd', t: `> ${t}` }, ...(msg ? msg.split('\n').map((x) => ({ k: 'msg', t: x })) : [])]);
    setText('');
  };
  const onKey = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submit();
    else if (e.key === 'Escape' || e.key === '`' || e.key === '~' || e.key === 'F2') { e.preventDefault(); closeConsole(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hi.current = Math.max(0, hi.current - 1); setText(hist.current[hi.current] || ''); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi.current = Math.min(hist.current.length, hi.current + 1); setText(hist.current[hi.current] || ''); }
  };
  return (
    <section className="console" role="dialog" aria-label="Konzole">
      <div className="con-out" aria-live="polite">
        {lines.map((l, i) => <p key={i} className={l.k}>{l.t}</p>)}
        <span ref={end} />
      </div>
      <input ref={input} className="con-in" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="příkaz (help)" aria-label="Příkaz konzole" spellCheck={false} autoComplete="off" />
    </section>
  );
}
