import React from "react";
import { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import App from "./App";
import Login from "./pages/misc/Login";
import Overview, { overviewLoader } from "./pages/Overview/Overview";
import Managecategories, {manageLoader} from "./pages/Overview/ManageCategories"; 
import Dashboard, { dashboardLoader } from "./pages/Dashboard/Dashboard";
const SingleWalletView = lazy(() => import("./pages/Dashboard/SingleWalletView"));
import { walletLoader } from "./pages/Dashboard/SingleWalletView";
const SingleAssetView = lazy(() => import("./pages/Dashboard/SingleAssetView"));
import { assetLoader } from "./pages/Dashboard/SingleAssetLoader";
import Defi, { defiLoader } from "./pages/Defi/Defi";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
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
        loader: manageLoader,
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
            element: <SingleWalletView />,
            loader: walletLoader,
          },
          {
            path: "asset/:assetId",
            element: <SingleAssetView />,
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
        loader: defiLoader,
      },
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