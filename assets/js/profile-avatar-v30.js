(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  let userId = "guest";
  let current = null;
  const key = () => `fitness-ai-avatar-v1:${userId}`;

  function initials() {
    const name = byId("userName")?.textContent?.trim() || window.APP?.profile?.full_name || window.APP?.user?.email || "U";
    return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";
  }
  function readSaved() {
    try { return JSON.parse(localStorage.getItem(key()) || "null"); } catch { return null; }
  }
  function paint() {
    const top = byId("topAvatar"), preview = byId("profileAvatarPreview");
    [top, preview].filter(Boolean).forEach(el => {
      el.replaceChildren();
      if (current?.type === "image" && current.value) {
        const img = document.createElement("img"); img.src = current.value; img.alt = "Profile avatar"; el.append(img);
      } else {
        el.textContent = current?.type === "emoji" ? current.value : initials();
      }
    });
    document.querySelectorAll("[data-avatar-emoji]").forEach(btn => btn.classList.toggle("active", current?.type === "emoji" && current.value === btn.dataset.avatarEmoji));
  }
  function save(value, message) {
    current = value;
    try { if (value) localStorage.setItem(key(), JSON.stringify(value)); else localStorage.removeItem(key()); }
    catch { if (byId("avatarMessage")) byId("avatarMessage").textContent = "Picture is too large for device storage. Try a smaller image."; return; }
    paint();
    if (byId("avatarMessage")) byId("avatarMessage").textContent = message || "Avatar saved on this device.";
  }
  function navigateProfile() {
    if (typeof window.APP?.user !== "undefined") {
      document.querySelector('[data-go="profile"]')?.click();
    } else {
      location.hash = "profile";
      document.querySelector('[data-go="profile"]')?.click();
    }
  }
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file?.type?.startsWith("image/")) return reject(new Error("Please choose an image file."));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas"), max = 320, scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", .76));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
      img.src = url;
    });
  }
  async function init() {
    const top = byId("topAvatar");
    top?.addEventListener("click", navigateProfile);
    top?.setAttribute("aria-label", "Open profile and avatar settings");
    document.querySelectorAll("[data-avatar-emoji]").forEach(btn => btn.addEventListener("click", () => save({ type: "emoji", value: btn.dataset.avatarEmoji })));
    byId("removeAvatar")?.addEventListener("click", () => save(null, "Using your initials again."));
    byId("avatarUpload")?.addEventListener("change", async event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (byId("avatarMessage")) byId("avatarMessage").textContent = "Preparing picture…";
      try { save({ type: "image", value: await compressImage(file) }, "Picture saved on this device."); }
      catch (error) { if (byId("avatarMessage")) byId("avatarMessage").textContent = error.message || "Unable to use this picture."; }
      event.target.value = "";
    });
    // app.js loads the signed-in user asynchronously during DOMContentLoaded.
    for (let i = 0; i < 100 && !window.APP?.user?.id; i++) await new Promise(resolve => setTimeout(resolve, 50));
    userId = window.APP?.user?.id || "guest";
    current = readSaved(); paint();
    const nameNode = byId("userName");
    if (nameNode && window.MutationObserver) new MutationObserver(paint).observe(nameNode, { childList: true, characterData: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", init);
})();