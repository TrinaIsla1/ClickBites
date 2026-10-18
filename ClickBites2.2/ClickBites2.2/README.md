# ClickBites Full-Stack

A React + Vite frontend and Express + SQLite backend for ClickBites.

## Requirements
- Node.js 18+ (Node.js 20+ recommended)
- VS Code

## Install
```bash
npm install
```

## Run backend
```bash
npm run server
```

## Run frontend (second terminal)
```bash
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

## Optional: start both on Windows
Double-click `start-clickbites.bat` after `npm install`.

## Demo admin
- Email: `admin@clickbites.local`
- Password: `Admin123!`

## Important
This is a web React project. It does **not** use Expo Router or React Native. If VS Code shows errors such as `Cannot find module 'expo-router'`, `react-native`, or `react-native-safe-area-context`, those errors are from an old Expo file/project and should not be present in this ClickBites project.

If VS Code still shows `Cannot find module ...`, run `npm install` from the folder containing `package.json`, then reload VS Code/TypeScript server.
