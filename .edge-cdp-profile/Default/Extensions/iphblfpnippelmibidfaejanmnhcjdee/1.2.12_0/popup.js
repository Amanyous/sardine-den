async function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || "runtime_error" });
        return;
      }
      resolve(res || { ok: false, error: "empty_response" });
    });
  });
}

const PREMIUM_STATE_KEY = "cloud.premium.state.v1";
const PREMIUM_FEATURE_DASHBOARD_FOLDERS = "dashboardFolders";
const PREMIUM_FOLDER_CREATE_MESSAGE = "Premium unlocks new folders.";
const PREMIUM_ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "cancel_scheduled"]);
const DEFAULT_PREMIUM_FEATURES = new Set([
  "widgetresize",
  "photoswidget",
  "custombackground",
  "wallpaperrotation",
  "dashboardfolders",
  "widgettransparency",
  "cloudsync",
]);
const UNLOCKED_PREMIUM_FEATURES = new Set([
  "widgetresize",
  "photoswidget",
  "custombackground",
]);

function getLocalStore(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result || {});
    });
  });
}

function setLocalStore(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "storage_error"));
        return;
      }
      resolve();
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

function setStatus(text, isError = false) {
  const status = document.getElementById("status");
  status.textContent = text || "";
  status.classList.toggle("error", !!isError);
}

