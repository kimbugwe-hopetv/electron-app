# URA Tax Administration Database Dashboard

This project is a desktop application built with Electron, React, Vite, and MongoDB. It connects to a local MongoDB database, shows collections such as taxpayers and tax assessments, and presents the data in a clean dashboard interface.

The goal is to combine:

- a desktop app experience for local institutional use,
- a React frontend for the user interface,
- a secure Electron backend that can access MongoDB,
- and a TypeScript workflow that helps reduce bugs during development.

---

## 1. Overview of the application

The app is designed for a government or tax administration dashboard.

It displays:

- overall database statistics,
- a current collection selector,
- a live refresh button,
- and the records from a chosen MongoDB collection.

The main collections used are:

- efris_transactions
- tax_assessments
- tax_incentives_exemptions
- taxpayers

The dashboard reads from the database and renders it in a readable, tabular format.

---

## 2. How the MongoDB connection is made

The database connection logic is in [src/electron/database.ts](src/electron/database.ts).

### Connection details

```ts
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'URA_TaxAdmin_DB';
```

This means:

- the MongoDB instance is running locally,
- the server is on the default MongoDB port 27017,
- the database name is `URA_TaxAdmin_DB`.

### Why the code uses a singleton-style connection

```ts
let client: MongoClient | null = null;
let database: Db | null = null;
```

The app does not create a new connection for every query. Instead, it reuses the same database connection if it already exists:

```ts
if (database) {
  return database;
}
```

This avoids unnecessary reconnects and improves performance.

### Connection process

```ts
client = new MongoClient(MONGO_URI);
await client.connect();
database = client.db(DATABASE_NAME);
```

This creates a MongoDB client, connects to the local database, and then selects the required database.

### Closing the connection

At shutdown, the app calls:

```ts
await client.close();
```

This is important because it releases database resources cleanly when the desktop app exits.

---

## 3. How the app communicates with MongoDB from the UI

The React UI itself does not directly access MongoDB. That would be unsafe and not allowed in a browser-based app.

Instead, the app uses Electron’s main process and preload bridge.

### Data flow

1. React code in [src/ui/App.tsx](src/ui/App.tsx) requests data.
2. The browser-side code calls `window.databaseAPI.*`.
3. [src/electron/preload.cts](src/electron/preload.cts) exposes a safe API through `contextBridge`.
4. Electron `ipcRenderer.invoke(...)` sends a request to the main process.
5. The main process in [src/electron/main.ts](src/electron/main.ts) handles the request using `ipcMain.handle(...)`.
6. MongoDB queries run in the main process.
7. Results are converted to JSON-safe structures and returned to React.

This is the key benefit: frontend code stays simple while database access stays controlled and secure.

---

## 4. Why Electron is used here

Electron is a good choice when you want a desktop app that behaves like a web app but can still access local system resources and a database.

### Benefits of Electron in this project

- Desktop app experience: the app runs like a native app, not only in a browser.
- MongoDB access from a local machine: Node.js and Electron support direct database access.
- Cross-platform distribution: the app can be packaged for Windows, Linux, and macOS.
- Single codebase for UI and desktop logic: React controls the interface while Electron handles the system layer.
- Familiar development model: frontend developers can build the UI in React while using Node-based back-end logic.

### Why not use only a browser app?

A plain browser app cannot safely or conveniently access the local MongoDB server in the same way, because browsers are restricted by security rules and cannot directly use Node.js modules or local machine resources in the same way a desktop app can.

Electron solves this by giving the app:

- a browser interface,
- a Node.js runtime,
- and the ability to create desktop packaging.

### Why Electron instead of a web app or other frameworks?

Compared with a pure web app, Electron is better when the app needs:

- local database access,
- desktop installation,
- custom window behavior,
- and controlled distribution to users on their own machines.

This project is not a cloud app; it is a desktop dashboard for local institutional data.

---

## 5. How Electron works in this project

Electron has two major processes:

### Main process

