import type { ConceptTopic } from './ConceptPanel';

// Original teaching summaries, checked against the linked primary sources on 2026-11-02.
// Sources explain concepts, not the specifications of this illustrative model or a local SOP.
const sumco = { label: 'SUMCO · 웨이퍼 제조 과정', url: 'https://www.sumcosi.com/english/products/process/' };
const samsung = { label: 'Samsung · 웨이퍼와 다이', url: 'https://semiconductor.samsung.com/support/tools-resources/fabrication-process/eight-essential-semiconductor-fabrication-processes-part-1-what-is-a-wafer/' };
const asml = { label: 'ASML · 리소그래피 원리', url: 'https://www.asml.com/en/technology/lithography-principles' };
const camfil = { label: 'Camfil · FFU의 구성과 역할', url: 'https://www.camfil.com/en/products/housings--frames-%2C-a-%2C-louvres/fan-filter-units' };
const hepa = { label: 'Camfil · HEPA 구성 설명 (PDF, 4쪽)', url: 'https://www.camfil.com/-/media/files/qbank/documents/__web/nofolder/understanding-your-hepa-filter-booklet-eng-finish-%281%29.pdf?hash=DC72CE9D386CB963510EAF92753ECA96&rev=24011ad7fd9043dda66fe7c8ecfedff9' };
const ashrae = { label: 'ASHRAE · Clean Spaces 기본 개념', url: 'https://handbook.ashrae.org/Handbooks/A15/SI/a15_ch18/a15_ch18_si.aspx' };
const iest = { label: 'IEST · 착의 시스템의 목적 (공개 요약)', url: 'https://www.iest.org/Standards-RPs/Recommended-Practices/IEST-RP-CC003' };
const waterloo = { label: 'Waterloo QNFCF · 해당 시설 착의 안내', url: 'https://qnfcf.uwaterloo.ca/data/general/operating-policies/gowning-procedure' };