function normalizeFeatureName(featureName) {
  return String(featureName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hasPremium(state) {
  if (state?.isPremium !== true) return false;
  const billingStatus = String(state?.billingStatus || "").trim().toLowerCase();
  return PREMIUM_ACTIVE_SUBSCRIPTION_STATUSES.has(billingStatus);
}

function hasPremiumFeature(featureName, state) {
  const key = normalizeFeatureName(featureName);
  if (!key) return false;

  if (UNLOCKED_PREMIUM_FEATURES.has(key)) {
    return true;
  }

  if (state?.features && Object.prototype.hasOwnProperty.call(state.features, key)) {
    return !!state.features[key];
  }

  return hasPremium(state) && DEFAULT_PREMIUM_FEATURES.has(key);
}

function fillGroupSelect(groupSelect, groups, selectedGroup = "") {
  groupSelect.innerHTML = "";
  for (const group of groups) {
    const opt = document.createElement("option");
    opt.value = group;
    opt.textContent = group;
    if (group === selectedGroup) opt.selected = true;
    groupSelect.appendChild(opt);
  }
}

async function createGroupLocally(rawName, { canCreateMoreGroups = false } = {}) {
  const groupName = String(rawName || "").trim();
  if (!groupName) {
    return { ok: false, reason: "empty_name" };
  }

  const data = await getLocalStore(["groups", "groups.order", "bm.lastGroup"]);
  const groups = data.groups && typeof data.groups === "object" ? data.groups : {};
  const groupOrder = Array.isArray(data["groups.order"])
    ? data["groups.order"].filter((name) => typeof name === "string" && name.trim())
    : [];

  if (groups[groupName]) {
    await setLocalStore({ "bm.lastGroup": groupName });
    return { ok: true, exists: true, created: false, group: groupName };
  }

  if (!canCreateMoreGroups) {
    return { ok: false, reason: "premium_required" };
  }

  groups[groupName] = { color: "#4f46e5" };
  await setLocalStore({
    groups,
    "groups.order": [...groupOrder.filter((name) => name !== groupName), groupName],
    "bm.lastGroup": groupName,
  });

  return { ok: true, exists: false, created: true, group: groupName };
}

async function getPremiumState() {
  const data = await getLocalStore([PREMIUM_STATE_KEY]);
  return data[PREMIUM_STATE_KEY] && typeof data[PREMIUM_STATE_KEY] === "object"
    ? data[PREMIUM_STATE_KEY]
    : null;
}

async function initPopup() {
  const addBtn = document.getElementById("addBtn");
  const groupSelect = document.getElementById("groupSelect");
  const newGroupInput = document.getElementById("newGroupInput");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const tabInfo = document.getElementById("tabInfo");
  let canCreateGroups = false;
  let hasUnlimitedGroups = false;

  async function reloadGroups(preferredGroup = "") {
    const groupsRes = await sendMessage({ type: "BOOKMARKS_GET_GROUPS" });
    if (!groupsRes.ok || !Array.isArray(groupsRes.groups) || groupsRes.groups.length === 0) {
      groupSelect.innerHTML = "";
      addBtn.disabled = true;
      return { ok: false };
    }

    const selectedGroup = preferredGroup || groupsRes.lastGroup || groupsRes.groups[0] || "";
    fillGroupSelect(groupSelect, groupsRes.groups, selectedGroup);
    addBtn.disabled = false;
    return { ok: true, groups: groupsRes.groups, lastGroup: selectedGroup };
  }

  addBtn.disabled = true;
  createGroupBtn.disabled = true;

  const tab = await getActiveTab();
  if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    tabInfo.textContent = "Open a regular website tab first.";
    setStatus("This tab cannot be added.", true);
    return;
  }

  tabInfo.textContent = (tab.title || tab.url).trim();

  const groupsState = await reloadGroups();
  if (!groupsState.ok) {
    setStatus("Could not load folders.", true);
    return;
  }

  const premiumState = await getPremiumState();
  hasUnlimitedGroups = hasPremiumFeature(PREMIUM_FEATURE_DASHBOARD_FOLDERS, premiumState);
  canCreateGroups = hasUnlimitedGroups;
  if (!canCreateGroups) {
    newGroupInput.disabled = true;
    createGroupBtn.disabled = true;
    newGroupInput.placeholder = "Premium required";
    setStatus(PREMIUM_FOLDER_CREATE_MESSAGE);
  }

  function syncCreateButtonState() {
    canCreateGroups = hasUnlimitedGroups;
    newGroupInput.disabled = !canCreateGroups;
    if (!canCreateGroups) {
      newGroupInput.placeholder = "Premium required";
      setStatus(PREMIUM_FOLDER_CREATE_MESSAGE);
    }
    if (!canCreateGroups) {
      createGroupBtn.disabled = true;
      return;
    }
    newGroupInput.placeholder = "Create a new folder";
    createGroupBtn.disabled = !newGroupInput.value.trim();
  }

  newGroupInput.addEventListener("input", syncCreateButtonState);
  newGroupInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!createGroupBtn.disabled) {
      createGroupBtn.click();
    }
  });

  createGroupBtn.addEventListener("click", async () => {
    canCreateGroups = hasUnlimitedGroups;
    if (!canCreateGroups) {
      setStatus(PREMIUM_FOLDER_CREATE_MESSAGE);
      return;
    }

    const name = newGroupInput.value.trim();
    if (!name) return;

    createGroupBtn.disabled = true;
    setStatus("Creating folder...");

    const res = await createGroupLocally(name, { canCreateMoreGroups: canCreateGroups }).catch((error) => ({
      ok: false,
      error: error?.message || "storage_error",
    }));
    if (!res || !res.ok) {
      setStatus(res?.reason === "premium_required"
        ? PREMIUM_FOLDER_CREATE_MESSAGE
        : "Failed to create folder.", true);
      syncCreateButtonState();
      return;
    }

    const nextGroup = res.group || name;
    const reload = await reloadGroups(nextGroup);
    if (!reload.ok) {
      setStatus("Folder created, but list refresh failed.", true);
      syncCreateButtonState();
      return;
    }

    newGroupInput.value = "";
    syncCreateButtonState();
    setStatus(res.exists ? "Folder already exists." : "Folder created.");
  });

  syncCreateButtonState();

  addBtn.addEventListener("click", async () => {
    const group = groupSelect.value || "";
    addBtn.disabled = true;
    setStatus("Adding...");

    const res = await sendMessage({ type: "BOOKMARKS_ADD_CURRENT_TAB", group });
    if (!res || !res.ok) {
      setStatus("Failed to add bookmark.", true);
      addBtn.disabled = false;
      return;
    }

    if (res.exists) {
      setStatus("Already exists in this folder.");
      addBtn.disabled = false;
      return;
    }

    setStatus("Added successfully.");
    window.setTimeout(() => window.close(), 450);
  });
}

initPopup().catch(() => {
  setStatus("Unexpected error.", true);
});
