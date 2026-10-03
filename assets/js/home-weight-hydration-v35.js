(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const GOAL_ML = 2500;
  let signedInUser = null;
  let latestMeasurement = null;

  const localDate = () => {
    const d = new Date();
    const pad = value => String(value).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const notify = (message, type = "ok") => window.UI?.toast?.(message, type);

  async function getUser() {
    if (signedInUser) return signedInUser;
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) throw error || new Error("Session expired");
    signedInUser = data.user;
    return signedInUser;
  }

  async function refreshWeight() {
    const user = await getUser();
    const { data, error } = await db.from("body_measurements")
      .select("weight_kg,body_fat_percentage,measured_at")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    latestMeasurement = data;
    if (!data?.weight_kg) {
      setText("homeWeightValue", "--");
      setText("homeWeightNote", "No measurement logged");
      return;
    }
    setText("homeWeightValue", Number(data.weight_kg).toFixed(1));
    const measured = new Date(data.measured_at);
    const dateText = Number.isNaN(measured.getTime())
      ? "Latest measurement"
      : `Updated ${measured.toLocaleDateString([], { day: "numeric", month: "short" })}`;
    setText("homeWeightNote", data.body_fat_percentage
      ? `${dateText} · ${Number(data.body_fat_percentage).toFixed(1)}% body fat`
      : dateText);
  }

  async function refreshHydration() {
    const user = await getUser();
    const { data, error } = await db.from("hydration_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .eq("logged_date", localDate());
    if (error) {
      if (/hydration_logs|relation|schema cache/i.test(error.message || "")) {
        setText("homeHydrationNote", "Run hydration-v35.sql once");
        return;
      }
      throw error;
    }
    const total = (data || []).reduce((sum, row) => sum + Number(row.amount_ml || 0), 0);
    setText("homeHydrationValue", total.toLocaleString());
    setText("homeHydrationNote", total >= GOAL_ML
      ? "Daily hydration goal achieved"
      : `${(GOAL_ML - total).toLocaleString()} ml remaining`);
    const progress = $("#homeHydrationBar");
    if (progress) progress.style.width = `${Math.min(100, total / GOAL_ML * 100)}%`;
  }

  async function addWater() {
    const button = $("#quickAddWater");
    if (!button || button.disabled) return;
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "...";
    try {
      const user = await getUser();
      const { error } = await db.from("hydration_logs").insert({
        user_id: user.id,
        amount_ml: 250,
        logged_date: localDate()
      });
      if (error) throw error;
      notify("250 ml water added");
      await refreshHydration();
    } catch (error) {
      notify(/hydration_logs|relation|schema cache/i.test(error.message || "")
        ? "Run supabase/hydration-v35.sql first"
        : error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function openWeightDialog() {
    const dialog = $("#homeQuickLogDialog");
    if (!dialog) return;
    $("#quickWeightInput").value = latestMeasurement?.weight_kg || "";
    $("#quickBodyFatInput").value = latestMeasurement?.body_fat_percentage || "";
    if (!dialog.open) dialog.showModal();
  }

  async function saveWeight() {
    const button = $("#saveQuickWeight");
    const weight = Number($("#quickWeightInput")?.value);
    const bodyFatText = $("#quickBodyFatInput")?.value || "";
    if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
      notify("Enter a valid weight", "error");
      return;
    }
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "Saving...";
    try {
      const user = await getUser();
      const { error } = await db.from("body_measurements").insert({
        user_id: user.id,
        weight_kg: weight,
        body_fat_percentage: bodyFatText === "" ? null : Number(bodyFatText)
      });
      if (error) throw error;
      $("#homeQuickLogDialog")?.close();
      notify("Weight saved");
      await refreshWeight();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  async function refreshWidgets() {
    try {
      await Promise.all([refreshWeight(), refreshHydration()]);
    } catch (error) {
      console.error("Weight/hydration widget refresh failed", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#openWeightQuickLog")?.addEventListener("click", openWeightDialog);
    $("#quickAddWater")?.addEventListener("click", addWater);
    $("#saveQuickWeight")?.addEventListener("click", saveWeight);
    setTimeout(refreshWidgets, 500);
  });
})();
