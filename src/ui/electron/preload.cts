
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('databaseAPI', {

  getCollection: (collectionName: string) =>
    ipcRenderer.invoke(
      'mongodb:get-collection',
      collectionName
    ),

  getStatistics: () =>
    ipcRenderer.invoke('mongodb:get-statistics'),

  testConnection: () =>
    ipcRenderer.invoke('mongodb:test-connection')

});
