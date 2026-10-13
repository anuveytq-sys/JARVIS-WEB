/* JARVIS popup-safe navigation bridge.
   Browser popup permission dialogs are controlled by the browser/OS and cannot
   be clicked or granted by JavaScript, including by voice. When a voice command
   reaches window.open without a user gesture, this bridge falls back to opening
   the requested site in the current tab instead of leaving the user stuck at a
   blocked-popup message.
*/
(() => {
  if (window.__jarvisPopupFixInstalled) return;
  window.__jarvisPopupFixInstalled = true;

  const nativeOpen = window.open.bind(window);

  window.open = function(url, target, features) {
    try {
      const popup = nativeOpen(url, target, features);
      if (popup) return popup;
    } catch (_) {}

    try {
      if (url) {
        window.location.assign(String(url));
      }
    } catch (_) {}

    return null;
  };
})();