export const waferConcepts: ConceptTopic[] = [
  {
    id: 'wafer-blank', title: '빈 웨이퍼와 패턴 웨이퍼',
    summary: '빈 웨이퍼는 아직 회로가 없는 바탕판이고, 패턴 웨이퍼는 그 위에 회로를 만든 모습이에요. 표면을 매끈하게 다듬는 것만으로는 회로가 생기지 않아요.',
    definition: '이 체험의 빈 웨이퍼는 아직 칩 회로를 만들지 않은 바탕판이에요. 패턴 웨이퍼는 이후 회로 제조가 진행된 모습을 비교하기 위한 예시예요.',
    principle: '회로는 표면을 반짝이게 만드는 것만으로 생기지 않아요. 이후 여러 공정으로 층과 패턴을 만들어 가요.',
    connection: '지금의 표면 준비와 다음의 회로 제조는 별개예요. 비교 화면의 격자는 나중 단계의 개념을 보여줘요.',
    misconception: '연마를 완료하면 격자 모양 회로가 저절로 나타나는 것은 아니에요.',
    question: { prompt: '연마된 빈 웨이퍼를 가장 잘 설명한 것은?', options: ['개별 칩까지 포장된 완성품', '회로 제조에 사용할 바탕판', '노치가 없는 불량 웨이퍼'], answer: 1, explanation: '표면을 준비한 것과 회로를 만든 것은 달라요. 빛나는 표면만으로 칩 완성을 판단할 수 없어요.' },
    sources: [samsung, asml],
  },
  {
    id: 'wafer-ingot', title: '잉곳에서 원판으로',
    summary: '잉곳은 실리콘을 하나의 큰 결정으로 키운 덩어리예요. 이것을 얇게 잘라 웨이퍼 원판을 만들어요.',
    definition: '잉곳은 웨이퍼의 재료가 되는 결정 덩어리예요.',
    principle: '성장시킨 단결정을 얇게 잘라 원판을 만들어요.',
    connection: '슬라이싱 뒤에는 표면 가공이 이어져요.',
    misconception: '잉곳 자르기와 완성된 회로를 개별 칩으로 나누는 다이싱은 달라요.',
    question: { prompt: '이 단계에서 나누는 대상은?', options: ['패키지', '완성 회로', '잉곳'], answer: 2, explanation: '슬라이싱은 잉곳에서 웨이퍼를 만드는 출발점이에요.' },
    sources: [sumco],
  },
  {
    id: 'wafer-lapping', title: '평탄화와 래핑',
    summary: '래핑은 잘라 낸 원판의 두께를 맞추고 양면을 평평하게 다듬는 과정이에요.',
    definition: '래핑은 두께와 양면의 평행도를 다듬는 가공이에요.',
    principle: '연마재로 표면 재료를 제거하며 형태를 정돈해요.',
    connection: '뒤의 손상층 제거와 정밀 연마를 준비해요.',
    misconception: '두께가 맞는 것과 거울처럼 매끈한 것은 같지 않아요.',
    question: { prompt: '래핑에서 다루는 것은?', options: ['두께와 평행도', '회로의 계산 속도', '패키지 단자'], answer: 0, explanation: '형태를 다듬은 뒤에도 표면 손상과 거칠기를 다뤄야 해요.' },
    sources: [sumco],
  },
  {
    id: 'wafer-polish', title: '손상 제거·연마·세정',
    summary: '자르고 가는 동안 생긴 표면 손상을 없애고, 거울처럼 매끈하게 연마한 뒤 깨끗이 씻어요.',
    definition: '표면 준비에는 가공 손상 제거와 미세 연마가 있어요.',
    principle: '화학적 제거로 손상층을 줄이고 기계·화학 작용으로 표면을 매끈하게 해요.',
    connection: '연마 뒤에도 세정과 검사가 이어져요.',
    misconception: '여기서의 식각은 회로 패턴 식각과 목적이 달라요.',
    question: { prompt: '이 연마의 목표는?', options: ['회로 그리기', '표면 품질 준비', '칩 포장'], answer: 1, explanation: '연마는 회로 완성이 아닌 표면 준비 과정이에요.' },
    sources: [sumco],
  },
  {
    id: 'wafer-notch', title: '작은 홈이 알려 주는 방향',
    summary: '노치는 웨이퍼 가장자리의 작은 홈이에요. 동그란 판에서도 방향을 알 수 있게 해 줘요.',
    definition: '노치는 웨이퍼 가장자리에 만든 작은 방향 표시예요.',
    principle: '원형 판에서도 결정 방향을 구분할 기준을 제공해요.',
    connection: '웨이퍼를 일정한 방향으로 이해하고 정렬하는 개념과 연결돼요. 정확한 방향 규격은 웨이퍼 사양에 따라 확인해요.',
    misconception: '노치는 불량 표시나 칩 하나가 빠진 자리가 아니에요.',
    question: { prompt: '노치의 역할과 가장 가까운 것은?', options: ['칩 성능 등급표', '사용한 횟수 표시', '방향 기준'], answer: 2, explanation: '방향을 구분하기 위한 표시예요. 노치만으로 칩 성능이나 품질을 알 수는 없어요.' },
    sources: [{ label: 'MicroChemicals · 웨이퍼 방향 표시 (PDF, 1쪽)', url: 'https://www.microchemicals.com/dokumente/application_notes/silicon_wafer_production_specification.pdf' }],
  },
  {
    id: 'wafer-die', title: '웨이퍼·다이·분리 공간',
    summary: '다이는 웨이퍼 위의 칩 하나하나예요. 다이 사이의 빈 줄(스크라이브 라인)을 따라 잘라 칩으로 나눠요.',
    definition: '다이는 개별 회로 영역이에요. 다이 사이에는 분리를 위한 스크라이브 라인이라는 공간이 있어요.',
    principle: '일반적인 칩 제조에서는 회로 제조 후 웨이퍼를 개별 칩으로 나누고 패키징해요.',
    connection: '웨이퍼 전체, 그 위의 개별 다이, 다이를 담는 패키지는 다른 단위예요.',
    misconception: '모형의 사각 격자는 실제 미세회로를 그대로 재현한 그림이 아니에요.',
    question: { prompt: '이 모형에서 여러 사각 영역이 나타내는 것은?', options: ['개별 다이의 배치', '서로 다른 웨이퍼 여러 장', '연마할 때 생긴 흠집'], answer: 0, explanation: '한 웨이퍼 위의 여러 다이를 단순화했어요. 실제 패턴과 다이 크기는 제품마다 달라요.' },
    sources: [samsung, { label: 'ASML · 제조 과정과 패키징', url: 'https://www.asml.com/en/company/stories/2021/semiconductor-manufacturing-process-steps' }],
  },
];

