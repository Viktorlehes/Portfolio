import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
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
        path: 'assets',
        element: <Assets />,
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