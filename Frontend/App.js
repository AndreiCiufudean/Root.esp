import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Text, View, Pressable, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext, useAuth } from './src/auth';
import { api, clearSession, getToken, setToken, USE_MOCK, subscribeBusy } from './src/api';
import { DataProvider, useData } from './src/appdata';
import { PrefsProvider, usePrefs } from './src/prefs';
import { kvGet, kvSet } from './src/store';
import { colors, BREAKPOINT } from './src/theme';
import { Wordmark, LogoBack, GradientBg, Dot, Loading, Icon } from './src/ui';
import { TourProvider } from './src/tour';
import KidsAccountSheet from './src/KidsAccountSheet';
import { DeviceNudge, recordFeature } from './src/deviceNudge';
import { kindOf } from './src/notifTypes';
import { playSound } from './src/sound';
import Splash from './src/Splash';
import EnterLoader from './src/EnterLoader';
import { firstRunStep } from './src/firstRunStep';
import Intro from './src/Intro';
import TourOverlay from './src/TourOverlay';
import SettingsModal from './src/SettingsModal';
import Sidebar, { SIDEBAR_WIDTH, NAV_ITEMS } from './src/Sidebar';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlantsScreen from './src/screens/PlantsScreen';
import DesignScreen from './src/screens/DesignScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import AddPlantScreen from './src/screens/AddPlantScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

import AdminScreen from './src/screens/AdminScreen';
import MenuScreen from './src/screens/MenuScreen';
import AssistantScreen from './src/screens/AssistantScreen';
import { KidsTabs, KidPlantScreen } from './src/kids/KidsApp';


