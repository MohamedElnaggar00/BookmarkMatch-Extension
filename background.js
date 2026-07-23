function flattenBookmarks(bookmarkNodes, result = []) {
  for (const node of bookmarkNodes) {
    if (node.url) {
      result.push({ title: (node.title || "").substring(0, 80), url: node.url });
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
    // 1. Get user settings from Chrome Storage
    const settings = await chrome.storage.local.get(['apiKey', 'maxMatches']);
    const apiKey = settings.apiKey;
    const maxMatches = settings.maxMatches || 5;

    // 2. Stop if the user hasn't entered their key in the popup yet
    if (!apiKey) {
      return { error: "Please click the extension icon in the top right to paste your Gemini API Key." };
    }

    const bookmarkTree = await chrome.bookmarks.getTree();
    let allBookmarks = flattenBookmarks(bookmarkTree);
    if (allBookmarks.length > 1000) allBookmarks = allBookmarks.slice(0, 1000);

    // 3. Inject the user's custom Max Matches into the AI prompt
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
    return { bookmarks: JSON.parse(jsonString) };

  } catch (error) {
    return { error: `CODE CRASH: ${error.message}` }; 
  }
}