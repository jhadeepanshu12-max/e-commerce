import { StrictMode } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);