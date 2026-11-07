export function firstRunStep({prefsLoaded,introDone,hasUser,introReplay}){if(!prefsLoaded)return 'splash';if(introReplay)return 'intro';if(hasUser)return 'app';return introDone?'login':'intro';}
