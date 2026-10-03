(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const filters = [...document.querySelectorAll(".filterRail button")];
    filters.forEach(button => button.addEventListener("click", () => {
      filters.forEach(item => item.classList.toggle("active", item === button));
      const selected = button.textContent.trim().toLowerCase();
      document.querySelectorAll("#activityList .activity").forEach(card => {
        const type = card.querySelector("header small")?.textContent.trim().toLowerCase() || "";
        const visible = selected === "all" || (selected === "runs" && type === "run") || (selected === "rides" && type === "ride") || (selected === "walks" && type === "walk") || (selected === "other" && !["run","ride","walk"].includes(type));
        card.hidden = !visible;
      });
    }));

    const observer = new MutationObserver(() => {
      const avatar = document.getElementById("avatar")?.textContent?.trim();
      if (avatar) document.getElementById("topAvatar").textContent = avatar;
    });
    const avatar = document.getElementById("avatar");
    if (avatar) observer.observe(avatar, { childList: true, characterData: true, subtree: true });
  });
})();
