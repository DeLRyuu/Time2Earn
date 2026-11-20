import { useContext } from 'react';
import { ConfigContext } from '../context/configContextDef';

export const useConfig = () => useContext(ConfigContext);
