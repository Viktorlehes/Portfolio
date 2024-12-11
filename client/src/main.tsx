import React from "react";
import { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, LoaderFunctionArgs } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import App from "./App";
import Login from "./pages/misc/Login";
import { Suspense } from "react";
// Lazy load components AND their loaders together

const Overview = lazy(() => import("./pages/Overview/Overview"));
const Managecategories = lazy(() => import("./pages/Overview/ManageCategories"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const SingleWalletView = lazy(() => import("./pages/Dashboard/SingleWalletView"));
const SingleAssetView = lazy(() => import("./pages/Dashboard/SingleAssetView"));

const overviewLoader = async (args: LoaderFunctionArgs) => {
  const { overviewLoader } = await import("./pages/Overview/Overview");
  return overviewLoader(args);
};

const manageLoader = async (args: LoaderFunctionArgs) => {
  const { manageLoader } = await import("./pages/Overview/ManageCategories");
  return manageLoader(args);
};

const dashboardLoader = async (args: LoaderFunctionArgs) => {
  const { dashboardLoader } = await import("./pages/Dashboard/Dashboard");
  return dashboardLoader(args);
};

const walletLoader = async (args: LoaderFunctionArgs) => {
  const { walletLoader } = await import("./pages/Dashboard/SingleWalletView");
  return walletLoader(args);
};

const assetLoader = async (args: LoaderFunctionArgs) => {
  const { assetLoader } = await import("./pages/Dashboard/SingleAssetView");
  return assetLoader(args);
};

// Defi can stay as a regular import since it's not lazy loaded
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
            <Suspense fallback={<div>Loading...</div>}>
              <Overview />
            </Suspense>
          </ProtectedRoute>
        ),
        loader: overviewLoader,
      },
      {
        path: "ManageCatagories",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<div>Loading...</div>}>
            <Managecategories />
            </Suspense>
          </ProtectedRoute>
        ),
        loader: manageLoader,
      },
      {
        path: "Dashboard",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<div>Loading...</div>}>
            <Dashboard />
            </Suspense>
          </ProtectedRoute>
        ),
        loader: dashboardLoader,
        children: [
          {
            path: "wallet/:walletAddress",
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <SingleWalletView />
              </Suspense>
            ),
            loader: walletLoader,
          },
          {
            path: "asset/:assetId",
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <SingleAssetView />
              </Suspense>
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