The main process is in [src/electron/main.ts](src/electron/main.ts).

It is responsible for:

- creating the app window,
- loading the UI,
- handling IPC requests,
- and managing database operations.

This code creates the window:

```ts
new BrowserWindow({
  width: 1600,
  height: 950,
  minWidth: 1000,
  minHeight: 650,
  webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

This is important because:

- `preload` loads a secure script before the UI runs,
- `contextIsolation` keeps the renderer process isolated,
- `nodeIntegration: false` prevents the frontend from directly accessing Node APIs.

That makes the app safer and more structured.

### Renderer process

The React app runs in the renderer process, created by the UI in [src/ui/main.tsx](src/ui/main.tsx).

It renders the interface and displays the data returned from the main process.

### Preload bridge

The preload script in [src/electron/preload.cts](src/electron/preload.cts) is the safe link between the renderer and the main process.

```ts
contextBridge.exposeInMainWorld('databaseAPI', {
  getCollection: (collectionName: string) =>
    ipcRenderer.invoke('mongodb:get-collection', collectionName),
  getStatistics: () => ipcRenderer.invoke('mongodb:get-statistics'),
  testConnection: () => ipcRenderer.invoke('mongodb:test-connection')
});
```

This means the renderer can only call a limited set of methods, and it cannot directly run unsafe code.

---

## 6. Why TypeScript is used even though JavaScript is the runtime language

This project uses TypeScript in the source files, but the browser and Electron runtime still execute JavaScript in the end.

### Why TypeScript is useful

TypeScript adds types to JavaScript. This helps catch errors early, including:

- wrong parameter types,
- missing properties,
- objects with unexpected shapes,
- invalid collection names,
- and easier refactoring.

Example from the project:

```ts
type CollectionName =
  | 'efris_transactions'
  | 'tax_assessments'
  | 'tax_incentives_exemptions'
  | 'taxpayers';
