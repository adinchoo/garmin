(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("deleteAllActivities");
    if (!button) return;

    const {busy, toast} = window.UI;
    button.addEventListener("click", async () => {
      const state = window.APP;
      const user = state?.user;
      if (!user?.id) {
        toast("Please sign in before deleting activities", "error");
        return;
      }
      if (!state.activities.length) {
        toast("No activities to delete");
        return;
      }
      if (!window.confirm("Delete all activities in your account? This cannot be undone.")) return;

      busy(button, true, "Deleting...");
      try {
        const {error} = await window.db.from("activities").delete().eq("user_id", user.id);
        if (error) {
          toast(error.message, "error");
          return;
        }

        document.getElementById("refresh")?.click();
      } catch (error) {
        console.error("Failed to delete activities", error);
        toast(error instanceof Error ? error.message : "Could not delete activities", "error");
      } finally {
        busy(button, false);
      }
    });
  });
})();
