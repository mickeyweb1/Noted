import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/outfit";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { UserContextProvider } from "./context/userContext.jsx";
import { BrowserRouter } from "react-router-dom";
import { SEOProvider } from "./components/SEO.jsx";

const app = (
  <StrictMode>
    <BrowserRouter>
      <SEOProvider>
        <UserContextProvider>
          <App />
        </UserContextProvider>
      </SEOProvider>
    </BrowserRouter>
  </StrictMode>
);
const rootElement = document.getElementById("root");

if (rootElement.dataset.notedPrerendered === "true") {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