```

This restricts the app to valid names and prevents invalid collection requests.

### Why it still becomes JavaScript

TypeScript is compiled to JavaScript by the TypeScript compiler (`tsc`).

So the development experience is:

- write TypeScript for safety,
- compile to JavaScript for the actual runtime,
- and run the real app using JavaScript in Node/Electron.

This is why TypeScript is commonly used in modern app development: it gives developer confidence while preserving JavaScript execution.

### In this project specifically

The app uses:

- TypeScript for Electron files and React logic,
- Vite for development and bundling the UI,
- and transpilation to convert TypeScript into JavaScript for runtime use.

So JavaScript is still the underlying language executed, but TypeScript improves correctness during development.

---

## 7. How the UI is structured

The UI code is in [src/ui/App.tsx](src/ui/App.tsx) and [src/ui/App.css](src/ui/App.css).

### Main UI responsibilities

The React component handles:

- database connection state,
- collection selection,
- loading state,
- statistics cards,
- and record rendering.

### Connection status

```tsx
const [connected, setConnected] = useState(false);
```

This value is updated after `testConnection()` runs.

### Record display

The app loads records for a chosen collection and shows them in a table:

```tsx
{records.map((record, index) => (
  ...
))}
```

It also supports nested objects and arrays by showing expandable details blocks.

### Styling

The visual design is controlled by [src/ui/App.css](src/ui/App.css), which styles:

- the page background,
- the statistics cards,
- the database toolbar,
- the table,
- and the nested record viewer.

This file is where the dashboard look and feel is defined.

---

## 8. File structure explained

### Root folder

At the project root you will find the main configuration files:

- [package.json](package.json): defines dependencies and scripts
- [vite.config.ts](vite.config.ts): configures the React/Vite frontend
- [electron-builder.json](electron-builder.json): configures desktop packaging
- [tsconfig.json](tsconfig.json): base TypeScript config
- [tsconfig.app.json](tsconfig.app.json): app TypeScript config
- [tsconfig.node.json](tsconfig.node.json): Node/Electron TypeScript config
- [index.html](index.html): the base HTML file used by Vite

### src folder

The application source code lives here.

#### src/electron

This folder contains the desktop backend logic.

- [src/electron/main.ts](src/electron/main.ts): creates the Electron window and handles IPC requests
- [src/electron/database.ts](src/electron/database.ts): MongoDB connection logic
- [src/electron/preload.cts](src/electron/preload.cts): exposes a safe API to the UI
- [src/electron/util.ts](src/electron/util.ts): small helper for development detection
- [src/electron/tsconfig.json](src/electron/tsconfig.json): compile config for Electron backend
- [src/electron/tsconfig.preload.json](src/electron/tsconfig.preload.json): compile config for preload script

#### src/ui

This folder contains the React frontend.

- [src/ui/App.tsx](src/ui/App.tsx): main dashboard code
- [src/ui/App.css](src/ui/App.css): styling for the UI
- [src/ui/main.tsx](src/ui/main.tsx): React root bootstrap
- [src/ui/index.css](src/ui/index.css): base CSS reset and layout defaults
- [src/ui/global.d.ts](src/ui/global.d.ts): global type declarations for `window.databaseAPI`

### public folder

The [public](public) directory is meant for static assets that do not need processing by Vite. In this project it is mostly a standard place to store files such as icons, logos, or static resources shared by the app.

### dist folder

The project generates build output folders such as:

- [dist-react](dist-react): built React frontend output
- [dist-electron](dist-electron): transpiled Electron backend JavaScript

These are generated after running the build scripts and are not usually edited manually.

#### Why they exist

- `dist-react` contains the HTML, CSS, and JS that the Electron app loads when it is packaged or run in production mode.
- `dist-electron` contains the compiled TypeScript files turned into JavaScript for the Electron main process and preload logic.

These folders are production artifacts, not source code.

### node_modules folder

The [node_modules](node_modules) folder contains all installed dependencies for React, Vite, Electron, MongoDB, and TypeScript.

It is created automatically when you run:

```bash
npm install
```

This folder is not normally committed to version control and is usually large, because it stores all the libraries the app depends on.

---

## 9. Why the project keeps both frontend and backend code separated

This project separates concerns:

- React is used for presentation and interaction,
- Electron is used for system-level control,
- MongoDB is used for persistence,
- and the preload layer safely exposes only the needed functions.

This separation makes the app easier to maintain.

Even though the interface is simple, the architecture is a good example of a typical desktop application:

- UI layer (React)
- Bridge layer (preload/IPC)
- Process controller (Electron main)
- Data layer (MongoDB)

---

## 10. Security and data handling

The app validates incoming collection names before querying MongoDB:

```ts
const ALLOWED_COLLECTIONS = [
  'efris_transactions',
  'tax_assessments',
  'tax_incentives_exemptions',
  'taxpayers'
] as const;
```

This prevents arbitrary database access through user input and limits requests to approved collections only.

It also serializes MongoDB documents before returning them to the UI:

```ts
if (value instanceof Date) {
  return value.toISOString();
}
```

This ensures the returned objects are JSON-safe and can be displayed in the browser renderer.

---

## 11. How to run the project

Install dependencies:

```bash
npm install
```

Start the app in development mode:

```bash
npm run dev
```

This runs Vite and Electron together.

Build the app:

```bash
npm run build
```

Create a packaged desktop build:

```bash
npm run dist:win
```

or:

```bash
npm run dist:linux
```

or:

```bash
npm run dist:mac
```

---

## 12. Summary

This project is a desktop database dashboard built with Electron and React. It connects to a local MongoDB database, exposes a safe API through Electron’s preload layer, and displays records from selected collections in a user-friendly interface.

The architecture is intentionally split into layers:

- UI interface: React
- Secure bridge: preload + IPC
- App runtime: Electron
- Data access: MongoDB driver

TypeScript is used to keep the code safer and easier to manage while JavaScript remains the final runtime language after compilation. This combination gives a professional and scalable structure for building desktop apps with modern frontend tools.