const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const ACCOUNTS_KEY = 'rootesp.accounts.v1';
const MIN_SPLASH_MS = 250;
// The tab header (where the Root.esp logo sits) is see-through: no white bar behind the logo. It paints the
// same colours as the top edge of every page gradient (left pink -> right cream), so there is no seam.
const SOFT_HEADER = { headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false, headerBackground: () => <HeaderBackdrop /> };
function HeaderBackdrop() {
  return <LinearGradient colors={[colors.gradient[0], colors.gradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}
const navigationRef=createNavigationContainerRef();

// All platforms share the same five principal destinations. Each has its own icon and accent colour.
// The bottom padding follows the phone's own navigation area (gesture bar or Home/Back/Recents buttons),
// so the tabs never sit underneath the system buttons on edge-to-edge Android phones.
function MobileTabBar({state,navigation}) {
  const insets=useSafeAreaInsets();
  return <View style={{flexDirection:'row',backgroundColor:colors.paper,borderTopWidth:1,borderColor:colors.line,paddingTop:6,paddingBottom:Math.max(10,insets.bottom+6),paddingLeft:insets.left,paddingRight:insets.right}}>
    {state.routes.map((route,i)=>{const selected=i===state.index;const item=NAV_ITEMS[route.name];const accent=item.color();return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected}} onPress={()=>navigation.navigate(route.name)} style={{flex:1,alignItems:'center',paddingVertical:4,gap:3}}>
      <View style={{paddingHorizontal:14,paddingVertical:4,borderRadius:14,backgroundColor:selected?accent+(colors.isDark?'33':'1F'):'transparent'}}><Icon name={selected?item.icon:item.iconOff} size={22} color={selected?accent:colors.muted}/></View>
      <Text style={{fontSize:11,fontWeight:selected?'700':'500',color:selected?accent:colors.muted}}>{item.label}</Text>
    </Pressable>;})}
  </View>;
}
function GuidedPage({page,children}) {
 const {user}=useAuth();const focused=useIsFocused();
 // Remember which main features this account has tried (used by the link-a-device prompt).
 useEffect(()=>{if(focused)recordFeature(user,page);},[focused,page,user?.UserID]);
 return <TourProvider><View style={{flex:1}}>{children}{focused&&<TourOverlay user={user} page={page}/>}</View></TourProvider>;
}
const wrapPage=(Component,page)=>function Wrapped(props){return <GuidedPage page={page}><Component {...props}/></GuidedPage>;};
const GuidedHome=wrapPage(HomeScreen,'Home');
const GuidedPlants=wrapPage(PlantsScreen,'Plants');
const GuidedDesign=wrapPage(DesignScreen,'Design');
const GuidedProfile=wrapPage(MenuScreen,'Profile');
const GuidedAssistant=wrapPage(AssistantScreen,'Assistant');
function HeaderBell(){
  const {counts}=useAuth();const nav=navigationRef;
  return <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={()=>nav.isReady()&&nav.navigate('Alerts')} style={{marginRight:16,padding:6}}>
    <Icon name="bell-outline" size={22} color={colors.soil}/>
    {(counts.urgent>0||counts.green>0)&&<View style={{position:'absolute',top:4,right:4}}><Dot color={counts.urgent?colors.danger:colors.success} size={9}/></View>}
  </Pressable>;
}
// Back from a tab: previous tab in the history, otherwise Home.
export function goBackFrom(navigation){ if(navigation.canGoBack())navigation.goBack(); else navigation.navigate('Home'); }
function MainTabs() {
  const { user, setSysNotifs } = useAuth();
  const {width}=useWindowDimensions();
  const wide=width>=BREAKPOINT;
  useEffect(()=>{let active=true;const refresh=()=>api.getNotifications(user.UserID).then(x=>{if(active)setSysNotifs(x);}).catch(()=>{});refresh();const id=setInterval(refresh,30000);return()=>{active=false;clearInterval(id);};},[user.UserID]);
  // backBehavior="history": the logo (and Android's back button) returns to the tab you came from.
  return <><Tabs.Navigator backBehavior="history" tabBar={wide?(props)=><Sidebar {...props}/>:props=><MobileTabBar {...props}/>} screenOptions={({navigation,route})=>({animation:'none',lazy:false,tabBarPosition:wide?'left':'bottom',sceneStyle:{backgroundColor:colors.bg},headerShown:!wide,headerStyle:{backgroundColor:colors.paper},headerShadowVisible:false,headerTitleAlign:'left',headerTitle:()=><LogoBack size={22} back={route.name!=='Home'} onPress={()=>goBackFrom(navigation)}/>,headerRight:()=><HeaderBell/>})}>
    <Tabs.Screen name="Home" component={GuidedHome}/>
    <Tabs.Screen name="Plants" component={GuidedPlants} options={{title:'My Plants'}}/>
    <Tabs.Screen name="Design" component={GuidedDesign}/>
    <Tabs.Screen name="Assistant" component={GuidedAssistant} options={{title:'Assistant'}}/>
    <Tabs.Screen name="Profile" component={GuidedProfile}/>
  </Tabs.Navigator><DeviceNudge user={user} navigate={(to)=>{if(!navigationRef.isReady())return;if(to==='Devices')navigationRef.navigate('Devices');else navigationRef.navigate('Main',{screen:to});}}/></>;
}

// Shown when a request is slow, so the app never looks frozen.
function LagOverlay() {
  const [slow, setSlow] = useState(false);

  useEffect(() => subscribeBusy(setSlow), []);
  if (!slow) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ backgroundColor: colors.paper, borderRadius: 22, padding: 26, alignItems: 'center', gap: 8, minWidth: 240 }}>

        <Text style={{ color: colors.soil, fontWeight: '700', fontSize: 17 }}>Still growing your data…</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>This is taking a little longer than usual.</Text>
      </View>
    </View>
  );
}

