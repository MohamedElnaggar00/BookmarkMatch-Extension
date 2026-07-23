const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');

if (searchQuery) {
  // 1. Create the container
  const container = document.createElement('div');
  container.className = 'my-bookmark-extension-container';
  container.innerHTML = `<h2 class="loading-text">✨ BookmarkMatch is checking your bookmarks...</h2>`;
  
  // 2. Better injection method (safely avoids hiding behind sticky headers)
  const targetElement = document.querySelector('#center_col') || document.querySelector('#rcnt') || document.body;
  
  if (targetElement === document.body) {
    container.style.marginTop = '150px'; // Prevent hiding under header if forced to use body
  }
  targetElement.insertBefore(container, targetElement.firstChild);

  // 3. Ask background script to run the AI search
  chrome.runtime.sendMessage({ action: "search_bookmarks", query: searchQuery }, (response) => {
    
    if (response && response.error) {
      // Show us the error instead of vanishing!
      container.innerHTML = `<h2 style="color: #ea4335;">⚠️ Error: ${response.error}</h2>`;
      console.error("Bookmark Extension Error:", response.error);
    } 
    else if (response && response.bookmarks && response.bookmarks.length > 0) {
      // Show results
      let html = `<h2>✨ BookmarkMatch found ${response.bookmarks.length} related bookmark(s):</h2><ul>`;
      response.bookmarks.forEach(bm => {
        html += `<li><a href="${bm.url}" target="_blank">${bm.title || bm.url}</a></li>`;
      });
      html += `</ul>`;
      container.innerHTML = html; 
    } 
    else {
      // Only remove if it genuinely succeeded but found 0 matches
      container.remove();
    }
  });
}