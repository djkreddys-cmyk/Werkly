"use client";
import { useEffect, useRef } from "react";
import { agreementHtml, RICH_AGREEMENT } from "@/lib/agreement-format";

export function AgreementEditor({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const last = useRef("");
  const selection = useRef<Range | null>(null);
  useEffect(() => { if (editor.current && value !== last.current) { editor.current.innerHTML = agreementHtml(value); last.current = value; selection.current = null; } }, [value]);
  const saveSelection = () => { const s = window.getSelection(); if (s?.rangeCount && editor.current?.contains(s.anchorNode)) selection.current = s.getRangeAt(0).cloneRange(); };
  const emit = () => { last.current = RICH_AGREEMENT + agreementHtml(RICH_AGREEMENT + (editor.current?.innerHTML || "")); onChange(last.current); saveSelection(); };
  const command = (name: string, arg?: string) => {
    if (disabled) return;
    editor.current?.focus();
    if (selection.current) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(selection.current); }
    document.execCommand(name, false, arg); emit();
  };
  return <div className="mt-2 rounded-lg border border-[var(--color-line)]">
    <div role="toolbar" aria-label="Agreement formatting" className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-2">
      {[["Bold", "bold"], ["Italic", "italic"], ["Underline", "underline"], ["Left", "justifyLeft"], ["Center", "justifyCenter"], ["Right", "justifyRight"], ["Bullets", "insertUnorderedList"], ["Numbering", "insertOrderedList"], ["Undo", "undo"], ["Redo", "redo"]].map(([label, action]) => <button key={action} type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command(action)} className="rounded border bg-white px-2 py-1 text-sm disabled:opacity-40">{label}</button>)}
      <select aria-label="Font size" defaultValue="3" disabled={disabled} onChange={e => command("fontSize", e.target.value)} className="rounded border bg-white p-1">{[8, 10, 12, 14, 18, 24, 32].map((size, i) => <option key={size} value={i + 1}>{size} pt</option>)}</select>
      <select aria-label="Paragraph style" defaultValue="p" disabled={disabled} onChange={e => command("formatBlock", e.target.value)} className="rounded border bg-white p-1"><option value="p">Normal</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>
    </div>
    <div ref={editor} role="textbox" aria-label="Agreement content" aria-multiline="true" aria-readonly={disabled} contentEditable={!disabled} suppressContentEditableWarning onInput={emit} onMouseUp={saveSelection} onKeyUp={saveSelection} onPaste={e => { e.preventDefault(); command("insertText", e.clipboardData.getData("text/plain")); }} onDrop={e => e.preventDefault()} className="min-h-[320px] max-h-[480px] overflow-auto p-4 text-sm leading-relaxed outline-none [&_p]:mb-3 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6" />
  </div>;
}
