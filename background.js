function flattenBookmarks(bookmarkNodes, result = []) {
  for (const node of bookmarkNodes) {
    if (node.url) {
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

    // ==========================================
    // 🔍 "EVERYTHING" STYLE BOOLEAN ENGINE
    // ==========================================
    if (!apiKey || apiKey.trim() === '') {
      let rawQuery = userQuery.toLowerCase().trim();
      
      // 1. PARSE "EVERYTHING" SYNTAX
      const exactPhrases = [];
      // Extract phrases inside quotes "like this" and remove them from the raw query
      rawQuery = rawQuery.replace(/"([^"]+)"/g, (match, phrase) => {
        exactPhrases.push(phrase.trim());
        return ''; 
      });

      // Split the rest by spaces to get our operators
      const tokens = rawQuery.split(/\s+/).filter(w => w.length > 0);

      // 2. FILTERING STAGE (Strict Boolean Logic)
      let filteredBookmarks = allBookmarks.filter(b => {
        const textToSearch = ((b.title || "") + " " + (b.url || "")).toLowerCase();

        // Check EXACT phrases (" ")
        for (let phrase of exactPhrases) {
          if (!textToSearch.includes(phrase)) return false; 
        }

        // Check AND, OR (|), NOT (!) operators
        for (let token of tokens) {
          // NOT operator (!)
          if (token.startsWith('!')) {
            const excludeTerm = token.substring(1);
            if (excludeTerm && textToSearch.includes(excludeTerm)) return false; 
          } 
          // OR operator (|)
          else if (token.includes('|')) {
            const orTerms = token.split('|').filter(t => t.length > 0);
            const hasAtLeastOne = orTerms.some(t => textToSearch.includes(t));
            if (!hasAtLeastOne) return false;
          } 
          // Default AND (must include)
          else {
            if (!textToSearch.includes(token)) return false;
          }
        }
        
        return true; // If it survived all checks, keep it!
      });

      // 3. SCORING STAGE (Rank the survivors)
      let scoredBookmarks = filteredBookmarks.map(b => {
        const title = (b.title || "").toLowerCase();
        let score = 0;

        // Give points based on title matches so the cleanest title rises to the top
        exactPhrases.forEach(phrase => { if (title.includes(phrase)) score += 50; });
        tokens.forEach(token => {
           // Strip operators just for scoring purposes
           let cleanToken = token.replace('!', '').replace('|', '');
           if (cleanToken && title.includes(cleanToken)) score += (cleanToken.length * 3);
        });

        return { bookmark: b, score: score };
      });

      // Sort and slice to top results
      const basicResults = scoredBookmarks
        .sort((a, b) => b.score - a.score)
        .map(item => item.bookmark)
        .slice(0, maxMatches);
      
      return { bookmarks: basicResults, usedAI: false };
    }

    // ==========================================
    // 🧠 AI SEMANTIC SEARCH ENGINE (WITH API KEY)
    // ==========================================
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
