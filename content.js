chrome.storage.local.get(['isActive', 'apiKey'], (result) => {
  if (result.isActive === false) return; 

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q');

  if (searchQuery) {
    const hasApiKey = result.apiKey && result.apiKey.trim() !== '';
    let container = null;

    if (hasApiKey) {
      createContainer();
      container.innerHTML = `<h2 class="loading-text">✨ BookmarkMatch is checking your bookmarks...</h2>`;
    }

    chrome.runtime.sendMessage({ action: "search_bookmarks", query: searchQuery }, (response) => {
      // DEBUG LOG
      console.log("BookmarkMatch found:", response);

      if (!response) {
         console.error("BookmarkMatch: No response from background script.");
         return;
      }

      if (response.error) {
        if (!container) createContainer();
        container.innerHTML = `<h2 style="color: #ea4335;">⚠️ Error: ${response.error}</h2>`;
        return;
      }

      const bookmarks = response.bookmarks || [];

      // 🚨 NEW LOGIC: Always show the box if AI is OFF, even if 0 matches!
      if (bookmarks.length > 0 || response.usedAI === false) {
        if (!container) createContainer();
        
        let titleHtml = response.usedAI ? 
            `<h2>✨ BookmarkMatch found ${bookmarks.length} related bookmark(s):</h2>` : 
            `<h2>🔍 BookmarkMatch found ${bookmarks.length} exact match(es):</h2>`;

        let html = titleHtml;
        
        if (bookmarks.length > 0) {
            html += `<ul>`;
            bookmarks.forEach(bm => {
              html += `<li><a href="${bm.url}" target="_blank">${bm.title || bm.url}</a></li>`;
            });
            html += `</ul>`;
        }

        if (response.usedAI === false) {
          html += `<div class="api-suggestion">💡 To get better matches, link a Gemini API key in the extension settings.</div>`;
        }

        container.innerHTML = html; 
      } 
      else {
        if (container) container.remove();
      }
    });

    function createContainer() {
      container = document.createElement('div');
      container.className = 'my-bookmark-extension-container';
      const targetElement = document.querySelector('#center_col') || document.querySelector('#rcnt') || document.body;
      if (targetElement === document.body) container.style.marginTop = '150px';
      targetElement.insertBefore(container, targetElement.firstChild);
    }
  }
});