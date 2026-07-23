# ✨ BookmarkMatch (Powered with AI)

BookmarkMatch is a smart Chrome Extension that acts as a second brain for your saved links. Whenever you search for a topic on Google, this extension uses Google's Gemini AI to semantically search your saved Chrome bookmarks and displays relevant matches right at the top of your search results.

## 🚀 Features
* **AI-Powered Semantic Search:** Doesn't just match exact words; understands the *intent* of your search.
* **Non-Intrusive UI:** Blends natively into Google Search (supports Light & Dark mode).
* **Privacy First:** Only runs when you search, and uses your own personal API key.
* **Customizable:** Turn it on/off and choose how many results to display via the extension popup.

## 🛠️ How to Install
Since this extension is not on the Chrome Web Store yet, you can install it manually in Developer Mode.

1. Download or clone this repository to your computer.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Turn on **Developer mode** (toggle switch in the top right corner).
4. Click the **Load unpacked** button in the top left.
5. Select the folder where you downloaded this code.

## ⚙️ Setup Instructions
1. Pin the extension to your Chrome toolbar.
2. Click the ✨ BookmarkMatch icon.
3. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
4. Paste your API key into the extension menu and click **Save**.
5. Go to Google and search for something you have bookmarked!

## 💻 Tech Stack
* HTML / CSS / JavaScript
* Chrome Extensions API (Manifest V3)
* Google Gemini API (gemini-3.6-flash)
