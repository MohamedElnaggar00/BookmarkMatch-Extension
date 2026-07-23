function flattenBookmarks(bookmarkNodes, result = []) {
  for (const node of bookmarkNodes) {
    if (node.url) {
      // Increased substring to 150 to catch longer titles like your GitHub example
      result.push({ title: (node.title || "").substring(0, 150), url: node.url });
    }
    if (node.children) flattenBookmarks(node.children, result);
  }
  return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search_bookmarks") {
    findSmartBookmarks(request.query).then(sendResponse);
    return true; 
  }
});

async function findSmartBookmarks(userQuery) {
  try {
    const settings = await chrome.storage.local.get(['apiKey', 'maxMatches']);
    const apiKey = settings.apiKey;
    const maxMatches = settings.maxMatches || 5;

    const bookmarkTree = await chrome.bookmarks.getTree();
    let allBookmarks = flattenBookmarks(bookmarkTree);

    // --- NEW: FUZZY SCORING SEARCH ENGINE ---
    if (!apiKey || apiKey.trim() === '') {
      const queryWords = userQuery.toLowerCase().split(' ').filter(word => word.length > 0);
      
      // Grade every single bookmark
      let scoredBookmarks = allBookmarks.map(b => {
        const title = (b.title || "").toLowerCase();
        const url = (b.url || "").toLowerCase();
        let score = 0;

        queryWords.forEach(word => {
          // 1. Exact match gets highest points
          if (title.includes(word) || url.includes(word)) {
            score += 5;
          } 
          // 2. Catch typos and plurals (e.g., "windowis" -> "window")
          else if (word.length >= 5) {
            // Cut off the last 2 letters of the search word and try again
            const rootWord = word.substring(0, word.length - 2);
            if (title.includes(rootWord) || url.includes(rootWord)) {
              score += 2;
            }
          }
        });

        return { bookmark: b, score: score };
      });

      // Filter out bookmarks with 0 points, and sort by the highest score
      const basicResults = scoredBookmarks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.bookmark)
        .slice(0, maxMatches);
      
      return { bookmarks: basicResults, usedAI: false };
    }

    // --- NORMAL AI SEARCH ---
    if (allBookmarks.length > 1000) allBookmarks = allBookmarks.slice(0, 1000);

    const prompt = `
      Find the top ${maxMatches} most relevant bookmarks for a user who searched Google for: "${userQuery}".
      Return ONLY a JSON array containing objects with "title" and "url" properties. Do not use markdown.
      Bookmarks data:
      ${JSON.stringify(allBookmarks)}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        return { error: `GOOGLE SERVER ERROR ${response.status}: ${errorData.error?.message || "Unknown Error"}` };
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        return { error: "Gemini blocked the response due to safety filters." };
    }

    const jsonString = data.candidates[0].content.parts[0].text;
    return { bookmarks: JSON.parse(jsonString), usedAI: true };

  } catch (error) {
    return { error: `CODE CRASH: ${error.message}` }; 
  }
}