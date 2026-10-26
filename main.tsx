import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./state/App";
import "./styles/base.css";
import "./styles/mint.css";
import "./styles/build.css";
import "./styles/pages.css";
import "./styles/motion.css";
import "./styles/rig.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
