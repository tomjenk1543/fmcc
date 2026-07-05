// Minimal mock DOM + browser globals for running FM Command Centre's <script> body under
// plain Node (no real browser/jsdom available in this sandbox — no network access to
// install jsdom). Good enough to exercise this app's own logic (element lookup, class
// toggling, dataset, innerHTML round-tripping, localStorage, basic event dispatch, a small
// CSS-selector subset) — NOT a spec-compliant DOM. Rebuilt from scratch after a sandbox
// reset wiped the previous copy of this file; it's a dev/test tool only, never shipped.

const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function kebabToCamel(s) { return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
function camelToKebab(s) { return s.replace(/[A-Z]/g, c => '-' + c.toLowerCase()); }

class TextNode {
  constructor(text) { this.nodeType = 3; this.textContent = text; this.parentNode = null; }
  get nodeValue() { return this.textContent; }
  set nodeValue(v) { this.textContent = v; }
}

class ClassList {
  constructor(el) { this.el = el; }
  _set() {
    const attr = this.el.attributes.get('class') || '';
    return new Set(attr.split(/\s+/).filter(Boolean));
  }
  _sync(set) { this.el.attributes.set('class', Array.from(set).join(' ')); }
  add(...names) { const s = this._set(); names.forEach(n => s.add(n)); this._sync(s); }
  remove(...names) { const s = this._set(); names.forEach(n => s.delete(n)); this._sync(s); }
  toggle(name, force) {
    const s = this._set();
    const has = s.has(name);
    const shouldHave = force === undefined ? !has : force;
    if (shouldHave) s.add(name); else s.delete(name);
    this._sync(s);
    return shouldHave;
  }
  contains(name) { return this._set().has(name); }
  get length() { return this._set().size; }
}

class Element {
  constructor(tagName) {
    this.nodeType = 1;
    this.tagName = (tagName || '').toUpperCase();
    this.attributes = new Map();
    this.style = {};
    this.childNodes = [];
    this.parentNode = null;
    this._listeners = {};
    this.classList = new ClassList(this);
    this.selected = false;
    this.checked = false;
    this.disabled = false;
    this.files = undefined;
    const self = this;
    this.dataset = new Proxy({}, {
      get(_, prop) {
        const attr = 'data-' + camelToKebab(String(prop));
        return self.attributes.has(attr) ? self.attributes.get(attr) : undefined;
      },
      set(_, prop, val) {
        const attr = 'data-' + camelToKebab(String(prop));
        self.attributes.set(attr, String(val));
        return true;
      },
      has(_, prop) {
        return self.attributes.has('data-' + camelToKebab(String(prop)));
      }
    });
  }

  get id() { return this.attributes.get('id') || ''; }
  set id(v) { this.attributes.set('id', v); }

  // Every OPTION descendant of a SELECT, recursing through OPTGROUP wrappers — real browsers
  // group a select's options this way (see e.g. this app's own role pickers, which render
  // <optgroup>s), so a plain this.children.filter(...) would miss every option nested one
  // level deeper and silently treat the select as empty.
  _allSelectOptions() {
    const out = [];
    (this.children || []).forEach(c => {
      if (c.tagName === 'OPTION') out.push(c);
      else if (c.tagName === 'OPTGROUP') out.push(...c._allSelectOptions());
    });
    return out;
  }

  // <select>.value defers to whichever <option> descendant is actually .selected (falling
  // back to the first option when none is), same as a real browser — critical for this app's
  // "replace all the options via innerHTML, then read .value back" pattern (position/role
  // pickers etc.) to behave the way production code assumes. Every other element (input,
  // textarea, or a bare <option> with no value attribute set) just uses a plain backing
  // field, with <option> falling back to its own text if nothing set .value explicitly.
  get value() {
    if (this.tagName === 'SELECT') {
      const opts = this._allSelectOptions();
      const selected = opts.find(o => o.selected);
      if (selected) return selected.value;
      return opts.length ? opts[0].value : '';
    }
    if (this.tagName === 'OPTION' && this._value === undefined) return this.textContent;
    return this._value !== undefined ? this._value : '';
  }
  set value(v) {
    if (this.tagName === 'SELECT') {
      this._allSelectOptions().forEach(o => { o.selected = (o.value === String(v)); });
      return;
    }
    this._value = v;
  }

  get className() { return this.attributes.get('class') || ''; }
  set className(v) { this.attributes.set('class', v); }

  get children() { return this.childNodes.filter(n => n.nodeType === 1); }

  get firstElementChild() { return this.children[0] || null; }
  get lastElementChild() { const c = this.children; return c[c.length - 1] || null; }

  get textContent() {
    return this.childNodes.map(n => n.nodeType === 3 ? n.textContent : n.textContent).join('');
  }
  set textContent(v) {
    this.childNodes = [];
    if (v !== '' && v != null) {
      const t = new TextNode(String(v));
      t.parentNode = this;
      this.childNodes.push(t);
    }
  }

  get innerHTML() {
    return this.childNodes.map(n => serializeNode(n)).join('');
  }
  set innerHTML(html) {
    this.childNodes = [];
    parseHtmlInto(this, html == null ? '' : String(html));
  }

  get outerHTML() { return serializeNode(this); }

  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }

  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i !== -1) this.childNodes.splice(i, 1);
    node.parentNode = null;
    return node;
  }
  insertBefore(node, ref) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    if (ref == null) { this.childNodes.push(node); return node; }
    const i = this.childNodes.indexOf(ref);
    if (i === -1) this.childNodes.push(node);
    else this.childNodes.splice(i, 0, node);
    return node;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  cloneNode(deep) {
    const clone = new Element(this.tagName);
    clone.attributes = new Map(this.attributes);
    if (deep) {
      this.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          const t = new TextNode(n.textContent);
          t.parentNode = clone;
          clone.childNodes.push(t);
        } else {
          const c = n.cloneNode(true);
          c.parentNode = clone;
          clone.childNodes.push(c);
        }
      });
    }
    return clone;
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener(type, fn) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(f => f !== fn);
  }
  dispatchEvent(evt) {
    evt.target = evt.target || this;
    evt.currentTarget = this;
    (this._listeners[evt.type] || []).slice().forEach(fn => fn(evt));
    return true;
  }
  // Test-harness convenience (not a real DOM method) — fires a synthetic event, optionally
  // merging extra properties (e.g. { target }) onto the event object.
  fire(type, extra) {
    const evt = Object.assign({ type, target: this, currentTarget: this, preventDefault(){}, stopPropagation(){} }, extra || {});
    this.dispatchEvent(evt);
  }
  click() { this.fire('click'); }
  focus() {}
  blur() {}
  scrollIntoView() {}

  matches(selector) { return matchesSelector(this, selector); }
  closest(selector) {
    let node = this;
    while (node) {
      if (node.nodeType === 1 && node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }
  querySelectorAll(selector) {
    return selectAll(this, selector);
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeNode(node) {
  if (node.nodeType === 3) return node.textContent;
  const tag = node.tagName.toLowerCase();
  const attrs = Array.from(node.attributes.entries())
    .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join('');
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
  const inner = node.childNodes.map(serializeNode).join('');
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

// ---- Tiny HTML parser (stack-based, tolerant of malformed/unclosed markup) ----
function parseHtmlInto(root, html) {
  const stack = [root];
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
  let lastIndex = 0;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m.index > lastIndex) {
      const text = html.slice(lastIndex, m.index);
      if (text) stack[stack.length - 1].appendChild(new TextNode(decodeEntities(text)));
    }
    lastIndex = tagRe.lastIndex;
    const whole = m[0];
    if (whole.startsWith('<!--')) continue;
    const isEnd = whole.startsWith('</');
    const tagName = m[1];
    if (!tagName) continue;
    if (isEnd) {
      // pop back to matching tag if present anywhere in the stack (tolerant of unclosed tags)
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tagName.toLowerCase() === tagName.toLowerCase()) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const selfClose = m[3] === '/' || VOID_TAGS.has(tagName.toLowerCase());
    const el = new Element(tagName);
    const attrStr = m[2] || '';
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let am;
    while ((am = attrRe.exec(attrStr))) {
      const name = am[1];
      const val = am[3] !== undefined ? am[3] : am[4] !== undefined ? am[4] : am[5] !== undefined ? am[5] : '';
      el.attributes.set(name, decodeEntities(val));
    }
    // Reflect a few boolean/value attributes from the parsed markup onto their matching
    // convenience properties — e.g. a static `<select disabled>` in index.html needs
    // el.disabled === true from the moment it's parsed, not just after some later JS
    // explicitly sets the property (which is the only thing a bare attributes.set() above
    // would be visible to).
    if (el.attributes.has('disabled')) el.disabled = true;
    if (el.attributes.has('checked')) el.checked = true;
    if (el.attributes.has('selected')) el.selected = true;
    if (el.attributes.has('value')) el.value = el.attributes.get('value');
    stack[stack.length - 1].appendChild(el);
    if (!selfClose) stack.push(el);
  }
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    if (text) stack[stack.length - 1].appendChild(new TextNode(decodeEntities(text)));
  }
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&middot;/g, '·').replace(/&times;/g, '×').replace(/&nbsp;/g, ' ');
}

