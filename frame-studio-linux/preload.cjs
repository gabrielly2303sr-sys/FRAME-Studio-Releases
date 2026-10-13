const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('frameAPI', {
  checkExportTools: () => ipcRenderer.invoke('frame:check-export-tools'),
  saveVideo: (name, buffer, duration, crf, fps) => ipcRenderer.invoke('frame:save-video', { name, buffer, duration, crf, fps }),
  beginFrameExport: (options) => ipcRenderer.invoke('frame:begin-frame-export', options),
  writeExportFrame: (sessionId, frameIndex, buffer) => ipcRenderer.invoke('frame:write-export-frame', { sessionId, frameIndex, buffer }),
  finishFrameExport: (sessionId) => ipcRenderer.invoke('frame:finish-frame-export', { sessionId }),
  cancelFrameExport: (sessionId) => ipcRenderer.invoke('frame:cancel-frame-export', sessionId),
  cancelExport: () => ipcRenderer.send('frame:cancel-export'),
  onAutoUpdateProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('frame:auto-update-progress', listener);
    return () => ipcRenderer.removeListener('frame:auto-update-progress', listener);
  },
  onExportProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('frame:export-progress', listener);
    return () => ipcRenderer.removeListener('frame:export-progress', listener);
  },
  saveProject: (data) => ipcRenderer.invoke('frame:save-project', data),
  openProject: () => ipcRenderer.invoke('frame:open-project'),
  openProjectPath: (target) => ipcRenderer.invoke('frame:open-project-path', target),
  mediaExists: (target) => ipcRenderer.invoke('frame:media-exists', target),
  mediaInfo: (target) => ipcRenderer.invoke('frame:media-info', target),
  generateWaveform: (path, duration) => ipcRenderer.invoke('frame:generate-waveform', { path, duration }),
  saveAudioRecording: (buffer, name, extension) => ipcRenderer.invoke('frame:save-audio-recording', { buffer, name, extension }),
  extractAudio: (payload) => ipcRenderer.invoke('frame:extract-audio', payload),
  checkYoutubeTools: () => ipcRenderer.invoke('frame:youtube-tools-status'),
  listDownloadedMedia: (folder) => ipcRenderer.invoke('frame:downloaded-media-list', folder),
  createDownloadedMediaFolder: (parentFolder, name) => ipcRenderer.invoke('frame:downloaded-media-create-folder', { parentFolder, name }),
  resolveDownloadedMedia: (relativePath) => ipcRenderer.invoke('frame:downloaded-media-resolve', relativePath),
  openDownloadedMediaFolder: (folder) => ipcRenderer.invoke('frame:downloaded-media-open-folder', folder),
  downloadYoutube: (payload) => ipcRenderer.invoke('frame:youtube-download', payload),
  cancelYoutubeDownload: () => ipcRenderer.send('frame:youtube-cancel'),
  onYoutubeDownloadProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('frame:youtube-download-progress', listener);
    return () => ipcRenderer.removeListener('frame:youtube-download-progress', listener);
  },
  selectMediaFiles: () => ipcRenderer.invoke('frame:select-media'),
  selectCustomizationBackground: () => ipcRenderer.invoke('frame:select-custom-background'),
  importFontsZip: () => ipcRenderer.invoke('frame:import-fonts-zip'),
  listSystemFonts: () => ipcRenderer.invoke('frame:list-system-fonts'),
  listCustomFonts: () => ipcRenderer.invoke('frame:list-custom-fonts'),
  readCustomFont: (id) => ipcRenderer.invoke('frame:read-custom-font', id),
  getPathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return null; }
  },
  mediaURL: (target) => `frame-media://asset/?path=${encodeURIComponent(target)}`,
  openPath: (target) => ipcRenderer.invoke('frame:open-path', target),
  isDesktop: true
});
