import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

// Compatibility entry: share the route definition mounted by main.tsx.
export default function App() { return <RouterProvider router={router} />; }
