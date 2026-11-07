import React,{useCallback,useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import {useLiveRefresh} from '../useLiveRefresh';
import {useAuth} from '../auth';
import {useData} from '../appdata';
import {api,USE_MOCK} from '../api';
import {colors} from '../theme';
import {Screen,Card,Loading,LoadFailure,Btn,IconBadge,Icon} from '../ui';
import {AdSlot} from '../deviceNudge';
import {TourTarget} from '../tour';
import {PlantTile,AttentionCard,AllGoodCard} from '../plantCards';
import {isOnline,soilStatus,displayReading,plantMood,greeting} from '../logic';
export const describePlant=p=>{const online=p.device?isOnline(p.device.LastSeenAt):null;const mood=plantMood(p.latest,p.settings,online);const soil=soilStatus(p.latest?.SoilMoisture,p.settings?.SoilMoistureThreshold);return {mood,soil:{tone:soil.tone,text:displayReading(p.latest?.SoilMoisture,'%',0,100),temp:displayReading(p.latest?.AirTemperature,'°C')}};};
const FRONT_PAGE_PLANTS=6;
export default function HomeScreen({navigation}){
 const {user}=useAuth();const {getLook}=useData();const [plants,setPlants]=useState(null),[err,setErr]=useState('');
 const load=useCallback((active=()=>true)=>{if(typeof active!=='function')active=()=>true;return api.getPlants(user.UserID).then(x=>{if(active()){setPlants(x);setErr('');}}).catch(e=>{if(active())setErr(e.message);});},[user.UserID]);useLiveRefresh(load);
 if(err)return <LoadFailure message={err} onRetry={load}/>;if(!plants)return <Loading/>;
 const connected=plants.filter(p=>p.device),offline=connected.filter(p=>!isOnline(p.device.LastSeenAt)),attention=plants.filter(p=>p.device&&describePlant(p).mood.tone!=='good');
 const stats=[['Plants',plants.length,'sprout',colors.section.plants],['Linked devices',connected.length,'chip',colors.info],['Offline devices',offline.length,'wifi-off',offline.length?colors.danger:colors.muted],['Check required',attention.length,'alert-circle-outline',attention.length?colors.warning:colors.success]];
 return <Screen>
 <View><Text style={{color:colors.muted,fontSize:13}}>{greeting().text}, {user.Username}</Text><Text style={{fontSize:30,color:colors.soil,fontWeight:'700'}}>Overview</Text><Text style={{color:colors.muted,marginBottom:6}}>Plant health and smart-device status · {USE_MOCK?'DEMO DATA':'Connected backend'}</Text></View>
 <TourTarget id="home.stats"><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{stats.map(([label,value,icon,tone])=><Card key={label} style={{minWidth:145,flexGrow:1,flexBasis:145,gap:8}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:colors.muted,fontSize:12}}>{label}</Text><IconBadge name={icon} color={tone} size={30}/></View><Text style={{color:colors.soil,fontSize:32,fontWeight:'700'}}>{value}</Text></Card>)}</View></TourTarget>

 <TourTarget id="home.plants"><View style={{gap:12}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12,gap:10,flexWrap:'wrap'}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><IconBadge name="sprout" color={colors.section.plants} size={32}/><View><Text style={{fontSize:20,fontWeight:'800',color:colors.soil}}>My plants</Text><Text style={{color:colors.muted,fontSize:12}}>{plants.length} plant{plants.length===1?'':'s'} · swipe to browse</Text></View></View>
   {plants.length>0&&<Btn small icon="arrow-right" title={plants.length>FRONT_PAGE_PLANTS?`See all ${plants.length}`:'Open'} onPress={()=>navigation.navigate('Plants')}/>}
  </View>
  {plants.length===0?<Pressable accessibilityRole="button" onPress={()=>navigation.navigate('AddPlant')}><View style={{alignItems:'center',gap:10,padding:26,borderRadius:22,borderWidth:2,borderStyle:'dashed',borderColor:colors.section.plants+'80',backgroundColor:colors.paper}}><Icon name="sprout-outline" size={38} color={colors.section.plants}/><Text style={{color:colors.soil,fontWeight:'700'}}>Add your first plant</Text><Text style={{color:colors.muted,textAlign:'center'}}>Start monitoring it and link a Root.esp device whenever you like.</Text></View></Pressable>
   :<ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={242} decelerationRate="fast" contentContainerStyle={{gap:12,paddingRight:4,paddingBottom:4}} style={{marginHorizontal:-16}}>
    <View style={{width:4}}/>
    {plants.slice(0,FRONT_PAGE_PLANTS).map(p=>{const d=describePlant(p);return <PlantTile key={p.PlantID} width={230} plant={p} look={getLook(p)} mood={d.mood} soil={d.soil} onPress={()=>navigation.navigate('PlantDetail',{plantId:p.PlantID})}/>;})}
    <Pressable accessibilityRole="button" accessibilityLabel="Add plant" onPress={()=>navigation.navigate('AddPlant')} style={({pressed})=>({width:150,borderRadius:22,borderWidth:2,borderStyle:'dashed',borderColor:colors.section.plants+'80',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:pressed?colors.mist:'transparent',marginRight:12})}>
     <View style={{width:52,height:52,borderRadius:26,backgroundColor:colors.section.plants,alignItems:'center',justifyContent:'center'}}><Icon name="plus" size={28} color={colors.isDark?'#10281B':'#FFFFFF'}/></View>
     <Text style={{color:colors.soil,fontWeight:'700'}}>Add plant</Text>
    </Pressable>
   </ScrollView>}
 </View></TourTarget>

 <TourTarget id="home.attention"><View style={{gap:12}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:12}}><IconBadge name={attention.length?'alert-circle-outline':'check-circle-outline'} color={attention.length?colors.warning:colors.success} size={32}/><View style={{flex:1}}><Text style={{fontSize:20,fontWeight:'800',color:colors.soil}}>Needs attention</Text><Text style={{color:colors.muted,fontSize:12}}>Sensor-based status, not an AI prediction</Text></View>{attention.length>0&&<View style={{minWidth:30,height:30,paddingHorizontal:8,borderRadius:15,backgroundColor:colors.warning,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.isDark?'#111':'#FFFFFF',fontWeight:'800'}}>{attention.length}</Text></View>}</View>
 {!attention.length?<AllGoodCard text={connected.length?'No issues in the latest measurements. Your plants are comfortable.':'Connect a Root.esp device to start live monitoring.'}/>:attention.map(p=>{const d=describePlant(p);return <AttentionCard key={p.PlantID} plant={p} look={getLook(p)} mood={d.mood} soil={d.soil} onPress={()=>navigation.navigate('PlantDetail',{plantId:p.PlantID})}/>;})}
 </View></TourTarget>
 <AdSlot user={user} index={0} navigate={to=>navigation.navigate(to)}/>
 <TourTarget id="home.actions"><View style={{flexDirection:'row',gap:12,flexWrap:'wrap',marginTop:12}}><Btn icon="chip" title="Devices" outline onPress={()=>navigation.navigate('Devices')}/><Btn icon="bell-outline" title="Notifications" outline onPress={()=>navigation.navigate('Alerts')}/><Btn icon="robot-happy-outline" title="Ask the assistant" outline tone="info" onPress={()=>navigation.navigate('Assistant')}/></View></TourTarget>
 </Screen>;
}
