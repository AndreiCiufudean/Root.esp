// Flower 2048 rules, kept free of React so they can be tested on their own.
export const BLOOM_STAGES=[
 [2,'seed','Seed','#F3E3C8','#8D6E63'],[4,'sprout','Sprout','#E3F6D5','#558B2F'],[8,'leaf','Leaf','#C9EDB5','#2E7D32'],
 [16,'clover','Clover','#A8E0A0','#1B5E20'],[32,'flower-tulip','Tulip','#FFD6E4','#C2185B'],[64,'flower','Daisy','#FFF1B8','#E65100'],
 [128,'flower-poppy','Poppy','#FFC9BE','#C62828'],[256,'flower-pollen','Big bloom','#E7D7FF','#5E35B1'],[512,'tree','Tree','#B8E6C9','#1B5E20'],
 [1024,'palm-tree','Palm','#BDE8F5','#00695C'],[2048,'white-balance-sunny','Sunny garden','#FFE082','#E65100'],
];
export const stageOf=v=>BLOOM_STAGES.find(s=>s[0]===v)||BLOOM_STAGES[BLOOM_STAGES.length-1];
export const N=4;
const emptyBoard=()=>Array.from({length:N},()=>Array(N).fill(0));
// Pure move logic (exported for tests). dir: 'left' | 'right' | 'up' | 'down'.
export function slideBoard(board,dir){
 const get=(r,c)=>dir==='left'?board[r][c]:dir==='right'?board[r][N-1-c]:dir==='up'?board[c][r]:board[N-1-c][r];
 const out=emptyBoard();let moved=false,gained=0,best=0;
 for(let r=0;r<N;r++){
  const line=[];for(let c=0;c<N;c++){const v=get(r,c);if(v)line.push(v);}
  const merged=[];for(let i=0;i<line.length;i++){if(line[i]===line[i+1]){const v=line[i]*2;merged.push(v);gained+=v;best=Math.max(best,v);i++;}else merged.push(line[i]);}
  for(let c=0;c<N;c++){const v=merged[c]||0;
   const [rr,cc]=dir==='left'?[r,c]:dir==='right'?[r,N-1-c]:dir==='up'?[c,r]:[N-1-c,r];
   out[rr][cc]=v;if(board[rr][cc]!==v)moved=true;}
 }
 return {board:out,moved,gained,best};
}
export function addSeed(board,rand=Math.random){
 const free=[];board.forEach((row,r)=>row.forEach((v,c)=>{if(!v)free.push([r,c]);}));
 if(!free.length)return board;
 const [r,c]=free[Math.floor(rand()*free.length)];const next=board.map(x=>[...x]);next[r][c]=rand()<0.9?2:4;return next;
}
export const canMove=b=>['left','right','up','down'].some(d=>slideBoard(b,d).moved);
export const bestTile=b=>Math.max(...b.flat());
export const bloomStars=best=>best>=128?3:best>=64?2:best>=32?1:0;
export const newGame=()=>addSeed(addSeed(emptyBoard()));

