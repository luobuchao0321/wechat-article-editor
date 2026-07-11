# Privacy and local data

ContentCraft is local-first by default.

- Drafts and saved layout modules are stored in the browser or desktop app's local IndexedDB storage.
- Importing a public WeChat article sends its link to the ContentCraft server running on your device or deployment so it can retrieve and parse the article.
- Image and stylesheet previews may be fetched through the local proxy route to work around hotlink restrictions.
- AI writing assistance sends the selected article text and the API key you provide to your chosen model endpoint. The app does not intentionally persist that API key.

Before sharing or deploying ContentCraft for a team, use only articles and assets you are authorized to process. Clear local browser data or the desktop app data directory when handing a device to someone else.
