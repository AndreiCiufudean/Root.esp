import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,Image,ActivityIndicator,Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {api,USE_MOCK} from '../api';
import {useAuth} from '../auth';
import {useIsFocused} from '@react-navigation/native';
import {QuestionnaireSheet,loadAnswers,saveAnswers,wasOffered,markOffered,QUESTIONS} from '../questionnaire';
import {getDesignHistory,saveDesignHistory,deleteDesignHistory,EXAMPLE_IMAGES} from '../designHistory';
import {Screen,Card,Btn,Icon,IconBadge,Pill} from '../ui';
import {AdSlot} from '../deviceNudge';
import {TourTarget} from '../tour';
import {colors,inputStyle} from '../theme';
const OPTIONS=['Matte ceramic','Glazed ceramic','3D-printed prototype'];
const MODES=[['interior','Interior visualization','sofa-outline'],['plant','Plant & pot design','flower-pollen-outline']];
const ACCENT=()=>colors.section.design;
const PRESET_IMAGE=require('../../assets/design/example-2.png');
// Outcome image of a saved design (built-in examples use bundled pictures).
const imageFor=item=>item.example&&item.outcome?EXAMPLE_IMAGES[item.outcome]:item.imageType==='preset'?PRESET_IMAGE:item.imageBase64?{uri:`data:${item.mimeType||'image/png'};base64,${item.imageBase64}`}:null;
// What the user uploaded for a saved design.
const inputFor=item=>item.uploaded?EXAMPLE_IMAGES[item.uploaded]:item.photoUri?{uri:item.photoUri}:null;

function Placeholder({label}){
 return <View style={{width:'100%',aspectRatio:1.5,borderRadius:12,borderWidth:1.5,borderStyle:'dashed',borderColor:colors.line,backgroundColor:colors.mist,alignItems:'center',justifyContent:'center',gap:8}}>
  <Icon name="image-off-outline" size={32} color={colors.muted}/><Text style={{color:colors.muted}}>{label}</Text>
 </View>;
}
// Every design picture sits whole (never cropped) on the same warm "photo mat", in frames of one size,
// so room photos and pot renders look like one calm gallery.
const MAT='#F3EEEA';
export function PhotoFrame({source,size,radius=14,pad=6}){
 const box=size?{width:size*4/3,height:size}:{width:'100%',aspectRatio:4/3,maxHeight:460};
 return <View style={[box,{alignSelf:'center',borderRadius:radius,backgroundColor:MAT,padding:pad,borderWidth:1,borderColor:colors.isDark?'#00000055':'#E4DCD3'}]}>
  <Image source={source} resizeMode="contain" style={{flex:1,width:'100%',borderRadius:Math.max(4,radius-6)}}/>
 </View>;
}
const Picture=({source})=><View style={{width:'100%',maxWidth:560,alignSelf:'center'}}><PhotoFrame source={source}/></View>;
function Labelled({icon,label,color,children}){
 return <View style={{gap:8}}><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Icon name={icon} size={16} color={color}/><Text style={{color,fontWeight:'700',fontSize:12,letterSpacing:1}}>{label.toUpperCase()}</Text></View>{children}</View>;
}
// Chip used for the workflow and material choices. Locked chips (saved designs) cannot be changed.
function Choice({selected,locked,onPress,icon,text,radius=10}){
 const accent=ACCENT();
 return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled:locked}} disabled={locked} onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:8,padding:icon?12:9,borderWidth:1.5,borderRadius:radius,borderColor:selected?accent:colors.line,backgroundColor:selected?accent+'1A':colors.paper,opacity:locked&&!selected?0.45:1}}>
  {icon&&<Icon name={icon} size={18} color={selected?accent:colors.muted}/>}<Text style={{color:colors.soil,fontWeight:selected?'700':'400'}}>{text}</Text>{locked&&selected&&<Icon name="check" size={16} color={accent}/>}
 </Pressable>;
}
// The personalisation answers (welcome questions) the designer uses.
function Answers({answers,locked,onEdit}){
 const entries=Object.entries(answers||{}).filter(([,v])=>v);
 const accent=ACCENT();
 return <View style={{gap:8,marginTop:12}}>
  <Text style={{color:colors.muted}}>{locked?'Answers used for this design':'Your design answers'}</Text>
  {entries.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{entries.map(([k,v])=><View key={k} style={{borderRadius:10,borderWidth:1,borderColor:colors.line,backgroundColor:colors.field,paddingHorizontal:10,paddingVertical:7}}>
   <Text style={{color:colors.muted,fontSize:11}}>{k}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}>{locked&&<Icon name="check-circle" size={13} color={accent}/>}<Text style={{color:colors.soil,fontWeight:'700',fontSize:13}}>{String(v)}</Text></View>
  </View>)}</View>:<Text style={{color:colors.muted,fontSize:12}}>No answers yet. They are optional: answer a few quick questions to tailor new designs to your home.</Text>}
  {!locked&&onEdit&&<Btn small outline tone="design" icon={entries.length?'pencil-outline':'clipboard-text-outline'} title={entries.length?'Edit answers':`Answer ${QUESTIONS.length} quick questions`} style={{alignSelf:'flex-start'}} onPress={onEdit}/>}
 </View>;
}

