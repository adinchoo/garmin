console.log("Fitness AI Hub loaded");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js")
    .catch(error => console.error("Service worker error:", error));
}