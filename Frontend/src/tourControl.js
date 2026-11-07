import {kvSet} from './store';
import {USE_MOCK} from './api';

const listeners=new Set();
const prefix=user=>`rootesp.tour.v3.${USE_MOCK?'demo':'real'}.${user.UserID}`;
export const tourPageKey=(user,page)=>`${prefix(user)}.${page}`;
export const tourSkipAllKey=user=>`${prefix(user)}.skipAll`;
export function subscribeTourChanges(callback){listeners.add(callback);return()=>listeners.delete(callback);}
function notify(){for(const fn of listeners)fn();}
export async function skipAllTours(user){
  if(!await kvSet(tourSkipAllKey(user),true))throw new Error('Could not save tour preference.');
  notify();
}
export async function replayAllTours(user){
  const saved=await Promise.all([
    kvSet(tourSkipAllKey(user),false),
    ...['Home','Plants','Design','Assistant','Profile'].map(page=>kvSet(tourPageKey(user,page),false))
  ]);
  if(saved.some(ok=>!ok))throw new Error('Could not reset every tour.');
  notify();
}