export default function DesignScreen({navigation}){
 const {user}=useAuth();
 const [history,setHistory]=useState([]),[viewing,setViewing]=useState(null),[deleting,setDeleting]=useState(false),[saving,setSaving]=useState(false);
 const [mode,setMode]=useState('interior'),[photo,setPhoto]=useState(null),[prefs,setPrefs]=useState({}),[description,setDescription]=useState(''),[material,setMaterial]=useState(OPTIONS[0]),[dimensions,setDimensions]=useState('');
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[order,setOrder]=useState(null),[requests,setRequests]=useState([]);
 const accent=ACCENT();
 useEffect(()=>{loadAnswers(user).then(setPrefs).catch(()=>{});getDesignHistory(user).then(setHistory).catch(()=>{});if(!USE_MOCK)api.getDesignRequests().then(setRequests).catch(()=>{});},[user.UserID]);
 const pick=async()=>{try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){setError('Photo permission denied.');return;}const res=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:0.75,base64:true});if(res.canceled)return;const a=res.assets?.[0];if(!a?.base64)return setError('Could not read selected image.');if(a.base64.length>8*1024*1024)return setError('Please choose a smaller image (under 6 MB).');setPhoto({uri:a.uri,base64:a.base64,mimeType:a.base64.startsWith('iVBOR')?'image/png':'image/jpeg'});setResult(null);setError('');}catch(e){setError(e.message);}};
 const generate=async()=>{if(!photo)return setError('Select a room or plant photo first.');setBusy(true);setError('');setOrder(null);try{const r=await api.generateDesign({mode,imageBase64:photo.base64,mimeType:photo.mimeType,preferences:prefs,description,material,dimensions});setResult(r);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const preset=()=>{setResult({preset:true,imageType:'preset',description:mode==='plant'?'Sculptural matte ceramic planter with integrated Root.esp module space.':'Neutral interior arrangement with two contemporary ceramic planters.',specifications:{material,dimensions:dimensions||'22 × 20 cm',workflow:mode}});setError('');};
 const save=async()=>{if(!result)return;setSaving(true);setError('');try{
  await saveDesignHistory(user,{title:result.preset?'Preset design':`AI ${mode} concept`,subtitle:mode==='interior'?'Interior visualization':'Plant & pot design',mode,material,dimensions:dimensions||'22 × 20 cm',description:result.description,prompt:description||null,answers:prefs,imageType:result.preset?'preset':'ai',imageBase64:result.imageBase64||null,mimeType:result.mimeType||'image/png',
   // the chosen photo's local file (native only; web blob links do not survive a reload)
   photoUri:Platform.OS!=='web'&&photo?.uri?photo.uri:null});setHistory(await getDesignHistory(user));
 }catch(e){setError(e.message);}finally{setSaving(false);}};
 const request=async()=>{if(!result?.designId)return;setBusy(true);setError('');try{const r=await api.requestManufacturing({designId:result.designId,mode,material,dimensions,notes:description,designImageBase64:result.imageBase64,designImageMimeType:result.mimeType,specifications:result.specifications||{}});setOrder(r);setRequests(old=>[{RequestID:r.requestId,Status:r.status,Material:material,Workflow:mode},...old]);}catch(e){setError(e.message);}finally{setBusy(false);}};
 const remove=async()=>{try{setHistory(await deleteDesignHistory(user,viewing.id));setViewing(null);setDeleting(false);}catch(e){setError(e.message);}};
 // The optional questionnaire is offered once, only after the person has looked at the designer:
 // when they close a design they opened from history, or after a while on this page.
 const [quiz,setQuiz]=useState(false),[offer,setOffer]=useState(false);const focused=useIsFocused();const lookedRef=React.useRef(false);
 const maybeOffer=async()=>{if(offer||Object.keys(prefs||{}).length)return;if(await wasOffered(user))return;setOffer(true);};
 useEffect(()=>{if(!focused)return undefined;const t=setTimeout(maybeOffer,20000);return()=>clearTimeout(t);},[focused,prefs]);
 useEffect(()=>{if(viewing)lookedRef.current=true;else if(lookedRef.current)maybeOffer();},[viewing]);
 const closeOffer=()=>{setOffer(false);markOffered(user);};
 const saveQuiz=async a=>{await saveAnswers(user,a);setPrefs(a);setQuiz(false);closeOffer();};
 const openItem=item=>{setDeleting(false);setError('');setViewing(v=>v?.id===item.id?null:item);};
 // Copy a saved design's answers into the editable designer to start a new variation.
 const reuse=()=>{const v=viewing;setMode(v.mode==='interior'?'interior':'plant');setMaterial(OPTIONS.includes(v.material)?v.material:OPTIONS[0]);setDimensions(v.dimensions&&v.dimensions!=='To be confirmed'?v.dimensions:'');setDescription(v.prompt||'');setPhoto(null);setResult(null);setViewing(null);};

 // The designer is the same for new and saved designs; a saved design fills every answer and locks it.
 const ro=!!viewing;
 const vMode=ro?viewing.mode:mode;
 const vMaterial=ro?viewing.material:material;
 const vDims=ro?(viewing.dimensions||''):dimensions;
 const vDesc=ro?(viewing.prompt||''):description;
 const vPhoto=ro?inputFor(viewing):photo?{uri:photo.uri}:null;
 const vAnswers=ro?viewing.answers:prefs;
 const step=(n,title,icon)=><View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10}}><View style={{width:28,height:28,borderRadius:14,backgroundColor:accent,alignItems:'center',justifyContent:'center'}}>{ro?<Icon name="check" size={16} color={colors.isDark?'#1F1433':'#FFFFFF'}/>:<Text style={{color:colors.isDark?'#1F1433':'#FFFFFF',fontWeight:'700'}}>{n}</Text>}</View><Text style={{fontWeight:'700',color:colors.soil,fontSize:16,flex:1}}>{title}</Text><Icon name={icon} size={20} color={accent}/></View>;
 const lockedInput=ro?{backgroundColor:colors.mist,color:colors.soil}:null;

 return <Screen><View style={{flexDirection:'row',alignItems:'center',gap:12}}><IconBadge name="palette-outline" color={accent} size={44}/><View style={{flex:1}}><Text style={{fontSize:30,fontWeight:'700',color:colors.soil}}>Design studio</Text><Text style={{color:colors.muted}}>Personalized planters and interior concepts, powered by optional AI.</Text></View></View>
 <TourTarget id="design.history"><Card><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="history" size={20} color={accent}/><Text style={{fontWeight:'700',color:colors.soil,fontSize:18}}>Design history</Text></View><Text style={{color:colors.muted,fontSize:12}}>{history.length} item{history.length===1?'':'s'}</Text></View>
 <Text style={{color:colors.muted,marginTop:6,marginBottom:6}}>Tap a design to open it in the designer with its answers filled in. Saved locally per account on this device.</Text>
 {history.map(item=>{const img=imageFor(item);const on=viewing?.id===item.id;return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:on}} accessibilityLabel={`Open ${item.title}`} onPress={()=>openItem(item)} style={({pressed})=>[{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,paddingHorizontal:on?10:0,marginHorizontal:on?-10:0,borderRadius:on?12:0,borderTopWidth:on?0:1,borderColor:colors.line,backgroundColor:on?accent+'1A':'transparent'},pressed&&{opacity:.7}]}>
  {img?<PhotoFrame source={img} size={58} radius={10} pad={3}/>:<View style={{width:77,height:58,borderRadius:10,backgroundColor:colors.mist,alignItems:'center',justifyContent:'center'}}><Icon name={item.mode==='interior'?'sofa-outline':'flower-pollen-outline'} size={24} color={accent}/></View>}
  <View style={{flex:1,gap:2}}><View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}><Text style={{fontWeight:'700',color:colors.soil}}>{item.title}</Text>{item.example&&<Text style={{fontSize:11,color:colors.info,fontWeight:'700'}}>EXAMPLE</Text>}</View><Text style={{color:colors.muted,fontSize:13}} numberOfLines={1}>{item.subtitle||item.description}</Text><Text style={{color:colors.muted,fontSize:11}}>{item.example?item.createdAt:new Date(item.createdAt).toLocaleString()}</Text></View>
  <Icon name={on?'eye':'chevron-right'} size={22} color={on?accent:colors.muted}/>
 </Pressable>;})}
 </Card></TourTarget>

 <AdSlot user={user} index={2} navigate={to=>navigation.navigate(to)}/>
 {offer&&!ro&&<View style={{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap',backgroundColor:colors.paper,borderRadius:16,borderWidth:1.5,borderColor:accent,padding:16}}>
  <IconBadge name="clipboard-text-outline" color={accent} size={40}/>
  <View style={{flex:1,minWidth:180}}><Text style={{color:colors.soil,fontWeight:'700',fontSize:16}}>Want designs that fit your home?</Text><Text style={{color:colors.muted}}>{QUESTIONS.length} quick questions about your style and plants. Optional, about a minute.</Text></View>
  <View style={{flexDirection:'row',gap:8}}><Btn small outline tone="muted" title="Not now" onPress={closeOffer}/><Btn small tone="design" icon="arrow-right" title="Answer" onPress={()=>setQuiz(true)}/></View>
 </View>}
 <QuestionnaireSheet visible={quiz} initial={prefs} onClose={()=>{setQuiz(false);closeOffer();}} onSave={saveQuiz}/>

 {ro&&<View style={{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap',backgroundColor:accent+(colors.isDark?'2E':'14'),borderRadius:14,borderWidth:1,borderColor:accent+'66',padding:14}}>
  <Icon name="history" size={22} color={accent}/>
  <View style={{flex:1,minWidth:180}}><Text style={{color:colors.soil,fontWeight:'700'}}>{viewing.title}{viewing.subtitle?` · ${viewing.subtitle}`:''}</Text><Text style={{color:colors.muted,fontSize:13}}>Saved design: every answer below is filled in as it was when this design was made.</Text></View>
  <Btn small outline tone="design" icon="content-copy" title="Start from these answers" onPress={reuse}/>
  <Btn small tone="design" icon="close" title="Close" onPress={()=>{setViewing(null);setDeleting(false);}}/>
 </View>}

 <TourTarget id="design.workflow"><Card>{step(1,'Choose a design workflow','gesture-tap-button')}<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{MODES.map(([v,t,ic])=><Choice key={v} icon={ic} text={t} selected={vMode===v} locked={ro} onPress={()=>{setMode(v);setResult(null);}}/>)}</View></Card></TourTarget>

 <TourTarget id="design.photo"><Card>{step(2,'Reference photo','camera-outline')}
  {ro?<Labelled icon="account-outline" label="Uploaded by user" color={colors.muted}>{vPhoto?<Picture source={vPhoto}/>:<Placeholder label="No photo was saved with this design"/>}</Labelled>
  :<><Text style={{color:colors.muted,marginBottom:12}}>{mode==='interior'?'Upload an interior photo.':'Upload your existing plant.'} Photos are transmitted to the configured AI provider only when you choose Generate.</Text><Btn icon="image-plus" title="Choose photograph" outline tone="design" onPress={pick}/>{photo&&<View style={{marginTop:14}}><Picture source={{uri:photo.uri}}/></View>}</>}
 </Card></TourTarget>

 <Card>{step(3,'Production preferences','tune-variant')}<Text style={{color:colors.muted}}>Material</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8}}>{OPTIONS.map(t=><Choice key={t} text={t} radius={8} selected={vMaterial===t} locked={ro} onPress={()=>setMaterial(t)}/>)}{ro&&!OPTIONS.includes(vMaterial)&&!!vMaterial&&<Choice text={vMaterial} radius={8} selected locked/>}</View>
  <TextInput value={vDims} editable={!ro} onChangeText={setDimensions} placeholder="Approximate dimensions (cm), optional" placeholderTextColor={colors.muted} style={[inputStyle,{marginTop:8},lockedInput]}/>
  {ro&&!!vDesc?<View style={{marginTop:10,gap:6}}><Text style={{color:colors.muted}}>What the user asked for</Text><View style={{alignSelf:'flex-end',maxWidth:'92%',backgroundColor:colors.fern,borderRadius:14,borderBottomRightRadius:4,padding:12}}><Text style={{color:colors.onFern,lineHeight:20}}>“{vDesc}”</Text></View></View>
  :<TextInput value={vDesc} editable={!ro} onChangeText={setDescription} placeholder="Describe the desired arrangement, shape or finish" multiline placeholderTextColor={colors.muted} style={[inputStyle,{marginTop:10,minHeight:74},lockedInput]}/>}
  <Answers answers={vAnswers} locked={ro} onEdit={()=>setQuiz(true)}/>
  {!ro&&<><Text style={{color:colors.muted,fontSize:12,marginVertical:12}}>Your onboarding preferences are applied when available. Suggested dimensions are not engineering-certified.</Text><Btn icon="shape-outline" title="Use preset design (offline)" outline disabled={busy} onPress={preset}/><View style={{height:9}}/><Btn icon="creation" tone="design" title={busy?'Generating…':'Generate visualization'} disabled={!photo||busy||USE_MOCK} onPress={generate}/>{USE_MOCK&&<Text style={{color:colors.muted,marginTop:10}}>Prototype: AI design is not connected yet. Open the examples in Design history to see what a finished design looks like.</Text>}</>}
 </Card>

 {busy&&<ActivityIndicator color={accent} size="large"/>}{!!error&&<Card style={{borderColor:colors.danger}}><Text style={{color:colors.danger}}>{error}</Text></Card>}

 {ro?<SavedResult item={viewing} deleting={deleting} setDeleting={setDeleting} onDelete={remove}/>
 :result&&<Card><Text style={{fontSize:18,fontWeight:'700',color:colors.soil}}>{result.preset?'Preset concept · Offline':'Generated concept · AI visualization'}</Text><Text style={{color:colors.muted,marginVertical:8}}>This is a design proposal, not a validated production drawing.</Text>{result.preset&&<Picture source={PRESET_IMAGE}/>}{result.imageBase64&&<Picture source={{uri:`data:${result.mimeType||'image/png'};base64,${result.imageBase64}`}}/>}<Text style={{color:colors.soil,marginVertical:10}}>{result.description}</Text><Text style={{color:colors.muted,marginBottom:12}}>Production requires verification of dimensions, drainage, water containment, electronics clearance and material durability by the manufacturer.</Text><Btn icon="content-save-outline" title={saving?'Saving…':'Save to design history'} disabled={saving} outline onPress={save}/>{!result.preset&&<View style={{marginTop:12}}><Btn icon="factory" title="Submit for manufacturing review" onPress={request} disabled={busy}/></View>}{result.preset&&<Text style={{color:colors.muted,fontSize:12,marginTop:8}}>Preset is illustrative only. Manufacturing review requires a real generated concept.</Text>}</Card>}
 {!ro&&requests.length>0&&<Card><Text style={{fontWeight:'700',color:colors.soil,marginBottom:8}}>Manufacturing reviews</Text>{requests.map(x=><View key={x.RequestID} style={{paddingVertical:10,borderTopWidth:1,borderColor:colors.line}}><Text style={{color:colors.soil}}>Request #{x.RequestID} · {x.Material}</Text><Text style={{color:colors.muted}}>Status: {x.Status}</Text></View>)}</Card>}
 {!ro&&order&&<Card><Text style={{color:colors.soil,fontWeight:'700'}}>Review request #{order.requestId} submitted</Text><Text style={{color:colors.muted}}>Status: {order.status}. A manufacturer must approve the design before production. No payment or automatic order has been placed.</Text></Card>}
 </Screen>;
}

// The result card of a saved design: the same place a new design's result appears, with the full outcome.
function SavedResult({item,deleting,setDeleting,onDelete}){
 const accent=ACCENT();const outcome=imageFor(item);
 return <Card style={{gap:16}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><Text style={{fontSize:18,fontWeight:'700',color:colors.soil,flex:1}}>{item.imageType==='preset'?'Preset concept · Offline':item.example?'Design result':'Generated concept · AI visualization'}</Text>{item.example&&<Pill text="Demo example" tone="info" icon="star-outline"/>}<Pill text={item.mode==='interior'?'Interior design':'Pot design'} tone="muted" icon={item.mode==='interior'?'sofa-outline':'flower-pollen-outline'}/></View>
  <Labelled icon="palette-outline" label={item.example?'Outcome by designer':'Design outcome'} color={accent}>
   {outcome?<Picture source={outcome}/>:<Placeholder label="No image saved"/>}
   <Text style={{color:colors.soil,lineHeight:22}}>{item.description}</Text>
  </Labelled>
  {item.designNotes?.length>0&&<View style={{gap:8}}><Text style={{fontWeight:'700',color:colors.soil,fontSize:16}}>Design choices</Text>{item.designNotes.map((n,i)=><View key={i} style={{flexDirection:'row',gap:8}}><Icon name="check" size={18} color={accent}/><Text style={{color:colors.soil,flex:1,lineHeight:20}}>{n}</Text></View>)}</View>}
  {item.plants?.length>0&&<View style={{gap:10}}>
   <Text style={{fontWeight:'700',color:colors.soil,fontSize:16}}>{item.plants.length===1?'The plant and its needs':'Plants in this design and their needs'}</Text>
   {item.plants.map((p,i)=><View key={p.latin} style={{backgroundColor:colors.mist,borderRadius:12,padding:14,gap:6}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <View style={{width:28,height:28,borderRadius:14,backgroundColor:colors.section.plants,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.isDark?'#10281B':'#FFFFFF',fontWeight:'700'}}>{i+1}</Text></View>
     <View style={{flex:1}}><Text style={{color:colors.soil,fontWeight:'700',fontSize:15}}>{p.en}{p.ro!==p.en?` — ${p.ro}`:''}</Text><Text style={{color:colors.muted,fontStyle:'italic'}}>{p.latin}</Text></View>
    </View>
    <Text style={{color:colors.soil,lineHeight:20}}>{p.role}</Text>
    <View style={{flexDirection:'row',gap:6,alignItems:'flex-start'}}><Icon name="water-outline" size={16} color={colors.info} style={{marginTop:2}}/><Text style={{color:colors.soil,flex:1,lineHeight:20}}><Text style={{fontWeight:'700'}}>Needs: </Text>{p.needs}</Text></View>
   </View>)}
  </View>}
  <Text style={{color:colors.muted,fontSize:12}}>Material: {item.material} · Size: {item.dimensions}</Text>
  {!item.example&&(deleting?<View style={{flexDirection:'row',gap:12,alignItems:'center',flexWrap:'wrap'}}><Text style={{color:colors.soil}}>Delete this saved design?</Text><Btn small tone="danger" title="Delete" onPress={onDelete}/><Btn small outline title="Cancel" onPress={()=>setDeleting(false)}/></View>:<Btn small outline icon="delete-outline" title="Remove from history" onPress={()=>setDeleting(true)}/>)}
 </Card>;
}
