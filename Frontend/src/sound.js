// Audio removed with the game. Keep no-op signatures for legacy non-critical UI callers.
export const getSoundSettings=()=>({masterMute:true,ui:false,gameMusic:false,gameMusicVolume:0,gameEffects:false,gameEffectsVolume:0});
export const updateSoundSettings=()=>{};
export const setSoundEnabled=()=>{};
export const isSoundEnabled=()=>false;
export const playSound=async()=>{};
export const startGameMusic=async()=>{};
export const stopGameMusic=async()=>{};
export const stopAllAudio=async()=>{};
