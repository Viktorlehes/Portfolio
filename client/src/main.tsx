import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Overview from './pages/Overview';
import Dashboard from './pages/Dashboard';
import Bundles from './pages/Bundles';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Overview />,
      },
      {
        path: 'Dashboard',
        element: <Dashboard />,
      },
      {
        path: 'Bundles',
        element: <Bundles />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);