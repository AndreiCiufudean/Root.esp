// The ODBC boundary is explicit: SQL BIT -> boolean, BIGINT -> decimal string,
// UTC datetime2 -> ISO 8601 UTC. Historical local timestamps must be migrated first.
const BIT_COLUMNS=new Set(['IsActive','IsAdmin','IsRead','IsAutomatic','FanStatus','AutomaticWateringEnabled','FanAutomaticEnabled']);
const sqlBoolean=value=>value===true||value===1||value==='1';
function sqlID(value){
 const s=typeof value==='bigint'?value.toString():typeof value==='string'?value:typeof value==='number'&&Number.isSafeInteger(value)?String(value):'';
 return /^[1-9]\d{0,18}$/.test(s)&&BigInt(s)<=9223372036854775807n?s:null;
}
function jsonValue(key,value){
 if(value==null)return value;
 if(BIT_COLUMNS.has(key))return sqlBoolean(value);
 if(typeof value==='bigint')return value.toString();
 if(typeof value==='string'&&/At$/.test(key)&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)){
  const iso=value.replace(' ','T').replace(/(\.\d{3})\d+/,'$1');
  const dated=new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(iso)?iso:iso+'Z');
  return Number.isFinite(dated.getTime())?dated.toISOString():null;
 }
 return value;
}
function normalizeRows(rows){
 if(!Array.isArray(rows))return rows;
 return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,jsonValue(key,value)])));
}
module.exports={sqlBoolean,sqlID,jsonValue,normalizeRows};