function Root() {
  const { ready, notifsFor } = useData();
  const prefs = usePrefs();
  const [accounts, setAccounts] = useState([]); // [{ user, token }]
  const [user, setUser] = useState(null);
  const [sysNotifs, setSysNotifs] = useState([]);
  const [bannerOpen,setBannerOpen]=useState(false);
  const [restored, setRestored] = useState(false);
  const [minDone, setMinDone] = useState(false);
  const iconsReady = true; // icons are vector shapes now (src/Icon.js), nothing to load
  const [settings, setSettings] = useState(null);
  const [authEpoch, setAuthEpoch] = useState(0);
  const pendingAdd=useRef(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [kidsSheet, setKidsSheet] = useState(false);
  const [entering, setEntering] = useState(0); // >0 shows the 'preparing your garden' page before the app
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [guestIntroRequired,setGuestIntroRequired]=useState(false);

  const navState = useRef(undefined);
  const lastCount = useRef(null);

  useEffect(() => { const t = setTimeout(() => setMinDone(true), MIN_SPLASH_MS); return () => clearTimeout(t); }, []);

  // Demo mode keeps you signed in after a refresh. (Real mode keeps its token in memory only.)
  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (USE_MOCK) {
        const saved = await kvGet(ACCOUNTS_KEY, null);
        if (saved?.accounts?.length) {
          setAccounts(saved.accounts);
          const cur = saved.accounts.find((a) => a.user.UserID === saved.current);
          if (cur) { setUser(cur.user); setToken(cur.token); setEntering((n) => n + 1); }
        }
      }
      setRestored(true);
    })();
  }, [ready]);

  useEffect(() => {
    if (restored && USE_MOCK) kvSet(ACCOUNTS_KEY, { accounts, current: user ? user.UserID : null });
  }, [accounts, user, restored]);

  useEffect(()=>{if(!user){setBannerOpen(false);return;}let active=true;const key=`rootesp.banner.v1.${USE_MOCK?'demo':'real'}.${user.UserID}`;kvGet(key,false).then(done=>{if(active)setBannerOpen(!done);});return()=>{active=false;};},[user?.UserID]);
  const dismissBanner=()=>{if(user)kvSet(`rootesp.banner.v1.${USE_MOCK?'demo':'real'}.${user.UserID}`,true);setBannerOpen(false);};

  // red dot = unread urgent alerts; green dot = unread friendly updates and discoveries
  const local = user ? notifsFor(user.UserID).filter(n=>!['Like','Comment','Follow'].includes(n.type)) : [];
  const counts = {
    urgent: sysNotifs.filter((n) => !n.IsRead && kindOf(n.NotificationType) === 'urgent').length,
    green: sysNotifs.filter((n) => !n.IsRead && kindOf(n.NotificationType) !== 'urgent').length + local.filter((n) => !n.isRead).length,
  };
  useEffect(() => {
    const total = counts.urgent + counts.green;
    if (lastCount.current !== null && total > lastCount.current) playSound('bell');
    lastCount.current = total;
  }, [counts.urgent, counts.green]);

  // Authentication state and account-specific pledge are independent of the device-wide theme.
  useEffect(()=>{if(user)prefs.migrateLegacy(user);},[user?.UserID,prefs.migrateLegacy]);
  const signIn = useCallback((u, opts) => {
    // Move the guest questionnaire into the authenticated account's own preferences.
    kvGet('rootesp.personalization.pending.v1',null).then(async answer=>{
      if(answer){await kvSet(`rootesp.personalization.account.${USE_MOCK?'demo':'real'}.${u.UserID}`,answer);await kvSet('rootesp.personalization.pending.v1',null);}
    });
    setAccounts((list) => [...list.filter((a) => a.user.UserID !== u.UserID), { user: u, token: getToken() }]);
    setSysNotifs([]);
    navState.current = undefined;
    setUser(u);
    setEntering((n) => n + 1);
    // Parents who said they have kids are invited to create a kids account right after sign-up.
    if (opts?.justRegistered && opts?.hasKids && !u.IsKid) setKidsSheet('welcome');
    // A brand-new account is always offered the tour once, whatever happened in the intro (see WelcomeOffer).
    // No legacy tours or welcome popups in the professional onboarding.

    setAuthEpoch(n=>n+1);
  }, []);

  const switchAccount = useCallback((acc) => {
    setToken(acc.token); setSysNotifs([]); navState.current = undefined; setUser(acc.user); setEntering((n) => n + 1); setAuthEpoch(n=>n+1);
  }, []);

  const signOut = useCallback(() => {
    const rest = accounts.filter((a) => a.user.UserID !== user?.UserID);
    setAccounts(rest); setSysNotifs([]); navState.current = undefined;
    // A child signing out must never land in a grown-up account that is still signed in on this device.
    if (user?.IsKid) { clearSession(); setUser(null); }
    else if (rest.some((a) => !a.user.IsKid)) { const next = rest.find((a) => !a.user.IsKid); setToken(next.token); setUser(next.user); }
    else { clearSession(); setUser(null); setGuestIntroRequired(false); setIntroOpen(false); }
    setAuthEpoch(n=>n+1);
  }, [accounts, user]);

  // splash -> intro (new visitor, or replay) -> login -> app. See src/flow.js.
  const step = firstRunStep({ prefsLoaded: ready && restored && minDone && iconsReady && prefs.loaded, introDone: prefs.introDone && !guestIntroRequired, hasUser: !!user, introReplay: introOpen });
  if (step === 'splash') return <Splash />;
  if (step === 'intro') {
    return <Intro onDone={() => {
      
      
      prefs.finishIntro(); setIntroOpen(false); setGuestIntroRequired(false);
      
    }} />;
  }

  const dark = colors.isDark;
  const openSettings=(section='appearance')=>setSettings(section);
  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: colors.bg, card: colors.paper, text: colors.soil, border: colors.line, primary: colors.fern },
  };

  return (
    <AuthContext.Provider value={{ user, accounts, counts, sysNotifs, setSysNotifs, signIn, signOut, switchAccount, beginAddAccount:()=>{pendingAdd.current=true;setAuthEpoch(n=>n+1);}, openSettings, openKidsSetup:()=>setKidsSheet('profile') }}>
      <View style={{ flex: 1 }}>
        <GradientBg />
        <StatusBar style={dark ? 'light' : 'dark'} />
        {/* re-mounted when the theme changes; navState keeps the current screen */}
        <NavigationContainer ref={navigationRef} key={`${user?.UserID ?? 'guest'}:${authEpoch}:${prefs.themeId}:${prefs.resolvedAppearance}`} theme={navTheme} initialState={navState.current} onReady={()=>{if(pendingAdd.current){pendingAdd.current=false;navigationRef.navigate('AddAccount');}}} onStateChange={(st) => { navState.current = st; }} documentTitle={{ formatter: () => 'Root.esp' }}>
          <Stack.Navigator key={user ? `u${user.UserID}` : 'guest'} screenOptions={({ navigation }) => ({ headerStyle: { backgroundColor: colors.paper }, headerTitleStyle: { color: colors.soil, fontSize: 16 }, headerTintColor: colors.fern, contentStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleAlign: 'left', headerBackVisible: false, animation: 'slide_from_right', animationDuration: 280, headerLeft: () => <LogoBack size={20} back onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')} /> })}>
            {user?.IsKid ? (
              <>
                <Stack.Screen name="KidsMain" component={KidsTabs} options={{ headerShown: false }} />
                <Stack.Screen name="KidPlant" component={KidPlantScreen} options={{ headerShown: false, animation: 'fade_from_bottom' }} />
              </>
            ) : user ? (
              <>
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="PlantDetail" component={PlantDetailScreen} options={{ title: 'Plant' }} />
                <Stack.Screen name="AddPlant" component={AddPlantScreen} options={{ title: 'Add a plant' }} />
                <Stack.Screen name="Devices" component={DevicesScreen} options={{ title: 'My Root.esp devices' }} />
                <Stack.Screen name="Alerts" component={NotificationsScreen} options={{ title: 'Notifications' }} />
                <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
                <Stack.Screen name="AddAccount" component={LoginScreen} options={{ title: 'Add account' }} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>

        </NavigationContainer>
        {user&&!user.IsKid&&bannerOpen&&<View accessibilityRole="alert" style={{position:'absolute',...(winW>=BREAKPOINT?{bottom:24,right:24,width:380}:{top:insets.top+64,left:18,right:18}),backgroundColor:colors.paper,shadowColor:'#000',shadowOpacity:0.12,shadowRadius:12,elevation:6,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:16,flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1}}><Text style={{fontWeight:'700',color:colors.soil}}>say hello to a better world</Text><Text style={{color:colors.muted,fontSize:12,marginTop:4}}>Welcome to your Root.esp experience.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss welcome banner" onPress={dismissBanner} style={{padding:10}}><Text style={{color:colors.muted}}>Dismiss</Text></Pressable></View>}
        <SettingsModal visible={!!settings} initialSection={settings||'appearance'} onClose={()=>setSettings(null)}/>
        {user&&!user.IsKid&&<KidsAccountSheet visible={!!kidsSheet} reason={kidsSheet} onClose={()=>setKidsSheet(false)}/>}
        {!!entering && user && <EnterLoader key={entering} kid={!!user.IsKid} name={user.DisplayName || user.Username} onDone={() => setEntering(0)} />}
        <LagOverlay />
      </View>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <DataProvider>
          <Root />
        </DataProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

