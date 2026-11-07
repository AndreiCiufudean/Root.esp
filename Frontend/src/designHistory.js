import {kvGet,kvSet} from './store';
import {USE_MOCK} from './api';
const key=user=>`rootesp.design.archive.v1.${USE_MOCK?'demo':'real'}.${user.UserID}`;

// ---- Built-in demo entries (prototype). They stay until the design API is connected. ----
export const EXAMPLE_IMAGES={
 roomUploaded:require('../assets/design/eg-room-uploaded.jpg'),
 roomDesigned:require('../assets/design/eg-room-designed.jpg'),
 potCustom:require('../assets/design/eg-pot-custom.jpg'),
};

export const exampleDesign={
 id:'eg',example:true,title:'eg design',subtitle:'Living room greened for a Romanian climate',mode:'interior',
 material:'Matte ceramic planters, built-in window planter',dimensions:'Window planter approx. 180 × 35 × 40 cm',
 createdAt:'Example · demo design',imageType:'example-interior',
 prompt:'Recommend plants for the Romanian environment and design my room, knowing this is my room.',
 uploaded:'roomUploaded',outcome:'roomDesigned',uploadedAspect:1.5,outcomeAspect:1.5,
 description:'A warm, minimalist living room is layered with plants that suit Romanian homes: hardy herbs and flowering shrubs by the bright window, shade-tolerant foliage away from it, and trailing plants on the lit shelves. Root.esp irrigation lines and soil-moisture sensors are hidden inside the planters, so nothing technical is visible.',
 designNotes:[
  'The long planter under the window gets the most light, so it holds the sun-loving Mediterranean plants.',
  'Shade-tolerant foliage plants sit further into the room, where light is bright but indirect.',
  'Trailing plants soften the floating shelves and draw the eye upward.',
  'Drip lines and Root.esp sensors are built into each planter, with one discreet controller at the end of the window planter.',
 ],
 plants:[
  {en:'Hydrangea',ro:'Hortensie',latin:'Hydrangea macrophylla',role:'Large blue flower heads in the window planter give the room its main splash of colour.',needs:'Bright light with some protection from hot afternoon sun, and evenly moist, slightly acidic soil. Water generously in summer; never let the root ball dry out completely.'},
  {en:'Rosemary',ro:'Rozmarin',latin:'Salvia rosmarinus',role:'Fine, upright evergreen stems add texture and a fresh scent next to the lavender.',needs:'Full sun and gritty, fast-draining soil. Water only when the top layer is dry; it dislikes wet roots, especially in winter.'},
  {en:'Peace Lily',ro:'Spathiphyllum',latin:'Spathiphyllum wallisii',role:'White flowers and glossy leaves next to the window planter bridge the sunny and the shady parts of the room.',needs:'Medium, indirect light and evenly moist soil. It droops when thirsty and recovers quickly after watering; keep away from cold draughts.'},
  {en:'Monstera',ro:'Monstera',latin:'Monstera deliciosa',role:'Big split leaves beside the sofa act as a living sculpture.',needs:'Bright, indirect light and watering when the top 3–5 cm of soil are dry. Likes warmth (18–27 °C) and occasional leaf cleaning.'},
  {en:'Boston Fern',ro:'Ferigă',latin:'Nephrolepis exaltata',role:'Soft, arching fronds on the upper shelf add a lush, airy layer.',needs:'Indirect light, constantly slightly moist soil and higher humidity. Benefits from misting during winter heating season.'},
  {en:'Lavender',ro:'Lavandă',latin:'Lavandula angustifolia',role:'Purple flowering stems add color and a Mediterranean accent.',needs:'Full sun, very well-drained soil, and relatively dry conditions. Better outdoors or on a very sunny balcony.'},
  {en:'Olive Tree',ro:'Măslin',latin:'Olea europaea',role:'Used as the taller sculptural plant, with a woody trunk and slender silver-green leaves.',needs:'Strong direct sunlight, good drainage, and a cool, bright winter rest period. Not reliably winter-hardy outdoors in much of Romania.'},
  {en:'Golden Pothos',ro:'Epipremnum',latin:'Epipremnum aureum',role:'The trailing foliage on the floating shelves creates a natural cascading effect.',needs:'Medium to bright indirect light and watering when the top few centimeters of soil have dried.'},
  {en:'English Ivy',ro:'Iederă',latin:'Hedera helix',role:'Spills over the edge of the window planter and softens its outline.',needs:'Bright, indirect light and cool rooms. Keep soil lightly moist; native to Romania and very tolerant.'},
 ],
 answers:{'Interior style':'Minimalist','Dominant home colors':'White / cream','Types of plants':'Mixed collection','Electronic module preference':'Integrated in the pot','What matters most?':'Both'},
};