export const ffuConcepts: ConceptTopic[] = [
  {
    id: 'ffu-fan', title: '팬·모터·제어부는 무엇을 할까?',
    summary: 'FFU는 팬이 공기를 밀어 주고 필터가 먼지를 걸러 내는 장치예요. 제어부가 팬 속도를 조절해요.',
    definition: 'FFU는 팬과 고성능 입자 필터, 제어부가 함께 일하는 공기 처리 장치예요.',
    principle: '모터로 구동되는 팬은 공기를 움직이고, 필터는 그 흐름 속 입자를 포집해요. 제어부는 운전을 조절하는 역할이에요.',
    connection: '회전하는 부품과 입자를 붙잡는 부품의 역할을 나눠 보세요. 이 모형의 회전 속도는 실제 성능값이 아니에요.',
    misconception: '팬 날개 자체가 미세입자 필터인 것은 아니에요. 팬이 돈다는 것만으로 청정도가 증명되지도 않아요.',
    question: { prompt: '팬과 필터의 역할을 바르게 연결하면?', options: ['팬은 포집, 필터는 회전', '팬은 공기 이동, 필터는 입자 포집', '팬과 필터 모두 온도 측정'], answer: 1, explanation: '공기를 이동시키는 일과 입자를 붙잡는 일은 달라요. FFU는 이 기능을 함께 구성한 장치예요.' },
    sources: [camfil],
  },
  {
    id: 'ffu-media', title: '필터 여재는 단순한 체일까?',
    summary: '여재는 필터 안에서 먼지를 실제로 붙잡는 섬유층이에요. 먼지는 섬유에 부딪히거나 걸리거나, 떠돌다 닿아서 붙잡혀요.',
    definition: '여재는 공기 속 입자를 붙잡는 필터의 핵심 부분이에요. 바깥 보호망과 안쪽 여재는 구분해요.',
    principle: '입자가 섬유에 부딪히거나 접촉하고, 작은 입자는 불규칙한 움직임으로 섬유에 닿기도 해요. 충돌·차단·확산 같은 여러 원리가 작용해요.',
    connection: '겉의 큰 격자만 보고 미세입자 포집 성능을 판단하지 않아요. 실제 효율은 필터 사양과 시험 조건으로 설명해요.',
    misconception: '구멍보다 큰 입자만 걸리고 작은 입자는 모두 통과하는 단순한 체로 이해하면 부족해요.',
    question: { prompt: '작은 입자도 포집될 수 있는 이유는?', options: ['모든 입자가 즉시 커져서', '보호망이 모든 공기를 막아서', '불규칙한 운동으로 섬유에 닿을 수 있어서'], answer: 2, explanation: '확산도 포집에 기여해요. 이 설명은 기본 원리이며, 모형의 점이나 격자 크기가 실제 포집 한계는 아니에요.' },
    sources: [{ label: 'NIOSH · 에어로졸 필터의 포집 원리 (PDF)', url: 'https://www.cdc.gov/niosh/docs/2014-151/pdfs/chapters/chapter-fp.pdf' }, hepa],
  },
  {
    id: 'ffu-housing', title: '몸체·흡입구·프레임의 역할',
    summary: '하우징은 FFU의 몸체이고, 프레임은 필터를 감싸 고정해요. 공기는 흡입구로 들어와 필터를 지나 아래로 나가요.',
    definition: '하우징은 장치의 몸체이고, 필터 프레임은 여재를 둘러싼 구조예요. 흡입구는 공기가 들어오는 쪽을 보여줘요.',
    principle: '몸체와 프레임은 구성품을 지지하고 공기가 필터를 통과하는 구조를 이뤄요. 모형의 판과 격자는 그 위치 관계를 설명해요.',
    connection: '여재를 지지하는 구조와 입자를 붙잡는 여재를 구별하면 분해 모형을 읽기 쉬워져요. 실제 배치와 재료는 제품마다 달라요.',
    misconception: '금속 상자나 눈에 보이는 흡입 격자 자체가 HEPA 여재와 같은 역할을 하지는 않아요.',
    question: { prompt: '프레임과 여재를 구별한 설명은?', options: ['프레임은 구조를 지지하고 여재는 입자를 포집해요', '프레임만 있으면 여재는 필요 없어요', '둘 다 팬의 회전 속도만 측정해요'], answer: 0, explanation: '지지 구조와 포집 매체는 다른 역할이에요. 여기에 연결부의 밀봉도 함께 고려해요.' },
    sources: [camfil, hepa],
  },
  {
    id: 'ffu-seal', title: '왜 틈과 밀봉부를 볼까?',
    summary: '필터 둘레에 틈이 있으면 공기가 걸러지지 않은 채 새어 나가요. 가스켓과 실링이 이 틈을 막아요.',
    definition: '가스켓과 실링은 공기가 필터 주변 틈으로 돌아가는 우회 경로를 줄이는 부분이에요.',
    principle: '여재를 통과하지 않고 주변으로 지나가는 공기는 그 여재의 포집 작용을 받지 않아요.',
    connection: '필터를 이해할 때 여재뿐 아니라 프레임과 하우징의 연결부도 함께 봐요. 이 모형은 누설 시험을 대신하지 않아요.',
    misconception: '좋은 여재를 넣었다고 설치된 장치 전체의 성능이 자동으로 보장되지는 않아요.',
    question: { prompt: '공기가 여재 옆 틈으로 지나가면?', options: ['여재를 통과한 것과 같아요', '그 경로는 여재의 포집을 우회해요', '필터 효율이 자동으로 높아져요'], answer: 1, explanation: '이를 우회 흐름으로 이해할 수 있어요. 밀봉은 여재와 별개이면서 전체 구성에 중요한 요소예요.' },
    sources: [hepa],
  },
];

