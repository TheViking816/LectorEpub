import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clear old database versions on startup
const clearOldDatabases = async () => {
  try {
    const dbs = await indexedDB.databases();
    const oldDb = dbs.find(db => db.name === 'epub-reader-db');
    if (oldDb) {
      console.log('Clearing old database version...');
      await indexedDB.deleteDatabase('epub-reader-db');
    }
  } catch (e) {
    console.log('No old databases to clear');
  }
};

clearOldDatabases().then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
});
