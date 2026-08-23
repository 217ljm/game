export function createBrowserPlatform(browserWindow = window) {
  const storage = browserWindow.localStorage;
  return {
    storage: {
      read(key, fallback = null) {
        const raw = storage.getItem(key);
        if (raw == null) return fallback;
        try {
          return JSON.parse(raw);
        } catch {
          storage.removeItem(key);
          return fallback;
        }
      },
      write(key, value) {
        storage.setItem(key, JSON.stringify(value));
      },
      remove(key) {
        storage.removeItem(key);
      },
      has(key) {
        return storage.getItem(key) != null;
      },
    },
    randomSeed(prefix = "life") {
      const values = new Uint32Array(4);
      browserWindow.crypto.getRandomValues(values);
      return `${prefix}-${[...values].map((value) => value.toString(16).padStart(8, "0")).join("")}`;
    },
    scrollToTop() {
      browserWindow.scrollTo({ top: 0, behavior: "smooth" });
    },
    downloadJson(filename, value) {
      const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  };
}