// ---- Tiny CSS-selector engine: supports a chain of descendant-combined *simple* selectors,
// each simple selector being tag?/.classes*/#id?/[attr]|[attr="val"]* in any combination
// (e.g. "div.foo#bar[data-x]", "th[data-sort-key]", ".scout-remove-btn"). Good enough for
// every selector string this app actually uses (see the querySelectorAll audit this was
// built against) — not a general CSS engine. ----
function parseSimpleSelector(sel) {
  const re = /^([a-zA-Z][a-zA-Z0-9-]*)?((?:[.#][-\w]+|\[[^\]]+\])*)$/;
  const m = sel.match(re);
  if (!m) return null;
  const tag = m[1] ? m[1].toUpperCase() : null;
  const rest = m[2] || '';
  const classes = [];
  let id = null;
  const attrChecks = [];
  const partRe = /[.#][-\w]+|\[[^\]]+\]/g;
  let pm;
  while ((pm = partRe.exec(rest))) {
    const part = pm[0];
    if (part[0] === '.') classes.push(part.slice(1));
    else if (part[0] === '#') id = part.slice(1);
    else {
      const inner = part.slice(1, -1);
      const eq = inner.match(/^([-\w]+)\s*=\s*"?([^"]*)"?$/);
      if (eq) attrChecks.push({ name: eq[1], value: eq[2] });
      else attrChecks.push({ name: inner, value: null });
    }
  }
  return { tag, classes, id, attrChecks };
}

function simpleMatches(el, parsed) {
  if (!parsed) return false;
  if (parsed.tag && el.tagName !== parsed.tag) return false;
  if (parsed.id && el.id !== parsed.id) return false;
  for (const c of parsed.classes) if (!el.classList.contains(c)) return false;
  for (const a of parsed.attrChecks) {
    if (!el.hasAttribute(a.name)) return false;
    if (a.value !== null && el.getAttribute(a.name) !== a.value) return false;
  }
  return true;
}

// Splits a descendant-combinator chain on whitespace, EXCEPT whitespace inside a [...]
// attribute-value (e.g. '[data-attr-name="Jumping Reach"]' must stay one token) — a plain
// /\s+/ split would wrongly cut that selector in two.
function splitSelectorChain(selector) {
  const parts = [];
  let depth = 0, current = '';
  for (const ch of selector.trim()) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function matchesSelector(el, selector) {
  // Only supports matching against the LAST simple selector in a descendant chain, which
  // is all .matches()/.closest() are used for in this app.
  const parts = splitSelectorChain(selector);
  const parsed = parseSimpleSelector(parts[parts.length - 1]);
  return simpleMatches(el, parsed);
}

function allDescendants(root) {
  const out = [];
  (function walk(node) {
    node.childNodes.forEach(n => {
      if (n.nodeType === 1) { out.push(n); walk(n); }
    });
  })(root);
  return out;
}

function selectAll(root, selector) {
  const chain = splitSelectorChain(selector).map(parseSimpleSelector);
  let candidates = allDescendants(root);
  // Walk the combinator chain left to right: at each step, keep elements matching that
  // step AND having some valid ancestor path matching every earlier step (approximated
  // here as "some ancestor, in order, matches the previous simple selector" — sufficient
  // for this app's own two-and-three-level selectors).
  let currentSets = [candidates.filter(el => simpleMatches(el, chain[0]))];
  for (let i = 1; i < chain.length; i++) {
    const prevMatches = currentSets[currentSets.length - 1];
    const next = allDescendants(root).filter(el => {
      if (!simpleMatches(el, chain[i])) return false;
      let anc = el.parentNode;
      while (anc) {
        if (prevMatches.includes(anc)) return true;
        anc = anc.parentNode;
      }
      return false;
    });
    currentSets.push(next);
  }
  return currentSets[currentSets.length - 1];
}

// ---- document / window globals ----
const documentBody = new Element('body');
const documentElement = new Element('html');
documentElement.appendChild(documentBody);
documentElement.style.setProperty = function (name, val) { this[name] = val; };
documentElement.style.getPropertyValue = function (name) { return this[name] || ''; };

// Fallback stubs for element IDs some test files reference that deliberately don't exist
// anywhere in the real index.html (e.g. kitlookup_test.js's 'kit-status-test') — throwaway
// status-line/fixture elements a test wires up itself rather than needing this app's real
// markup to grow test-only hooks. Real getElementById() would just return null for these;
// this harness instead lazily creates (and caches, so repeated lookups return the SAME
// element a test can both write to and later assert against) a detached stub, so a test can
// freely invent fixture IDs without this app's HTML needing to know about them.
const stubElementsById = new Map();

const document = {
  documentElement,
  body: documentBody,
  createElement(tag) { return new Element(tag); },
  getElementById(id) {
    // Search the live tree each time (cheap enough at this app's DOM size, and avoids a
    // second bookkeeping structure getting out of sync with direct attribute edits).
    if (documentElement.id === id) return documentElement;
    const all = allDescendants(documentElement);
    const found = all.find(el => el.id === id);
    if (found) return found;
    if (stubElementsById.has(id)) return stubElementsById.get(id);
    const stub = new Element('div');
    stub.id = id;
    stubElementsById.set(id, stub);
    return stub;
  },
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
  querySelectorAll(sel) { return selectAll(documentElement, sel); },
  addEventListener: documentBody.addEventListener.bind(documentBody),
  removeEventListener: documentBody.removeEventListener.bind(documentBody),
  dispatchEvent: documentBody.dispatchEvent.bind(documentBody),
};
// document itself needs its own listener registry distinct from body's — document-level
// keydown handlers (Escape key etc.) are registered on `document`, not `document.body`.
(function () {
  const listeners = {};
  document.addEventListener = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  document.removeEventListener = (type, fn) => { if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn); };
  document._listeners = listeners;
  document.dispatchEvent = (evt) => { (listeners[evt.type] || []).slice().forEach(fn => fn(evt)); };
})();

function getComputedStyle(el) {
  return {
    getPropertyValue(name) { return (el.style && el.style[name]) || ''; }
  };
}

class LocalStorageMock {
  constructor() { this._data = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; }
  setItem(k, v) { this._data[k] = String(v); }
  removeItem(k) { delete this._data[k]; }
  clear() { this._data = {}; }
}
const localStorage = new LocalStorageMock();

// FileReader mock — controlled by global.__fileReaderText / global.__fileReaderShouldError,
// same knobs importupload_test.js already drives.
class FileReaderMock {
  readAsText(file) {
    setTimeout_immediate(() => {
      if (global.__fileReaderShouldError) {
        if (this.onerror) this.onerror(new Error('mock read error'));
      } else {
        this.result = global.__fileReaderText !== undefined ? global.__fileReaderText : '';
        if (this.onload) this.onload({ target: this });
      }
    });
  }
  // readFileAsDataUrl() (crest/kit/league-logo lookups) always goes through this path —
  // real content doesn't matter to any test (none assert on the actual bytes, only that
  // SOME truthy data URL came back and got applied), so this fabricates a plausible-looking
  // one from the file's own name/type rather than actually reading fake ArrayBuffers.
  readAsDataURL(file) {
    setTimeout_immediate(() => {
      if (global.__fileReaderShouldError) {
        if (this.onerror) this.onerror(new Error('mock read error'));
      } else {
        const type = (file && file.type) || 'image/png';
        const name = (file && file.name) || 'mock';
        this.result = `data:${type};base64,MOCK_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (this.onload) this.onload({ target: this });
      }
    });
  }
}
// Run "async" callbacks synchronously in this harness — nothing here needs real
// asynchrony, and it keeps tests simple (no await/setTimeout plumbing needed).
function setTimeout_immediate(fn) { fn(); }

const window = {
  innerWidth: 1680,
  innerHeight: 1000,
  addEventListener(type, fn) { document.addEventListener(type, fn); },
  removeEventListener(type, fn) { document.removeEventListener(type, fn); },
  showDirectoryPicker: undefined,
};

const location = { reload() {} };

function confirm(msg) { return global.__confirmResult !== undefined ? global.__confirmResult : true; }
function alert(msg) {}

global.document = document;
global.window = window;
global.localStorage = localStorage;
global.location = location;
global.confirm = confirm;
global.alert = alert;
global.getComputedStyle = getComputedStyle;
global.FileReader = FileReaderMock;
global.Element = Element;
