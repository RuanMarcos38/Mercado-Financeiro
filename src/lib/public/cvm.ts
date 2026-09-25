export type CvmCompany={
  cnpj:string;
  corporateName:string;
  tradeName:string;
  status:string;
  cvmCode:string;
};

const URL="https://dados.cvm.gov.br/dados/cia_aberta/CAD/DADOS/cad_cia_aberta.csv";

function splitCsvLine(line:string){
  const out:string[]=[]; let cur=""; let q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"') q=!q;
    else if(ch===";" && !q){out.push(cur);cur="";}
    else cur+=ch;
  }
  out.push(cur);
  return out.map(x=>x.replace(/^"|"$/g,"").trim());
}

export async function getCvmCompanies(search?:string):Promise<CvmCompany[]>{
  const res=await fetch(URL,{next:{revalidate:21600}});
  if(!res.ok) throw new Error(`CVM: HTTP ${res.status}`);
  const text=await res.text();
  const lines=text.split(/\r?\n/).filter(Boolean);
  const header=splitCsvLine(lines[0]);
  const idx=(name:string)=>header.indexOf(name);
  const mapped=lines.slice(1).map(line=>{
    const r=splitCsvLine(line);
    return {
      cnpj:r[idx("CNPJ_CIA")]??"",
      corporateName:r[idx("DENOM_SOCIAL")]??"",
      tradeName:r[idx("DENOM_COMERC")]??"",
      status:r[idx("SIT")]??"",
      cvmCode:r[idx("CD_CVM")]??""
    };
  });
  const q=search?.trim().toLowerCase();
  return (q?mapped.filter(x=>(x.corporateName+" "+x.tradeName+" "+x.cnpj).toLowerCase().includes(q)):mapped).slice(0,100);
}
