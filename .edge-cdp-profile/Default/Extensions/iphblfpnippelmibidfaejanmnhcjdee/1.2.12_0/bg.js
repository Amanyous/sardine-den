// bg.js (MV3 service worker) — clean + no duplicate contextMenu ids
// Drop-in replacement

const BM_KEYS = {
  bookmarks: "bookmarks",
  groups: "groups",
  groupOrder: "groups.order",
  lastGroup: "bm.lastGroup",
};

const SEEDED_KEY = "bm.seeded.v1";

const DEFAULT_GROUPS = {
  "🔍 Search": { color: "#3b82f6" },
  "💼 Work":   { color: "#8b5cf6" },
  "💬 Social": { color: "#22c55e" },
  "🎧 Fun":    { color: "#f97316" },
};

const PRESET_BOOKMARKS = [
  { group: "🔍 Search", title: "Google", url: "https://www.google.com" },
  { group: "🔍 Search", title: "YouTube", url: "https://www.youtube.com" },
  { group: "🔍 Search", title: "Wikipedia", url: "https://www.wikipedia.org" },
  { group: "🔍 Search", title: "ChatGPT", url: "https://chat.openai.com" },

  { group: "💬 Social", title: "Telegram Web", url: "https://web.telegram.org" },
  { group: "💬 Social", title: "WhatsApp Web", url: "https://web.whatsapp.com" },
  { group: "💬 Social", title: "Instagram", url: "https://www.instagram.com" },
  { group: "💬 Social", title: "X (Twitter)", url: "https://x.com" },

  { group: "💼 Work", title: "GitHub", url: "https://github.com" },
  { group: "💼 Work", title: "Stack Overflow", url: "https://stackoverflow.com" },
  { group: "💼 Work", title: "Google Drive", url: "https://drive.google.com" },
  { group: "💼 Work", title: "Notion", url: "https://www.notion.so" },

  { group: "🎧 Fun", title: "Spotify", url: "https://open.spotify.com" },
  { group: "🎧 Fun", title: "Netflix", url: "https://www.netflix.com" },
  { group: "🎧 Fun", title: "Reddit", url: "https://www.reddit.com" },
  { group: "🎧 Fun", title: "Twitch", url: "https://www.twitch.tv" },

  { group: "💼 Work", title: "Gmail", url: "https://mail.google.com" },
  { group: "🔍 Search", title: "Google Maps", url: "https://maps.google.com" },
  { group: "🔍 Search", title: "Google Translate", url: "https://translate.google.com" },
  { group: "🎧 Fun", title: "Amazon", url: "https://www.amazon.com" },
];

const MENU = {
  ROOT: "bm_add_root",
  LAST: "bm_add_last",
  GROUP_PREFIX: "bm_add_group_", // + encodeURIComponent(name)
};

const MEDIA_LAST_KEY = "media.lastActiveUrl";
const MEDIA_LAST_TAB_ID_KEY = "media.lastActiveTabId";
const PREMIUM_STATE_KEY = "cloud.premium.state.v1";
const PREMIUM_FEATURE_DASHBOARD_FOLDERS = "dashboardFolders";
const DEFAULT_OFF_PERMISSIONS_MIGRATED_KEY = "permissions.defaultOff.migrated.v1";
const DEFAULT_OFF_API_PERMISSIONS = ["unlimitedStorage", "scripting"];
const DEFAULT_OFF_MEDIA_ORIGINS = [
  "https://*.youtube.com/*",
  "https://youtu.be/*",
  "https://open.spotify.com/*",
  "https://*.soundcloud.com/*",
  "https://on.soundcloud.com/*",
];

console.log("[bg] loaded");

function isWebUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function isSupportedMediaUrl(url) {
  if (!isWebUrl(url)) return false;

  // YouTube/YT Music: только конкретные видео, плейлисты или Shorts
  if (/youtube\.com|youtu\.be|music\.youtube\.com/i.test(url)) {
    return /[?&]v=[\w-]+|\/shorts\/[\w-]+|[?&]list=[\w-]+|youtu\.be\/[\w-]+/.test(url);
  }

  // Spotify: only the web player; other Spotify hosts are not covered by media permissions.
  if (/spotify\.com/i.test(url)) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./i, "") === "open.spotify.com";
    } catch {
      return false;
    }
  }

  // SoundCloud: только страницы с треком или сетом (минимум /artist/track)
  if (/soundcloud\.com/i.test(url)) {
    try {
      const u = new URL(url);
      const blocked = new Set(["/discover", "/home", "/stream", "/you", "/search", "/upload", "/charts"]);
      if (blocked.has(u.pathname) || u.pathname === "/") return false;
      const segs = u.pathname.split("/").filter(Boolean);
      return segs.length >= 2;
    } catch { return false; }
  }

  return false;
}

