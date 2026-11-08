import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installPersianInputGuard } from './utils/persianText';

installPersianInputGuard();

createRoot(document.getElementById('root')!).render(<App />);
