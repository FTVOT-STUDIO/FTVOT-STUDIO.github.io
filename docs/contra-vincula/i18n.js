// 언어 선택: 한국어(HTML 원문) · English · 日本語
// 각 항목은 [선택자, 영어 배열, 일본어 배열]. 같은 선택자에 여러 요소가 있으면 문서 순서대로 대응합니다
const T = [
  ['.back', ['FTVOT Studio'], ['FTVOT Studio']],
  ['.release > span:first-child', ['Coming December 2029'], ['2029年12月 発売予定']],
  ['.scroll-cue', ['Learn more'], ['もっと見る']],
  ['.main-tag', ['If refusing salvation is a sin,<br>then gladly I shall be a sinner.'], ['救いを拒むことが罪ならば、<br>喜んで罪人となろう。']],
  ['.sub-tag', ['Not even salvation granted by a god can take the place of my freedom.'], ['神が与えた救いでさえ、私の自由の代わりにはならない。']],
  ['#about .lead', [
    '<i>Contra Vincula: The Defiant Exile</i> is a narrative RPG set in the dark fantasy world of <b>ARCA</b>, about the oppression carried out in the name of divinity and those who rise against that order.',
    'You play as Seraphina Lilith, a former angel cast out of heaven, uncovering the truth hidden within the Faust Church.'
  ], [
    '『コントラ・ヴィンクラ：ザ・ディファイアント・エグザイル』は、ダークファンタジー世界<b>アルカ（ARCA）</b>を舞台に、神性の名のもとに行われる抑圧と、その秩序に抗う者たちを描くナラティブRPGです。',
    'プレイヤーは天界を追放された元天使セラフィナ・リリスとなり、ファウスト教に隠された真実を調べます。'
  ]],
  ['#about dt', ['Genre', 'World', 'Themes'], ['ジャンル', '世界観', 'テーマ']],
  ['#about dd', ['Narrative RPG · Dark Fantasy', 'ARCA', 'Freedom · Bondage · Salvation · Faith · Choice · Defiance'], ['ナラティブRPG · ダークファンタジー', 'ARCA（アルカ）', '自由 · 束縛 · 救済 · 信仰 · 選択 · 抵抗']],
  ['#world .lead', ['A world where transcendent beings of divinity and power clash over their own ideals. Here, salvation is not always mercy.'], ['神性と権能を持つ超越者たちが、それぞれの理想を追って衝突する世界。ここでの救いは、必ずしも慈悲ではありません。']],
  ['#story h2', ['Only Seven Days'], ['与えられた時間は、わずか7日']],
  ['#story .lead', [
    'Lilith lost her wings and her station as the price of defying the order. The Faust Church she reached offered no new life, only another demand for obedience in the name of salvation. Imprisoned in place of the one she sought to protect, she is robbed even of her voice.',
    'On the day an unexpected hand frees her from her cell, the memories of everyone in the church but Tiphareth grow briefly clouded. For the one week this lasts, Lilith must find <b>seven pieces of valid evidence</b> to stand against Tiphareth.'
  ], [
    '秩序に抗った代償として翼と地位を奪われたリリス。たどり着いたファウスト教は新たな人生ではなく、救いを名目に再び服従を強いる場所でした。守ろうとした者の身代わりに幽閉された彼女は、声さえも奪われます。',
    '思いがけない助けで牢を抜け出した日、ティフェレトを除く教団の人々の記憶が一時的に曇ります。その状態が続く一週間のうちに、リリスはティフェレトに立ち向かうための<b>七つの有効な情報</b>を見つけなければなりません。'
  ]],
  ['#story .quote', ['What she seeks is not revenge, but the freedom to decide her own life, bound by no one\'s command.'], ['彼女が望むのは復讐ではなく、誰の命令にも縛られず、自らの生き方を自分で決める自由です。']],
  ['.cast .role', ['The Defiant Exile', 'The Beauty That Enthralls the World', 'The One Saint Chosen by Beauty', 'Tiphareth\'s Devoted Believer'], ['抗う追放者', '世界を魅了する美', '美が選んだ唯一の聖女', 'ティフェレトの忠実な信徒']],
  ['.cast h3', ['Seraphina Lilith', 'Tiphareth', 'Julos de Pore', 'Andromalius'], ['セラフィナ・リリス', 'ティフェレト', 'ジュロス・ド・ポア', 'アンドロマリウス']],
  ['.cast article > p:not(.role)', [
    'A former angel who lost her wings for defying the order of heaven. She is neither a righteous hero nor a flawless savior, and will not shy from cruel choices to win back her freedom.',
    'The Sephira of beauty and head of the Faust Church. She seeks to mend a divided world through salvation, yet that salvation is faith to some and a chain upon freedom to others.',
    'A figure of absolute faith in Tiphareth. Tiphareth lies at the heart of her every action and judgment, and that faith shapes how she sees the world and judges others. Her relationship with Lilith is tangled up in that same faith.',
    'One who serves Tiphareth and carries out her will. He values the church\'s order and his own convictions above all, and plays a key role in the conflict with Lilith.'
  ], [
    '天界の秩序に抗い翼を失った元天使。正義の英雄でも完全無欠の救世主でもなく、自由を取り戻すためなら残酷な選択もためらいません。',
    '美の権能を持つセフィラにしてファウスト教の教主。救いによって分かたれた世界をつなごうとしますが、その救いはある者には信仰であり、ある者には自由を奪う鎖です。',
    'ティフェレトへの絶対的な信仰を抱く人物。その行動と判断の奥には常にティフェレトがあり、その信仰は世界の見方や他者への判断にも影響を与えます。リリスとの関係もまた、この信仰と複雑に絡み合っています。',
    'ティフェレトに仕え、その意志を遂行する人物。教団の秩序と自らの信念を何よりも重んじ、リリスとの対立において重要な役割を担います。'
  ]],
  ['.gp h3', ['Investigation', 'Dialogue & Choices', 'Deduction & Mind Games', 'Time Management', 'RPG Elements', 'Relationships', 'Branching Story'], ['調査・探索', '会話・選択肢', '推理・心理戦', '時間管理', 'RPG要素', '人物関係', '分岐するストーリー']],
  ['.gp p', ['Gather clues, records, and evidence from places and people', 'Read words and actions, and choose to turn the flow', 'Pierce contradictions in testimony with evidence', 'Where to search and whom to meet within seven days', 'Weigh your condition with every action', 'Affection, emotion, and past actions change reactions and information', 'Your choices and findings change the story'], ['場所や人物から手がかり・記録・証拠を集める', '発言と行動を読み、流れを変える選択', '証言の矛盾を証拠で突く', '7日の中で、どこを調べ誰に会うか', '行動のたびに状態を見極める', '好感度や感情、過去の行動が反応と情報を変える', '選択と調査の結果が展開を変える']],
  ['.gp-meters span', ['Health', 'Action', 'Suspicion'], ['体力', '行動力', '疑念度']],
  ['#news dt', ['Developer', 'Release', 'Engine', 'Platforms'], ['開発', '発売', 'エンジン', 'プラットフォーム']],
  ['#news dd', ['FTVOT Studio', 'December 2029', 'Unity', 'TBA'], ['FTVOT STUDIO（セグスタジオ）', '2029年12月予定', 'Unity', '後日発表']],
  ['.foot a', ['Back to FTVOT Studio'], ['FTVOT Studioへ戻る']],
];

const LANGS = ['ko', 'en', 'ja'];
const original = T.map(([sel]) => [...document.querySelectorAll(sel)].map((el) => el.innerHTML)); // 한국어 원문 보관

function apply(lang) {
  const k = LANGS.indexOf(lang);
  T.forEach(([sel, en, ja], i) => {
    const list = k === 0 ? original[i] : k === 1 ? en : ja;
    document.querySelectorAll(sel).forEach((el, j) => { if (list[j] != null) el.innerHTML = list[j]; });
  });
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  try { localStorage.setItem('cv-lang', lang); } catch {}
}

let saved = null; try { saved = localStorage.getItem('cv-lang'); } catch {}
const guess = (navigator.language || 'ko').slice(0, 2);
const start = LANGS.includes(saved) ? saved : LANGS.includes(guess) ? guess : 'en';
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.lang)));
if (start !== 'ko') apply(start); else apply('ko');
