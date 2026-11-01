import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/outfit";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { UserContextProvider } from "./context/userContext.jsx";
import { BrowserRouter } from "react-router-dom";
import { SEOProvider } from "./components/SEO.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <SEOProvider>
        <UserContextProvider>
          <App />
        </UserContextProvider>
      </SEOProvider>
    </BrowserRouter>
  </StrictMode>,
);
