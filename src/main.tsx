import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConfigMissing } from "./components/common/ConfigMissing";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>{isSupabaseConfigured ? <App /> : <ConfigMissing />}</React.StrictMode>
  );
}
