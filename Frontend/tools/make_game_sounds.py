# Original synthesized effects for Root.esp. No sampled or copyrighted recordings.
import math,random,wave,struct,os
from pathlib import Path
root=str(Path(__file__).resolve().parents[1] / 'assets' / 'sounds')
random.seed(2727)
fs=22050
spec={
'click':(.09,[(760,.13,0.03),(1100,.06,0)]),
'pop':(.19,[(520,.19,0),(780,.10,.06)]),
'success':(.55,[(523,.15,0),(659,.15,.12),(784,.13,.25)]),
'error':(.28,[(320,.10,0),(270,.1,.12)]),
'bell':(.71,[(659,.10,0),(988,.13,.04),(1319,.09,.09)]),
'water':(.33,[(640,.12,0),(790,.1,.045),(520,.06,.16)]),
}
for name,(duration,notes) in spec.items():
 n=int(duration*fs);a=[]
 for k in range(n):
  t=k/fs
  v=0
  for freq,amp,start in notes:
   tt=t-start
   if tt<0:continue
   env=math.exp(-tt*(11 if name in ('click','pop') else 6))*(1-math.exp(-tt*130))
   f=freq*(1+(.06*math.exp(-tt*20) if name in ('pop','water') else 0))
   v+=amp*env*math.sin(2*math.pi*f*tt)
  if name=='water':v+=.018*math.exp(-t*11)*(random.random()*2-1)
  a.append(int(max(-1,min(1,v))*32767))
 with wave.open(os.path.join(root,name+'.wav'),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(fs);w.writeframes(struct.pack('<%dh'%len(a),*a))
 print(name,os.stat(os.path.join(root,name+'.wav')).st_size)
