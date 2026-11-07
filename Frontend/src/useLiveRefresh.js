import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
export function useLiveRefresh(load, interval=30000) {
 useFocusEffect(useCallback(()=>{
  let stopped=false, timer;
  const run=async()=>{try{await load(()=>!stopped);}finally{if(!stopped)timer=setTimeout(run,interval);}};
  run();
  return ()=>{stopped=true;clearTimeout(timer);};
 },[load,interval]));
}