// Custom pot: the input is the outcome of "eg design" (the greened living room) and the user asks for the
// Monstera's pot; the outcome is the Root.esp pot render.
export const examplePot={
 id:'eg-pot',example:true,title:'eg pot custom',subtitle:"Custom pot for the Monstera",mode:'plant',
 material:'Matte ceramic',dimensions:'Approx. 34 × 34 × 40 cm (Ø × Ø × H)',createdAt:'Example · demo design',imageType:'example-pot',
 prompt:"Design the Monstera's pot.",
 uploaded:'roomDesigned',outcome:'potCustom',uploadedAspect:1.5,outcomeAspect:0.8,
 description:'A rounded, barrel-shaped pot in warm sand-beige matte ceramic, picked from the living room\'s cream walls and oak tones so the Monstera beside the sofa sits in something that looks like it was always there. The Root.esp module is flush with the front, the water tank hides behind a side panel, and there is nothing technical in sight.',
 designNotes:[
  'Barrel profile: wide in the middle for the Monstera\'s fast-growing roots, slightly narrower rim so the leaves arch out over it.',
  'Sand-beige matte glaze matches the cream and light-oak palette of the room from "eg design".',
  'Root.esp controller sits in a flush square front panel with a single status light, at a height that is easy to reach.',
  'Refillable water reservoir behind the side panel (marked with a drop), so watering never means lifting the plant.',
  'Inner liner with drainage layer and a soil-moisture sensor channel, so the sensor reads the root zone without showing a cable.',
 ],
 plants:[
  {en:'Monstera',ro:'Monstera',latin:'Monstera deliciosa',role:'The plant this pot is made for, standing next to the sofa in the designed living room.',needs:'Bright, indirect light and watering when the top 3–5 cm of soil are dry. Likes warmth (18–27 °C), a chunky, airy potting mix and occasional leaf cleaning. Root.esp waters it from the reservoir when the soil sensor drops below the threshold.'},
 ],
 answers:{'Interior style':'Minimalist','Dominant home colors':'White / cream','Types of plants':'Mixed collection','Electronic module preference':'Integrated in the pot','What matters most?':'Both'},
};
export const EXAMPLES=[exampleDesign,examplePot];
const isExample=r=>EXAMPLES.some(e=>e.id===r.id);

export async function getDesignHistory(user){const rows=await kvGet(key(user),[]);return [...EXAMPLES,...(Array.isArray(rows)?rows.filter(r=>!isExample(r)&&!r.example):[])];}
export async function saveDesignHistory(user,entry){const previous=await getDesignHistory(user);const next=[{...entry,id:`design-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:new Date().toISOString()},...previous.filter(x=>!x.example)].slice(0,40);if(!await kvSet(key(user),next))throw new Error('Could not save design on this device.');return [...EXAMPLES,...next];}

// Examples remain permanently available; only user-created designs can be removed.
export async function deleteDesignHistory(user,id){
 if(EXAMPLES.some(e=>e.id===id))throw new Error('The built-in examples cannot be deleted.');
 const previous=await getDesignHistory(user);
 const own=previous.filter(item=>!item.example);
 const next=own.filter(item=>item.id!==id);
 if(next.length===own.length)throw new Error('Design not found.');
 if(!await kvSet(key(user),next))throw new Error('Could not delete this design on this device.');
 return [...EXAMPLES,...next];
}
