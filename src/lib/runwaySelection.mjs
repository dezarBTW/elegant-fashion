export function selectRunway(catalog,previous,limit=6){
 const eligible=catalog.filter(product=>product.id&&product.image);
 if(!previous?.ids?.length)return eligible.slice(0,limit);
 const selected=previous.ids.map(id=>eligible.find(product=>product.id===id)).filter(Boolean);
 const newProducts=eligible.filter(product=>Date.parse(product.created_at)>Date.parse(previous.lastSeenAt||0)&&!selected.some(item=>item.id===product.id));
 for(const product of newProducts.slice().reverse()){
  if(selected.length>=limit){selected.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));selected.pop();}
  selected.unshift(product);
 }
 for(const product of eligible){if(selected.length>=limit)break;if(!selected.some(item=>item.id===product.id))selected.push(product);}
 return selected.slice(0,limit);
}
