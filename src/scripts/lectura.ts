// Marcador de lectura. Vive en el navegador del lector: sin cuentas, sin
// backend, sin cookies. Si localStorage no esta disponible el sitio funciona
// igual, solo que sin memoria.
type Marca = {
  slug: string;
  number: number;
  title: string;
  novelTitle: string;
  at: number;
};

type Estado = Record<string, { last: Marca | null; read: string[] }>;

const KEY = "renacentista:lectura:v1";

function cargar(): Estado {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Estado;
  } catch {
    return {};
  }
}

function guardar(estado: Estado): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(estado));
  } catch {
    /* modo privado: se lee igual, solo no se recuerda */
  }
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** En la entrega abierta: deja la marca y, al llegar al pie, la da por leida. */
function registrarLectura(): void {
  const el = document.querySelector<HTMLElement>("[data-current-installment]");
  if (!el) return;

  const novel = el.dataset.novel ?? "";
  const slug = el.dataset.slug ?? "";
  const estado = cargar();
  const previo = estado[novel] ?? { last: null, read: [] };

  estado[novel] = {
    ...previo,
    last: {
      slug,
      number: Number(el.dataset.number ?? "1"),
      title: el.dataset.title ?? "",
      novelTitle: el.dataset.novelTitle ?? "",
      at: Date.now()
    }
  };
  guardar(estado);

  const fin = document.querySelector("[data-installment-end]");
  if (!fin) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    const actual = cargar();
    const obra = actual[novel] ?? { last: null, read: [] };
    if (!obra.read.includes(slug)) obra.read = [...obra.read, slug];
    actual[novel] = obra;
    guardar(actual);
    observer.disconnect();
    pintarIndice();
  });
  observer.observe(fin);
}

/** Indice de una obra: marca lo leido y senala donde se quedo. */
function pintarIndice(): void {
  const estado = cargar();
  document.querySelectorAll<HTMLElement>("[data-index-item]").forEach((item) => {
    const novel = item.dataset.novel ?? "";
    const slug = item.dataset.slug ?? "";
    const obra = estado[novel];
    if (!obra) return;

    const marca = item.querySelector<HTMLElement>("[data-index-mark]");
    if (marca) {
      if (obra.last?.slug === slug) {
        marca.textContent = "▸";
        marca.classList.add("text-phosphor", "glow-phosphor");
      } else if (obra.read.includes(slug)) {
        marca.textContent = "✓";
        marca.classList.add("text-base-600");
      }
    }
    if (obra.last?.slug === slug) item.classList.add("bg-phosphor-soft");
  });
}

/** Tarjetas de obra: "vas en 03/07" y el enlace para retomar. */
function pintarProgreso(): void {
  const estado = cargar();
  document.querySelectorAll<HTMLElement>("[data-novel-progress]").forEach((el) => {
    const novel = el.dataset.novelProgress ?? "";
    const total = Number(el.dataset.total ?? "0");
    const obra = estado[novel];
    if (!obra?.last) return;

    el.textContent = `vas en ${pad(obra.last.number)}/${pad(total)}`;
    el.hidden = false;

    const resume = document.querySelector<HTMLAnchorElement>(
      `[data-novel-resume="${novel}"]`
    );
    if (resume) {
      resume.href = `/novelas/${novel}/${obra.last.slug}`;
      resume.hidden = false;
    }
  });
}

/** Barra superior del inicio: la ultima obra tocada, sea cual sea. */
function pintarContinuar(): void {
  const barra = document.querySelector<HTMLElement>("[data-continue-bar]");
  if (!barra) return;

  const estado = cargar();
  const ultima = Object.entries(estado)
    .filter(([, obra]) => obra.last)
    .sort((a, b) => (b[1].last?.at ?? 0) - (a[1].last?.at ?? 0))
    .at(0);
  if (!ultima) return;

  const [novel, obra] = ultima;
  const marca = obra.last as Marca;
  const enlace = barra.querySelector<HTMLAnchorElement>("[data-continue-link]");
  const texto = barra.querySelector<HTMLElement>("[data-continue-text]");
  if (enlace) enlace.href = `/novelas/${novel}/${marca.slug}`;
  if (texto) {
    texto.textContent = `${marca.novelTitle} · entrega ${pad(marca.number)} · ${marca.title}`;
  }
  barra.hidden = false;
}

registrarLectura();
pintarIndice();
pintarProgreso();
pintarContinuar();