async function rememberMediaTab(tab) {
  try {
    const url = tab?.url || "";
    if (!isSupportedMediaUrl(url)) return;
    const tabId = typeof tab?.id === "number" ? tab.id : null;
    await setStore({
      [MEDIA_LAST_KEY]: url,
      ...(tabId !== null ? { [MEDIA_LAST_TAB_ID_KEY]: tabId } : {}),
    });
  } catch {}
}

function faviconFor(url) {
  try {
    // Более стабильный вариант, чем t2.gstatic (у тебя там 404).
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
  } catch {
    return "";
  }
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(
    "https://docs.google.com/forms/d/e/1FAIpQLScXYS2B-OdHtKExyI9kryC0UG2QtHuBAudArEAKi64GQ6mmAA/viewform?usp=dialog"
  );
});

function getStore(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, (r) => resolve(r || {})));
}

function setStore(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()));
}

function normalizePremiumFeatureName(featureName) {
  return String(featureName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hasActivePremiumSubscription(state) {
  if (state?.isPremium !== true) return false;
  const billingStatus = String(state?.billingStatus || "").trim().toLowerCase();
  return billingStatus === "active" || billingStatus === "trialing";
}

function hasPremiumFeature(featureName, state) {
  const key = normalizePremiumFeatureName(featureName);
  if (!key) return false;

  if (state?.features && Object.prototype.hasOwnProperty.call(state.features, key)) {
    return !!state.features[key];
  }

  return hasActivePremiumSubscription(state) && key === "dashboardfolders";
}

async function canCreateBookmarkGroups() {
  const data = await getStore([PREMIUM_STATE_KEY]);
  const state = data[PREMIUM_STATE_KEY] && typeof data[PREMIUM_STATE_KEY] === "object"
    ? data[PREMIUM_STATE_KEY]
    : null;
  return hasPremiumFeature(PREMIUM_FEATURE_DASHBOARD_FOLDERS, state);
}

function removeOptionalAccess(permissions, origins) {
  return new Promise((resolve) => {
    if (!chrome?.permissions?.remove) {
      resolve(false);
      return;
    }
    chrome.permissions.remove({ permissions, origins }, (removed) => {
      resolve(!!removed && !chrome.runtime?.lastError);
    });
  });
}

async function ensureDefaultOffPermissionMigration() {
  const data = await getStore([DEFAULT_OFF_PERMISSIONS_MIGRATED_KEY]);
  if (data[DEFAULT_OFF_PERMISSIONS_MIGRATED_KEY]) return;
  await removeOptionalAccess(DEFAULT_OFF_API_PERMISSIONS, DEFAULT_OFF_MEDIA_ORIGINS);
  await setStore({ [DEFAULT_OFF_PERMISSIONS_MIGRATED_KEY]: true });
}

function groupIdFromName(name) {
  return MENU.GROUP_PREFIX + encodeURIComponent(name);
}

function groupNameFromId(id) {
  return decodeURIComponent(String(id).slice(MENU.GROUP_PREFIX.length));
}

async function ensureDefaults() {
  const data = await getStore([BM_KEYS.groups, BM_KEYS.bookmarks, BM_KEYS.lastGroup, SEEDED_KEY]);

  const hasStoredGroups = Object.prototype.hasOwnProperty.call(data || {}, BM_KEYS.groups);

  let groups =
    data[BM_KEYS.groups] && typeof data[BM_KEYS.groups] === "object"
      ? data[BM_KEYS.groups]
      : {};

  let bookmarks = Array.isArray(data[BM_KEYS.bookmarks]) ? data[BM_KEYS.bookmarks] : [];

  let lastGroup = typeof data[BM_KEYS.lastGroup] === "string" ? data[BM_KEYS.lastGroup] : "";

  const seeded = !!data[SEEDED_KEY];

  // groups
  if (!hasStoredGroups) {
    // structuredClone ок в MV3, но сделаем безопасно
    groups = JSON.parse(JSON.stringify(DEFAULT_GROUPS));
  }

  // lastGroup
  if (!lastGroup || !groups[lastGroup]) lastGroup = Object.keys(groups)[0] || "";

  // seed bookmarks (only once)
  let didSeed = false;
  if (!seeded && bookmarks.length === 0) {
    const now = Date.now();
    bookmarks = PRESET_BOOKMARKS.map((b) => ({
      ...b,
      icon: faviconFor(b.url),
      addedAt: now,
    }));
    didSeed = true;
  }

  await setStore({
    [BM_KEYS.groups]: groups,
    [BM_KEYS.bookmarks]: bookmarks,
    [BM_KEYS.lastGroup]: lastGroup,
    ...(didSeed ? { [SEEDED_KEY]: true } : {}),
  });

  return { groups, bookmarks, lastGroup };
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

async function addTabToBookmarks(tab, groupOverride = "") {
  tab = tab || (await getActiveTab());
  if (!tab?.url || !isWebUrl(tab.url)) {
    return { ok: false, reason: "unsupported_tab" };
  }

  const { groups, bookmarks, lastGroup } = await ensureDefaults();

  if (!Object.keys(groups || {}).length) {
    return { ok: false, reason: "no_groups" };
  }

  const group = groupOverride && groups[groupOverride] ? groupOverride : lastGroup;

  const url = tab.url;
  const title = (tab.title || url).trim();

  const exists = bookmarks.some((b) => b.url === url && b.group === group);
  if (exists) {
    await setStore({ [BM_KEYS.lastGroup]: group });
    return { ok: true, added: false, exists: true, group, title, url };
  }

  bookmarks.unshift({
    title,
    url,
    group,
    icon: faviconFor(url),
    addedAt: Date.now(),
  });

  await setStore({
    [BM_KEYS.bookmarks]: bookmarks,
    [BM_KEYS.lastGroup]: group,
  });

  // badge feedback
  try {
    await chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 900);
  } catch {}

  return { ok: true, added: true, exists: false, group, title, url };
}

async function createBookmarkGroup(rawName, { canCreateMoreGroups = false } = {}) {
  const groupName = String(rawName || "").trim();
  if (!groupName) {
    return { ok: false, reason: "empty_name" };
  }

  const data = await getStore([BM_KEYS.groups, BM_KEYS.groupOrder, BM_KEYS.lastGroup]);
  const groups = data[BM_KEYS.groups] && typeof data[BM_KEYS.groups] === "object"
    ? data[BM_KEYS.groups]
    : {};
  const groupOrder = Array.isArray(data[BM_KEYS.groupOrder]) ? data[BM_KEYS.groupOrder].filter((name) => typeof name === "string" && name.trim()) : [];

  if (groups[groupName]) {
    await setStore({ [BM_KEYS.lastGroup]: groupName });
    return { ok: true, created: false, exists: true, group: groupName };
  }

  if (!canCreateMoreGroups) {
    return { ok: false, reason: "premium_required" };
  }

  groups[groupName] = { color: "#4f46e5" };
  const nextOrder = [...groupOrder.filter((name) => name !== groupName), groupName];

  await setStore({
    [BM_KEYS.groups]: groups,
    [BM_KEYS.groupOrder]: nextOrder,
    [BM_KEYS.lastGroup]: groupName,
  });

  return { ok: true, created: true, exists: false, group: groupName };
}

// ----- Context Menus (no duplicates) -----

let menuBuildInFlight = null;
const hasContextMenusApi = !!(chrome?.contextMenus);

async function buildContextMenu() {
  if (!hasContextMenusApi) return;
  // Делаем "lock", чтобы при onStartup + onChanged не строилось параллельно
  if (menuBuildInFlight) return menuBuildInFlight;

  menuBuildInFlight = (async () => {
    const { groups } = await ensureDefaults();

    await new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        // root
        chrome.contextMenus.create({
          id: MENU.ROOT,
          title: "Add to Bookmarks",
          contexts: ["page"],
        });

        // groups under root
        for (const groupName of Object.keys(groups)) {
          chrome.contextMenus.create({
            id: groupIdFromName(groupName),
            parentId: MENU.ROOT,
            title: groupName,
            contexts: ["page"],
          });
        }

        // quick add as separate item
        chrome.contextMenus.create({
          id: MENU.LAST,
          title: "Quick add (last group)",
          contexts: ["page"],
        });

        resolve();
      });
    });
  })();

  try {
    await menuBuildInFlight;
  } finally {
    menuBuildInFlight = null;
  }
}

