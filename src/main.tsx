import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Bundles from './pages/Bundles';
import Temp from './pages/Temp';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'Bundles',
        element: <Bundles />,
      },
      {
        path: 'liabilities',
        element: <Temp />,
      },
      {
        path: 'cashflow',
        element: <Temp />,
      },
      {
        path: 'reports',
        element: <Temp />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);