import type { CSSProperties, ReactNode } from "react";
import type { ExplorerMotif } from "./types";

interface HexIslandProps {
  color: string; motif: ExplorerMotif; label: ReactNode; caption: string;
  selected?: boolean; inactive?: boolean; onSelect: () => void;
  style?: CSSProperties; nodeId: string; kind?: "node" | "group";
}
/** Portfolio-independent polygon art inside a native HTML button. */
export function HexIsland({ color, motif, label, caption, selected, inactive, onSelect, style, nodeId, kind = "node" }: HexIslandProps): JSX.Element {
  return <button type="button" className="civic-island" data-node={nodeId} data-selected={selected || undefined} data-inactive={inactive || undefined}
    data-explorer-node={kind === "node" ? nodeId : undefined} data-explorer-group={kind === "group" ? nodeId : undefined}
    aria-pressed={Boolean(selected)} onClick={onSelect} style={{ ...style, "--island-hue": color } as CSSProperties}>
    <svg viewBox="0 0 220 180" aria-hidden="true" focusable="false" className="civic-island-art">
      <ellipse cx="110" cy="155" rx="87" ry="20" className="island-shadow" />
      <g className="island-lift">
        <polygon points="24,105 110,147 110,166 24,124" className="island-side-left" />
        <polygon points="110,147 196,105 196,124 110,166" className="island-side-right" />
        <polygon points="110,23 196,64 196,105 110,147 24,105 24,64" className="island-top" />
        <polygon points="110,33 185,69 185,100 110,136 35,100 35,69" className="island-inset" />
        <path d="M45 94 109 124 175 92 M110 124v-24" className="island-path" />
        {motif === 0 && <g className="island-motif"><path d="M70 89V57m20 42V67m48 29V60" /><polygon points="70,39 54,68 86,68" /><polygon points="90,52 76,78 104,78" /><polygon points="138,39 120,74 156,74" /></g>}
        {motif === 1 && <g className="island-motif"><path d="M73 96V67l37-17 37 17v29l-37 18zM110 82v32M73 67l37 15 37-15M94 58v-9l16-8 16 8v9M103 62h14m-7-7v14" /></g>}
        {motif === 2 && <g className="island-motif"><path d="m57 81 74-35 36 17-74 36zM57 81v13l36 17 74-35V63M93 99v12M72 85l14 7m26-17 13-6m12-6 13-6" /><circle cx="84" cy="108" r="4" /><circle cx="145" cy="88" r="4" /></g>}
        {motif === 3 && <g className="island-motif"><path d="M68 100V64l26-12 26 12v36M94 77v36m-26-49 26 13 26-13M120 100V44l23-11 23 11v36m-23-24v35m-23-47 23 12 23-12M77 79l9 4m13 5 10-5m20-18 8 4m12-3 9-4" /></g>}
        {motif === 4 && <g className="island-motif"><path d="m110 39 37 18v27c0 15-19 28-37 34-18-6-37-19-37-34V57zM91 79l14 15 25-32" /></g>}
        {motif === 5 && <g className="island-motif"><path d="M68 69q42-43 84 0M82 81q28-29 56 0M97 93q13-14 26 0M110 102v3" /><circle cx="110" cy="106" r="3" /></g>}
        <path d="m44 111 12 6m3 2 12 6m80-3 12-6" className="island-edge" />
      </g>
    </svg>
    <span className="civic-island-label">{label}</span><span className="civic-island-caption">{caption}</span>
  </button>;
}
