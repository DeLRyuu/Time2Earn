import { useContext } from 'react';
import { ToastContext } from '../context/toastContextDef';

export const useToast = () => useContext(ToastContext);
