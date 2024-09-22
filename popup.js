document.addEventListener("DOMContentLoaded", function () {
  const urlInput = document.getElementById("urlInput");
  const insertButton = document.getElementById("insertButton");
  const saveButton = document.getElementById("saveButton");
  const fileNameInput = document.getElementById("fileNameInput");
  const checkUrlsInput = document.getElementById("checkUrlsInput");
  const checkUrlsButton = document.getElementById("checkUrlsButton");
  const urlStatusTable = document.getElementById("urlStatusTable").querySelector("tbody");
  const prevPageButton = document.getElementById("prevPage");
  const nextPageButton = document.getElementById("nextPage");
  const bulkUrlsInput = document.getElementById("bulkUrlsInput");
  const openBulkUrlsButton = document.getElementById("openBulkUrlsButton");
  const useHttp = document.getElementById("useHttp");
  const useHttps = document.getElementById("useHttps");

  const tabInsert = document.getElementById("tab-insert");
  const tabCheck = document.getElementById("tab-check");
  const tabBulkOpen = document.getElementById("tab-bulk-open");
  const tabAbout = document.getElementById("tab-about");

  const contentInsert = document.getElementById("content-insert");
  const contentCheck = document.getElementById("content-check");
  const contentBulkOpen = document.getElementById("content-bulk-open");
  const contentAbout = document.getElementById("content-about");

  function activateTab(tab) {
    tabInsert.classList.remove("active");
    tabCheck.classList.remove("active");
    tabBulkOpen.classList.remove("active");
    tabAbout.classList.remove("active");

    contentInsert.classList.remove("active");
    contentCheck.classList.remove("active");
    contentBulkOpen.classList.remove("active");
    contentAbout.classList.remove("active");

    if (tab === "insert") {
      tabInsert.classList.add("active");
      contentInsert.classList.add("active");
    } else if (tab === "check") {
      tabCheck.classList.add("active");
      contentCheck.classList.add("active");
    } else if (tab === "bulk-open") {
      tabBulkOpen.classList.add("active");
      contentBulkOpen.classList.add("active");
    } else if (tab === "about") {
      tabAbout.classList.add("active");
      contentAbout.classList.add("active");
    }
  }

  tabInsert.addEventListener("click", function () {
    activateTab("insert");
  });

  tabCheck.addEventListener("click", function () {
    activateTab("check");
  });

  tabBulkOpen.addEventListener("click", function () {
    activateTab("bulk-open");
  });

  tabAbout.addEventListener("click", function () {
    activateTab("about");
  });

  insertButton.addEventListener("click", function () {
    const urlToInsert = urlInput.value.trim();
    if (urlToInsert) {
      const newURL = `https://web.archive.org/cdx/search/cdx?url=${urlToInsert}&matchType=domain&fl=original&collapse=urlkey&output=text&filter=statuscode:200`;
      chrome.tabs.create({ url: newURL });
    }
  });

  saveButton.addEventListener("click", function () {
    const urlToInsert = urlInput.value.trim();
    const fileName = fileNameInput.value.trim();

    if (urlToInsert && fileName) {
      const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${urlToInsert}&matchType=domain&fl=original&collapse=urlkey&output=text&filter=statuscode:200`;

      chrome.runtime.sendMessage(
        { action: "fetchArchive", apiUrl: apiUrl },
        function (response) {
          if (response.success) {
            const uniqueLines = [...new Set(response.data.split('\n'))].join('\n');
            const blob = new Blob([uniqueLines], { type: "text/plain" });
            const fileUrl = window.URL.createObjectURL(blob);

            chrome.downloads.download({
              url: fileUrl,
              filename: `${fileName.replace(/[^a-zA-Z0-9]/g, "_")}_archive_result.txt`,
              saveAs: true
            });

          } else {
            console.error("Failed to fetch archive result:", response.error);
            alert("Failed to save result. Please try again.");
          }
        }
      );
    } else {
      alert("Please provide a URL and file name.");
    }
  });

  checkUrlsButton.addEventListener("click", function () {
    const urls = checkUrlsInput.value.trim().split('\n').filter(url => url.trim() !== "");

    urlResults = [];  
    currentPage = 1;
    processUrls(urls);
  });

  async function processUrls(urls) {
    const promises = [];
    for (let i = 0; i < urls.length; i++) {
      promises.push(checkUrl(urls[i]));
      if (promises.length >= 10 || i === urls.length - 1) {
        await Promise.all(promises); 
        promises.length = 0; 
      }
    }
    displayPage(1);  
    totalPages = Math.ceil(urlResults.length / 10);
    updatePaginationButtons();
  }

  function checkUrl(url) {
    return fetch(url, { method: 'HEAD' })
      .then(response => {
        const statusCode = response.status;
        urlResults.push({ url, statusCode });
      })
      .catch(error => {
        console.error("Error checking URL:", error);
        urlResults.push({ url, statusCode: "Error" });
      });
  }

  function displayPage(page) {
    urlStatusTable.innerHTML = "";  

    const start = (page - 1) * 10;
    const end = start + 10;
    const pageResults = urlResults.slice(start, end);

    pageResults.forEach(result => {
      const row = document.createElement("tr");
      const urlCell = document.createElement("td");
      const statusCell = document.createElement("td");

      urlCell.textContent = result.url;
      statusCell.textContent = result.statusCode;

      if (result.statusCode >= 200 && result.statusCode < 300) {
        statusCell.classList.add("status-code-green");
      } else if (result.statusCode >= 300 && result.statusCode < 400) {
        statusCell.classList.add("status-code-blue");
      } else {
        statusCell.classList.add("status-code-red");
      }

      row.appendChild(urlCell);
      row.appendChild(statusCell);
      urlStatusTable.appendChild(row);
    });
  }

  prevPageButton.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      displayPage(currentPage);
      updatePaginationButtons();
    }
  });

  nextPageButton.addEventListener("click", function () {
    if (currentPage < totalPages) {
      currentPage++;
      displayPage(currentPage);
      updatePaginationButtons();
    }
  });

  function updatePaginationButtons() {
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
  }

  openBulkUrlsButton.addEventListener("click", function () {
    const urls = bulkUrlsInput.value.trim().split('\n').filter(url => url.trim() !== "");

    if (urls.length === 0) {
      alert("Please provide URLs to open.");
      return;
    }

    const openUrls = [];

    urls.forEach(url => {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      if (useHttps.checked) {
        openUrls.push(`https://${cleanUrl}`);
      }
      if (useHttp.checked) {
        openUrls.push(`http://${cleanUrl}`);
      }
    });

    openUrls.forEach(url => {
      chrome.tabs.create({ url: url });
    });
  });
});
