import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Language } from '../../types';

const ExplorerContent = lazy(() => import('./AmenitiesExplorerContent'));

class ExplorerLoadBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">{this.props.message}</p> : this.props.children;
  }
}

export function AmenitiesExplorerEntry({ language }: { language: Language }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const zh = language === 'zh';

  function close(navigate = false) {
    dialog.current?.close();
    setOpen(false);
    if (!navigate) trigger.current?.focus();
  }

  function focusDestination() {
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('.app-header h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  }

  useEffect(() => {
    if (!open) return;
    const onHashChange = () => { close(true); focusDestination(); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [open]);

  return <>
    <button type="button" className="amenities-explorer-trigger" ref={trigger} aria-haspopup="dialog" onClick={() => {
      dialog.current?.showModal();
      title.current?.focus();
      setOpen(true);
    }}>{zh ? '探索公共服務' : 'Explore Public Services'}</button>
    {createPortal(<dialog
      ref={dialog} className="amenities-explorer-dialog" aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault(); event.stopPropagation(); close();
        }
      }}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
        if (anchor?.hash === window.location.hash) { close(true); focusDestination(); }
      }}
    >
      <div className="amenities-explorer-dialog-header">
        <h2 ref={title} id={id} tabIndex={-1}>{zh ? '公共服務探索' : 'Civic Explorer'}</h2>
        <button type="button" onClick={() => close()}>{zh ? '關閉探索' : 'Close Explorer'}</button>
      </div>
      {open && <div className="amenities-explorer-body">
        <ExplorerLoadBoundary message={zh ? '暫時無法載入探索工具。請關閉探索並使用原有導覽。' : 'Explorer could not load. Close it and use the existing navigation.'}>
          <Suspense fallback={<p role="status">{zh ? '載入探索工具中…' : 'Loading Explorer…'}</p>}>
            <ExplorerContent language={language} />
          </Suspense>
        </ExplorerLoadBoundary>
      </div>}
    </dialog>, document.body)}
  </>;
}
