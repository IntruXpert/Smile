chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchArchive") {
      const apiUrl = request.apiUrl;
  
      fetch(apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(data => {
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error("Fetch error:", error);
          sendResponse({ success: false, error: error.toString() });
        });
  
      return true;
    }
  });
  