export const cleanroomConcepts: ConceptTopic[] = [
  {
    id: 'cleanroom-what', title: '클린룸은 어떤 곳일까?',
    summary: '공기 속 먼지와 온도·습도를 정해진 범위로 관리하는 방이에요. 반도체 회로는 아주 가늘어서, 눈에 안 보이는 먼지 한 알도 불량을 만들 수 있어요.',
    definition: '공기 속 먼지 양과 온도·습도를 정해진 범위로 관리하는 방이에요. 반도체는 이 안에서 만들어요.',
    principle: '반도체 회로는 머리카락 굵기의 수천분의 1만큼 가늘어서, 눈에 안 보이는 먼지 한 알도 회로를 끊거나 이어 불량을 만들어요.',
    connection: '천장 전체에 달린 FFU가 걸러 낸 공기를 아래로 내려보내고, 구멍 뚫린 바닥으로 빠져나가게 해요.',
    misconception: '먼지가 0개인 방이 아니라, 먼지 수를 정해진 기준 아래로 계속 관리하는 방이에요.',
    question: { prompt: '클린룸이 필요한 가장 큰 이유는?', options: ['작업자가 쾌적하게 일하도록', '아주 작은 먼지도 회로 불량을 만들어서', '장비 소음을 줄이려고'], answer: 1, explanation: '회로가 매우 미세해서 작은 입자 하나도 불량의 원인이 될 수 있어요.' },
    sources: [ashrae],
  },
  {
    id: 'cleanroom-gown', title: '방진복은 왜 입을까?',
    summary: '사람 몸에서는 각질·머리카락·침방울이 계속 나와요. 방진복은 이 먼지가 웨이퍼로 퍼지지 않게 몸 전체를 덮어요. 위에서 아래로 입는 건 먼저 입은 옷을 더럽히지 않기 위해서예요.',
    definition: '사람이 클린룸에서 가장 큰 먼지 발생원이라, 몸에서 나오는 먼지를 옷 안에 가두려고 입어요.',
    principle: '가만히 있어도 사람 몸에서는 피부 각질, 머리카락, 옷 보풀, 침방울이 계속 나와요. 방진복은 먼지가 잘 안 생기는 소재로 몸 전체를 덮어요.',
    connection: '헤어캡부터 부츠까지 위에서 아래로 입는 건, 먼저 입은 옷에 다음 옷의 먼지가 떨어지지 않게 하려는 거예요. 에어샤워로 겉면 먼지를 한 번 더 털어 내요.',
    misconception: '방진복은 사람을 보호하는 옷이 아니라, 사람에게서 나오는 먼지로부터 제품을 보호하는 옷이에요.',
    question: { prompt: '방진복이 주로 지키는 대상은?', options: ['작업자의 몸', '클린룸 안의 웨이퍼와 공정', '바깥 공기'], answer: 1, explanation: '방진복은 사람에게서 나오는 먼지가 공정으로 퍼지지 않게 막아요.' },
    sources: [iest],
  },
  {
    id: 'cleanroom-airflow', title: 'FFU와 방진복, 둘 다 필요한 이유',
    summary: '먼지는 공기와 사람 양쪽에서 와요. 천장의 FFU가 공기를, 방진복이 사람을 맡아요.',
    definition: 'FFU는 공기 속 먼지를 걸러 내고, 방진복은 사람 몸에서 나오는 먼지를 막아요.',
    principle: '클린룸의 오염은 공기와 사람 양쪽에서 와요. 그래서 둘 다 관리해야 해요.',
    connection: '천장의 FFU에서 내려오는 공기와, 갱의실에서 입은 방진복을 함께 떠올려 보세요.',
    misconception: 'FFU가 있어도 방진복은 필요하고, 방진복을 입어도 공기 관리는 필요해요.',
    question: { prompt: 'FFU와 착의 관리의 관계는?', options: ['다른 경로의 오염 관리를 서로 보완해요', '둘 중 하나만 있으면 언제나 충분해요', '둘 다 공기를 가열하는 장치예요'], answer: 0, explanation: '공기 속 입자와 사람 유래 오염은 연결되지만 같은 관리 대상은 아니에요. 시설 전체의 설계와 운영을 함께 봐요.' },
    sources: [camfil, ashrae, iest],
  },
];

