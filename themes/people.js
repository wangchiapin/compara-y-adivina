// 比比看 主題包：人物（50 人）
// 一個主題包 = 項目資料（items）＋ 特徵定義（dims）＋ 幾條「怎麼分組、怎麼說」的規則。
// 遊戲引擎（index.html）與校正工具（calibrate.html）只讀 window.THEME_PACK，自己不含任何人物專用資料。
// 新增主題：複製這支檔案，換掉 items／dims／規則，再用 ?theme=<檔名> 開啟。
window.THEME_PACK={
 id:'people',
 title:['人物','Personas','People'],
 noun:['個人','personas','people'],          // 選單「2 個人」裡的名詞（中／西／英）
 dir:'img/',                                  // 圖片資料夾；每個項目的圖是 <id>.webp
 t2s:{},                                      // 這個主題額外用到、引擎簡體對照表沒有的字（{繁:簡}）
 // 分組：解碼題、連鎖題只會把「同組」的項目放在一起（人物 = 同性別，避免光看外表就猜到答案）
 grp:p=>p.sex,
 // 西班牙語形容詞的陰陽性：0 = 陽性、1 = 陰性
 gnd:p=>p.sex==='F'?1:0,
 // 西班牙語「最…的」前面的冠詞
 art:p=>p.sex==='F'?'la ':'el ',
 // 項目資料。id／name 必填；w、ih = 圖寬高(px)，face = 臉佔全身高的比例（臉部裁切用）；
 // 其餘為特徵值，1–3 = 程度，0 = 校正時標為「不出題」。
 items:[
  {"id":"P01","name":"Noah","sex":"M","age":53,"h":184,"build":2,"muscle":3,"hair":1,"tex":3,"skin":3,"eyes":3,"nose":3,"w":301,"ih":760,"face":0.21},
  {"id":"P02","name":"Diana","sex":"F","age":22,"h":156,"build":1,"muscle":1,"hair":2,"tex":1,"skin":3,"eyes":1,"nose":2,"w":209,"ih":760,"face":0.21},
  {"id":"P03","name":"Helen","sex":"F","age":46,"h":158,"build":3,"muscle":2,"hair":3,"tex":1,"skin":3,"eyes":1,"nose":3,"w":295,"ih":760,"face":0.21},
  {"id":"P04","name":"Jack","sex":"M","age":11,"h":144,"build":2,"muscle":1,"hair":1,"tex":3,"skin":1,"eyes":1,"nose":1,"w":222,"ih":760,"face":0.26},
  {"id":"P05","name":"Paul","sex":"M","age":84,"h":172,"build":2,"muscle":1,"hair":1,"tex":3,"skin":3,"eyes":1,"nose":2,"w":253,"ih":760,"face":0.21},
  {"id":"P06","name":"Max","sex":"M","age":30,"h":169,"build":1,"muscle":1,"hair":1,"tex":3,"skin":2,"eyes":1,"nose":1,"w":216,"ih":760,"face":0.21},
  {"id":"P07","name":"Ian","sex":"M","age":43,"h":178,"build":1,"muscle":1,"hair":1,"tex":0,"skin":3,"eyes":3,"nose":2,"w":234,"ih":760,"face":0.21},
  {"id":"P08","name":"Mia","sex":"F","age":27,"h":159,"build":3,"muscle":1,"hair":1,"tex":3,"skin":3,"eyes":1,"nose":2,"w":270,"ih":760,"face":0.21},
  {"id":"P09","name":"Mark","sex":"M","age":33,"h":185,"build":1,"muscle":1,"hair":2,"tex":1,"skin":1,"eyes":1,"nose":1,"w":219,"ih":760,"face":0.21},
  {"id":"P10","name":"Leo","sex":"M","age":18,"h":182,"build":3,"muscle":3,"hair":1,"tex":3,"skin":1,"eyes":1,"nose":2,"w":328,"ih":760,"face":0.21},
  {"id":"P11","name":"Oliver","sex":"M","age":9,"h":132,"build":2,"muscle":1,"hair":1,"tex":1,"skin":1,"eyes":1,"nose":2,"w":234,"ih":760,"face":0.26},
  {"id":"P12","name":"Nora","sex":"F","age":26,"h":167,"build":3,"muscle":1,"hair":3,"tex":3,"skin":1,"eyes":1,"nose":2,"w":292,"ih":760,"face":0.21},
  {"id":"P13","name":"Eric","sex":"M","age":77,"h":157,"build":1,"muscle":1,"hair":1,"tex":3,"skin":2,"eyes":1,"nose":2,"w":233,"ih":760,"face":0.21},
  {"id":"P14","name":"Adam","sex":"M","age":20,"h":190,"build":2,"muscle":1,"hair":1,"tex":3,"skin":2,"eyes":1,"nose":3,"w":218,"ih":760,"face":0.21},
  {"id":"P15","name":"Sarah","sex":"F","age":6,"h":113,"build":2,"muscle":1,"hair":3,"tex":3,"skin":1,"eyes":1,"nose":2,"w":235,"ih":760,"face":0.29},
  {"id":"P16","name":"Emily","sex":"F","age":55,"h":169,"build":2,"muscle":1,"hair":2,"tex":3,"skin":3,"eyes":1,"nose":2,"w":235,"ih":760,"face":0.21},
  {"id":"P17","name":"Chloe","sex":"F","age":17,"h":162,"build":2,"muscle":1,"hair":2,"tex":1,"skin":3,"eyes":1,"nose":3,"w":221,"ih":760,"face":0.23},
  {"id":"P18","name":"Tom","sex":"M","age":35,"h":174,"build":2,"muscle":1,"hair":1,"tex":1,"skin":2,"eyes":1,"nose":2,"w":231,"ih":760,"face":0.21},
  {"id":"P19","name":"Amy","sex":"F","age":61,"h":157,"build":1,"muscle":1,"hair":1,"tex":3,"skin":2,"eyes":1,"nose":2,"w":232,"ih":760,"face":0.21},
  {"id":"P20","name":"Peter","sex":"M","age":39,"h":163,"build":2,"muscle":2,"hair":1,"tex":3,"skin":2,"eyes":1,"nose":2,"w":272,"ih":760,"face":0.21},
  {"id":"P21","name":"David","sex":"M","age":14,"h":161,"build":2,"muscle":1,"hair":1,"tex":1,"skin":1,"eyes":3,"nose":2,"w":219,"ih":760,"face":0.23},
  {"id":"P22","name":"Emma","sex":"F","age":47,"h":160,"build":3,"muscle":1,"hair":3,"tex":3,"skin":1,"eyes":1,"nose":3,"w":286,"ih":760,"face":0.21},
  {"id":"P23","name":"Eva","sex":"F","age":65,"h":143,"build":2,"muscle":1,"hair":1,"tex":1,"skin":1,"eyes":1,"nose":2,"w":244,"ih":760,"face":0.21},
  {"id":"P24","name":"Maya","sex":"F","age":67,"h":166,"build":2,"muscle":1,"hair":3,"tex":3,"skin":3,"eyes":1,"nose":3,"w":231,"ih":760,"face":0.21},
  {"id":"P25","name":"Olivia","sex":"F","age":8,"h":122,"build":2,"muscle":1,"hair":3,"tex":1,"skin":1,"eyes":1,"nose":1,"w":222,"ih":760,"face":0.29},
  {"id":"P26","name":"Alice","sex":"F","age":41,"h":159,"build":2,"muscle":2,"hair":3,"tex":3,"skin":1,"eyes":1,"nose":2,"w":228,"ih":760,"face":0.21},
  {"id":"P27","name":"Alex","sex":"M","age":68,"h":166,"build":1,"muscle":1,"hair":2,"tex":1,"skin":3,"eyes":1,"nose":2,"w":232,"ih":760,"face":0.21},
  {"id":"P28","name":"Anna","sex":"F","age":36,"h":166,"build":1,"muscle":1,"hair":2,"tex":3,"skin":2,"eyes":1,"nose":1,"w":207,"ih":760,"face":0.21},
  {"id":"P29","name":"Julia","sex":"F","age":42,"h":156,"build":2,"muscle":1,"hair":3,"tex":1,"skin":2,"eyes":1,"nose":1,"w":231,"ih":760,"face":0.21},
  {"id":"P30","name":"Lily","sex":"F","age":13,"h":149,"build":2,"muscle":1,"hair":2,"tex":3,"skin":2,"eyes":1,"nose":2,"w":216,"ih":760,"face":0.23},
  {"id":"P31","name":"Ruby","sex":"F","age":25,"h":167,"build":2,"muscle":1,"hair":3,"tex":1,"skin":1,"eyes":1,"nose":2,"w":247,"ih":760,"face":0.21},
  {"id":"P32","name":"Nick","sex":"M","age":34,"h":172,"build":3,"muscle":1,"hair":2,"tex":1,"skin":1,"eyes":1,"nose":2,"w":314,"ih":760,"face":0.21},
  {"id":"P33","name":"Henry","sex":"M","age":31,"h":171,"build":1,"muscle":1,"hair":2,"tex":3,"skin":1,"eyes":1,"nose":3,"w":230,"ih":760,"face":0.21},
  {"id":"P34","name":"Grace","sex":"F","age":60,"h":159,"build":2,"muscle":1,"hair":3,"tex":3,"skin":3,"eyes":1,"nose":2,"w":236,"ih":760,"face":0.21},
  {"id":"P35","name":"Lucy","sex":"F","age":38,"h":160,"build":3,"muscle":1,"hair":1,"tex":1,"skin":3,"eyes":1,"nose":3,"w":283,"ih":760,"face":0.21},
  {"id":"P36","name":"Carl","sex":"M","age":37,"h":170,"build":2,"muscle":2,"hair":1,"tex":0,"skin":1,"eyes":1,"nose":3,"w":290,"ih":760,"face":0.21},
  {"id":"P37","name":"Liam","sex":"M","age":49,"h":182,"build":3,"muscle":2,"hair":1,"tex":3,"skin":1,"eyes":1,"nose":3,"w":291,"ih":760,"face":0.21},
  {"id":"P38","name":"Dan","sex":"M","age":52,"h":173,"build":3,"muscle":2,"hair":1,"tex":3,"skin":3,"eyes":1,"nose":2,"w":298,"ih":760,"face":0.21},
  {"id":"P39","name":"Rose","sex":"F","age":29,"h":166,"build":2,"muscle":1,"hair":1,"tex":3,"skin":1,"eyes":1,"nose":2,"w":230,"ih":760,"face":0.21},
  {"id":"P40","name":"Kate","sex":"F","age":79,"h":142,"build":3,"muscle":1,"hair":3,"tex":1,"skin":2,"eyes":1,"nose":2,"w":271,"ih":760,"face":0.21},
  {"id":"P41","name":"Kevin","sex":"M","age":56,"h":163,"build":2,"muscle":1,"hair":1,"tex":0,"skin":2,"eyes":1,"nose":2,"w":233,"ih":760,"face":0.21},
  {"id":"P42","name":"Luke","sex":"M","age":73,"h":164,"build":3,"muscle":1,"hair":1,"tex":3,"skin":1,"eyes":1,"nose":2,"w":266,"ih":760,"face":0.21},
  {"id":"P43","name":"Hannah","sex":"F","age":57,"h":156,"build":3,"muscle":1,"hair":1,"tex":1,"skin":1,"eyes":1,"nose":2,"w":273,"ih":760,"face":0.21},
  {"id":"P44","name":"Ryan","sex":"M","age":69,"h":177,"build":2,"muscle":1,"hair":1,"tex":3,"skin":3,"eyes":3,"nose":2,"w":244,"ih":760,"face":0.21},
  {"id":"P45","name":"Sam","sex":"M","age":16,"h":170,"build":3,"muscle":1,"hair":2,"tex":1,"skin":3,"eyes":3,"nose":1,"w":281,"ih":760,"face":0.23},
  {"id":"P46","name":"Hugo","sex":"M","age":48,"h":175,"build":2,"muscle":2,"hair":1,"tex":0,"skin":3,"eyes":1,"nose":2,"w":264,"ih":760,"face":0.21},
  {"id":"P47","name":"Sophia","sex":"F","age":32,"h":165,"build":1,"muscle":1,"hair":2,"tex":3,"skin":3,"eyes":1,"nose":1,"w":219,"ih":760,"face":0.21},
  {"id":"P48","name":"Zoe","sex":"F","age":7,"h":121,"build":1,"muscle":1,"hair":1,"tex":1,"skin":2,"eyes":1,"nose":1,"w":240,"ih":760,"face":0.29},
  {"id":"P49","name":"Jake","sex":"M","age":45,"h":175,"build":2,"muscle":2,"hair":1,"tex":3,"skin":3,"eyes":1,"nose":2,"w":254,"ih":760,"face":0.21},
  {"id":"P50","name":"Ava","sex":"F","age":21,"h":166,"build":3,"muscle":1,"hair":3,"tex":3,"skin":1,"eyes":1,"nose":2,"w":280,"ih":760,"face":0.21}
 ],
 // 特徵定義。name: 老師設定畫面用的名稱（中／西／英）；v: 取值；num: 數字型；thr: 至少差多少才出「比」；near: 差多少以內算「差不多」；
 // crop: 卡片怎麼裁圖（full 全身按真實比例、half 半身、face 臉）；lv: 第幾關開始出現；w: 出現權重；
 // pos／neg: 正反形容詞（中文字、拼音、西、英）；poss: 「的頭髮」這類所屬名詞；unit: 具體差距的單位；
 // eq: 可出「一樣」；same／diff: 可出「差不多／不一樣」；tagA: 卡片上常駐的小標；tagB: 只在要看數字時顯示。
 // 胖瘦、壯不壯、髮質比較主觀：thr:2 = 只有 1 對 3（差很多）才出題（步驟 6-4 討論）
 dims:{
  height:{name:['身高','Estatura','Height'],v:p=>p.h,num:1,thr:8,near:3,crop:'full',lv:1,w:2.5,
    pos:{z:'高',p:'gāo',es:['alto','alta'],en:['tall','taller','tallest']},neg:{z:'矮',p:'ǎi',es:['bajo','baja'],en:['short','shorter','shortest']},
    unit:{t:'公分',p:'gōngfēn'},esU:'cm',enU:'cm',esSame:'la misma estatura',enSame:'are not the same height',same:1,diff:1,
    tagB:p=>[p.h,'cm']},
  age:{name:['年齡','Edad','Age'],v:p=>p.age,num:1,thr:3,near:2,crop:'face',lv:1,w:2,noMas:1,
    pos:{z:'大',p:'dà',es:['mayor','mayor'],en:['old','older','oldest']},neg:{z:'小',p:'xiǎo',es:['menor','menor'],en:['young','younger','youngest']},
    unit:{t:'歲',p:'suì'},esU:'años',enU:'years',esSame:'la misma edad',enSame:'are not the same age',same:1,diff:1,
    tagA:p=>[p.age,'歲']},
  build:{name:['胖瘦','Complexión','Build'],v:p=>p.build,thr:2,crop:'half',lv:1,w:2,eq:1,
    pos:{z:'胖',p:'pàng',es:['gordo','gorda'],en:['heavy','heavier','heaviest']},neg:{z:'瘦',p:'shòu',es:['delgado','delgada'],en:['thin','thinner','thinnest']}},
  hair:{name:['頭髮長短','Largo del pelo','Hair length'],v:p=>p.hair,thr:1,crop:'face',lv:1,w:2.5,eq:1,poss:{z:'頭髮',p:'tóufa',es:'el pelo',en:'hair',be:'is'},
    pos:{z:'長',p:'cháng',es:'largo',en:['long','longer','longest']},neg:{z:'短',p:'duǎn',es:'corto',en:['short','shorter','shortest']},
    esSame:'el pelo del mismo largo',enSame:'do not have the same hair length',same:1},
  eyes:{name:['眼睛大小','Tamaño de ojos','Eye size'],v:p=>p.eyes,thr:2,crop:'face',lv:1,w:1.5,poss:{z:'眼睛',p:'yǎnjing',es:'los ojos',en:'eyes',be:'are'},
    pos:{z:'大',p:'dà',es:'grandes',en:['big','bigger','biggest']},neg:{z:'小',p:'xiǎo',es:'pequeños',en:['small','smaller','smallest']}},
  nose:{name:['鼻子大小','Tamaño de nariz','Nose size'],v:p=>p.nose,thr:2,crop:'face',lv:1,w:1.5,poss:{z:'鼻子',p:'bízi',es:'la nariz',en:'nose',be:'is'},
    pos:{z:'大',p:'dà',es:'grande',en:['big','bigger','biggest']},neg:{z:'小',p:'xiǎo',es:'pequeña',en:['small','smaller','smallest']}},
  muscle:{name:['壯不壯','Fuerza','Muscles'],v:p=>p.muscle,thr:2,crop:'half',lv:2,w:1.5,eq:1,
    pos:{z:'壯',p:'zhuàng',es:['fuerte','fuerte'],en:['strong','stronger','strongest']},neg:null},
  tex:{name:['髮質（直／捲）','Tipo de pelo','Hair type'],v:p=>p.tex,thr:2,crop:'face',lv:2,w:2,eq:1,poss:{z:'頭髮',p:'tóufa',es:'el pelo',en:'hair',be:'is'},
    pos:{z:'捲',p:'juǎn',es:'rizado',en:['curly','curlier','curliest']},neg:{z:'直',p:'zhí',es:'lacio',en:['straight','straighter','straightest']}},
  skin:{name:['膚色','Color de piel','Skin tone'],v:p=>4-p.skin,thr:2,crop:'face',lv:2,w:1.5,poss:{z:'皮膚',p:'pífū',es:'la piel',en:'skin',be:'is'},
    pos:{z:'白',p:'bái',es:'clara',en:['light','lighter','lightest']},neg:{z:'黑',p:'hēi',es:'oscura',en:['dark','darker','darkest']}},
 },
 // 校正工具（calibrate.html）的分頁：k = 特徵欄位、lv = 1／2／3 級各叫什麼
 calib:[
  {k:'hair',name:'頭髮長短',crop:'face',lv:['短','中','長']},
  {k:'tex',name:'髮質',crop:'face',lv:['直','波浪','捲']},
  {k:'build',name:'胖瘦',crop:'half',lv:['瘦','普通','胖']},
  {k:'muscle',name:'壯',crop:'half',lv:['普通','壯','很壯']},
  {k:'skin',name:'膚色',crop:'face',lv:['淺','中','深']},
  {k:'eyes',name:'眼睛',crop:'face',lv:['小','中','大']},
  {k:'nose',name:'鼻子',crop:'face',lv:['小','中','大']},
 ],
};
