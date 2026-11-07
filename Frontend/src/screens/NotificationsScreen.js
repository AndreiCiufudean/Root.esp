import React,{useCallback,useState} from 'react';
import {Text,View,Pressable} from 'react-native';
import {useLiveRefresh} from '../useLiveRefresh';
import {useAuth} from '../auth';
import {api,USE_MOCK} from '../api';
import {Screen,Card,Loading,LoadFailure,Btn} from '../ui';
import {colors} from '../theme';
import {timeAgo} from '../logic';
const LEGACY=new Set(['Onboarding','NatureDiscovery','NatureAchievement','Like','Comment','Follow','Watering']);
export default function NotificationsScreen({navigation}){
 const {user,setSysNotifs}=useAuth();const [items,setItems]=useState(null),[err,setErr]=useState(''),[tab,setTab]=useState('unread');
 const load=useCallback((active=()=>true)=>{if(typeof active!=='function')active=()=>true;return api.getNotifications(user.UserID).then(rows=>{if(active()){setItems(rows.filter(x=>!LEGACY.has(x.NotificationType)));setSysNotifs(rows.filter(x=>!LEGACY.has(x.NotificationType)));setErr('');}}).catch(e=>{if(active())setErr(e.message);});},[user.UserID,setSysNotifs]);useLiveRefresh(load);
 if(err)return <LoadFailure message={err} onRetry={load}/>;if(!items)return <Loading/>;
 const shown=items.filter(x=>tab==='all'||(tab==='unread'?!x.IsRead:!!x.IsRead));
 const mark=async x=>{try{await api.markRead(x.NotificationID);await load();}catch(e){setErr(e.message);}};
 return <Screen><Text style={{fontSize:30,color:colors.soil,fontWeight:'600'}}>Notifications</Text><Text style={{color:colors.muted}}>Only important plant and device updates. {USE_MOCK?'Demo data.':''}</Text>
 <View style={{flexDirection:'row',gap:10}}>{[['unread','Unread'],['read','Read'],['all','All']].map(([id,label])=><Pressable key={id} onPress={()=>setTab(id)} style={{paddingVertical:12,paddingHorizontal:18,backgroundColor:tab===id?colors.mist:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:7}}><Text style={{color:colors.soil}}>{label}</Text></Pressable>)}</View>
 {!shown.length&&<Card><Text style={{color:colors.muted}}>No notifications in this category.</Text></Card>}
 {shown.map(x=><Card key={x.NotificationID}><Text style={{color:colors.soil,fontWeight:'700'}}>{x.Title}</Text><Text style={{color:colors.soil,marginTop:6}}>{x.Message}</Text><Text style={{color:colors.muted,marginTop:6,fontSize:12}}>{timeAgo(x.CreatedAt)}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:12}}>{x.PlantID&&<Btn small title="View plant" outline onPress={()=>navigation.navigate('PlantDetail',{plantId:x.PlantID})}/>} {x.NotificationType==='Offline'&&<Btn small title="Devices" outline onPress={()=>navigation.navigate('Devices')}/>} {!x.IsRead&&<Btn small title="Mark read" onPress={()=>mark(x)}/>}</View></Card>)}
 {items.some(x=>!x.IsRead)&&<Btn title="Mark all as read" outline onPress={async()=>{try{await api.markAllRead(user.UserID);await load();}catch(e){setErr(e.message);}}}/>}
 </Screen>;
}
