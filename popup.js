document.addEventListener('DOMContentLoaded', () => {
  const toggleStatus = document.getElementById('toggle-status');
  const apiKeyInput = document.getElementById('api-key');
  const maxMatchesInput = document.getElementById('max-matches');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');

  // Load existing settings when popup opens
  chrome.storage.local.get(['isActive', 'apiKey', 'maxMatches'], (result) => {
    toggleStatus.checked = result.isActive !== false; // Defaults to ON if not set
    apiKeyInput.value = result.apiKey || '';
    maxMatchesInput.value = result.maxMatches || 5;
  });

  // Save settings when button is clicked
  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      isActive: toggleStatus.checked,
      apiKey: apiKeyInput.value.trim(),
      maxMatches: parseInt(maxMatchesInput.value, 10) || 5
    }, () => {
      // Show a quick success message
      statusMsg.textContent = 'Settings saved successfully!';
      setTimeout(() => statusMsg.textContent = '', 2000);
    });
  });
});