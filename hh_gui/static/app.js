(() => {
  const STORAGE = "hh-applicant-gui-v1";
  const PRESETS = "hh-applicant-gui-presets";

  const NAV = [
    { id: "overview", title: "Обзор", hint: "Сессия и лимиты" },
    {
      title: "Автоматизация",
      pages: [
        ["apply", "Автоотклики", "Поиск и рассылка"],
        ["chats", "Авточаты", "Автоответчик"],
        ["clear", "Отказы", "Скрытие откликов"],
      ],
    },
    {
      title: "Сбор",
      pages: [
        ["contacts", "Контакты", "Собеседования"],
        ["vacancies", "Подходящие", "Оценка в процентах"],
      ],
    },
    { id: "resumes", title: "Резюме", hint: "Список и поднятие" },
    { id: "auth", title: "Вход", hint: "Код, пароль, выход" },
    { id: "api", title: "API", hint: "Свой запрос" },
    { id: "config", title: "Конфиг", hint: "config.toml" },
    { id: "logs", title: "Лог", hint: "Файл log.txt" },
  ];
  const PAGE_IDS = NAV.flatMap((item) => (item.pages ? item.pages.map(([id]) => id) : [item.id]));

  const EXPERIENCE = [
    ["", "Любой"],
    ["noExperience", "Нет опыта"],
    ["between1And3", "1–3 года"],
    ["between3And6", "3–6 лет"],
    ["moreThan6", "Более 6 лет"],
  ];
  const SCHEDULE = [
    ["", "Любой"],
    ["fullDay", "Полный день"],
    ["shift", "Сменный"],
    ["flexible", "Гибкий"],
    ["remote", "Удалённый"],
    ["flyInFlyOut", "Вахта"],
  ];
  const ORDER = [
    ["", "Как решит сайт"],
    ["relevance", "По соответствию"],
    ["publication_time", "Сначала новые"],
    ["salary_desc", "Зарплата по убыванию"],
    ["salary_asc", "Зарплата по возрастанию"],
    ["distance", "Ближе к точке"],
  ];
  const WORK = [
    ["REMOTE", "Удалённо"],
    ["HYBRID", "Гибрид"],
    ["ON_SITE", "В офисе"],
    ["FIELD_WORK", "Разъезд"],
  ];
  const EMPLOYMENT = [
    ["full", "Полная"],
    ["part", "Частичная"],
    ["project", "Проект"],
    ["volunteer", "Волонтёрство"],
    ["probation", "Стажировка"],
  ];
  const LABELS = [
    ["with_address", "С адресом"],
    ["accept_handicapped", "Доступна с инвалидностью"],
    ["not_from_agency", "Без агентств"],
    ["accept_kids", "От 14 лет"],
    ["accredited_it", "Аккредитованная IT"],
    ["low_performance", "Мало откликов"],
  ];
  const SEARCH_FIELDS = [
    ["name", "Название"],
    ["company_name", "Компания"],
    ["description", "Описание"],
  ];
  const AREA_PRESETS = [
    ["1", "Москва"],
    ["2", "Петербург"],
    ["113", "Россия"],
    ["40", "Казахстан"],
    ["2238", "Беларусь"],
  ];

  const SNIPPETS = {
    "[general]": `[general]
user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
base_url = "https://hh.ru"
captcha_lang = "RU"
# proxy_url = "socks5h://127.0.0.1:1080"
`,
    "[openai.default]": `[openai.default]
base_url = "http://127.0.0.1:11434/v1"
model = "qwen3-vl:8b"
# api_key = ""
# proxy_url = "socks5h://127.0.0.1:1080"
delay = 0.5
timeout = 90.0
connect_timeout = 10.0
temperature = 0.0
max_completion_tokens = 1000
`,
    "[openai.captcha]": `[openai.captcha]
# Отдельная vision-модель, если основная не видит картинки
# base_url = "http://127.0.0.1:8080/v1"
# model = "gemma"
`,
    "[smtp]": `[smtp]
host = "smtp.example.com"
port = 465
user = "me@example.com"
password = ""
from = "Имя <me@example.com>"
ssl = true
starttls = false
`,
    "[api_client]": `[api_client]
base_url = "https://api.hh.ru/"
delay = 0.345
max_retries = 3
`,
  };

  function defaultApply() {
    return {
      resumeId: "",
      search: "",
      orderBy: "",
      totalPages: "1",
      perPage: "10",
      maxResponses: "",
      excludedFilter: "",
      aiFilter: "",
      experience: "",
      schedule: "",
      workFormat: [],
      employment: [],
      salary: "",
      currency: "",
      onlyWithSalary: "",
      period: "",
      dateFrom: "",
      dateTo: "",
      area: "",
      metro: "",
      professionalRole: "",
      industry: "",
      employerId: "",
      excludedEmployerId: "",
      label: [],
      searchField: [],
      premium: "",
      noMagic: false,
      forceLetter: "yes",
      sendEmail: "",
      skipTests: "",
      dryRun: "yes",
      topLat: "",
      bottomLat: "",
      leftLng: "",
      rightLng: "",
      sortPointLat: "",
      sortPointLng: "",
    };
  }

  function loadPersisted() {
    const empty = {
      page: "overview",
      globals: {
        verbosity: 0,
        profile: ".",
        configDir: "",
        apiDelay: "",
        baseUrl: "",
        userAgent: "",
        proxyUrl: "",
        openaiProxy: "",
        openaiDelay: "",
        openaiTimeout: "",
        openaiConnectTimeout: "",
        captchaLang: "",
        useAi: true,
        manualCaptcha: false,
        handleCaptcha: true,
      },
      apply: defaultApply(),
      reply: { resumeId: "", maxPages: "20", dryRun: "no", loop: "yes", noBump: false },
      clear: { blacklist: "", olderThan: "", deleteChat: false, dryRun: "yes" },
      auth: { username: "" },
      api: { method: "GET", endpoint: "/me", params: "", asJson: false },
      termHeight: 280,
      logFollow: false,
      leadsLimit: 80,
      vacancyLimit: 20,
      scorePrompt: "",
      applyTab: "search",
      chatTab: "run",
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (!saved) return empty;
      saved.globals = { ...empty.globals, ...(saved.globals || {}) };
      saved.apply = { ...defaultApply(), ...(saved.apply || {}) };
      saved.reply = { ...empty.reply, ...(saved.reply || {}) };
      saved.clear = { ...empty.clear, ...(saved.clear || {}) };
      saved.auth = { username: saved.auth?.username || "" };
      saved.api = { ...empty.api, ...(saved.api || {}) };
      saved.page = PAGE_IDS.includes(saved.page) ? saved.page : "overview";
      saved.leadsLimit = clampLimit(saved.leadsLimit);
      saved.vacancyLimit = clampScoreLimit(saved.vacancyLimit);
      saved.scorePrompt = typeof saved.scorePrompt === "string" ? saved.scorePrompt : "";
      saved.applyTab = ["search", "filter", "letter", "tests"].includes(saved.applyTab) ? saved.applyTab : "search";
      saved.chatTab = ["run", "reply", "options", "bump"].includes(saved.chatTab) ? saved.chatTab : "run";
      return { ...empty, ...saved };
    } catch {
      return empty;
    }
  }

  const state = loadPersisted();
  state.password = "";
  state.snapshot = { me: null, resumes: [], message: "", authorized: false };
  state.jobs = [];
  state.activeJob = null;
  state.hidden = new Set();
  state.dockOpen = false;
  state.logs = {};
  state.pending = {};
  state.configText = "";
  state.configPath = "";
  state.configBaseline = "";
  state.configDirty = false;
  state.configLoading = false;
  state.form = null;
  state.formDirty = false;
  state.formParseError = "";
  state.leads = null;
  state.leadsLimit = clampLimit(state.leadsLimit);
  state.vacancyLimit = clampScoreLimit(state.vacancyLimit);
  state.scorePrompt = state.scorePrompt || "";
  state.vacancies = null;
  state.today = null;
  state.logText = "";
  state.logPath = "";
  state.areaHits = [];
  state.areaQuery = "";
  state.binary = null;
  state.binaryError = "";
  state.profiles = [];
  state.defaultConfigRoot = "";
  state.configRoot = "";
  state.ws = null;
  state.logTimer = 0;
  const terms = new Map();
  let termErrorShown = false;
  let configGeneration = 0;
  let previewTimer = 0;

  function persist() {
    const data = {
      page: state.page,
      globals: state.globals,
      apply: state.apply,
      reply: state.reply,
      clear: state.clear,
      auth: { username: state.auth.username },
      api: state.api,
      termHeight: state.termHeight,
      logFollow: state.logFollow,
      leadsLimit: state.leadsLimit,
      vacancyLimit: state.vacancyLimit,
      scorePrompt: state.scorePrompt,
      applyTab: state.applyTab,
      chatTab: state.chatTab,
    };
    localStorage.setItem(STORAGE, JSON.stringify(data));
  }

  function presets() {
    try {
      const data = JSON.parse(localStorage.getItem(PRESETS) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function field(label, control, help) {
    const tag = control && ["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName) ? "label" : "div";
    const wrap = document.createElement(tag);
    wrap.className = "field";
    wrap.append(el("span", "field-label", label), control);
    if (help) wrap.append(el("small", "", help));
    return wrap;
  }

  function button(label, className, onClick, opts = {}) {
    const node = el("button", className, label);
    node.type = "button";
    if (opts.run) node.dataset.run = "1";
    if (opts.title) node.title = opts.title;
    node.addEventListener("click", onClick);
    return node;
  }

  function cmdButton(title, hint, onClick, opts = {}) {
    const node = el("button", `cmd${opts.danger ? " danger" : ""}`);
    node.type = "button";
    if (opts.run !== false) node.dataset.run = "1";
    node.append(el("strong", "", title), el("small", "", hint));
    node.addEventListener("click", onClick);
    return node;
  }

  function choiceChips(options, value, onChange) {
    const row = el("div", "chips");
    for (const [id, label] of options) {
      row.append(button(label, `chip${value === id ? " on" : ""}`, () => {
        onChange(id);
        rerender();
      }));
    }
    return row;
  }

  function textInput(value, oninput, attrs = {}) {
    const input = document.createElement(attrs.multiline ? "textarea" : "input");
    if (!attrs.multiline) input.type = attrs.type || "text";
    input.value = value ?? "";
    input.placeholder = attrs.placeholder || "";
    input.spellcheck = false;
    input.autocomplete = attrs.autocomplete || "off";
    if (attrs.inputmode) input.inputMode = attrs.inputmode;
    input.addEventListener("input", () => oninput(input.value));
    return input;
  }

  function selectFrom(options, value, onChange) {
    const select = document.createElement("select");
    for (const [id, label] of options) {
      const option = el("option", "", label);
      option.value = id;
      select.append(option);
    }
    select.value = options.some(([id]) => id === value) ? value : "";
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function banner(kind, text) {
    return el("div", `banner ${kind}`, text);
  }

  function card(title, hint, children, plain = false) {
    const box = el("section", "card");
    if (title) box.append(el("h2", "", title));
    if (hint) box.append(el("p", "muted", hint));
    const body = el("div", plain ? "stack" : "grid");
    children.filter(Boolean).forEach((child) => body.append(child));
    box.append(body);
    return box;
  }

  function span2(node) {
    node.classList.add("span-2");
    return node;
  }

  function toast(message) {
    const host = document.getElementById("toasts");
    const node = el("div", "toast", message);
    host.append(node);
    setTimeout(() => node.remove(), 5200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text || "");
      toast("Скопировано");
    } catch {
      toast("Не удалось скопировать");
    }
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.detail || `Ошибка ${response.status}`);
    return data;
  }

  function tokens(value) {
    return String(value || "")
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function pushFlag(args, flag, value) {
    const text = String(value ?? "").trim();
    if (text) args.push(flag, text);
  }

  function pushMulti(args, flag, value) {
    const items = Array.isArray(value) ? value.filter(Boolean) : tokens(value);
    if (items.length) args.push(flag, ...items);
  }

  function pushTri(args, flag, value) {
    if (value === "yes") args.push(flag);
    if (value === "no") args.push(`--no-${flag.replace(/^--/, "")}`);
  }

  function applyArgs() {
    const form = state.apply;
    const args = [];
    pushFlag(args, "--resume-id", form.resumeId);
    pushFlag(args, "--search", form.search);
    pushFlag(args, "--order-by", form.orderBy);
    pushFlag(args, "--total-pages", form.totalPages);
    pushFlag(args, "--per-page", form.perPage);
    pushFlag(args, "--max-responses", form.maxResponses);
    pushFlag(args, "--excluded-filter", form.excludedFilter);
    pushTri(args, "--ai-filter", form.aiFilter);
    pushFlag(args, "--experience", form.experience);
    pushFlag(args, "--schedule", form.schedule);
    pushMulti(args, "--work-format", form.workFormat);
    pushMulti(args, "--employment", form.employment);
    pushFlag(args, "--salary", form.salary);
    pushFlag(args, "--currency", form.currency);
    pushTri(args, "--only-with-salary", form.onlyWithSalary);
    pushFlag(args, "--period", form.period);
    pushFlag(args, "--date-from", form.dateFrom);
    pushFlag(args, "--date-to", form.dateTo);
    pushMulti(args, "--area", form.area);
    pushMulti(args, "--metro", form.metro);
    pushMulti(args, "--professional-role", form.professionalRole);
    pushMulti(args, "--industry", form.industry);
    pushMulti(args, "--employer-id", form.employerId);
    pushMulti(args, "--excluded-employer-id", form.excludedEmployerId);
    pushMulti(args, "--label", form.label);
    pushMulti(args, "--search-field", form.searchField);
    pushTri(args, "--premium", form.premium);
    if (form.noMagic) args.push("--no-magic");
    pushTri(args, "--force-cover-letter", form.forceLetter === "no" ? "no" : "yes");
    pushTri(args, "--send-email", form.sendEmail);
    pushTri(args, "--skip-tests", form.skipTests);
    pushTri(args, "--dry-run", form.dryRun === "no" ? "no" : "yes");
    pushFlag(args, "--top-lat", form.topLat);
    pushFlag(args, "--bottom-lat", form.bottomLat);
    pushFlag(args, "--left-lng", form.leftLng);
    pushFlag(args, "--right-lng", form.rightLng);
    pushFlag(args, "--sort-point-lat", form.sortPointLat);
    pushFlag(args, "--sort-point-lng", form.sortPointLng);
    return args;
  }

  function clearArgs(overrides = {}) {
    const form = { ...state.clear, ...overrides };
    const args = [];
    pushTri(args, "--blacklist-discard", form.blacklist);
    pushFlag(args, "--older-than", form.olderThan);
    if (form.deleteChat) args.push("--delete-chat");
    if (form.dryRun !== "no") args.push("--dry-run");
    return args;
  }

  function replyArgs(overrides = {}) {
    const form = { ...state.reply, ...overrides };
    const args = [];
    pushFlag(args, "--resume-id", form.resumeId);
    pushFlag(args, "--max-pages", form.maxPages);
    pushTri(args, "--dry-run", form.dryRun);
    pushTri(args, "--loop", form.loop);
    return args;
  }

  function replyPayload(overrides = {}) {
    return {
      op: "reply-chats",
      args: replyArgs(overrides),
      globals: state.globals,
      noBump: state.reply.noBump === true,
    };
  }

  function currentPayload() {
    const globals = state.globals;
    if (state.page === "auth") {
      const args = [];
      if (state.auth.username.trim()) args.push(state.auth.username.trim());
      if (state.password) args.push(state.password);
      return { op: "authorize", args, globals };
    }
    if (state.page === "apply") return { op: "apply-vacancies", args: applyArgs(), globals };
    if (state.page === "chats") return replyPayload();
    if (state.page === "clear") return { op: "clear-negotiations", args: clearArgs(), globals };
    if (state.page === "api") return { op: "call-api", args: apiArgs(), globals };
    return null;
  }

  function apiArgs() {
    const form = state.api;
    const args = [];
    if (form.asJson) args.push("-j");
    const method = (form.method || "GET").toUpperCase();
    if (method && method !== "GET") args.push(method);
    args.push((form.endpoint || "/me").trim() || "/me");
    const raw = (form.params || "").trim();
    if (!raw) return args;
    if (raw.startsWith("{")) {
      args.push(raw);
      return args;
    }
    raw.split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => args.push(line));
    return args;
  }

  function schedulePreview() {
    const node = document.getElementById("command-preview");
    if (!node) return;
    const payload = currentPayload();
    if (!payload) {
      node.textContent = "";
      return;
    }
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(async () => {
      try {
        const data = await api("/api/preview", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (document.getElementById("command-preview") === node) node.textContent = data.display;
      } catch (error) {
        if (document.getElementById("command-preview") === node) node.textContent = error.message;
      }
    }, 180);
  }

  function send(message) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
      toast("Нет связи с панелью. Обновите страницу.");
      return false;
    }
    state.ws.send(JSON.stringify(message));
    return true;
  }

  const OP_TITLE = {
    authorize: "Вход",
    logout: "Выход",
    whoami: "Кто я",
    "list-resumes": "Резюме",
    "update-resumes": "Поднятие",
    "apply-vacancies": "Отклики",
    "reply-chats": "Чаты",
    "clear-negotiations": "Отказы",
    "call-api": "API",
    config: "Конфиг",
    log: "Лог",
    "check-updates": "Обновления",
    "chat-leads": "Контакты",
    "vacancy-score": "Оценка",
    __help__: "Справка",
  };

  function clampScoreLimit(value) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return 20;
    return Math.max(1, Math.min(number, 100));
  }

  function clampLimit(value) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return 80;
    return Math.max(1, Math.min(number, 1000));
  }

  function sameProfile(message) {
    const profile = message.profile || ".";
    const current = state.globals.profile || ".";
    return profile === current && (message.configDir || "") === (state.globals.configDir || "");
  }

  function run(payload, confirmed = false) {
    if (!confirmed && payload.op === "apply-vacancies" && state.apply.dryRun !== "yes") {
      if (!window.confirm("Отклики будут отправлены по-настоящему. Продолжить?")) return;
    }
    if (!confirmed && payload.op === "clear-negotiations" && !payload.args?.includes("--dry-run")) {
      const text = payload.args?.includes("--delete-chat")
        ? "Отказы будут скрыты, и их чаты уберутся. ИИ для этого не нужен. Продолжить?"
        : "Отклики будут скрыты по-настоящему. Продолжить?";
      if (!window.confirm(text)) return;
    }
    if (!confirmed && payload.op === "logout") {
      if (!window.confirm("Выйти из аккаунта на сайте и стереть локальные токены и куки?")) return;
    }
    if (!confirmed && payload.op === "reply-chats" && !payload.args?.includes("--dry-run")) {
      if (!window.confirm("Ответы в чатах будут отправлены по-настоящему. Продолжить?")) return;
    }
    const entry = terms.get(state.activeJob);
    const dims = entry ? { cols: entry.term.cols, rows: entry.term.rows } : { cols: 100, rows: 24 };
    if (send({ type: "start", ...payload, ...dims })) {
      const dock = document.getElementById("dock");
      dock?.classList.add("flash");
      setTimeout(() => dock?.classList.remove("flash"), 700);
    }
  }

  function jobTitle(job) {
    const base = OP_TITLE[job.op] || shortCommand(job.display) || "Команда";
    const same = state.jobs.filter((item) => item.code == null && (OP_TITLE[item.op] || item.op) === (OP_TITLE[job.op] || job.op));
    return same.length > 1 && job.started ? `${base} ${job.started}` : base;
  }

  function activeLive() {
    const job = state.jobs.find((item) => item.id === state.activeJob);
    return Boolean(job && job.code == null);
  }

  function paintRunning() {
    document.querySelectorAll("[data-run]").forEach((node) => {
      node.disabled = !state.binary;
    });
    const stop = document.getElementById("dock-stop");
    if (stop) stop.disabled = !activeLive();
    const hint = document.getElementById("dock-hint");
    if (hint) {
      hint.textContent = activeLive()
        ? "Эта команда ещё идёт. Если утилита спрашивает код или текст, печатайте здесь. «Стоп» и Ctrl+C прерывают только эту вкладку."
        : "Журнал можно скрыть. Команда при этом не останавливается и остаётся в индикаторе сверху, пока выполняется.";
    }
  }

  function shortCommand(display) {
    const text = String(display || "").replace(/^.*?hh-applicant-tool\s+/, "");
    return text.length > 64 ? `${text.slice(0, 64)}…` : text;
  }

  function closeJobsMenu() {
    const menu = document.getElementById("jobs-menu");
    const btn = document.getElementById("jobs-btn");
    if (menu) menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
  }

  function liveJobs() {
    return state.jobs.filter((job) => job.code == null);
  }

  function paintJobs() {
    const live = liveJobs();
    const count = live.length;
    const label = document.getElementById("jobs-label");
    const led = document.getElementById("jobs-led");
    if (led) led.className = count ? "led on" : "led";
    if (label) {
      if (!count) label.textContent = "Ничего не запущено";
      else if (count === 1) label.textContent = jobTitle(live[0]);
      else label.textContent = `${count} работают`;
    }
    const menu = document.getElementById("jobs-menu");
    if (!menu) return;
    menu.replaceChildren();
    if (!live.length) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "jobs-item";
      item.setAttribute("role", "menuitem");
      item.append(el("span", "jobs-item-text", "Открыть журнал"));
      item.addEventListener("click", () => openLatestJournal());
      menu.append(item);
      return;
    }
    for (const job of [...live].reverse()) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `jobs-item${job.id === state.activeJob ? " on" : ""}`;
      item.setAttribute("role", "menuitem");
      const text = el("span", "jobs-item-text");
      text.append(el("b", "", jobTitle(job)), el("small", "", `${job.started || ""} ${shortCommand(job.display)}`.trim()));
      item.append(el("span", "led on"), text);
      item.addEventListener("click", () => openJob(job.id));
      menu.append(item);
    }
  }

  function paintTabs() {
    const host = document.getElementById("dock-tabs");
    if (!host) return;
    host.replaceChildren();
    const visible = state.jobs.filter((job) => !state.hidden.has(job.id));
    if (!visible.length) {
      host.append(el("span", "dock-empty", "Журнал пуст"));
      return;
    }
    for (const job of visible) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `dock-tab${job.id === state.activeJob ? " on" : ""}`;
      const mark = job.code == null ? "led on" : job.code === 0 ? "led ok" : "led bad";
      tab.append(el("span", mark), document.createTextNode(jobTitle(job)));
      tab.addEventListener("click", () => openJob(job.id));
      const close = el("span", "tab-x", "×");
      close.title = "Скрыть журнал";
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        hideJob(job.id);
      });
      tab.append(close);
      host.append(tab);
    }
  }

  function syncJobs(jobs) {
    if (!Array.isArray(jobs)) return;
    state.jobs = jobs;
    const ids = new Set(jobs.map((job) => job.id));
    for (const id of [...state.hidden]) if (!ids.has(id)) state.hidden.delete(id);
    for (const [id, entry] of [...terms]) {
      if (!ids.has(id)) {
        entry.term.dispose();
        entry.pane.remove();
        terms.delete(id);
        delete state.logs[id];
        delete state.pending[id];
      }
    }
    if (state.activeJob != null && !ids.has(state.activeJob)) state.activeJob = null;
  }

  function termTheme() {
    return {
      background: "#0e0d0c",
      foreground: "#f4efe4",
      cursor: "#ffb45a",
      cursorAccent: "#1a120c",
      selectionBackground: "#5a3d22",
      black: "#2a2622",
      red: "#ff6b5a",
      green: "#7ee0a3",
      yellow: "#ffd166",
      blue: "#7ec8ff",
      magenta: "#e39bff",
      cyan: "#5eebc8",
      white: "#f4efe4",
      brightBlack: "#9a9084",
      brightRed: "#ff9b8e",
      brightGreen: "#b8f7cf",
      brightYellow: "#ffe29a",
      brightBlue: "#b7e4ff",
      brightMagenta: "#f3c6ff",
      brightCyan: "#b9fff0",
      brightWhite: "#ffffff",
    };
  }

  function ensureTerm(id) {
    const key = Number(id);
    if (terms.has(key)) return terms.get(key);
    if (!window.Terminal || !window.FitAddon) {
      if (!termErrorShown) {
        termErrorShown = true;
        toast("Не загрузился терминал");
      }
      return null;
    }
    const pane = document.createElement("div");
    pane.className = "term-pane";
    document.getElementById("terminal-host").append(pane);
    const term = new window.Terminal({
      cursorBlink: true,
      fontFamily: '"SF Mono", Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.35,
      scrollback: 8000,
      theme: termTheme(),
    });
    const fit = new window.FitAddon.FitAddon();
    term.loadAddon(fit);
    term.open(pane);
    term.onData((data) => {
      const job = state.jobs.find((item) => item.id === key);
      if (job && job.code == null) send({ type: "input", id: key, data });
    });
    term.onResize(({ cols, rows }) => {
      if (state.activeJob === key) send({ type: "resize", id: key, cols, rows });
    });
    const entry = { term, fit, pane, hydrated: false };
    terms.set(key, entry);
    return entry;
  }

  function revealActive() {
    const empty = document.getElementById("terminal-empty");
    if (empty) empty.hidden = state.activeJob != null;
    for (const [id, entry] of terms) entry.pane.classList.toggle("active", id === state.activeJob);
    const entry = terms.get(state.activeJob);
    if (!entry) return;
    requestAnimationFrame(() => entry.fit.fit());
  }

  function syncDock() {
    const dock = document.getElementById("dock");
    if (!dock) return;
    const open = state.dockOpen;
    dock.classList.toggle("collapsed", !open);
    if (!open) {
      dock.style.height = "";
      placeVersion();
      return;
    }
    const height = Math.min(window.innerHeight * 0.7, Math.max(180, state.termHeight || 280));
    dock.style.height = `${height}px`;
    placeVersion();
    requestAnimationFrame(() => fitActive());
  }

  function placeVersion() {
    const corner = document.getElementById("version-corner");
    const dock = document.getElementById("dock");
    if (!corner) return;
    const open = dock && !dock.classList.contains("collapsed");
    const height = open ? dock.getBoundingClientRect().height : 0;
    corner.style.bottom = `${height + 10}px`;
  }

  function paintVersion() {
    const label = document.getElementById("version-label");
    if (!label) return;
    label.textContent = state.version ? `v${state.version}` : "v…";
  }

  function openLatestJournal() {
    const last = [...state.jobs].reverse().find((job) => job.code == null) || [...state.jobs].reverse()[0];
    if (last) {
      openJob(last.id);
      return;
    }
    state.dockOpen = true;
    state.activeJob = null;
    closeJobsMenu();
    syncDock();
    paintTabs();
    paintRunning();
  }

  function applyJobSnapshot(jobs) {
    const before = state.jobs.map((job) => `${job.id}:${job.code}`).join("|");
    syncJobs(jobs);
    let revealed = false;
    for (const job of state.jobs) {
      if (job.code == null && state.hidden.has(job.id)) {
        state.hidden.delete(job.id);
        revealed = true;
      }
    }
    const after = state.jobs.map((job) => `${job.id}:${job.code}`).join("|");
    if (before === after && !revealed) return;
    if (state.dockOpen && (state.activeJob == null || revealed)) {
      const live = [...state.jobs].reverse().find((job) => job.code == null);
      if (live && (state.activeJob == null || state.hidden.has(state.activeJob))) state.activeJob = live.id;
    }
    paintJobs();
    paintTabs();
    paintRunning();
    if (state.page === "overview") renderMain();
    if (state.dockOpen && revealed) {
      revealActive();
      syncDock();
    }
  }

  function openJob(id) {
    const key = Number(id);
    state.hidden.delete(key);
    state.activeJob = key;
    state.dockOpen = true;
    const entry = ensureTerm(key);
    if (entry && !entry.hydrated) {
      const pending = state.pending[key] || "";
      const text = state.logs[key] || pending;
      if (text) entry.term.write(text);
      if (!state.logs[key]) state.logs[key] = pending;
      state.pending[key] = "";
      entry.hydrated = true;
    }
    closeJobsMenu();
    revealActive();
    syncDock();
    paintTabs();
    paintJobs();
    paintRunning();
    entry?.term.focus();
  }

  function hideJob(id) {
    state.hidden.add(id);
    if (state.activeJob === id) {
      const next = [...state.jobs].reverse().find((job) => !state.hidden.has(job.id));
      state.activeJob = next ? next.id : null;
    }
    if (!state.jobs.some((job) => !state.hidden.has(job.id))) state.dockOpen = false;
    revealActive();
    syncDock();
    paintTabs();
    paintJobs();
    paintRunning();
  }

  function hideDock() {
    for (const job of state.jobs) {
      if (job.code != null) state.hidden.add(job.id);
    }
    state.dockOpen = false;
    const active = state.jobs.find((job) => job.id === state.activeJob);
    if (!active || state.hidden.has(state.activeJob)) {
      const live = [...state.jobs].reverse().find((job) => job.code == null && !state.hidden.has(job.id));
      state.activeJob = live ? live.id : null;
    }
    revealActive();
    syncDock();
    paintTabs();
    paintJobs();
    paintRunning();
  }

  function noteOutput(id, data) {
    const key = Number(id);
    state.logs[key] = (state.logs[key] || "") + data;
    if (state.logs[key].length > 200000) state.logs[key] = state.logs[key].slice(-200000);
    const entry = terms.get(key);
    if (entry?.hydrated) entry.term.write(data);
    else state.pending[key] = (state.pending[key] || "") + data;
  }

  function hydrate(id, screen) {
    const key = Number(id);
    const entry = ensureTerm(key);
    if (!entry || entry.hydrated) return entry;
    const pending = state.pending[key] || "";
    const text = screen != null ? screen : pending;
    state.logs[key] = (screen != null ? screen : state.logs[key] || "") + (screen != null ? "" : "");
    if (screen != null) state.logs[key] = screen + pending;
    if (text) entry.term.write(text);
    if (screen != null && pending) entry.term.write(pending);
    entry.hydrated = true;
    state.pending[key] = "";
    return entry;
  }

  function adoptHello(message) {
    syncJobs(message.jobs || []);
    const screens = message.screens || {};
    for (const job of state.jobs) {
      state.logs[job.id] = screens[job.id] ?? screens[String(job.id)] ?? "";
      state.pending[job.id] = "";
      if (job.code != null) state.hidden.add(job.id);
    }
    const live = [...state.jobs].reverse().find((job) => job.code == null);
    state.activeJob = live ? live.id : null;
    state.dockOpen = Boolean(live);
    if (live) {
      state.hidden.delete(live.id);
      const entry = ensureTerm(live.id);
      if (entry) {
        entry.term.reset();
        entry.hydrated = false;
        hydrate(live.id, state.logs[live.id] || "");
      }
    }
    revealActive();
    syncDock();
    paintJobs();
    paintTabs();
    paintRunning();
  }

  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    state.ws = ws;
    ws.onmessage = (event) => {
      if (state.ws !== ws) return;
      const message = JSON.parse(event.data);
      if (message.type === "hello") {
        adoptHello(message);
        return;
      }
      if (message.type === "jobs") {
        applyJobSnapshot(message.jobs || []);
        return;
      }
      if (message.type === "leads") {
        if (sameProfile(message) && message.result) {
          state.leads = message.result;
          if (showsDesk()) renderMain();
        }
        return;
      }
      if (message.type === "vacancies") {
        if (sameProfile(message) && message.result) {
          state.vacancies = message.result;
          if (showsDesk()) renderMain();
        }
        return;
      }
      if (message.type === "output") {
        noteOutput(message.id, message.data || "");
        return;
      }
      if (message.type === "started") {
        syncJobs(message.jobs || []);
        const job = message.job;
        if (job) {
          state.hidden.delete(job.id);
          const entry = ensureTerm(job.id);
          if (entry && !entry.hydrated) {
            const pending = state.pending[job.id] || "";
            if (pending) entry.term.write(pending);
            entry.hydrated = true;
            state.pending[job.id] = "";
          }
          state.activeJob = job.id;
          state.dockOpen = true;
        }
        revealActive();
        syncDock();
        paintJobs();
        paintTabs();
        paintRunning();
        if (showsDesk()) renderMain();
        if (job) terms.get(job.id)?.term.focus();
        return;
      }
      if (message.type === "exit") {
        syncJobs(message.jobs || state.jobs);
        const finished = state.jobs.find((job) => job.id === message.id);
        if (finished && !state.dockOpen) state.hidden.add(finished.id);
        if (!state.jobs.some((job) => !state.hidden.has(job.id))) state.dockOpen = false;
        revealActive();
        syncDock();
        paintJobs();
        paintTabs();
        paintRunning();
        afterCommand(message.op);
        return;
      }
      if (message.type === "cleared") {
        const key = Number(message.id);
        state.logs[key] = "";
        terms.get(key)?.term.reset();
        return;
      }
      if (message.type === "error") toast(message.message || "Команда не запустилась");
    };
    ws.onclose = () => {
      if (state.ws === ws) setTimeout(connect, 1200);
    };
  }

  async function afterCommand(op) {
    if (["authorize", "logout", "whoami", "update-resumes", "list-resumes"].includes(op)) {
      await refreshSnapshot();
    }
    if (op === "config") await loadConfig(false);
    if (state.page === "logs") await loadLog(false);
    if (op === "apply-vacancies" || op === "reply-chats" || op === "chat-leads" || op === "vacancy-score") await loadDesk();
    else if (state.page === "overview") renderMain();
    await refreshState(false);
  }

  async function loadDesk() {
    const query = new URLSearchParams({
      configDir: state.globals.configDir || "",
      profile: state.globals.profile || ".",
    });
    try {
      const [leads, today, vacancies] = await Promise.all([
        api(`/api/chat-leads?${query}`),
        api(`/api/today?${query}`),
        api(`/api/vacancies?${query}`),
      ]);
      state.leads = leads && leads.savedAt ? leads : null;
      state.vacancies = vacancies && vacancies.savedAt ? vacancies : null;
      state.today = today;
    } catch (error) {
      state.today = state.today || { applies: "—", replies: "—", date: "" };
    }
    if (showsDesk()) renderMain();
  }

  function stripAnsi(text) {
    return String(text || "").replace(/\x1b\[[0-9;]*m/g, "");
  }

  function fitActive() {
    terms.get(state.activeJob)?.fit.fit();
  }

  function bindJobs() {
    const btn = document.getElementById("jobs-btn");
    const menu = document.getElementById("jobs-menu");
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const live = liveJobs();
      if (live.length > 1) {
        const open = menu.hidden;
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        return;
      }
      closeJobsMenu();
      if (live.length === 1) openJob(live[0].id);
      else openLatestJournal();
    });
    document.addEventListener("click", () => closeJobsMenu());
    menu.addEventListener("click", (event) => event.stopPropagation());
  }

  function bindDock() {
    document.getElementById("dock-stop").addEventListener("click", () => {
      if (state.activeJob == null) return;
      send({ type: "stop", id: state.activeJob });
    });
    document.getElementById("dock-clear").addEventListener("click", () => {
      if (state.activeJob == null) return;
      state.logs[state.activeJob] = "";
      terms.get(state.activeJob)?.term.reset();
      send({ type: "clear-buffer", id: state.activeJob });
    });
    document.getElementById("dock-copy").addEventListener("click", () => {
      const entry = terms.get(state.activeJob);
      const selected = entry?.term.getSelection?.() || "";
      copyText(selected || stripAnsi(state.logs[state.activeJob] || ""));
    });
    document.getElementById("dock-hide").addEventListener("click", () => hideDock());
    const dock = document.getElementById("dock");
    const resizer = document.getElementById("dock-resizer");
    resizer.addEventListener("pointerdown", (event) => {
      const startY = event.clientY;
      const startH = dock.offsetHeight;
      function move(nextEvent) {
        const next = Math.min(window.innerHeight * 0.72, Math.max(168, startH - (nextEvent.clientY - startY)));
        state.termHeight = next;
        dock.style.height = `${next}px`;
        placeVersion();
        fitActive();
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        persist();
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
    window.addEventListener("resize", () => fitActive());
  }

  function applyDockHeight() {
    syncDock();
  }

  function profileMeta() {
    return state.profiles.find((item) => item.id === (state.globals.profile || ".")) || null;
  }

  function personLabel() {
    const me = state.snapshot.me;
    if (!me) return state.binary ? "Сессия не проверена" : "Утилита не найдена";
    return [me.lastName, me.firstName].filter(Boolean).join(" ") || me.email || "Соискатель";
  }

  function renderNav() {
    const nav = document.getElementById("nav");
    nav.replaceChildren();
    for (const item of NAV) {
      if (item.pages) {
        nav.append(el("div", "nav-label", item.title));
        for (const [id, title, hint] of item.pages) nav.append(navButton(id, title, hint));
      } else {
        nav.append(navButton(item.id, item.title, item.hint));
      }
    }
  }

  function navButton(id, title, hint) {
    const node = el("button", `nav-btn${state.page === id ? " active" : ""}`);
    node.type = "button";
    node.append(document.createTextNode(title), el("span", "", hint));
    node.addEventListener("click", () => go(id));
    return node;
  }

  function showsDesk() {
    return ["overview", "contacts", "vacancies", "chats"].includes(state.page);
  }

  function renderTop() {
    const host = document.getElementById("top-controls");
    host.replaceChildren();
    const profile = document.createElement("select");
    profile.title = "Профиль";
    profile.setAttribute("aria-label", "Профиль");
    for (const item of state.profiles.length ? state.profiles : [{ id: ".", name: "Основной" }]) {
      const option = el("option", "", item.name);
      option.value = item.id;
      profile.append(option);
    }
    if (![...profile.options].some((option) => option.value === state.globals.profile)) {
      const option = el("option", "", state.globals.profile);
      option.value = state.globals.profile;
      profile.prepend(option);
    }
    profile.value = state.globals.profile || ".";
    profile.addEventListener("change", onProfile);
    const verbosity = el("div", "seg");
    verbosity.setAttribute("role", "group");
    verbosity.setAttribute("aria-label", "Подробность журнала");
    for (const level of [0, 1, 2]) {
      const node = button(level === 0 ? "Тихо" : `-${"v".repeat(level)}`, state.globals.verbosity === level ? "on" : "", () => {
        state.globals.verbosity = level;
        persist();
        renderTop();
        schedulePreview();
      });
      verbosity.append(node);
    }
    const ai = button(state.globals.useAi ? "AI в командах" : "AI выключен", state.globals.useAi ? "ghost sm" : "danger sm", () => {
      state.globals.useAi = !state.globals.useAi;
      persist();
      renderTop();
      schedulePreview();
    });
    const cluster = el("div", "top-cluster");
    cluster.append(profile, button("Новый", "ghost sm", openNewProfile));
    const tools = el("div", "top-tools");
    tools.append(verbosity, ai, el("span", "person", personLabel()), button("Параметры", "ghost sm", openSettings));
    host.append(cluster, tools);
  }

  function forgetPrompts() {
    state.promptBook = {};
    state.promptDraft = {};
  }

  async function onProfile() {
    const select = document.querySelector(".top-controls select");
    state.globals.profile = select.value;
    forgetPrompts();
    persist();
    await refreshState(false);
    renderTop();
    if (state.page === "config") await loadConfig(true);
    else if (state.page === "logs") await loadLog(true);
    await loadDesk();
    if (!showsDesk() && state.page !== "config" && state.page !== "logs") {
      renderMain();
    }
    refreshSnapshot();
  }

  function closeModal() {
    const root = document.getElementById("modal-root");
    root.hidden = true;
    root.replaceChildren();
    root.onclick = null;
  }

  function openNewProfile() {
    const root = document.getElementById("modal-root");
    root.hidden = false;
    const modal = el("div", "modal");
    modal.append(el("h2", "", "Новый профиль"));
    modal.append(el("p", "muted", "Отдельный каталог со своим конфигом, токеном и куками. Имя: латиница, цифры, точка, _ или -."));
    const input = textInput("", () => {}, { placeholder: "work" });
    modal.append(field("Имя", input));
    const actions = el("div", "actions");
    actions.style.marginTop = "14px";
    actions.append(
      button("Создать", "primary", async () => {
        const name = input.value.trim();
        if (!name) return toast("Нужно имя профиля");
        try {
          await api("/api/profiles", {
            method: "POST",
            body: JSON.stringify({ name, globals: state.globals }),
          });
          state.globals.profile = name;
          forgetPrompts();
          persist();
          closeModal();
          await refreshState(false);
          renderTop();
          renderMain();
          refreshSnapshot();
          toast("Профиль создан");
        } catch (error) {
          toast(error.message);
        }
      }),
      button("Отмена", "ghost", closeModal),
    );
    modal.append(actions);
    root.replaceChildren(modal);
    root.onclick = (event) => {
      if (event.target === root) closeModal();
    };
    input.focus();
  }

  function openSettings() {
    const root = document.getElementById("modal-root");
    root.hidden = false;
    const modal = el("div", "modal");
    modal.append(el("h2", "", "Параметры запуска"));
    modal.append(el("p", "muted", "Эти значения добавляются к каждой команде. Пустые поля остаются на усмотрение утилиты и config.toml."));
    const grid = el("div", "grid");
    const inputs = {};
    function add(key, label, help, placeholder = "") {
      const input = textInput(state.globals[key] || "", () => {}, { placeholder });
      inputs[key] = input;
      const node = field(label, input, help);
      if (key === "userAgent" || key === "configDir") node.classList.add("span-2");
      grid.append(node);
    }
    const binary = textInput(state.binary || "", () => {}, { placeholder: "Определяется автоматически" });
    grid.append(span2(field("Путь к hh-applicant-tool", binary, "Пустое поле сбрасывает путь и снова ищет программу в PATH.")));
    add("configDir", "Каталог данных", "Абсолютный путь. Пусто — каталог утилиты по умолчанию.", state.defaultConfigRoot);
    add("apiDelay", "Задержка API, сек", "Флаг --api-delay");
    add("baseUrl", "Сайт", "Например https://rabota.by", "https://hh.ru");
    add("userAgent", "User-Agent", "Браузерный агент для сайта. Пустой быстро начинает выглядеть подозрительно.");
    add("proxyUrl", "Прокси сайта", "socks5h:// или http://");
    add("openaiProxy", "Прокси AI", "Отдельный прокси только для модели");
    add("openaiDelay", "Задержка AI, сек", "");
    add("openaiTimeout", "Таймаут AI, сек", "");
    add("openaiConnectTimeout", "Таймаут соединения AI", "");
    const captcha = selectFrom(
      [["", "Из конфига"], ["RU", "RU"], ["EN", "EN"]],
      state.globals.captchaLang,
      () => {},
    );
    inputs.captchaLang = captcha;
    grid.append(field("Язык капчи", captcha, "Часть моделей лучше читает английские буквы."));
    const manual = checkbox(state.globals.manualCaptcha, "Ручная капча");
    const handle = checkbox(state.globals.handleCaptcha, "Перехватывать капчу");
    const ai = checkbox(state.globals.useAi, "Использовать AI");
    const toggles = el("div", "stack");
    toggles.append(ai.label, manual.label, handle.label);
    grid.append(span2(field("Капча и AI", toggles, "Ручная капча на macOS открывается окном, если установлен tkinter. Иначе текст спрашивается в журнале внизу.")));
    modal.append(grid);
    const actions = el("div", "actions");
    actions.style.marginTop = "14px";
    actions.append(
      button("Сохранить", "primary", async () => {
        for (const key of Object.keys(inputs)) {
          state.globals[key] = inputs[key].value.trim();
        }
        state.globals.useAi = ai.input.checked;
        state.globals.manualCaptcha = manual.input.checked;
        state.globals.handleCaptcha = handle.input.checked;
        persist();
        try {
          await api("/api/settings", {
            method: "PUT",
            body: JSON.stringify({ binary: binary.value.trim() }),
          });
        } catch (error) {
          toast(error.message);
          return;
        }
        root.hidden = true;
        root.replaceChildren();
        await refreshState(false);
        renderTop();
        schedulePreview();
        toast("Параметры сохранены");
      }),
      button("Закрыть", "ghost", () => {
        root.hidden = true;
        root.replaceChildren();
      }),
    );
    modal.append(actions);
    root.replaceChildren(modal);
    root.onclick = (event) => {
      if (event.target === root) {
        root.hidden = true;
        root.replaceChildren();
      }
    };
  }

  function checkbox(checked, label, onChange) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);
    const wrap = el("label", "check");
    wrap.append(input, document.createTextNode(label));
    if (onChange) input.addEventListener("change", () => onChange(input.checked));
    return { input, label: wrap };
  }

  function pageHead(title, lead, actions) {
    const head = el("div", "page-head");
    const text = el("div");
    text.append(el("h1", "", title));
    if (lead) text.append(el("p", "lead", lead));
    head.append(text);
    if (actions?.length) {
      const row = el("div", "actions");
      actions.forEach((item) => row.append(item));
      head.append(row);
    }
    return head;
  }

  function previewLine() {
    const row = el("div", "preview-row");
    const code = el("code");
    code.id = "command-preview";
    code.textContent = "Собираю команду…";
    row.append(code, button("Копировать", "ghost sm", () => copyText(code.textContent)));
    return row;
  }

  function resumeSelect(value, onChange, emptyLabel) {
    const select = document.createElement("select");
    select.dataset.resume = "1";
    fillResumeSelect(select, value, emptyLabel);
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function fillResumeSelect(select, value, emptyLabel = "Все опубликованные") {
    const current = value ?? select.value;
    select.replaceChildren();
    const empty = el("option", "", emptyLabel);
    empty.value = "";
    select.append(empty);
    for (const resume of state.snapshot.resumes || []) {
      const option = el("option", "", `${resume.title} · ${resume.status || resume.id}`);
      option.value = resume.id;
      select.append(option);
    }
    if (current && ![...select.options].some((option) => option.value === current)) {
      const option = el("option", "", current);
      option.value = current;
      select.append(option);
    }
    select.value = current || "";
  }

  function paintResumeSelects() {
    document.querySelectorAll("select[data-resume]").forEach((select) => fillResumeSelect(select));
  }

  function go(page) {
    if (state.page === "config" && state.configDirty && page !== "config") {
      if (!window.confirm("В конфиге есть несохранённые правки. Уйти без сохранения?")) return;
    }
    state.page = page;
    persist();
    renderNav();
    renderMain();
    document.getElementById("main").scrollTop = 0;
    if (page === "config") loadConfig(true);
    if (page === "logs") loadLog(true);
  }

  function rerender() {
    const main = document.getElementById("main");
    const top = main.scrollTop;
    renderMain();
    main.scrollTop = top;
  }

  function renderMain() {
    const main = document.getElementById("main");
    const page = el("div", "page");
    const builders = {
      overview: renderOverview,
      auth: renderAuth,
      apply: renderApply,
      chats: renderChats,
      contacts: renderContacts,
      vacancies: renderVacancies,
      resumes: renderResumes,
      clear: renderClear,
      api: renderApi,
      config: renderConfig,
      logs: renderLogs,
    };
    builders[state.page](page);
    main.replaceChildren(page);
    paintRunning();
    schedulePreview();
  }

  function renderOverview(page) {
    const me = state.snapshot.me;
    const profile = profileMeta();
    const globals = state.globals;
    page.append(pageHead("Обзор", "Каждая команда утилиты запускается кнопкой. Текст нужен только для данных: телефон, поисковая строка, тексты в конфиге."));
    if (!state.binary) {
      page.append(banner("bad", state.binaryError || "Команда hh-applicant-tool не найдена. Установите её в то же окружение, из которого открыта панель: pip install hh-applicant-tool. Либо укажите путь в «Параметрах»."));
    }
    const counters = me?.counters || {};
    const stats = el("div", "stats");
    stats.append(
      stat("Резюме", counters.resumes ?? "—"),
      stat("Новые просмотры", me ? `+${counters.views || 0}` : "—"),
      stat("Непрочитанные", me ? `+${counters.unread || 0}` : "—"),
      stat("Вход", me ? (me.authType || "есть") : "нет"),
    );
    page.append(stats);
    page.append(renderToday());
    page.append(renderLive());
    page.append(renderLeadsShortcut());
    page.append(renderVacancyShortcut());
    if (me && me.authType && me.authType !== "applicant") {
      page.append(banner("warn", "Сайт видит эту сессию не как соискателя. Войдите заново: утилита принудительно выбирает роль applicant."));
    }
    if (state.snapshot.message && !me) page.append(banner("warn", state.snapshot.message));
    const commands = el("div", "cmd-grid");
    const fire = (op, args = []) => () => run({ op, args, globals });
    commands.append(
      cmdButton("Кто я", "whoami", fire("whoami")),
      cmdButton("Войти", "телефон или почта", () => go("auth"), { run: false }),
      cmdButton("Выйти", "logout", fire("logout"), { danger: true }),
      cmdButton("Список резюме", "list-resumes", fire("list-resumes")),
      cmdButton("Поднять резюме", "update-resumes", fire("update-resumes")),
      cmdButton("Пробные отклики", "ничего не отправит", () => {
        state.apply.dryRun = "yes";
        persist();
        run({ op: "apply-vacancies", args: applyArgs(), globals: state.globals });
      }),
      cmdButton("Настроить отклики", "поиск и фильтры", () => go("apply"), { run: false }),
      cmdButton("Пробные чаты", "ответы не уходят", () => {
        run(replyPayload({ dryRun: "yes", loop: "no" }));
      }),
      cmdButton("Настроить чаты", "цикл и страницы", () => go("chats"), { run: false }),
      cmdButton("Пробные отказы", "ничего не скроет", () => {
        state.clear.dryRun = "yes";
        persist();
        run({ op: "clear-negotiations", args: clearArgs(), globals: state.globals });
      }),
      cmdButton("Настроить отказы", "срок, чат, блок", () => go("clear"), { run: false }),
      cmdButton("Запросы API", "готовые кнопки", () => go("api"), { run: false }),
      cmdButton("Обновления", "check-updates", fire("check-updates")),
      cmdButton("Показать конфиг", "config", fire("config")),
      cmdButton("Путь к конфигу", "config -p", () => run({ op: "config", args: ["-p"], globals })),
      cmdButton("Показать лог", "log", fire("log")),
      cmdButton("Справка", "все флаги утилиты", fire("__help__")),
    );
    const board = el("section", "card");
    board.append(el("h2", "", "Команды"));
    board.append(el("p", "muted", "Кнопка сразу вызывает установленный hh-applicant-tool. Опасные действия спрашивают подтверждение. Код из SMS печатается в журнале внизу, когда утилита его попросит."));
    board.append(commands);
    page.append(board);
    page.append(card("Как этим пользоваться", "Утилита задумана как фоновый процесс. Панель собирает её команду и показывает вывод.", [
      span2(el("p", "muted", "После входа подождите 10–15 минут перед первой рассылкой: на первом же отклике сайт часто показывает капчу. Дневной потолок откликов около 200. Поиск тратит показы вакансий, ориентир — 2000 в сутки, поэтому пробный запуск лучше делать на одной короткой странице.")),
      span2(el("p", "muted", "Поднимать резюме имеет смысл раз в 4 часа: утилита сама пропускает те, которые сайт ещё не даёт обновить. Автоответчик по умолчанию крутится в цикле с паузой 30–60 секунд, пока его не остановить. Токен доступа живёт около двух недель и обновляется сам. Куки сайта живут меньше: whoami может работать, а тесты в откликах уже нет — тогда войдите заново.")),
    ], true));
    const files = profile
      ? `Конфиг: ${profile.hasConfig ? "есть" : "ещё нет"}. Токен: ${profile.hasToken ? "есть" : "нет"}. Куки: ${profile.hasCookies ? "есть" : "нет"}. Лог: ${formatBytes(profile.logBytes)}.`
      : "Каталог профиля ещё не создан.";
    const profileCard = card("Текущий профиль", files, []);
    profileCard.append(el("p", "mono muted", state.configRoot || state.defaultConfigRoot || ""));
    if ((state.globals.profile || ".") !== ".") {
      profileCard.append(button("Удалить этот профиль", "danger sm", removeProfile));
    }
    page.append(profileCard);
    page.append(el("p", "muted", "Утилита — Sergey M., github.com/s3rgeym/hh-applicant-tool, ограниченная некоммерческая лицензия. Эта панель только вызывает установленную команду и не меняет её код."));
  }

  function renderToday() {
    const today = state.today || {};
    const box = el("section", "card");
    box.append(el("h2", "", "Сегодня"));
    const stats = el("div", "shortcut-stats");
    stats.append(stat("Откликов", today.applies ?? "—"), stat("Ответов в чатах", today.replies ?? "—"));
    box.append(stats);
    const date = today.date ? ` за ${today.date}` : "";
    box.append(el("p", "muted", `По файлу лога профиля${date}: отправленные отклики и ответы в чатах. Пробный запуск в этот счёт не входит. Если лог очищали, счёт начинается заново.`));
    return box;
  }

  function renderLive() {
    const box = el("section", "card");
    box.append(el("h2", "", "Сейчас"));
    const live = liveJobs();
    if (!live.length) {
      box.append(el("p", "muted", "Ни одна команда не выполняется. Индикатор сверху смотрит в тот же список: живой процесс остаётся там, даже если журнал скрыт."));
      return box;
    }
    box.append(el("p", "muted", "Эти команды идут прямо сейчас. Скрытый журнал их не останавливает и не убирает из списка."));
    for (const job of live) {
      const row = el("div", "job-line");
      row.append(el("span", "led on"));
      const text = el("div", "job-line-text");
      text.append(el("b", "", jobTitle(job)), el("span", "muted", `${job.started || ""} · ${shortCommand(job.display)}`));
      row.append(text);
      row.append(button("Журнал", "ghost sm", () => openJob(job.id)));
      row.append(button("Стоп", "danger sm", () => send({ type: "stop", id: job.id })));
      box.append(row);
    }
    return box;
  }

  function renderLeadsShortcut() {
    const box = el("section", "card");
    box.append(el("h2", "", "Контакты и собеседования"));
    const data = state.leads;
    const items = data?.items || [];
    if (!data?.savedAt) {
      box.append(el("p", "muted", "Проверка ещё не сохранялась. Она идёт в фоне, как ответы в чатах: видна в индикаторе и в журнале, страницу можно переключить."));
    } else {
      const interviews = items.filter((item) => (item.tags || []).includes("Собеседование")).length;
      const invites = items.filter((item) => (item.tags || []).includes("Приглашение")).length;
      const contacts = items.filter((item) => (item.tags || []).includes("Контакты")).length;
      const stats = el("div", "shortcut-stats");
      stats.append(stat("Собеседования", interviews), stat("Приглашения", invites), stat("С контактами", contacts));
      box.append(stats);
      const when = String(data.savedAt).replace("T", " ");
      box.append(el("p", "muted", `Просмотрено ${data.scanned} из ${data.total}. В таблице ${items.length}. Сохранено ${when}.`));
    }
    const actions = el("div", "actions");
    const scan = button(leadsRunning() ? "Уже идёт" : "Прогнать", "primary sm", collectLeads);
    scan.disabled = leadsRunning();
    actions.append(button("Открыть таблицу", "ghost sm", () => go("contacts")), scan);
    box.append(actions);
    return box;
  }

  function leadsRunning() {
    return liveJobs().some((job) => job.op === "chat-leads");
  }

  function scoreRunning() {
    return liveJobs().some((job) => job.op === "vacancy-score");
  }

  function renderVacancyShortcut() {
    const box = el("section", "card");
    box.append(el("h2", "", "Подходящие вакансии"));
    const data = state.vacancies;
    const items = data?.items || [];
    if (!data?.savedAt) {
      box.append(el("p", "muted", "Прогон ещё не сохранялся. Он берёт поиск с автооткликов и просит модель оценить каждую вакансию числом от 0 до 100."));
    } else {
      const strong = items.filter((item) => Number(item.score) >= 70).length;
      const stats = el("div", "shortcut-stats");
      stats.append(stat("В таблице", items.length), stat("От 70%", strong), stat("Запросов к модели", data.asked ?? "—"));
      box.append(stats);
      box.append(el("p", "muted", `Сохранено ${String(data.savedAt).replace("T", " ")}.`));
    }
    const actions = el("div", "actions");
    actions.append(button("Открыть", "ghost sm", () => go("vacancies")));
    box.append(actions);
    return box;
  }

  function stat(label, value) {
    const node = el("div", "stat");
    node.append(el("span", "", label), el("strong", "", String(value)));
    return node;
  }

  function formatBytes(value) {
    const size = Number(value) || 0;
    if (size < 1024) return `${size} Б`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
    return `${(size / 1024 / 1024).toFixed(1)} МБ`;
  }

  async function removeProfile() {
    const name = state.globals.profile;
    if (!name || name === ".") return;
    if (!window.confirm(`Удалить профиль ${name} вместе с конфигом, токеном и куками на этом компьютере?`)) return;
    try {
      await api(`/api/profiles/${encodeURIComponent(name)}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true, globals: state.globals }),
      });
      state.globals.profile = ".";
      persist();
      await refreshState(false);
      renderTop();
      renderMain();
    } catch (error) {
      toast(error.message);
    }
  }

  function renderAuth(page) {
    page.append(pageHead("Вход", "Телефон или почта. Пустой пароль — утилита пришлёт код, его нужно ввести в журнале внизу, когда появится запрос.", [
      button("Войти", "primary", () => run(currentPayload()), { run: true }),
      button("Выйти", "danger", () => run({ op: "logout", args: [], globals: state.globals }), { run: true }),
    ]));
    page.append(previewLine());
    page.append(banner("info", "Если у аккаунта есть и кабинет работодателя, утилита всё равно входит как соискатель. Пароль попадает в аргументы процесса только на время входа; в журнале он скрыт."));
    page.append(card("Учётная запись", "", [
      field("Телефон или email", textInput(state.auth.username, (value) => {
        state.auth.username = value;
        persist();
        schedulePreview();
      }, { autocomplete: "username", placeholder: "79001234567" }), "Для телефона код придёт в SMS, для почты — письмом."),
      field("Пароль", textInput(state.password, (value) => {
        state.password = value;
        schedulePreview();
      }, { type: "password", autocomplete: "current-password" }), "Необязателен. После регистрации пароль нужно задать на сайте отдельно."),
    ]));
    page.append(card("Если сессия «есть», а отклики нет", "", [
      span2(el("p", "muted", "whoami проверяет токен API. Тесты при отклике и часть сайта опираются на куки. Когда давно не было рассылок, войдите ещё раз. Отдельной команды обновления токена нет: утилита обновляет его сама, пока жив refresh token.")),
    ], true));
  }

  function bindApply(key, after) {
    return (value) => {
      state.apply[key] = value;
      persist();
      schedulePreview();
      if (after) after();
    };
  }

  function chipField(label, help, key, options) {
    const selected = new Set(state.apply[key] || []);
    const row = el("div", "chips");
    for (const [id, text] of options) {
      const chip = button(text, `chip${selected.has(id) ? " on" : ""}`, () => {
        const current = new Set(state.apply[key] || []);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        state.apply[key] = [...current];
        persist();
        rerender();
      });
      row.append(chip);
    }
    return field(label, row, help);
  }

  function subtabs(items, current, onPick) {
    const row = el("div", "subtabs");
    for (const [id, title] of items) {
      row.append(button(title, `subtab${id === current ? " on" : ""}`, () => onPick(id)));
    }
    return row;
  }

  function promptId(fieldSpec) {
    return `${fieldSpec.section}.${fieldSpec.key}`;
  }

  function promptValue(group, fieldSpec) {
    const draft = state.promptDraft?.[group];
    const id = promptId(fieldSpec);
    if (draft && Object.prototype.hasOwnProperty.call(draft, id)) return draft[id];
    return fieldSpec.value;
  }

  function setPromptValue(group, fieldSpec, value) {
    state.promptDraft = state.promptDraft || {};
    state.promptDraft[group] = state.promptDraft[group] || {};
    state.promptDraft[group][promptId(fieldSpec)] = value;
  }

  function promptIsSystem(group, fieldSpec) {
    return promptValue(group, fieldSpec).trim() === String(fieldSpec.default || "").trim();
  }

  async function loadPrompts(group) {
    if (state.promptLoading === group) return;
    state.promptLoading = group;
    try {
      const data = await api(`/api/prompts?${new URLSearchParams({
        group,
        configDir: state.globals.configDir || "",
        profile: state.globals.profile || ".",
      })}`);
      state.promptBook = state.promptBook || {};
      state.promptBook[group] = data;
      state.promptDraft = state.promptDraft || {};
      state.promptDraft[group] = {};
    } catch (error) {
      state.promptBook = state.promptBook || {};
      state.promptBook[group] = { tabs: [], message: error.message };
      toast(error.message);
    } finally {
      if (state.promptLoading === group) state.promptLoading = "";
    }
    const showing = (group === "apply" && state.page === "apply" && state.applyTab !== "search")
      || (group === "chats" && state.page === "chats" && state.chatTab !== "run");
    if (showing) renderMain();
  }

  async function savePrompt(group, fieldSpec, value) {
    const text = value == null ? promptValue(group, fieldSpec) : value;
    const data = await api("/api/prompts", {
      method: "POST",
      body: JSON.stringify({
        globals: state.globals,
        group,
        fields: [{ section: fieldSpec.section, key: fieldSpec.key, value: text }],
      }),
    });
    state.promptBook[group] = data;
    if (state.promptDraft?.[group]) delete state.promptDraft[group][promptId(fieldSpec)];
    toast(text.trim() === String(fieldSpec.default || "").trim() ? "Снова системный текст" : "Промпт записан");
    rerender();
  }

  function promptPane(group, tabId) {
    const book = state.promptBook?.[group];
    if (!book) {
      loadPrompts(group);
      return el("p", "muted", "Читаю промпты…");
    }
    if (book.message) return el("p", "muted", book.message);
    const tab = (book.tabs || []).find((item) => item.id === tabId);
    if (!tab) return el("p", "muted", "Эта вкладка не найдена.");
    const box = el("section", "card stack");
    box.append(el("p", "muted", "В полях уже системный текст утилиты. Свой текст сохраняется в config.toml. Сброс возвращает системный и убирает свою строку из файла."));
    for (const fieldSpec of tab.fields) {
      const area = document.createElement("textarea");
      area.className = "prompt-box";
      area.spellcheck = false;
      area.value = promptValue(group, fieldSpec);
      const mark = el("span", "muted", promptIsSystem(group, fieldSpec) ? "Системный текст" : "Свой текст");
      area.addEventListener("input", () => {
        setPromptValue(group, fieldSpec, area.value);
        mark.textContent = area.value.trim() === String(fieldSpec.default || "").trim() ? "Системный текст" : "Свой текст";
      });
      const actions = el("div", "prompt-actions");
      actions.append(
        button("Сохранить", "primary sm", () => savePrompt(group, fieldSpec).catch((error) => toast(error.message))),
        button("Сбросить", "ghost sm", () => savePrompt(group, fieldSpec, fieldSpec.default).catch((error) => toast(error.message))),
        mark,
      );
      const block = el("div", "stack");
      block.append(field(fieldSpec.label, area, fieldSpec.help), actions);
      box.append(block);
    }
    return box;
  }

  function renderApply(page) {
    const form = state.apply;
    page.append(pageHead("Автоотклики", "Без строки поиска утилита идёт по рекомендованным вакансиям выбранных резюме. Со строкой — по обычному поиску.", [
      button("Пробный запуск", "primary", () => {
        state.apply.dryRun = "yes";
        persist();
        run({ op: "apply-vacancies", args: applyArgs(), globals: state.globals });
      }, { run: true }),
      button("Отправить", "danger", () => {
        state.apply.dryRun = "no";
        persist();
        run({ op: "apply-vacancies", args: applyArgs(), globals: state.globals });
      }, { run: true }),
      button("Справка флагов", "ghost", () => run({ op: "apply-vacancies", args: ["-h"], globals: state.globals }), { run: true }),
    ]));
    page.append(previewLine());
    page.append(form.dryRun === "yes"
      ? banner("info", "Пробный запуск: отклики не отправляются, в журнале будет только разбор вакансий. Для пробы оставьте 1 страницу и немного вакансий.")
      : banner("warn", "Боевая рассылка. Сайт ограничивает число откликов, около 200 в сутки, и не любит ссылки в письмах."));
    page.append(subtabs([
      ["search", "Поиск"],
      ["filter", "Фильтр"],
      ["letter", "Письмо"],
      ["tests", "Тесты"],
    ], state.applyTab, (id) => {
      state.applyTab = id;
      persist();
      rerender();
    }));
    if (state.applyTab !== "search") {
      page.append(promptPane("apply", state.applyTab));
      return;
    }
    page.append(card("Куда откликаться", "", [
      field("Резюме", resumeSelect(form.resumeId, bindApply("resumeId")), "Пусто — все опубликованные резюме."),
      field("Поиск", textInput(form.search, bindApply("search"), { placeholder: "Python backend" }), "Пустая строка переключает режим на рекомендованные вакансии."),
      field("Сортировка", selectFrom(ORDER, form.orderBy, bindApply("orderBy"))),
      field("Страниц", textInput(form.totalPages, bindApply("totalPages"), { inputmode: "numeric" }), "В самой утилите по умолчанию 20. Больше 2000 результатов API не отдаёт."),
      field("На странице", textInput(form.perPage, bindApply("perPage"), { inputmode: "numeric" }), "В утилите по умолчанию 100."),
      field("Не больше откликов", textInput(form.maxResponses, bindApply("maxResponses"), { inputmode: "numeric", placeholder: "без потолка" })),
    ]));
    page.append(card("Как откликаться", "Промпты модели — на вкладках рядом. Здесь только флаги запуска.", [
      field("Пробный запуск", choiceChips([
        ["yes", "Ничего не отправлять"],
        ["no", "Отправлять"],
      ], form.dryRun === "no" ? "no" : "yes", (value) => {
        state.apply.dryRun = value;
        persist();
        rerender();
      })),
      field("Фильтр AI", choiceChips([
        ["", "Выключен"],
        ["yes", "Включить"],
        ["no", "Явно выключить"],
      ], form.aiFilter, bindApply("aiFilter")), "Медленно. Отказ заносит вакансию в чёрный список. Нужен настроенный AI."),
      span2(field("Исключить по регулярному выражению", textInput(form.excludedFilter, bindApply("excludedFilter"), { placeholder: "junior|php|bitrix|курьер" }), "Совпадение по названию или описанию тоже отправляет вакансию в чёрный список.")),
      field("Сопроводительное всегда", choiceChips([
        ["yes", "Да"],
        ["no", "Только когда сайт просит"],
      ], form.forceLetter === "no" ? "no" : "yes", bindApply("forceLetter"))),
      field("Письмо на email", choiceChips([
        ["", "Нет"],
        ["yes", "Да, нужен SMTP"],
      ], form.sendEmail === "yes" ? "yes" : "", bindApply("sendEmail"))),
      field("Тесты", choiceChips([
        ["", "Решать"],
        ["yes", "Пропускать вакансии с тестом"],
      ], form.skipTests === "yes" ? "yes" : "", bindApply("skipTests")), "Без AI выбирается «да» или средний вариант."),
    ]));
    const areaRow = el("div", "chips");
    const selectedAreas = new Set(tokens(form.area));
    for (const [id, label] of AREA_PRESETS) {
      areaRow.append(button(`${label} · ${id}`, `chip${selectedAreas.has(id) ? " on" : ""}`, () => {
        const current = new Set(tokens(state.apply.area));
        if (current.has(id)) current.delete(id);
        else current.add(id);
        state.apply.area = [...current].join(" ");
        persist();
        rerender();
      }));
    }
    const areaSearch = el("div", "row");
    const areaInput = textInput(state.areaQuery, (value) => {
      state.areaQuery = value;
    }, { placeholder: "Казань" });
    areaSearch.append(areaInput, button("Найти id", "ghost sm", searchAreas));
    const hits = el("div", "chips");
    for (const item of state.areaHits) {
      hits.append(button(`${item.trail} · ${item.id}`, "chip", () => {
        const current = new Set(tokens(state.apply.area));
        current.add(item.id);
        state.apply.area = [...current].join(" ");
        persist();
        rerender();
      }));
    }
    page.append(card("Фильтры поиска", "Идентификаторы региона, метро, роли и отрасли — это id справочников HH. Беларусь в документации утилиты указана как 2238.", [
      span2(field("Регион", textInput(form.area, bindApply("area"), { placeholder: "1 2" }), "Несколько id через пробел.")),
      span2(areaRow),
      span2(areaSearch),
      state.areaHits.length ? span2(hits) : null,
      field("Опыт", selectFrom(EXPERIENCE, form.experience, bindApply("experience"))),
      field("График", selectFrom(SCHEDULE, form.schedule, bindApply("schedule"))),
      chipField("Формат работы", "", "workFormat", WORK),
      chipField("Занятость", "", "employment", EMPLOYMENT),
      field("Зарплата от", textInput(form.salary, bindApply("salary"), { inputmode: "numeric" })),
      field("Валюта", selectFrom([["", "Любая"], ["RUR", "RUR"], ["USD", "USD"], ["EUR", "EUR"]], form.currency, bindApply("currency"))),
      field("Только с зарплатой", selectFrom([["", "Не важно"], ["yes", "Да"], ["no", "Нет"]], form.onlyWithSalary, bindApply("onlyWithSalary"))),
      field("За последние дни", textInput(form.period, bindApply("period"), { inputmode: "numeric" })),
      field("Дата с", textInput(form.dateFrom, bindApply("dateFrom"), { type: "date" })),
      field("Дата по", textInput(form.dateTo, bindApply("dateTo"), { type: "date" })),
      field("Метро, id", textInput(form.metro, bindApply("metro"))),
      field("Профроли, id", textInput(form.professionalRole, bindApply("professionalRole"))),
      field("Отрасли, id", textInput(form.industry, bindApply("industry"))),
      field("Работодатели, id", textInput(form.employerId, bindApply("employerId"))),
      field("Кроме работодателей", textInput(form.excludedEmployerId, bindApply("excludedEmployerId"))),
      chipField("Метки", "", "label", LABELS),
      chipField("Где искать текст", "Пусто — ищет сайт сам.", "searchField", SEARCH_FIELDS),
      field("Только премиум", selectFrom([["", "Не важно"], ["yes", "Да"], ["no", "Нет"]], form.premium, bindApply("premium"))),
      field("Не разбирать поисковую строку", checkbox(form.noMagic, "Флаг --no-magic", (checked) => {
        state.apply.noMagic = checked;
        persist();
        schedulePreview();
      }).label, "Сайт не будет сам переписывать запрос."),
    ].filter(Boolean)));
    const geo = el("details");
    geo.append(el("summary", "", "Координаты для сортировки по расстоянию"));
    const geoGrid = el("div", "grid");
    geoGrid.style.marginTop = "12px";
    for (const [key, label] of [
      ["topLat", "Верхняя широта"],
      ["bottomLat", "Нижняя широта"],
      ["leftLng", "Левая долгота"],
      ["rightLng", "Правая долгота"],
      ["sortPointLat", "Широта точки"],
      ["sortPointLng", "Долгота точки"],
    ]) {
      geoGrid.append(field(label, textInput(form[key], bindApply(key), { inputmode: "decimal" })));
    }
    geo.append(geoGrid);
    const geoCard = el("section", "card");
    geoCard.append(geo);
    page.append(geoCard);
    page.append(presetBar());
    const dict = el("div", "chips");
    dict.append(
      button("Роли в журнал", "chip", () => run({ op: "call-api", args: ["/professional_roles"], globals: state.globals }), { run: true }),
      button("Отрасли в журнал", "chip", () => run({ op: "call-api", args: ["/industries"], globals: state.globals }), { run: true }),
      button("Метро в журнал", "chip", () => run({ op: "call-api", args: ["/metro"], globals: state.globals }), { run: true }),
      button("Словари в журнал", "chip", () => run({ op: "call-api", args: ["/dictionaries"], globals: state.globals }), { run: true }),
      button("1 × 10", "chip", () => {
        state.apply.totalPages = "1";
        state.apply.perPage = "10";
        persist();
        rerender();
      }),
      button("5 × 20", "chip", () => {
        state.apply.totalPages = "5";
        state.apply.perPage = "20";
        persist();
        rerender();
      }),
      button("Как в CLI: 20 × 100", "chip", () => {
        state.apply.totalPages = "20";
        state.apply.perPage = "100";
        persist();
        rerender();
      }),
    );
    page.append(dict);
  }

  async function searchAreas() {
    try {
      const data = await api("/api/areas", {
        method: "POST",
        body: JSON.stringify({ globals: state.globals, query: state.areaQuery }),
      });
      state.areaHits = data.items || [];
      rerender();
    } catch (error) {
      toast(error.message);
    }
  }

  function presetBar() {
    const stored = presets();
    const names = Object.keys(stored);
    const box = el("section", "card");
    box.append(el("h2", "", "Пресеты поиска"));
    box.append(el("p", "muted", "Наборы параметров откликов хранятся в этом браузере, не в каталоге утилиты."));
    const row = el("div", "preset-row");
    const select = document.createElement("select");
    select.append(el("option", "", names.length ? "Выберите пресет" : "Пресетов нет"));
    for (const name of names) select.append(el("option", "", name));
    const name = textInput("", () => {}, { placeholder: "Имя пресета" });
    row.append(
      select,
      name,
      button("Сохранить", "ghost sm", () => {
        const title = name.value.trim();
        if (!title) return toast("Нужно имя пресета");
        const next = presets();
        next[title] = state.apply;
        localStorage.setItem(PRESETS, JSON.stringify(next));
        rerender();
        toast("Пресет сохранён");
      }),
      button("Загрузить", "ghost sm", () => {
        const chosen = select.value;
        if (!chosen || !presets()[chosen]) return;
        state.apply = { ...defaultApply(), ...presets()[chosen] };
        persist();
        rerender();
      }),
      button("Удалить", "ghost sm", () => {
        const chosen = select.value;
        const next = presets();
        delete next[chosen];
        localStorage.setItem(PRESETS, JSON.stringify(next));
        rerender();
      }),
    );
    box.append(row);
    return box;
  }

  function renderChats(page) {
    const form = state.reply;
    const launch = (overrides) => {
      state.reply = { ...state.reply, ...overrides };
      persist();
      run(replyPayload());
    };
    page.append(pageHead("Авточаты", "Отвечает работодателю, выбирает кнопку из предложенных вариантов, через 3 дня молчания коротко спрашивает, жива ли вакансия, и выходит из чата при отказе.", [
      button("Пробный проход", "primary", () => launch({ dryRun: "yes", loop: "no" }), { run: true }),
      button("Ответить один раз", "ghost", () => launch({ dryRun: "no", loop: "no" }), { run: true }),
      button("Запустить цикл", "danger", () => launch({ dryRun: "no", loop: "yes" }), { run: true }),
      button("Справка", "ghost", () => run({ op: "reply-chats", args: ["-h"], globals: state.globals }), { run: true }),
    ]));
    page.append(previewLine());
    page.append(form.loop === "no"
      ? banner("info", "Один проход по страницам чатов.")
      : banner("warn", "Цикл не заканчивается сам. Остановка — кнопка «Стоп» или Ctrl+C в журнале."));
    page.append(subtabs([
      ["run", "Проход"],
      ["reply", "Ответ"],
      ["options", "Кнопки"],
      ["bump", "Напоминание"],
    ], state.chatTab, (id) => {
      state.chatTab = id;
      persist();
      rerender();
    }));
    if (state.chatTab !== "run") {
      page.append(promptPane("chats", state.chatTab));
      return;
    }
    page.append(card("Проход", "Промпты ответа, кнопок и напоминания — на соседних вкладках.", [
      field("Резюме", resumeSelect(form.resumeId, (value) => {
        state.reply.resumeId = value;
        persist();
        schedulePreview();
      }, "Все резюме")),
      field("Страниц", textInput(form.maxPages, (value) => {
        state.reply.maxPages = value;
        persist();
        schedulePreview();
      }, { inputmode: "numeric" }), "По умолчанию 20. Чаты старше 14 дней утилита дальше не листает."),
      field("Пробный запуск", choiceChips([
        ["no", "Отвечать"],
        ["yes", "Только писать в журнал"],
      ], form.dryRun === "yes" ? "yes" : "no", (value) => {
        state.reply.dryRun = value;
        persist();
      })),
      field("Цикл", choiceChips([
        ["yes", "Пауза 30–60 секунд"],
        ["no", "Один проход"],
      ], form.loop === "no" ? "no" : "yes", (value) => {
        state.reply.loop = value;
        persist();
      })),
      field("Напоминания", checkbox(form.noBump === true, "Не напоминать работодателю", (checked) => {
        state.reply.noBump = checked;
        persist();
      }).label, "Чаты, где последнее сообщение уже ваше, пропускаются. Новые сообщения работодателя по-прежнему получают ответ."),
    ]));
    const refusalActions = el("div", "actions");
    refusalActions.append(
      button("Показать", "ghost sm", () => run({
        op: "clear-negotiations",
        args: ["--delete-chat", "--dry-run"],
        globals: state.globals,
      }), { run: true }),
      button("Убрать", "danger sm", () => run({
        op: "clear-negotiations",
        args: ["--delete-chat"],
        globals: state.globals,
      }), { run: true }),
    );
    page.append(card("Чаты с отказами", "ИИ не нужен. Берутся только отклики со статусом отказ: отклик скрывается и чат убирается. Ответы и напоминания не отправляются.", [
      span2(field("Прогон", refusalActions, "Показать ничего не удаляет.")),
    ]));
    page.append(card("Без модели", "", [
      span2(el("p", "muted", "Если AI выключен, на сообщение уходит ближайший быстрый ответ сайта. Напоминание без модели выбирается случайно, а с галочкой «Не напоминать» не отправляется. Отказ со статусом DISCARD закрывается без модели.")),
    ], true));
  }

  function renderContacts(page) {
    const actions = [];
    if ((state.leads?.items || []).length) actions.push(button("Скачать CSV", "ghost", exportContacts));
    page.append(pageHead("Контакты", "Кто прислал телефон, почту или пригласил на собеседование. Сообщения не отправляются.", actions));
    page.append(renderLeads());
  }

  function renderVacancies(page) {
    const actions = [];
    if ((state.vacancies?.items || []).length) actions.push(button("Скачать CSV", "ghost", exportVacancies));
    actions.push(button("В фильтр откликов", "ghost", saveScorePrompt, { title: "Записать промпт в ai_filter_prompt и включить фильтр" }));
    page.append(pageHead("Подходящие вакансии", "Поиск тот же, что на автооткликах. Прогон ничего не отправляет: модель ставит процент, таблица сохраняется.", actions));
    const box = el("section", "card stack");
    box.append(el("p", "muted", `Сейчас поиск: ${searchSummary()}.`));
    box.append(button("Настроить поиск", "ghost sm", () => go("apply")));
    const prompt = document.createElement("textarea");
    prompt.value = state.scorePrompt || "";
    prompt.placeholder = "Например: только backend на Python, без поддержки и стажировок, зарплата не ниже резюме";
    prompt.addEventListener("input", () => {
      state.scorePrompt = prompt.value;
      persist();
    });
    box.append(field("Промпт", prompt, "Модель отвечает одним числом от 0 до 100. Между запросами пауза из конфига OpenAI. Вакансия с тем же промптом второй раз не спрашивается. В запрос уходит карточка поиска, до 2000 символов."));
    const bar = el("div", "actions leads-toolbar");
    const limits = el("div", "chips");
    for (const value of [10, 20, 40]) {
      limits.append(button(String(value), `chip${state.vacancyLimit === value ? " on" : ""}`, () => {
        state.vacancyLimit = value;
        persist();
        rerender();
      }));
    }
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "100";
    input.className = "leads-limit";
    input.value = String(clampScoreLimit(state.vacancyLimit));
    input.setAttribute("aria-label", "Сколько вакансий оценить");
    input.addEventListener("change", () => {
      state.vacancyLimit = clampScoreLimit(input.value);
      persist();
      rerender();
    });
    const runScore = button(scoreRunning() ? "Уже идёт" : "Прогнать", "primary sm", collectVacancies);
    runScore.disabled = scoreRunning();
    bar.append(limits, input, runScore);
    box.append(bar);
    box.append(el("p", "muted", "Лимит от 1 до 100. Каждая новая вакансия — отдельный запрос к модели."));
    if (state.vacancies) box.append(vacancyTable(state.vacancies));
    page.append(box);
  }

  function searchSummary() {
    const form = state.apply;
    const bits = [];
    bits.push(form.search ? `«${form.search}»` : "рекомендованные вакансии");
    if (form.resumeId) bits.push("одно резюме");
    if (form.area) bits.push(`регион ${form.area}`);
    if (form.salary) bits.push(`зарплата от ${form.salary}`);
    return bits.join(", ");
  }

  async function collectVacancies() {
    if (scoreRunning()) {
      const job = liveJobs().find((item) => item.op === "vacancy-score");
      if (job) openJob(job.id);
      return;
    }
    state.scorePrompt = document.querySelector("textarea")?.value || state.scorePrompt;
    persist();
    try {
      const data = await api("/api/vacancies", {
        method: "POST",
        body: JSON.stringify({
          globals: state.globals,
          search: state.apply,
          prompt: state.scorePrompt,
          limit: clampScoreLimit(state.vacancyLimit),
        }),
      });
      if (data.already) toast("Оценка уже идёт");
      if (data.id != null) openJob(data.id);
    } catch (error) {
      toast(error.message);
    }
  }

  async function saveScorePrompt() {
    const prompt = (document.querySelector("textarea")?.value || state.scorePrompt || "").trim();
    if (!prompt) {
      toast("Сначала напишите промпт");
      return;
    }
    try {
      await api("/api/config/prompt", {
        method: "POST",
        body: JSON.stringify({ globals: state.globals, prompt }),
      });
      state.apply.aiFilter = "yes";
      state.scorePrompt = prompt;
      persist();
      toast("Промпт записан в фильтр откликов");
      go("apply");
    } catch (error) {
      toast(error.message);
    }
  }

  function vacancyTable(data) {
    const wrap = el("div", "table-wrap");
    const items = data.items || [];
    const tail = data.stopped
      ? " Прогон остановлен, показана уже собранная часть."
      : data.truncated
        ? " Дальше лимит."
        : "";
    const reused = data.reused ? ` Без нового запроса: ${data.reused}.` : "";
    wrap.append(el("p", "muted", `В таблице ${items.length} из ${data.total || items.length}. Новых запросов к модели: ${data.asked ?? "—"}.${reused}${tail}`));
    if (!items.length) {
      wrap.append(el("p", "", "По этому поиску вакансий нет."));
      return wrap;
    }
    const table = document.createElement("table");
    table.className = "leads";
    const head = document.createElement("tr");
    for (const title of ["Компания", "Вакансия", "Откликов", "Подходит"]) {
      const cell = document.createElement("th");
      cell.textContent = title;
      head.append(cell);
    }
    table.append(head);
    for (const item of items) {
      const row = document.createElement("tr");
      row.append(cell(item.company || ""));
      const vacancy = document.createElement("td");
      if (item.url) {
        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = item.vacancy || "Вакансия";
        vacancy.append(link);
      } else {
        vacancy.textContent = item.vacancy || "";
      }
      row.append(vacancy);
      row.append(cell(item.responses == null ? "—" : String(item.responses)));
      const score = document.createElement("td");
      score.textContent = item.score == null ? "—" : `${item.score}%`;
      row.append(score);
      table.append(row);
    }
    wrap.append(table);
    return wrap;
  }

  function cell(text) {
    const node = document.createElement("td");
    node.textContent = text;
    return node;
  }

  function downloadCsv(filename, rows) {
    const lines = rows.map((row) => row.map((value) => {
      const text = String(value ?? "");
      return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }).join(","));
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportContacts() {
    const rows = [["Компания", "Вакансия", "Что", "Контакты", "Когда", "Сообщение", "Ссылка"]];
    for (const item of state.leads?.items || []) {
      rows.push([
        item.company || "",
        item.vacancy || "",
        (item.tags || []).join(", "),
        (item.contacts || []).join("; "),
        item.when || "",
        item.snippet || "",
        item.url || "",
      ]);
    }
    downloadCsv("hh-contacts.csv", rows);
  }

  function exportVacancies() {
    const rows = [["Компания", "Вакансия", "Откликов", "Подходит", "Ссылка"]];
    for (const item of state.vacancies?.items || []) {
      rows.push([item.company || "", item.vacancy || "", item.responses ?? "", item.score ?? "", item.url || ""]);
    }
    downloadCsv("hh-vacancies.csv", rows);
  }

  function renderLeads() {
    const box = el("section", "card");
    box.append(el("p", "muted", "Прогон читает переписки и остаётся в индикаторе сверху, пока не закончится. Страницу можно переключить."));
    const bar = el("div", "actions leads-toolbar");
    const limits = el("div", "chips");
    for (const [value, label] of [[40, "40"], [80, "80"], [150, "150"]]) {
      limits.append(button(label, `chip${state.leadsLimit === value ? " on" : ""}`, () => {
        state.leadsLimit = value;
        persist();
        rerender();
      }));
    }
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "1000";
    input.className = "leads-limit";
    input.value = String(clampLimit(state.leadsLimit));
    input.setAttribute("aria-label", "Свой лимит чатов");
    input.addEventListener("change", () => {
      state.leadsLimit = clampLimit(input.value);
      persist();
      rerender();
    });
    const collect = button(leadsRunning() ? "Уже идёт" : "Прогнать", "primary sm", collectLeads);
    collect.disabled = leadsRunning();
    bar.append(limits, input, collect);
    box.append(bar);
    box.append(el("p", "muted", "Свой лимит — число от 1 до 1000. Сайт отдаёт не больше тысячи переписок, каждый чат читается отдельно. Таблица сохраняется."));
    if (state.leads) box.append(leadsTable(state.leads));
    return box;
  }

  async function collectLeads() {
    if (leadsRunning()) {
      const job = liveJobs().find((item) => item.op === "chat-leads");
      if (job) openJob(job.id);
      return;
    }
    try {
      const data = await api("/api/chat-leads", {
        method: "POST",
        body: JSON.stringify({ globals: state.globals, limit: clampLimit(state.leadsLimit) }),
      });
      if (data.already) toast("Проверка уже идёт");
      if (data.id != null) openJob(data.id);
    } catch (error) {
      toast(error.message);
    }
  }

  function leadsTable(data) {
    const wrap = el("div", "table-wrap");
    const found = (data.items || []).length;
    const tail = data.stopped
      ? " Проверка остановлена, показана уже собранная часть."
      : data.truncated
        ? " Дальше лимит, остальные чаты не открывались."
        : "";
    wrap.append(el("p", "muted", `Просмотрено ${data.scanned} из ${data.total}. В таблице ${found}.${tail}`));
    if (!found) {
      wrap.append(el("p", "", "В просмотренных чатах нет контактов и приглашений на собеседование."));
      return wrap;
    }
    const table = document.createElement("table");
    table.className = "leads";
    const head = document.createElement("tr");
    for (const title of ["Компания", "Вакансия", "Что", "Контакты", "Когда", "Сообщение"]) {
      const cell = document.createElement("th");
      cell.textContent = title;
      head.append(cell);
    }
    const thead = document.createElement("thead");
    thead.append(head);
    const body = document.createElement("tbody");
    for (const row of data.items) {
      const tr = document.createElement("tr");
      tr.append(textCell(row.person ? `${row.company} · ${row.person}` : row.company));
      const vacancy = document.createElement("td");
      if (row.url) {
        const link = el("a", "", row.vacancy);
        link.href = row.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        vacancy.append(link);
      } else {
        vacancy.textContent = row.vacancy || "";
      }
      tr.append(vacancy);
      const tags = document.createElement("td");
      for (const tag of row.tags || []) {
        const kind = tag === "Собеседование" ? "interview" : tag === "Приглашение" ? "invite" : "contact";
        tags.append(el("span", `tag ${kind}`, tag));
      }
      tr.append(tags);
      tr.append(textCell((row.contacts || []).join("\n") || "—"));
      tr.append(textCell(String(row.when || "").replace("T", " ").slice(0, 16)));
      tr.append(textCell(row.snippet || "—"));
      body.append(tr);
    }
    table.append(thead, body);
    wrap.append(table);
    return wrap;
  }

  function textCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    return cell;
  }

  function renderResumes(page) {
    page.append(pageHead("Резюме", "Поднять дату можно только у тех резюме, которым это разрешает сайт. Остальные утилита пропустит с предупреждением.", [
      button("Обновить карточки", "ghost", () => refreshSnapshot(), {}),
      button("Таблица в журнал", "ghost", () => run({ op: "list-resumes", args: [], globals: state.globals }), { run: true }),
      button("Поднять все", "primary", () => run({ op: "update-resumes", args: [], globals: state.globals }), { run: true }),
    ]));
    const list = el("div", "resume-list");
    const resumes = state.snapshot.resumes || [];
    if (!resumes.length) {
      list.append(el("p", "muted", state.snapshot.message || "Список пуст. Проверьте вход или нажмите «Обновить список»."));
    }
    for (const resume of resumes) {
      const row = el("article", "resume");
      const text = el("div");
      text.append(el("b", "", resume.title));
      const meta = el("div", "muted", `${resume.status || "без статуса"} · ${resume.id}`);
      text.append(meta);
      if (resume.updatedAt) text.append(el("div", "muted", `Обновлено ${resume.updatedAt}`));
      const side = el("div");
      side.append(el("div", resume.canUpdate ? "ok-text" : "warn-text", resume.canUpdate ? "можно поднять" : "рано поднимать"));
      if (resume.url) {
        const link = el("a", "", "открыть");
        link.href = resume.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        side.append(link);
      }
      row.append(text, side);
      list.append(row);
    }
    const wrap = el("section", "card");
    wrap.append(list);
    page.append(wrap);
  }

  function renderClear(page) {
    const form = state.clear;
    const launch = (dryRun) => {
      state.clear.dryRun = dryRun;
      persist();
      run({ op: "clear-negotiations", args: clearArgs(), globals: state.globals });
    };
    page.append(pageHead("Отказы", "Скрывает отказы. При желании убирает и старые отклики, чат и работодателя. Из-за API один проход иногда оставляет хвост, тогда команду запускают ещё раз.", [
      button("Показать, что скроется", "primary", () => launch("yes"), { run: true }),
      button("Скрыть", "danger", () => launch("no"), { run: true }),
    ]));
    page.append(previewLine());
    page.append(form.dryRun === "yes"
      ? banner("info", "Пробный запуск ничего не скрывает.")
      : banner("warn", "Будут скрыты настоящие отклики."));
    page.append(card("Что сделать", "", [
      field("Пробный запуск", choiceChips([
        ["yes", "Ничего не скрывать"],
        ["no", "Скрывать"],
      ], form.dryRun === "no" ? "no" : "yes", (value) => {
        state.clear.dryRun = value;
        persist();
      })),
      field("Старше, дней", textInput(form.olderThan, (value) => {
        state.clear.olderThan = value;
        persist();
        schedulePreview();
      }, { inputmode: "numeric", placeholder: "только отказы" }), "Пусто — скрываются отказы. Число добавляет любые отклики старше N дней."),
      field("Блокировать за отказ", choiceChips([
        ["", "Не менять"],
        ["yes", "Да"],
        ["no", "Нет"],
      ], form.blacklist, (value) => {
        state.clear.blacklist = value;
        persist();
      })),
      field("Чат", checkbox(form.deleteChat, "Скрыть и чат", (checked) => {
        state.clear.deleteChat = checked;
        persist();
        schedulePreview();
      }).label, "Чат убирается через сайт, не через API."),
    ]));
  }

  const API_COMMANDS = [
    ["Кто я", ["/me"], "GET /me"],
    ["Мои резюме", ["/resumes/mine"], "GET /resumes/mine"],
    ["Отклики", ["/negotiations"], "GET /negotiations"],
    ["Статистика откликов", ["/negotiations_statistic/mine"], "GET /negotiations_statistic/mine"],
    ["Регионы", ["/areas"], "GET /areas"],
    ["Страны", ["/areas/countries"], "GET /areas/countries"],
    ["Профроли", ["/professional_roles"], "GET /professional_roles"],
    ["Отрасли", ["/industries"], "GET /industries"],
    ["Словари", ["/dictionaries"], "GET /dictionaries"],
    ["Метро", ["/metro"], "GET /metro"],
    ["Избранные вакансии", ["/vacancies/favorited"], "GET /vacancies/favorited"],
    ["Скрытые вакансии", ["/vacancies/blacklisted"], "GET /vacancies/blacklisted"],
  ];

  function renderApi(page) {
    const form = state.api;
    page.append(pageHead("API", "Готовые запросы уходят сразу. Свой адрес собирается кнопками метода и полями ниже, без набора команды в журнале."));
    const board = el("div", "cmd-grid");
    for (const [title, args, hint] of API_COMMANDS) {
      board.append(cmdButton(title, hint, () => run({ op: "call-api", args, globals: state.globals })));
    }
    const ready = el("section", "card");
    ready.append(el("h2", "", "Готовые запросы"));
    ready.append(board);
    page.append(ready);
    page.append(previewLine());
    page.append(card("Свой запрос", "Метод — кнопкой. Путь и параметры нужны только если готового запроса выше нет.", [
      span2(field("Метод", choiceChips(
        [["GET", "GET"], ["POST", "POST"], ["PUT", "PUT"], ["PATCH", "PATCH"], ["DELETE", "DELETE"]],
        form.method || "GET",
        (value) => {
          state.api.method = value;
          persist();
        },
      ))),
      field("Путь", textInput(form.endpoint, (value) => {
        state.api.endpoint = value;
        persist();
        schedulePreview();
      }, { placeholder: "/employers" })),
      span2(field("Параметры", textInput(form.params, (value) => {
        state.api.params = value;
        persist();
        schedulePreview();
      }, { multiline: true, placeholder: "text=IT\nonly_with_vacancies=true" }), "По одному ключ=значение на строке. Либо один JSON-объект.")),
      field("Формат", checkbox(form.asJson, "Отправить JSON", (checked) => {
        state.api.asJson = checked;
        persist();
        schedulePreview();
      }).label, "Флаг -j. Для GET обычно не нужен."),
    ]));
    page.append(button("Выполнить свой запрос", "primary", () => run(currentPayload()), { run: true }));
    page.append(button("Справка call-api", "ghost", () => run({ op: "call-api", args: ["-h"], globals: state.globals }), { run: true }));
  }

  function renderConfig(page) {
    page.append(pageHead("Конфиг", "Секции выше файла — куда подключать модель, сайт и почту. Сам config.toml внизу остаётся с комментариями: сохранение переносит поля в него и не переписывает остальное.", [
      button(state.configDirty || state.formDirty ? "Сохранить" : "Сохранено", "primary", saveConfig),
      button("Перечитать", "ghost", () => {
        if ((state.configDirty || state.formDirty) && !window.confirm("Есть несохранённые правки. Перечитать файл и сбросить их?")) return;
        state.formDirty = false;
        loadConfig(true);
      }),
      button("Показать в журнале", "ghost", () => run({ op: "config", args: [], globals: state.globals }), { run: true }),
      button("Путь", "ghost", () => run({ op: "config", args: ["-p"], globals: state.globals }), { run: true }),
    ]));
    if (state.configLoading) {
      page.append(el("p", "muted", "Читаю config.toml…"));
      return;
    }
    page.append(el("p", "mono muted", state.configPath || "Путь появится после чтения"));
    renderConnection(page);
    page.append(banner("info", "Секции openai.* наследуют openai.default. Плейсхолдеры %(имя)s работают в пользовательских промптах и письмах, но не в system_prompt. Знак процента в тексте пишется как %%. Случайный выбор {вариант|вариант} действует в сопроводительном и письме на почту."));
    const snippets = el("div", "chips");
    for (const [title, body] of Object.entries(SNIPPETS)) {
      snippets.append(button(title, "chip", () => insertSnippet(editor, title, body)));
    }
    page.append(snippets);
    const layout = el("div", "split");
    const outline = el("div", "outline");
    outline.id = "config-outline";
    const editor = document.createElement("textarea");
    editor.className = "editor";
    editor.spellcheck = false;
    editor.value = state.configText;
    editor.addEventListener("input", () => {
      state.configText = editor.value;
      state.configDirty = state.configText !== state.configBaseline;
      paintOutline(editor);
      const save = document.querySelector(".page-head .primary");
      if (save) save.textContent = state.configDirty || state.formDirty ? "Сохранить" : "Сохранено";
    });
    layout.append(outline, editor);
    page.append(layout);
    const prompts = el("details");
    prompts.append(el("summary", "", "Имена плейсхолдеров"));
    prompts.append(el("p", "muted", "Отклики: first_name, last_name, email, phone, resume_title, resume_hash, resume_url, resume_city, resume_about, resume_skills, resume_salary, resume_experience, resume_total_experience, vacancy_name, vacancy_url, employer_name, github_profile_url. В фильтре ещё vacancy_skills и vacancy_description. В тесте — question и reply_options."));
    prompts.append(el("p", "muted", "Чаты: те же данные резюме, кроме resume_url и resume_hash, плюс farewell_message, vacancy_compensation, contact_name, reply_to_message, reply_options. message_history, message_count и contact_is_bot нельзя подставлять в промпт с кнопками."));
    page.append(prompts);
    paintOutline(editor);
  }

  function formValue(key) {
    return state.form?.[key] || "";
  }

  function setForm(key, value) {
    state.form = { ...(state.form || {}), [key]: value };
    state.formDirty = true;
    const save = document.querySelector(".page-head .primary");
    if (save) save.textContent = "Сохранить";
  }

  function formText(key, attrs = {}) {
    return textInput(formValue(key), (value) => setForm(key, value), attrs);
  }

  function renderConnection(page) {
    if (state.formParseError) {
      page.append(banner("bad", state.formParseError + " Поля ниже не записаны поверх файла, чтобы не стереть его. Поправьте текст внизу."));
    }
    const ready = formValue("openai.default.base_url") && formValue("openai.default.model");
    page.append(banner(ready ? "info" : "warn", ready
      ? "Адрес и модель заданы. Переключатель в шапке «AI в командах» только разрешает вызовы. Пока файл не сохранён, утилита их не видит."
      : "Модель не подключена. Нужны адрес API, который заканчивается на /v1, и имя модели. Переключатель «AI в командах» сам адрес не задаёт."));
    const providers = el("div", "chips");
    for (const [label, url, model] of [
      ["Ollama на этом компьютере", "http://127.0.0.1:11434/v1", "qwen3-vl:8b"],
      ["OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"],
      ["OpenRouter", "https://openrouter.ai/api/v1", ""],
    ]) {
      providers.append(button(label, "chip", () => {
        setForm("openai.default.base_url", url);
        if (model) setForm("openai.default.model", model);
        rerender();
      }));
    }
    page.append(card("Подключение модели", "Протокол как у OpenAI: адрес, ключ и имя модели. Ключ для локальной Ollama можно оставить пустым.", [
      span2(providers),
      field("Адрес API", formText("openai.default.base_url", { placeholder: "http://127.0.0.1:11434/v1" }), "Без /chat/completions на конце."),
      field("Ключ API", formText("openai.default.api_key", { type: "password", placeholder: "sk-…" }), "В журнал команд не попадает."),
      field("Модель", formText("openai.default.model", { placeholder: "qwen3-vl:8b" }), "Точное имя, как его отдаёт сервер."),
      field("В командах", choiceChips([
        ["yes", "Вызывать модель"],
        ["no", "Не вызывать"],
      ], state.globals.useAi ? "yes" : "no", (value) => {
        state.globals.useAi = value === "yes";
        persist();
        renderTop();
      }), "Тот же переключатель, что в шапке."),
    ]));
    page.append(card("Как ходить в модель", "Это не адрес. Пустые поля остаются такими, как решит утилита.", [
      field("Пауза, сек", formText("openai.default.delay", { inputmode: "decimal", placeholder: "0.5" })),
      field("Ждать ответ, сек", formText("openai.default.timeout", { inputmode: "decimal", placeholder: "90" })),
      field("Ждать соединение, сек", formText("openai.default.connect_timeout", { inputmode: "decimal", placeholder: "10" })),
      field("Повторы", formText("openai.default.max_retries", { inputmode: "numeric", placeholder: "5" })),
      field("Температура", formText("openai.default.temperature", { inputmode: "decimal", placeholder: "0" }), "0 — ответы стабильнее."),
      field("Максимум токенов", formText("openai.default.max_completion_tokens", { inputmode: "numeric", placeholder: "1000" })),
      span2(field("Прокси только для модели", formText("openai.default.proxy_url", { placeholder: "socks5h://127.0.0.1:1080" }), "Сайт hh через него не ходит.")),
    ]));
    page.append(card("Капча отдельной моделью", "Пустые поля значат: капчу читает та же модель, что и выше. Имеет смысл, если основная не видит картинки.", [
      field("Адрес", formText("openai.captcha.base_url", { placeholder: "http://127.0.0.1:8080/v1" })),
      field("Ключ", formText("openai.captcha.api_key", { type: "password" })),
      field("Модель", formText("openai.captcha.model", { placeholder: "gemma" })),
    ]));
    page.append(card("Сайт", "Куда утилита ходит как браузер. Это не адрес модели.", [
      field("Адрес сайта", formText("general.base_url", { placeholder: "https://hh.ru" })),
      field("Язык капчи", choiceChips([
        ["", "Не задан"],
        ["RU", "RU"],
        ["EN", "EN"],
      ], formValue("general.captcha_lang").toUpperCase(), (value) => setForm("general.captcha_lang", value)), "Часть моделей лучше читает английские буквы."),
      span2(field("Прокси сайта", formText("general.proxy_url", { placeholder: "socks5h://127.0.0.1:1080" }))),
      span2(field("User-Agent", formText("general.user_agent", { placeholder: "Mozilla/5.0 …" }), "Пустой быстро начинает выглядеть подозрительно.")),
    ]));
    page.append(card("Почта для откликов", "Нужна, только если на странице откликов включена отправка письма работодателю.", [
      field("Сервер", formText("smtp.host", { placeholder: "smtp.example.com" })),
      field("Порт", formText("smtp.port", { inputmode: "numeric", placeholder: "465" })),
      field("Логин", formText("smtp.user", { placeholder: "me@example.com" })),
      field("Пароль", formText("smtp.password", { type: "password" })),
      span2(field("От кого", formText("smtp.from", { placeholder: "Имя <me@example.com>" }))),
      field("SSL", choiceChips([
        ["", "Не задано"],
        ["true", "Да"],
        ["false", "Нет"],
      ], formValue("smtp.ssl"), (value) => setForm("smtp.ssl", value))),
      field("STARTTLS", choiceChips([
        ["", "Не задано"],
        ["true", "Да"],
        ["false", "Нет"],
      ], formValue("smtp.starttls"), (value) => setForm("smtp.starttls", value))),
    ]));
    page.append(card("API сайта", "Редко нужно менять. Пусто — утилита ходит на api.hh.ru сама.", [
      field("Адрес API", formText("api_client.base_url", { placeholder: "https://api.hh.ru/" })),
      field("Пауза, сек", formText("api_client.delay", { inputmode: "decimal", placeholder: "0.345" })),
      field("Повторы", formText("api_client.max_retries", { inputmode: "numeric", placeholder: "3" })),
    ]));
    page.append(el("h2", "file-title", "Файл config.toml"));
  }

  function paintOutline(editor) {
    const host = document.getElementById("config-outline");
    if (!host) return;
    host.replaceChildren();
    const lines = editor.value.split("\n");
    let found = false;
    lines.forEach((line, index) => {
      const match = line.match(/^\[([^\]]+)\]/);
      if (!match) return;
      found = true;
      host.append(button(match[1], "", () => {
        const position = lines.slice(0, index).join("\n").length + (index ? 1 : 0);
        editor.focus();
        editor.setSelectionRange(position, position + line.length);
      }));
    });
    if (!found) host.append(el("span", "muted", "Секций пока нет"));
  }

  function insertSnippet(editor, title, body) {
    if (editor.value.includes(title)) {
      toast("Такая секция уже есть");
      return;
    }
    const prefix = editor.value && !editor.value.endsWith("\n") ? "\n\n" : editor.value ? "\n" : "";
    editor.value += `${prefix}${body.trim()}\n`;
    editor.dispatchEvent(new Event("input"));
    editor.focus();
  }

  async function saveConfig() {
    try {
      if (state.formDirty && !state.formParseError) {
        const merged = await api("/api/config/merge", {
          method: "POST",
          body: JSON.stringify({ text: state.configText, fields: state.form || {} }),
        });
        state.configText = merged.text;
        state.form = merged.fields || state.form;
        state.formDirty = false;
        state.formParseError = merged.parseError || "";
        state.configDirty = true;
        const editor = document.querySelector(".editor");
        if (editor) {
          editor.value = state.configText;
          paintOutline(editor);
        }
      }
      const data = await api("/api/config", {
        method: "PUT",
        body: JSON.stringify({
          globals: state.globals,
          profile: state.globals.profile || ".",
          text: state.configText,
        }),
      });
      state.configBaseline = state.configText;
      state.configDirty = false;
      state.configPath = data.path;
      toast("Конфиг сохранён");
      const save = document.querySelector(".page-head .primary");
      if (save) save.textContent = "Сохранено";
      const path = document.querySelector(".page .mono");
      if (path) path.textContent = data.path;
    } catch (error) {
      toast(error.message);
    }
  }

  async function loadConfig(render) {
    const generation = ++configGeneration;
    state.configLoading = true;
    if (render && state.page === "config") renderMain();
    try {
      const data = await api(`/api/config?${new URLSearchParams({
        configDir: state.globals.configDir || "",
        profile: state.globals.profile || ".",
      })}`);
      if (generation !== configGeneration) return;
      if (state.configDirty && !render) return;
      state.configText = data.text || "";
      state.configBaseline = state.configText;
      state.configPath = data.path || "";
      state.configDirty = false;
      state.form = data.fields || {};
      state.formDirty = false;
      state.formParseError = data.parseError || "";
    } catch (error) {
      toast(error.message);
    } finally {
      if (generation === configGeneration) {
        state.configLoading = false;
        if (state.page === "config" && (render || !state.configDirty)) renderMain();
      }
    }
  }

  function renderLogs(page) {
    page.append(pageHead("Лог утилиты", "Это файл log.txt профиля, не журнал кнопок внизу. В файл утилита пишет подробности и сама маскирует часть идентификаторов.", [
      button("Обновить", "ghost", () => loadLog(false)),
      button(state.logFollow ? "Слежение включено" : "Следить", "ghost", () => {
        state.logFollow = !state.logFollow;
        persist();
        setupLogFollow();
        renderMain();
      }),
      button("Показать в журнале", "ghost", () => run({ op: "log", args: [], globals: state.globals }), { run: true }),
      button("Следить в журнале", "ghost", () => run({ op: "log", args: ["-f"], globals: state.globals }), { run: true }),
      button("Очистить файл", "danger", () => run({ op: "log", args: ["--clear"], globals: state.globals }), { run: true }),
    ]));
    page.append(el("p", "mono muted", state.logPath || ""));
    const view = el("pre", "log-view", state.logText || "Файл пуст или ещё не создан.");
    page.append(view);
  }

  function setupLogFollow() {
    window.clearInterval(state.logTimer);
    if (state.logFollow) state.logTimer = window.setInterval(() => {
      if (state.page === "logs") loadLog(false);
    }, 2000);
  }

  async function loadLog(render) {
    try {
      const data = await api(`/api/logfile?${new URLSearchParams({
        configDir: state.globals.configDir || "",
        profile: state.globals.profile || ".",
      })}`);
      state.logText = data.text || "";
      state.logPath = data.path || "";
      if (state.page === "logs") {
        if (render) renderMain();
        else {
          const view = document.querySelector(".log-view");
          const path = document.querySelector(".page .mono");
          if (view) view.textContent = state.logText || "Файл пуст или ещё не создан.";
          if (path) path.textContent = state.logPath;
        }
      }
    } catch (error) {
      toast(error.message);
    }
  }

  async function refreshState(render = true) {
    try {
      const data = await api(`/api/state?${new URLSearchParams({ configDir: state.globals.configDir || "" })}`);
      state.binary = data.binary;
      state.binaryError = data.binaryError || "";
      state.profiles = data.profiles || [];
      state.defaultConfigRoot = data.defaultConfigRoot || "";
      state.configRoot = data.configRoot || "";
      state.version = data.version || "";
      paintVersion();
      if (!state.profiles.some((item) => item.id === state.globals.profile)) state.globals.profile = ".";
    } catch (error) {
      toast(error.message);
    }
    if (render) {
      renderTop();
      renderMain();
    }
  }

  async function refreshSnapshot() {
    if (!state.binary) return;
    try {
      const data = await api("/api/snapshot", {
        method: "POST",
        body: JSON.stringify({ globals: state.globals }),
      });
      state.snapshot = data;
    } catch (error) {
      if (String(error.message).includes("другая команда")) return;
      state.snapshot = { me: null, resumes: [], message: error.message, authorized: false };
    }
    renderTop();
    paintResumeSelects();
    if (state.page === "overview" || state.page === "resumes") renderMain();
  }

  function boot() {
    bindJobs();
    bindDock();
    applyDockHeight();
    paintJobs();
    paintTabs();
    connect();
    setupLogFollow();
    renderNav();
    renderTop();
    renderMain();
    refreshState(false).then(async () => {
      renderTop();
      await loadDesk();
      if (!showsDesk()) renderMain();
      if (state.page === "config") return loadConfig(true);
      if (state.page === "logs") return loadLog(true);
      return refreshSnapshot();
    });
  }

  boot();
})();
