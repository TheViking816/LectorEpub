console.log('Clearing IndexedDB...'); indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name))); console.log('Database cleared. Please refresh the page.');
