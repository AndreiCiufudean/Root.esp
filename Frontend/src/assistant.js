// Offline demo assistant used until the AI chat API is configured (EXPO_PUBLIC_USE_MOCK=false + OPENAI_API_KEY
// on the backend). It answers common plant-care questions from simple rules and the user's own plant list,
// and always says it is a demo so nobody mistakes it for a real AI diagnosis.
import { plantMood, isOnline, displayReading } from './logic';

const has = (t, ...words) => words.some((w) => t.includes(w));

function plantSummary(plants) {
  if (!plants?.length) return 'You have not added any plants yet. Open My Plants and tap "Add plant" to start.';
  return plants.map((p) => {
    const online = p.device ? isOnline(p.device.LastSeenAt) : null;
    const mood = plantMood(p.latest, p.settings, online);
    const soil = p.latest ? `, soil ${displayReading(p.latest.SoilMoisture, '%', 0, 100)}` : '';
    return `• ${p.PlantName}${p.species?.CommonName ? ` (${p.species.CommonName})` : ''}: ${mood.label}${soil}`;
  }).join('\n');
}

export function demoReply(text, plants = []) {
  const t = (text || '').toLowerCase();
  const named = plants.find((p) => t.includes(p.PlantName.toLowerCase()) || (p.species?.CommonName && t.includes(p.species.CommonName.toLowerCase())));
  if (has(t, 'hello', 'hi ', 'hey', 'salut', 'buna')) return 'Hello! I can help with watering, light, pests, repotting and plant choices for your home. What would you like to know?';
  if (named) {
    const online = named.device ? isOnline(named.device.LastSeenAt) : null;
    const mood = plantMood(named.latest, named.settings, online);
    const sp = named.species;
    return `${named.PlantName} is currently: ${mood.label}. ${mood.hint}${sp ? `\n\nCare for ${sp.CommonName}: ${sp.WateringAdvice} Light: ${sp.LightRequirements}. ${sp.CareInstructions}` : ''}`;
  }
  if (has(t, 'my plants', 'how are', 'status', 'overview')) return `Here is how your plants are doing right now:\n${plantSummary(plants)}`;
  if (has(t, 'yellow')) return 'Yellow leaves usually mean one of three things:\n1. Too much water: the soil stays wet and lower leaves turn yellow and soft. Let it dry out and check the drainage hole.\n2. Too little light: pale, yellowing new growth. Move it closer to a window.\n3. Natural ageing: one or two old bottom leaves yellowing is normal.\nRoot.esp soil readings help you tell 1 apart from the others.';
  if (has(t, 'water', 'udare', 'thirsty', 'dry')) return 'A good rule: water when the top 2–3 cm of soil feel dry, then water thoroughly until a little drains out. Succulents and herbs like rosemary prefer drying out more; ferns and peace lilies like evenly moist soil. With a Root.esp device you can set a soil-moisture threshold and let automatic watering handle it.';
  if (has(t, 'light', 'sun', 'lumina', 'dark')) return 'South- and west-facing windows give strong direct sun (lavender, rosemary, olive, succulents). East-facing windows give gentle morning sun (most houseplants). North-facing rooms suit pothos, peace lily, ferns and ivy. In Romanian winters, light drops a lot, so move sun-lovers closer to the glass.';
  if (has(t, 'pest', 'bug', 'insect', 'gnat', 'aphid', 'mite')) return 'Common indoor pests are fungus gnats, aphids and spider mites. Let the topsoil dry between waterings (gnats breed in wet soil), wipe leaves with mild soapy water, and isolate the plant for a week. If it keeps spreading, a garden centre can recommend a suitable treatment.';
  if (has(t, 'repot', 'pot', 'ghiveci')) return 'Repot in spring when roots circle the pot or come out of the drainage hole. Choose a pot only 2–4 cm wider, with a drainage hole, and fresh potting mix. The Design tab can also create a custom planter with space for the Root.esp module.';
  if (has(t, 'romania', 'winter', 'iarna', 'outdoor', 'balcony', 'balcon')) return 'For Romanian homes: hardy outdoor choices include lavender, rosemary (protect in hard frost), ivy and hydrangea. Olive trees and most tropical houseplants should come indoors before frost, ideally to a bright, cool room around 8–12 °C for olives. Keep plants away from radiators during the heating season.';
  if (has(t, 'design', 'room', 'interior', 'decor')) return 'Open the Design tab to upload a photo of your room. The example "eg design" in Design history shows a living room planned with plants suited to Romania, together with each plant\'s needs.';
  if (has(t, 'recommend', 'suggest', 'which plant', 'best plant', 'easy')) return 'Easy, forgiving plants for beginners: golden pothos, snake plant, ZZ plant and peace lily. For a sunny window: rosemary, basil or lavender. For low light: pothos, ivy or a fern. Tell me which room and window direction you have and I can narrow it down.';
  return 'I am the demo assistant, so I can only answer common questions about watering, light, pests, repotting, plant choices and your own plants. Try one of the suggestions, or ask about a plant by name. The full AI assistant becomes available once the AI service is connected.';
}

export const SUGGESTIONS = ['How are my plants doing?', 'Why are my leaves turning yellow?', 'Which plants suit a Romanian winter?', 'How often should I water?', 'Recommend easy plants for beginners'];
