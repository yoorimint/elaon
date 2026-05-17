// 한국 종목 6자리 코드 → DART corp_code (8자리) 매핑.
//
// 채우는 방법:
//   1. https://opendart.fss.or.kr 가입 → API 키 발급
//   2. https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=<KEY> 호출 → ZIP 다운
//   3. ZIP 안의 CORPCODE.xml 에서 종목 6자리(stock_code) ↔ corp_code 매핑 추출
//   4. 본인이 자주 검색할 종목만 아래에 추가
//
// 환경변수 OPEN_DART_API_KEY + 본 매핑이 모두 있을 때만 DART 재무·공시 섹션이
// 활성화. 매핑이 없는 종목은 사이트 다른 부분은 정상 동작하지만 DART 섹션은
// 표시되지 않음.
//
// 추측으로 채우면 잘못된 회사 정보가 노출되므로 비워둠.
export const DART_CORP_CODES: Record<string, string> = {
  // 예: "005930": "00126380",  // 삼성전자
};
