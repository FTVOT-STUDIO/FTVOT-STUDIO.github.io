// 언어 선택: 한국어(HTML 원문) · English · 日本語
// 각 항목은 [선택자, 영어 배열, 일본어 배열]. 같은 선택자에 여러 요소가 있으면 문서 순서대로 대응합니다
const T = [
  ['.back', ['FTVOT Studio'], ['FTVOT Studio']],
  ['.rel-label', ['Coming December 2029'], ['2029年12月 発売予定']],
  ['.scroll-cue span', ['Beyond the veil'], ['帳の向こうへ']],
  ['.latin', ['<span>I</span>Exilium — Exile', '<span>II</span>Arca — World', '<span>III</span>Septem Dies — Seven Days', '<span>IV</span>Personae — Characters', '<span>V</span>Ludus — Systems', '<span>VI</span>Imago — Artwork', '<span>VII</span>Acta — Details'], ['<span>I</span>Exilium — 追放', '<span>II</span>Arca — 世界', '<span>III</span>Septem Dies — 七日', '<span>IV</span>Personae — 人物', '<span>V</span>Ludus — システム', '<span>VI</span>Imago — 絵画', '<span>VII</span>Acta — 情報']],
  ['.main-tag', ['If refusing salvation is a sin,<br>then gladly I shall be a sinner.'], ['救いを拒むことが罪ならば、<br>喜んで罪人となろう。']],
  ['.sub-tag', ['Not even salvation granted by a god can take the place of my freedom.'], ['神が与えた救いでさえ、私の自由の代わりにはならない。']],
  ['#about .lead', [
    '<i>Contra Vincula: The Defiant Exile</i> is a narrative RPG set in the dark fantasy world of <b>ARCA</b>, telling the story of bonds forged in the name of divinity and the exile who would break them.',
    'As Seraphina Lilith, an exile stripped of her wings, you will tear down the veil of the Faust Church, which worships beauty, and dig up the truth buried beneath it yourself.'
  ], [
    '『コントラ・ヴィンクラ：ザ・ディファイアント・エグザイル』は、ダークファンタジー世界<b>アルカ</b>を舞台に、神性の名で満たされた束縛と、それを断ち切ろうとする一人の追放者の物語を描くナラティブRPGです。',
    'プレイヤーは翼を奪われた追放者セラフィナ・リリスとなり、美を崇めるファウスト教の帳を剥ぎ取って、その下に埋もれた真実を自らの手で暴いていきます。'
  ]],
  ['#about dt', ['Genre', 'World', 'Themes'], ['ジャンル', '世界観', 'テーマ']],
  ['#about dd', ['Narrative RPG · Dark Fantasy', 'ARCA', 'Freedom · Bondage · Salvation · Faith · Choice · Defiance'], ['ナラティブRPG · ダークファンタジー', 'ARCA（アルカ）', '自由 · 束縛 · 救済 · 信仰 · 選択 · 抵抗']],
  ['#world .lead', [
    'ARCA, where transcendent beings clash over their own ideals. Here, divinity does not mean goodness, and salvation can be the gentlest of shackles.',
    'The Sephirot who govern the order and principles of the world, the transcendents who oppose them or chase other ideals, and countless lives in their shadow. What is order to one becomes oppression to another, and a decision made to protect can steal the very freedom of the one it protects.',
    'No conflict in this world wears the label of good or evil. Everyone carries their own past, convictions, and desires, and even the same event is seen and judged through different eyes.',
    'And at its heart stands the <b>Faust Church</b>, which worships beauty and salvation. Followers of Tiphareth, the Sephira of beauty, entrust their lives to faith in hope of escaping pain, and the deeper their belief, the more quietly their will sinks beneath the order of that faith.'
  ], [
    '超越者たちがそれぞれの理想を抱いてぶつかり合う世界、アルカ。ここでは神性は善を意味せず、救いは時に最も柔らかな枷となります。',
    '世界の秩序と原理を司るセフィラ、彼らに抗い、あるいは異なる理想を追う超越者たち、そしてその影の下で生きる無数の命。ある者にとっての秩序は別の者にとっての抑圧となり、守るための決断が、時にその者の自由を奪います。',
    'この世界の争いに、善と悪という名札は付いていません。誰もがそれぞれの過去と信念、欲望を抱き、同じ出来事でさえ異なる目で見て、解釈します。',
    'そしてその中心に、美と救いを崇める<b>ファウスト教</b>があります。美の権能を持つセフィラ、ティフェレトに従う信徒たちは苦しみから逃れることを願って人生を信仰に委ね、信仰が深まるほど、その意志は静かに信仰の秩序の下へと沈んでいきます。'
  ]],
  ['#story h2', ['Seven Days, and No More'], ['許された時間は、ただ七日']],
  ['#story .lead', [
    'Cast down from heaven for defying its order, Lilith found no sanctuary in the Faust Church, only another altar to kneel before in the name of salvation. Imprisoned in place of the one she meant to protect, she is stripped even of her voice.',
    'On the day an unexpected hand opens her cell, the memories of every believer but Tiphareth cloud over like mist. Seven days remain before it lifts. Within them, she must seize <b>seven truths</b> to stand against Tiphareth.'
  ], [
    '秩序に背いた代償として天界から投げ出されたリリス。たどり着いたファウスト教は安息の地ではなく、救いの名のもとに再び膝を折らせる場所でした。守ろうとした者の身代わりに囚われた彼女から、教団は声さえも奪っていきます。',
    '思いがけない手が牢の扉を開けた日、ティフェレトを除くすべての信徒の記憶が霧のように曇ります。その霧が晴れるまで残された時間は七日。その間に、ティフェレトに立ち向かうための<b>七つの真実</b>を手に入れなければなりません。'
  ]],
  ['#story .quote', ['What she seeks is not revenge. It is the freedom to decide her own life, bound by no one\'s command.'], ['彼女が望むのは復讐ではありません。誰の命令にも縛られず、自らの生き方を自分で決める自由です。']],
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
  ['.gp p', ['Search places and people to gather clues, records, and evidence.', 'Read what others say and do, and turn the conversation with your choices.', 'Find the contradictions in testimony and pierce them with evidence.', 'Over seven days, decide where to search and whom to meet.', 'Weigh your health, action points, and suspicion before every move.', 'Affection, emotion, and past actions change how people react and what they reveal.', 'Your choices and findings decide where the story branches.'], ['場所や人物を調べ、手がかりや記録、証拠を集めます。', '相手の言葉と行動を読み、選択で会話の流れを変えます。', '証言の矛盾を見つけ、証拠で突き崩します。', '七日の間に、どこを調べ誰に会うかを決めなければなりません。', '体力や行動力、疑念度を見極めながら、一つひとつの行動を決めます。', '好感度や感情、これまでの行動によって、反応や得られる情報が変わります。', '選択と調査の結果によって、物語の流れが分かれていきます。']],
  ['.gp-center', ['Seven truths to find in seven days'], ['七日のうちに見つけるべき七つの真実']],
  ['.gp-meters span', ['Health', 'Action', 'Suspicion'], ['体力', '行動力', '疑念度']],
  ['#news dt', ['Title', 'Genre', 'Developer', 'Release', 'Engine', 'Platforms'], ['タイトル', 'ジャンル', '開発', '発売', 'エンジン', 'プラットフォーム']],
  ['#news dd', ['Contra Vincula: The Defiant Exile', 'Narrative RPG · Dark Fantasy', 'FTVOT Studio', 'December 2029', 'Unity', 'Steam · Google Play'], ['Contra Vincula: The Defiant Exile', 'ナラティブRPG · ダークファンタジー', 'FTVOT STUDIO（セグスタジオ）', '2029年12月予定', 'Unity', 'Steam · Google Play']],
  ['.seal-cap', ['Coming'], ['発売予定']],
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
