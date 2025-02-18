import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import App from "./App";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Overview, {overviewLoader} from "./pages/Overview/Overview";
import Dashboard, {dashboardLoader} from "./pages/Dashboard/Dashboard";
import SingleWalletView, {walletLoader} from "./pages/Dashboard/SingleWalletView";
import SingleAssetView, {assetLoader} from "./pages/Dashboard/SingleAssetView";
import Managecategories from "./pages/Overview/ManageCategories";
import Defi from "./pages/Defi/Defi";
import Alerts from "./pages/Alerts/Alerts";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
              <Overview />
          </ProtectedRoute>
        ),
        loader: overviewLoader,
      },
      {
        path: "ManageCatagories",
        element: (
          <ProtectedRoute>
            <Managecategories />
          </ProtectedRoute>
        ),
      },
      {
        path: "Dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
        loader: dashboardLoader,
        children: [
          {
            path: "wallet/:walletAddress",
            element: (
                <SingleWalletView />
            ),
            loader: walletLoader,
          },
          {
            path: "asset/:assetId",
            element: (
                <SingleAssetView />
            ),
            loader: assetLoader,
          }
        ]
      },
      {
        path: "Defi",
        element: (
          <ProtectedRoute>
            <Defi />
          </ProtectedRoute>
        ),
      },
      {
        path: "Alerts",
        element: (
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        ),
      }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);