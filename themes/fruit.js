// 比比看 主題包：水果（32 種）
// 結構同 people.js；差別：沒有「性別」分組、卡片圖用真實大小比例（scale）、西／英語名稱要帶冠詞（nm）。
// 資料來源：Ben 2026-11-02 確認的水果表（大小 cm、重量 g、甜／酸 1–3）。
window.THEME_PACK={
 id:'fruit',
 title:['水果','Frutas','Fruits'],
 noun:['個水果','frutas','fruits'],
 nounPy:' ge shuǐguǒ',                           // 「三個水果」的拼音
 dir:'img/fruit/',
 t2s:{"蘋":"苹","檸":"柠","鳳":"凤","蓮":"莲","霧":"雾","釋":"释","槤":"莲","龍":"龙","櫻":"樱","藍":"蓝","輕":"轻","個":"个"},
 // 水果一眼就認得，「看句子找人」「連鎖解碼」（藏名字、靠句子猜哪個是誰）沒有意義，關掉
 noTypes:['decode','chain'],
 grp:p=>'f',
 gnd:p=>p.g,                                    // 西語陰陽性：1 = 陰性（la）、0 = 陽性（el）
 art:p=>p.g?'la ':'el ',
 // 西／英語名稱（帶冠詞）：cap = 放句首要大寫
 nm:(p,l,cap)=>{const t=l==='es'?(p.g?'la ':'el ')+p.es:'the '+p.en;return cap?t.charAt(0).toUpperCase()+t.slice(1):t;},
 // 「誰」→「哪一個」
 qw:{z:'哪一個',p:'nǎ yí ge',es:'cuál',Es:'Cuál',en:'which one',En:'Which one',whom:'which one'},
 // 卡片上畫「真實大小」時，每個項目最長邊的公分數（含梗、葉子）
 scale:p=>p.len,
 adjOk:['size','weight','long'],               // 「選形容詞」題只用有正反兩個形容詞的特徵
 // id 圖檔名；name 中文；py 拼音；es／en 西英名稱（不含冠詞）；g 西語陰陽；size 大小(公分，圓的看直徑、長的看長)；weight 重量(公克)；
 // long 長度(公分，0 = 不是長形水果、不出「長短」題)；sweet／sour 甜／酸 1–3；len 圖上最長邊的真實公分數；w／ih 圖寬高(px)
 items:[
  {"id":"apple","name":"蘋果","py":"píngguǒ","es":"manzana","en":"apple","g":1,"size":8,"weight":250,"long":0,"sweet":2,"sour":2,"len":9,"w":420,"ih":480},
  {"id":"banana","name":"香蕉","py":"xiāngjiāo","es":"banana","en":"banana","g":1,"size":18,"weight":150,"long":18,"sweet":3,"sour":1,"len":20,"w":480,"ih":472},
  {"id":"watermelon","name":"西瓜","py":"xīguā","es":"sandía","en":"watermelon","g":1,"size":25,"weight":4000,"long":0,"sweet":2,"sour":1,"len":27,"w":415,"ih":480},
  {"id":"grapes","name":"葡萄","py":"pútáo","es":"racimo de uvas","en":"bunch of grapes","g":0,"size":18,"weight":400,"long":18,"sweet":3,"sour":2,"len":20,"w":350,"ih":480},
  {"id":"strawberry","name":"草莓","py":"cǎoméi","es":"fresa","en":"strawberry","g":1,"size":4,"weight":20,"long":4,"sweet":2,"sour":2,"len":5,"w":385,"ih":480},
  {"id":"mandarin","name":"橘子","py":"júzi","es":"mandarina","en":"mandarin","g":1,"size":7,"weight":130,"long":0,"sweet":3,"sour":2,"len":7,"w":450,"ih":480},
  {"id":"lemon","name":"檸檬","py":"níngméng","es":"limón","en":"lemon","g":0,"size":7,"weight":120,"long":7,"sweet":1,"sour":3,"len":8,"w":407,"ih":480},
  {"id":"pineapple","name":"鳳梨","py":"fènglí","es":"piña","en":"pineapple","g":1,"size":22,"weight":1500,"long":22,"sweet":3,"sour":3,"len":28,"w":281,"ih":480},
  {"id":"mango","name":"芒果","py":"mángguǒ","es":"mango","en":"mango","g":0,"size":12,"weight":400,"long":12,"sweet":3,"sour":1,"len":12,"w":412,"ih":480},
  {"id":"cherry","name":"櫻桃","py":"yīngtáo","es":"cereza","en":"cherry","g":1,"size":3,"weight":8,"long":0,"sweet":2,"sour":2,"len":7,"w":480,"ih":468},
  {"id":"papaya","name":"木瓜","py":"mùguā","es":"papaya","en":"papaya","g":1,"size":20,"weight":900,"long":20,"sweet":3,"sour":1,"len":22,"w":408,"ih":480},
  {"id":"guava","name":"芭樂","py":"bālè","es":"guayaba","en":"guava","g":1,"size":9,"weight":250,"long":0,"sweet":2,"sour":1,"len":9,"w":387,"ih":480},
  {"id":"waxapple","name":"蓮霧","py":"liánwù","es":"manzana de agua","en":"wax apple","g":1,"size":7,"weight":130,"long":0,"sweet":1,"sour":1,"len":8,"w":414,"ih":480},
  {"id":"pear","name":"水梨","py":"shuǐlí","es":"pera asiática","en":"Asian pear","g":1,"size":10,"weight":450,"long":0,"sweet":2,"sour":1,"len":10,"w":460,"ih":480},
  {"id":"peach","name":"桃子","py":"táozi","es":"durazno","en":"peach","g":0,"size":7,"weight":200,"long":0,"sweet":3,"sour":1,"len":8,"w":431,"ih":480},
  {"id":"persimmon","name":"柿子","py":"shìzi","es":"caqui","en":"persimmon","g":0,"size":8,"weight":250,"long":0,"sweet":3,"sour":1,"len":8,"w":480,"ih":452},
  {"id":"lychee","name":"荔枝","py":"lìzhī","es":"lichi","en":"lychee","g":0,"size":4,"weight":25,"long":0,"sweet":3,"sour":1,"len":4,"w":396,"ih":480},
  {"id":"kiwi","name":"奇異果","py":"qíyìguǒ","es":"kiwi","en":"kiwi","g":0,"size":7,"weight":100,"long":7,"sweet":2,"sour":3,"len":7,"w":385,"ih":480},
  {"id":"blueberry","name":"藍莓","py":"lánméi","es":"arándano","en":"blueberry","g":0,"size":2,"weight":2,"long":0,"sweet":2,"sour":2,"len":3.5,"w":480,"ih":432},
  {"id":"dragonfruit","name":"火龍果","py":"huǒlóngguǒ","es":"pitahaya","en":"dragon fruit","g":1,"size":12,"weight":400,"long":0,"sweet":2,"sour":1,"len":14,"w":329,"ih":480},
  {"id":"sugarapple","name":"釋迦","py":"shìjiā","es":"anona","en":"sugar apple","g":1,"size":9,"weight":350,"long":0,"sweet":3,"sour":1,"len":9,"w":433,"ih":480},
  {"id":"coconut","name":"椰子","py":"yēzi","es":"coco","en":"coconut","g":0,"size":15,"weight":1200,"long":0,"sweet":1,"sour":1,"len":16,"w":459,"ih":480},
  {"id":"pomelo","name":"柚子","py":"yòuzi","es":"pomelo","en":"pomelo","g":0,"size":16,"weight":1000,"long":0,"sweet":2,"sour":2,"len":17,"w":418,"ih":480},
  {"id":"cantaloupe","name":"哈密瓜","py":"hāmìguā","es":"melón","en":"cantaloupe","g":0,"size":16,"weight":1200,"long":0,"sweet":3,"sour":1,"len":17,"w":394,"ih":480},
  {"id":"sweetorange","name":"柳丁","py":"liǔdīng","es":"naranja","en":"orange","g":1,"size":8,"weight":200,"long":0,"sweet":2,"sour":2,"len":8,"w":412,"ih":480},
  {"id":"passionfruit","name":"百香果","py":"bǎixiāngguǒ","es":"maracuyá","en":"passion fruit","g":1,"size":6,"weight":80,"long":0,"sweet":2,"sour":3,"len":6,"w":366,"ih":480},
  {"id":"durian","name":"榴槤","py":"liúlián","es":"durián","en":"durian","g":0,"size":25,"weight":2500,"long":0,"sweet":3,"sour":1,"len":28,"w":361,"ih":480},
  {"id":"plum","name":"李子","py":"lǐzi","es":"ciruela","en":"plum","g":1,"size":6,"weight":70,"long":0,"sweet":2,"sour":3,"len":6,"w":402,"ih":480},
  {"id":"longan","name":"龍眼","py":"lóngyǎn","es":"racimo de longan","en":"bunch of longans","g":0,"size":12,"weight":200,"long":0,"sweet":3,"sour":1,"len":13,"w":392,"ih":480},
  {"id":"pomegranate","name":"石榴","py":"shíliú","es":"granada","en":"pomegranate","g":1,"size":8,"weight":300,"long":0,"sweet":2,"sour":2,"len":9,"w":427,"ih":480},
  {"id":"fig","name":"無花果","py":"wúhuāguǒ","es":"higo","en":"fig","g":0,"size":6,"weight":60,"long":0,"sweet":3,"sour":1,"len":6,"w":402,"ih":480},
  {"id":"ume","name":"梅子","py":"méizi","es":"ciruela ume","en":"ume plum","g":1,"size":4,"weight":20,"long":0,"sweet":1,"sour":3,"len":4,"w":400,"ih":480}
 ],
 // 特徵：甜、酸只有「比較甜／比較酸」（沒有反義詞），thr:2 = 只有 1 對 3 才出題，所以「兩個都很甜／都很酸」不會被拿來比（Ben 的規則）
 // 重量用對數：v = 4×log2(公克)，差 5 約 2.4 倍以上才算明顯比較重，差 2 以內（約 1.4 倍）算差不多
 dims:{
  size:{name:['大小','Tamaño','Size'],v:p=>p.size,num:1,thr:3,near:1,crop:'full',lv:1,w:2.5,
    deg:ax=>ax>=3&&ax<=6?1:ax>=12?2:0,
    pos:{z:'大',p:'dà',es:['grande','grande'],en:['big','bigger','biggest']},neg:{z:'小',p:'xiǎo',es:['pequeño','pequeña'],en:['small','smaller','smallest']},
    unit:{t:'公分',p:'gōngfēn'},esU:'cm',enU:'cm',tagB:p=>[p.size,'cm']},
  weight:{name:['重量','Peso','Weight'],v:p=>Math.round(4*Math.log2(p.weight)),num:1,thr:5,near:2,crop:'item',lv:1,w:2,noDeg:1,noDiff:1,
    pos:{z:'重',p:'zhòng',es:['pesado','pesada'],en:['heavy','heavier','heaviest']},neg:{z:'輕',p:'qīng',es:['ligero','ligera'],en:['light','lighter','lightest']}},
  sweet:{name:['甜','Dulzura','Sweetness'],v:p=>p.sweet,thr:2,noTie:1,crop:'item',lv:1,w:1.5,
    pos:{z:'甜',p:'tián',es:['dulce','dulce'],en:['sweet','sweeter','sweetest']},neg:null},
  long:{name:['長短','Largo','Length'],v:p=>p.long,num:1,thr:3,near:1,crop:'full',lv:2,w:1.5,
    deg:ax=>ax>=3&&ax<=5?1:ax>=8?2:0,
    pos:{z:'長',p:'cháng',es:['largo','larga'],en:['long','longer','longest']},neg:{z:'短',p:'duǎn',es:['corto','corta'],en:['short','shorter','shortest']},
    unit:{t:'公分',p:'gōngfēn'},esU:'cm',enU:'cm',tagB:p=>[p.long,'cm']},
  sour:{name:['酸','Acidez','Sourness'],v:p=>p.sour,thr:2,noTie:1,crop:'item',lv:2,w:1.5,
    pos:{z:'酸',p:'suān',es:['ácido','ácida'],en:['sour','sourer','sourest']},neg:null},
 },
 calib:[],
};
