import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Overview, { cryptoStatsLoader } from "./pages/Overview/Overview";
import Dashboard, { dashboardLoader } from "./pages/Dashboard/Dashboard";
import Bundles from "./pages/Bundles/Bundles";
import Temp from "./pages/misc/Temp";
import SingleWalletView, { walletLoader } from "./pages/Dashboard/SingleWalletView";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Overview />,
        loader: cryptoStatsLoader,
      },
      {
        path: "Dashboard",
        element: <Dashboard />,
        loader: dashboardLoader,
        children: [
          {
            path: "wallet/:walletAddress",
            element: <SingleWalletView />,
            loader: walletLoader,
          }
        ]
      },
      {
        path: "Earn",
        element: <Temp />
      },
      {
        path: "Bundles",
        element: <Bundles />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);