// build menus on install/update
chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultOffPermissionMigration();
  await ensureDefaults();
  await buildContextMenu();
});

// on browser start
chrome.runtime.onStartup?.addListener(async () => {
  await ensureDefaultOffPermissionMigration();
  await ensureDefaults();
  await buildContextMenu();
});

// rebuild when groups changed
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[BM_KEYS.groups] && hasContextMenusApi) buildContextMenu();
});

// handle context menu clicks
if (hasContextMenusApi) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const id = String(info.menuItemId || "");

    if (id === MENU.LAST) {
      await addTabToBookmarks(tab);
      return;
    }

    if (id.startsWith(MENU.GROUP_PREFIX)) {
      const groupName = groupNameFromId(id);
      await addTabToBookmarks(tab, groupName);
    }
  });
}

// quick add by clicking extension icon
chrome.action.onClicked.addListener(async (tab) => {
  await addTabToBookmarks(tab);
});

// ----- Media tab tracking for New Tab music widget -----
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await rememberMediaTab(tab);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (
    changeInfo.status !== "complete"
    && typeof changeInfo.url !== "string"
    && typeof changeInfo.audible !== "boolean"
  ) return;
  await rememberMediaTab(tab);
});

// ----- Search + utility message handlers -----
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SEARCH" && typeof msg.query === "string") {
    const q = String(msg.query || "").trim();
    if (!q) return;

    const fallbackUrl = "https://www.google.com/search?q=" + encodeURIComponent(q);

    const fallbackOpen = () => {
      try {
        if (chrome?.tabs?.update) {
          chrome.tabs.update({ url: fallbackUrl });
          return;
        }
      } catch {}

      try {
        if (chrome?.tabs?.create) chrome.tabs.create({ url: fallbackUrl });
      } catch {}
    };

    try {
      if (chrome?.search?.query) {
        chrome.search.query(
          { text: q, disposition: "CURRENT_TAB" },
          () => {
            if (chrome.runtime?.lastError) fallbackOpen();
          }
        );
      } else {
        fallbackOpen();
      }
    } catch {
      fallbackOpen();
    }
    return;
  }

  if (msg?.type === "GET_BROWSER_BOOKMARKS_TREE") {
    try {
      if (!chrome?.bookmarks?.getTree) {
        sendResponse({ ok: false, error: "bookmarks api unavailable" });
        return;
      }

      if (chrome?.permissions?.contains) {
        chrome.permissions.contains({ permissions: ["bookmarks"] }, (granted) => {
          if (chrome.runtime?.lastError || !granted) {
            sendResponse({ ok: false, error: "bookmarks permission not granted" });
            return;
          }

          chrome.bookmarks.getTree((nodes) => {
            if (chrome.runtime?.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message || "bookmarks api error" });
              return;
            }
            sendResponse({ ok: true, nodes: Array.isArray(nodes) ? nodes : [] });
          });
        });
        return true;
      }

      chrome.bookmarks.getTree((nodes) => {
        if (chrome.runtime?.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message || "bookmarks api error" });
          return;
        }
        sendResponse({ ok: true, nodes: Array.isArray(nodes) ? nodes : [] });
      });
      return true;
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e || "unknown error") });
      return;
    }
  }

  if (msg?.type === "BOOKMARKS_GET_GROUPS") {
    (async () => {
      try {
        const { groups, lastGroup } = await ensureDefaults();
        const names = Object.keys(groups || {});
        sendResponse({ ok: true, groups: names, lastGroup: lastGroup || names[0] || "" });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e || "unknown error") });
      }
    })();
    return true;
  }

  if (msg?.type === "BOOKMARKS_ADD_CURRENT_TAB") {
    (async () => {
      try {
        const group = typeof msg?.group === "string" ? msg.group : "";
        const result = await addTabToBookmarks(null, group);
        sendResponse(result && typeof result === "object" ? result : { ok: false, reason: "unknown" });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e || "unknown error") });
      }
    })();
    return true;
  }

  if (msg?.type === "BOOKMARKS_CREATE_GROUP") {
    (async () => {
      try {
        const name = typeof msg?.name === "string" ? msg.name : "";
        const result = await createBookmarkGroup(name, {
          canCreateMoreGroups: await canCreateBookmarkGroups(),
        });
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e || "unknown error") });
      }
    })();
    return true;
  }
});