export const gowningConcepts: ConceptTopic[] = [
  {
    id: 'gowning-purpose', title: '방진복이 줄이려는 오염은?',
    summary: '방진복은 사람 몸과 옷에서 나오는 먼지가 제품에 닿지 않게 막아요. 장갑은 손으로 만질 때 옮는 오염을 막아요.',
    definition: '착의 시스템은 사람과 의복에서 나오는 오염이 제품·공정으로 전달되는 것을 줄이는 데 쓰여요.',
    principle: '머리와 몸을 덮는 구성품은 머리카락·피부·의복 유래 오염과 연결돼요. 장갑은 손의 접촉 경로와 관련돼요. 이 모형은 그 역할을 단순화했어요.',
    connection: '헤어넷·후드·방진복·장갑을 각각 보되 하나의 착의 시스템으로 연결해 보세요. 오염 관리와 작업자 위험 보호는 목적을 구분해야 해요.',
    misconception: '방진복이나 일반 클린룸 장갑이 모든 화학물질·열·기계적 위험을 막아 준다고 가정하면 안 돼요. 작업별 보호구 판단과 교육은 별도예요.',
    question: { prompt: '방진복을 이해할 때 적절한 설명은?', options: ['모든 위험을 막는 만능 보호구예요', '사람 유래 오염 관리와 작업별 위험 보호는 구분해요', '필터가 있으면 의복에서 입자가 나오지 않아요'], answer: 1, explanation: '이 체험은 오염 전달을 줄이는 개념을 설명해요. 실제 위험에 맞는 보호구의 적합성이나 입실 자격을 판정하지 않아요.' },
    sources: [iest, { label: 'NASA · 사람과 의복 유래 오염', url: 'https://sma.nasa.gov/sma-disciplines/planetary-protection/explore/explore-item/cleanroom-gowning-or-how-to-dress-in-the-cleanroom' }, { label: 'Stanford EH&S · 위험별 보호구 개념', url: 'https://ehs-library.stanford.edu/topic/lab-safety/personal-protective-equipment' }],
  },
  {
    id: 'gowning-sop', title: '한 시설의 예시와 실제 SOP',
    summary: '입는 순서와 복장은 시설마다 조금씩 달라요. 이 체험의 순서는 공개된 한 시설의 안내를 바탕으로 한 예시예요.',
    definition: 'SOP는 해당 시설과 작업에 맞춰 정한 절차예요. 이 체험의 착의 순서는 Waterloo QNFCF의 공개 안내를 바탕으로 한 예시예요.',
    principle: '시설은 다루는 작업과 환경에 맞게 복장과 절차를 정해요. 예를 들어 공개된 Waterloo와 Stanford 안내에도 구성품과 요구사항의 차이가 있어요.',
    connection: '머리·몸·손을 덮는 이유를 익히되, 화면의 순서·진행률을 현장의 착의 적합성 판정으로 옮기지 않아요.',
    misconception: '이 예시를 외우거나 마지막 점검을 완료했다고 어느 시설에서나 입실하거나 작업할 자격이 생기는 것은 아니에요.',
    question: { prompt: '체험의 예시와 소속 시설 안내가 다르다면?', options: ['게임의 순서를 어디서나 그대로 적용해요', '더 짧은 절차를 임의로 골라요', '해당 시설의 최신 SOP와 교육을 기준으로 확인해요'], answer: 2, explanation: '예시는 개념을 익히기 위한 것이에요. 현장 절차나 안전 교육을 대체하지 않으며, 불명확한 점은 시설 담당자에게 확인해야 해요.' },
    sources: [waterloo, { label: 'Stanford SNF · 해당 시설별 복장 안내', url: 'https://snfguide.stanford.edu/gowning' }],
  },
];
