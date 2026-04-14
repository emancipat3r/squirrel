export type Theme = {
  id: string;
  name: string;
  vars: Record<string, string>;
};

export const themes: Theme[] = [
  {
    id: "gruvbox",
    name: "Gruvbox Dark",
    vars: {
      "--bg-hard": "#1d2021",
      "--bg": "#282828",
      "--bg1": "#3c3836",
      "--bg2": "#504945",
      "--bg3": "#665c54",
      "--fg": "#ebdbb2",
      "--fg-muted": "#a89984",
      "--fg-dim": "#928374",
      "--red": "#fb4934",
      "--green": "#b8bb26",
      "--yellow": "#fabd2f",
      "--blue": "#83a598",
      "--purple": "#d3869b",
      "--aqua": "#8ec07c",
      "--orange": "#fe8019",
      "--accent": "#fe8019",
      "--accent-rgb": "254, 128, 25",
      "--secondary": "#8ec07c",
      "--secondary-rgb": "142, 192, 124",
      "--question-accent": "#fabd2f",
      "--question-rgb": "250, 189, 47",
      "--danger": "#fb4934",
      "--danger-rgb": "251, 73, 52",
    },
  },
  {
    id: "nord",
    name: "Nord",
    vars: {
      "--bg-hard": "#2e3440",
      "--bg": "#3b4252",
      "--bg1": "#434c5e",
      "--bg2": "#4c566a",
      "--bg3": "#5a657b",
      "--fg": "#eceff4",
      "--fg-muted": "#d8dee9",
      "--fg-dim": "#7b88a1",
      "--red": "#bf616a",
      "--green": "#a3be8c",
      "--yellow": "#ebcb8b",
      "--blue": "#81a1c1",
      "--purple": "#b48ead",
      "--aqua": "#88c0d0",
      "--orange": "#d08770",
      "--accent": "#88c0d0",
      "--accent-rgb": "136, 192, 208",
      "--secondary": "#a3be8c",
      "--secondary-rgb": "163, 190, 140",
      "--question-accent": "#ebcb8b",
      "--question-rgb": "235, 203, 139",
      "--danger": "#bf616a",
      "--danger-rgb": "191, 97, 106",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin Mocha",
    vars: {
      "--bg-hard": "#1e1e2e",
      "--bg": "#24243e",
      "--bg1": "#313244",
      "--bg2": "#45475a",
      "--bg3": "#585b70",
      "--fg": "#cdd6f4",
      "--fg-muted": "#bac2de",
      "--fg-dim": "#6c7086",
      "--red": "#f38ba8",
      "--green": "#a6e3a1",
      "--yellow": "#f9e2af",
      "--blue": "#89b4fa",
      "--purple": "#cba6f7",
      "--aqua": "#94e2d5",
      "--orange": "#fab387",
      "--accent": "#cba6f7",
      "--accent-rgb": "203, 166, 247",
      "--secondary": "#94e2d5",
      "--secondary-rgb": "148, 226, 213",
      "--question-accent": "#f9e2af",
      "--question-rgb": "249, 226, 175",
      "--danger": "#f38ba8",
      "--danger-rgb": "243, 139, 168",
    },
  },
  {
    id: "tokyonight",
    name: "Tokyo Night",
    vars: {
      "--bg-hard": "#1a1b26",
      "--bg": "#24283b",
      "--bg1": "#2f3549",
      "--bg2": "#3b4261",
      "--bg3": "#545c7e",
      "--fg": "#c0caf5",
      "--fg-muted": "#a9b1d6",
      "--fg-dim": "#565f89",
      "--red": "#f7768e",
      "--green": "#9ece6a",
      "--yellow": "#e0af68",
      "--blue": "#7aa2f7",
      "--purple": "#bb9af7",
      "--aqua": "#73daca",
      "--orange": "#ff9e64",
      "--accent": "#7aa2f7",
      "--accent-rgb": "122, 162, 247",
      "--secondary": "#73daca",
      "--secondary-rgb": "115, 218, 202",
      "--question-accent": "#e0af68",
      "--question-rgb": "224, 175, 104",
      "--danger": "#f7768e",
      "--danger-rgb": "247, 118, 142",
    },
  },
  {
    id: "solarized",
    name: "Solarized Dark",
    vars: {
      "--bg-hard": "#002b36",
      "--bg": "#073642",
      "--bg1": "#0a4050",
      "--bg2": "#1a5060",
      "--bg3": "#2a6070",
      "--fg": "#fdf6e3",
      "--fg-muted": "#93a1a1",
      "--fg-dim": "#657b83",
      "--red": "#dc322f",
      "--green": "#859900",
      "--yellow": "#b58900",
      "--blue": "#268bd2",
      "--purple": "#6c71c4",
      "--aqua": "#2aa198",
      "--orange": "#cb4b16",
      "--accent": "#268bd2",
      "--accent-rgb": "38, 139, 210",
      "--secondary": "#2aa198",
      "--secondary-rgb": "42, 161, 152",
      "--question-accent": "#b58900",
      "--question-rgb": "181, 137, 0",
      "--danger": "#dc322f",
      "--danger-rgb": "220, 50, 47",
    },
  },
  {
    id: "rosepine",
    name: "Rose Pine",
    vars: {
      "--bg-hard": "#191724",
      "--bg": "#1f1d2e",
      "--bg1": "#26233a",
      "--bg2": "#393552",
      "--bg3": "#524f67",
      "--fg": "#e0def4",
      "--fg-muted": "#908caa",
      "--fg-dim": "#6e6a86",
      "--red": "#eb6f92",
      "--green": "#9ccfd8",
      "--yellow": "#f6c177",
      "--blue": "#31748f",
      "--purple": "#c4a7e7",
      "--aqua": "#9ccfd8",
      "--orange": "#f6c177",
      "--accent": "#c4a7e7",
      "--accent-rgb": "196, 167, 231",
      "--secondary": "#9ccfd8",
      "--secondary-rgb": "156, 207, 216",
      "--question-accent": "#f6c177",
      "--question-rgb": "246, 193, 119",
      "--danger": "#eb6f92",
      "--danger-rgb": "235, 111, 146",
    },
  },
];

const STORAGE_KEY = "squirrel-theme";

export function loadThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "gruvbox";
}

export function saveThemeId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
  // Derived semantic tokens that use rgb values
  const r = theme.vars;
  root.style.setProperty("--surface", `rgba(${hexToRgb(r["--fg"])}, 0.04)`);
  root.style.setProperty("--surface-hover", `rgba(${hexToRgb(r["--fg"])}, 0.08)`);
  root.style.setProperty("--border", `rgba(${hexToRgb(r["--fg"])}, 0.08)`);
  root.style.setProperty("--border-subtle", `rgba(${hexToRgb(r["--fg"])}, 0.05)`);
  root.style.setProperty("--accent-dim", `rgba(${r["--accent-rgb"]}, 0.12)`);
  root.style.setProperty("--accent-glow", `rgba(${r["--accent-rgb"]}, 0.25)`);
  root.style.setProperty("--secondary-dim", `rgba(${r["--secondary-rgb"]}, 0.12)`);
  root.style.setProperty("--secondary-glow", `rgba(${r["--secondary-rgb"]}, 0.25)`);
  root.style.setProperty("--question-dim", `rgba(${r["--question-rgb"]}, 0.12)`);
  root.style.setProperty("--question-glow", `rgba(${r["--question-rgb"]}, 0.25)`);
  root.style.setProperty("--danger-dim", `rgba(${r["--danger-rgb"]}, 0.15)`);
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
