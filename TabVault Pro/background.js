// Setup context menus
chrome.runtime.onInstalled.addListener(() => {
  // One-time cleanup script to maximize space and performance
  chrome.alarms.clearAll();
  chrome.storage.local.remove(['historyGroups', 'autoCloseOnSave', 'focusModeOnOpen']);

  chrome.contextMenus.create({
    id: "copyActiveMD",
    title: "Copy Active Window as Markdown",
    contexts: ["action"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyActiveMD") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      let str = `# Current Window\n\n`;
      tabs.forEach(t => {
        // Skip browser internal pages which block script execution
        if (t.url && !t.url.startsWith('chrome://')) {
          str += `* [${t.title || t.url}](${t.url})\n`;
        }
      });
      
      // We must inject into the active tab to write to the clipboard securely (Manifest V3)
      if (tab && tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (markdown) => {
            navigator.clipboard.writeText(markdown)
              .catch(e => console.error("Clipboard write failed:", e));
          },
          args: [str]
        }).catch(err => {
          console.error("Failed to inject clipboard script:", err);
        });
      }
    });
  }
});



